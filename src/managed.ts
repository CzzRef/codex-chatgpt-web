/** Explicit externally-owned entry. Never calls setup, service or Codex integration writers. */
import { existsSync, lstatSync, readFileSync, rmSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { atomicWriteFile, defaultConfig, resolveInteractionConnectorIdentities, type AppConfig } from "./config";
import { createHash, randomBytes } from "node:crypto";
import { connectTunnel, createTunnelConfig, installRuntimeKeyBytes, installTunnelClient, stopTunnel, tunnelStatus, waitForTunnelReady } from "./tunnel";
import { startServer } from "./server";
import { UnifiedRouter, validateUnifiedManifest, type UnifiedRoutingState } from "./unified-router";
import { VERSION } from "./version";

export interface ManagedLaunchConfig {
  schemaVersion: 1;
  owner: "codex-plusplus";
  ccwVersion: string;
  profileDir: string;
  apiBase: string;
  port: number;
  subagentProtocol: "native" | "compatibility-v1";
  runtimeCommand: string[];
  nativeContext?: { contextWindow?: number; autoCompactTokenLimit?: number };
}

export function readManagedLaunchConfig(file: string): ManagedLaunchConfig {
  if (!isAbsolute(file) || lstatSync(file).isSymbolicLink()) throw new Error("Managed launch file must be an absolute regular file");
  const config = JSON.parse(readFileSync(file, "utf8")) as ManagedLaunchConfig;
  if (config.schemaVersion !== 1 || config.owner !== "codex-plusplus" || config.ccwVersion !== VERSION
    || !isAbsolute(config.profileDir) || resolve(file) !== join(resolve(config.profileDir), "managed-launch.json")
    || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535
    || !["native", "compatibility-v1"].includes(config.subagentProtocol)
    || !Array.isArray(config.runtimeCommand) || config.runtimeCommand.length < 2
    || config.runtimeCommand.some(arg => typeof arg !== "string")
    || !isAbsolute(config.runtimeCommand[0]!) || !isAbsolute(config.runtimeCommand[1]!)) {
    throw new Error("Invalid or incompatible Codex++ managed launch contract");
  }
  return config;
}

export function buildManagedAppConfig(launch: ManagedLaunchConfig, token: string, includeWebConfig = true): AppConfig {
  const config: AppConfig = {
    ...defaultConfig("full"), purpose: "managed", port: launch.port,
    subagentProtocol: launch.subagentProtocol, browserHost: "launcher",
    browserHostDescriptorPath: join(launch.profileDir, "runtime/launcher-browser.json"),
    storageStatePath: join(launch.profileDir, "browser/storage-state.json"),
    brokerSocketPath: join(launch.profileDir, "runtime/turn-broker.sock"),
    runtimeCommand: launch.runtimeCommand, controlToken: token,
  };
  // The browser helper may save Web capabilities and connector settings in its private profile.
  // No transport, path, token, Codex protocol or runtime ownership can be overridden there.
  const webConfigFile = join(launch.profileDir, "config.json");
  if (includeWebConfig && existsSync(webConfigFile)) {
    const web = JSON.parse(readFileSync(webConfigFile, "utf8")) as AppConfig;
    for (const field of ["appName", "automaticAppName", "browserInteractionMode", "solAvailable", "proAvailable", "experimentalBiggerContext", "zeroRiskProEnabled", "tunnel", "automaticTunnel", "manualTunnel"] as const) {
      if (web[field] !== undefined) (config as unknown as Record<string, unknown>)[field] = web[field];
    }
  }
  return config;
}

export async function runManagedCommand(args: string[]): Promise<void> {
  const action = args[0] === "--config" ? "serve" : args.shift();
  if (!["serve", "configure", "tunnel", "interrupt"].includes(action ?? "") || args.length !== 2 || args[0] !== "--config") throw new Error("Usage: managed [configure|tunnel|interrupt] --config /absolute/profile/managed-launch.json");
  const launch = readManagedLaunchConfig(args[1]!);
  process.env.CODEX_CPP_MANAGED = "1";
  process.env.CODEX_CHATGPT_WEB_HOME = launch.profileDir;
  const tokenFile = join(launch.profileDir, "control-token");
  const stat = lstatSync(tokenFile);
  if (!stat.isFile() || stat.isSymbolicLink() || (process.platform !== "win32" && (stat.mode & 0o077) !== 0)) throw new Error("Managed control credential must be private");
  const token = readFileSync(tokenFile, "utf8").trim();
  if (action === "configure") { await configureManagedWeb(launch, token); return; }
  if (action === "tunnel") { await runManagedTunnel(launch, token); return; }
  if (action === "interrupt") { await interruptManagedTurn(launch, token); return; }
  const stateFile = join(launch.profileDir, "runtime/unified-routing-state.json");
  const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) as UnifiedRoutingState : undefined;
  const router = new UnifiedRouter({
    apiBase: launch.apiBase, controlToken: token, state, nativeContext: launch.nativeContext,
    manifest: async () => {
      const response = await fetch(`${launch.apiBase}/internal/unified/manifest`, {
        headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`Codex++ model manifest unavailable (${response.status})`);
      return validateUnifiedManifest(await response.json());
    },
    execute: request => fetch(request),
    persist: value => atomicWriteFile(stateFile, `${JSON.stringify(value)}\n`),
  });
  let config: AppConfig;
  try {
    config = buildManagedAppConfig(launch, token);
    atomicWriteFile(join(launch.profileDir, "config.json"), `${JSON.stringify(config)}\n`);
  } catch {
    // A corrupt Web-only configuration cannot take official/API transport down on restart.
    config = buildManagedAppConfig(launch, token, false);
  }
  const server = startServer(config, { managed: router, refreshManagedConfig: () => buildManagedAppConfig(launch, token) });
  process.stdout.write(`Managed CCW ${VERSION} ready on 127.0.0.1:${server.port}\n`);
  await new Promise<void>(() => {});
}

async function readControlStdin(): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of process.stdin) { const part = Buffer.from(chunk); bytes += part.byteLength; if (bytes > 128_000) throw new Error("Managed configuration input is too large"); chunks.push(part); }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Managed configuration input must be valid JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Managed input must be an object");
  return value as Record<string, unknown>;
}

async function configureManagedWeb(launch: ManagedLaunchConfig, token: string): Promise<void> {
  const input = await readControlStdin();
  const config = buildManagedAppConfig(launch, token);
  const mode = input.browserInteractionMode ?? config.browserInteractionMode;
  if (mode !== "automatic" && mode !== "manual") throw new Error("Invalid Web interaction mode");
  config.browserInteractionMode = mode;
  Object.assign(config, resolveInteractionConnectorIdentities(config, mode));
  for (const field of ["solAvailable", "proAvailable", "experimentalBiggerContext", "zeroRiskProEnabled"] as const) {
    if (input[field] !== undefined) { if (typeof input[field] !== "boolean") throw new Error("Web capability values must be boolean"); config[field] = input[field]; }
  }
  if (mode === "manual" && config.experimentalBiggerContext) throw new Error("Zero Risk mode cannot use Bigger Context");
  if (input.tunnelId !== undefined || input.runtimeKey !== undefined) {
    if (typeof input.tunnelId !== "string" || typeof input.runtimeKey !== "string" || !input.runtimeKey.trim()) throw new Error("Tunnel ID and runtime key are required together");
    // Validate before any installation or key write. The unique alias belongs to this profile.
    const alias = `cpp-web-${mode}-${randomBytes(8).toString("hex")}`;
    createTunnelConfig({ binaryPath: "/pending", tunnelId: input.tunnelId, runtimeKeyFile: "/pending", alias, profileName: alias });
    const other = mode === "automatic" ? config.manualTunnel : config.automaticTunnel;
    if (other?.tunnelId === input.tunnelId) throw new Error("Automatic and Zero Risk require separate tunnels");
    const binaryPath = await installTunnelClient();
    const runtimeKeyFile = installRuntimeKeyBytes(input.runtimeKey, mode);
    config.tunnel = createTunnelConfig({ binaryPath, tunnelId: input.tunnelId, runtimeKeyFile, alias, profileName: alias });
    if (mode === "automatic") config.automaticTunnel = config.tunnel; else config.manualTunnel = config.tunnel;
  } else config.tunnel = mode === "automatic" ? config.automaticTunnel : config.manualTunnel;
  atomicWriteFile(join(launch.profileDir, "config.json"), `${JSON.stringify(config)}\n`);
  process.stdout.write(JSON.stringify({ status: "configured", connectorName: config.appName, tunnelConfigured: Boolean(config.tunnel), browserInteractionMode: mode }));
}

async function runManagedTunnel(launch: ManagedLaunchConfig, token: string): Promise<void> {
  const config = buildManagedAppConfig(launch, token);
  if (!config.tunnel) throw new Error("Configure the Web tunnel in Codex++ first");
  const ownerFile = join(launch.profileDir, "runtime/tunnel-owner.json");
  const fingerprint = createHash("sha256").update(JSON.stringify(config.tunnel)).digest("hex");
  const previous = existsSync(ownerFile) ? JSON.parse(readFileSync(ownerFile, "utf8")) : undefined;
  const current = tunnelStatus(config);
  if (current.processRunning && previous?.fingerprint !== fingerprint) throw new Error("The Web tunnel alias is owned by another runtime");
  atomicWriteFile(ownerFile, JSON.stringify({ owner: "codex-plusplus", fingerprint, alias: config.tunnel.alias }));
  if (!current.processRunning) {
    connectTunnel(config);
    const ready = await waitForTunnelReady(config);
    if (!ready.ready) throw new Error("The Web tunnel did not become ready");
  }
  atomicWriteFile(ownerFile, JSON.stringify({ owner: "codex-plusplus", fingerprint, alias: config.tunnel.alias }));
  const healthFile = join(launch.profileDir, "runtime/tunnel-status.json");
  let finish!: () => void;
  let failed = false;
  const stopping = new Promise<void>(resolveStop => { finish = resolveStop; });
  const report = () => {
    const status = tunnelStatus(config);
    atomicWriteFile(healthFile, JSON.stringify({ ownerPid: process.pid, ready: status.ok, checkedAt: Date.now() }));
    if (!status.processRunning) { failed = true; finish(); }
  };
  process.once("SIGTERM", finish); process.once("SIGINT", finish);
  process.stdin.once("data", finish); process.stdin.once("end", finish); process.stdin.resume();
  const monitor = setInterval(report, 10_000);
  try { report(); await stopping; }
  finally {
    clearInterval(monitor);
    const owner = JSON.parse(readFileSync(ownerFile, "utf8"));
    if (owner.fingerprint !== fingerprint) throw new Error("Tunnel ownership changed; refusing to stop it");
    stopTunnel(config);
    if (tunnelStatus(config).processRunning) throw new Error("Owned Web tunnel is still running");
    rmSync(ownerFile, { force: true }); rmSync(healthFile, { force: true });
  }
  if (failed) throw new Error("Owned Web tunnel exited; supervisor may restart this component");
}

async function interruptManagedTurn(launch: ManagedLaunchConfig, token: string): Promise<void> {
  const input = await readControlStdin();
  const threadId = input.session_id;
  const turnId = input.turn_id;
  if (input.hook_event_name !== "Interrupt" || typeof threadId !== "string" || typeof turnId !== "string") throw new Error("Interrupt requires exact thread and turn IDs");
  const response = await fetch(`http://127.0.0.1:${launch.port}/admin/interrupt-turn`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ threadId, turnId }), signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`Interrupt failed (${response.status})`);
}
