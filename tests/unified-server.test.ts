import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultConfig } from "../src/config";
import { closeTurnBrokers } from "../src/adapters/chatgpt-web/turn-broker";
import { startServer } from "../src/server";
import { UnifiedRouter, type UnifiedManifest } from "../src/unified-router";
import { buildManagedAppConfig, readManagedLaunchConfig, type ManagedLaunchConfig } from "../src/managed";

const token = "a-private-fixture-control-token-over-32-chars";
const manifest: UnifiedManifest = { schemaVersion: 1, ccwVersion: "5.0.5", revision: "fixture",
  profiles: [{ id: "p", name: "Fixture", protocol: "responses", models: ["cpp/p/model"] }], groups: [],
  models: [{ slug: "cpp/p/model", supported_reasoning_levels: [{ effort: "high" }], cpp_route: { kind: "api", profileId: "p", model: "model" } }] };
const completed = () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "fixture" }] }] });
const body = (model: string, turnId = "turn-1") => JSON.stringify({ model, input: "fixture", stream: false,
  client_metadata: { "x-codex-turn-metadata": JSON.stringify({ thread_id: "thread", turn_id: turnId }) } });

test("managed full gateway keeps official and API HTTP routes available when Web configuration fails", async () => {
  const root = mkdtempSync(join(tmpdir(), "cpp-full-gateway-"));
  const native: Request[] = []; const api: Request[] = [];
  const router = new UnifiedRouter({ apiBase: "http://127.0.0.1:57321", controlToken: token,
    manifest: async () => manifest, execute: async req => { api.push(req); return completed(); } });
  const server = startServer({ ...defaultConfig("full"), purpose: "managed", port: 0, controlToken: token,
    brokerSocketPath: join(root, "broker.sock") }, {
    managed: router, refreshManagedConfig: () => { throw new Error("invalid private Web configuration"); },
    fetchUpstream: async req => { native.push(req); return new URL(req.url).pathname.endsWith("/models")
      ? Response.json({ models: [{ slug: "gpt-5.6-sol", visibility: "list", tool_mode: "code_mode_only", shell_type: "shell_command", context_window: 123456, supported_reasoning_levels: [{ effort: "high" }], multi_agent_version: "v2" }] }) : completed(); },
  });
  const base = `http://127.0.0.1:${server.port}`;
  try {
    const results = await Promise.all(["official", "cpp/p/model"].map(model => fetch(`${base}/v1/responses?client_version=fixture`, {
      method: "POST", headers: { authorization: "Bearer official-fixture", "content-type": "application/json" }, body: body(model, model),
    })));
    for (const response of results) { expect(response.status).toBe(200); await response.text(); }
    expect(native[0]!.headers.get("authorization")).toBe("Bearer official-fixture");
    expect(native[0]!.url).toContain("client_version=fixture");
    expect(api[0]!.headers.get("authorization")).toBe(`Bearer ${token}`);
    const web = await fetch(`${base}/v1/responses`, { method: "POST", headers: { "content-type": "application/json" }, body: body("chatgpt-web/sol/high") });
    expect(web.status).toBe(503); await web.text();
    const catalog = await (await fetch(`${base}/v1/models`, { headers: { authorization: "Bearer official-fixture" } })).json() as any;
    expect(catalog.models.find((row: any) => row.slug === "gpt-5.6-sol").context_window).toBe(123456);
    expect(catalog.models.find((row: any) => row.slug === "gpt-5.6-sol").multi_agent_version).toBe("v2");
    expect(catalog.models.some((row: any) => row.slug === "cpp/p/model")).toBe(true);
    const health = await (await fetch(`${base}/healthz`)).json() as any;
    expect(health.status).toBe("ok"); expect(health.managed_web_config).toBe("invalid");
    expect((await fetch(`${base}/admin/unified`)).status).toBe(401);
    await router.control({ threadId: "thread", model: "gpt-5.6-sol", reasoningEffort: "high" });
    const changed = await fetch(`${base}/v1/responses`, { method: "POST", headers: { authorization: "Bearer official-fixture" }, body: body("gpt-5.6-sol") });
    await changed.text();
    expect((await native.at(-1)!.json() as any).reasoning.effort).toBe("high");
  } finally { await server.stop(true); await closeTurnBrokers(); rmSync(root, { recursive: true, force: true }); }
});

test("HTTP drain and exact-turn interrupt cancel the managed executor stream", async () => {
  const cancellations: string[] = []; let activeId = "";
  let source!: ReadableStreamDefaultController<Uint8Array>;
  const router = new UnifiedRouter({ apiBase: "http://127.0.0.1:57321", controlToken: token, manifest: async () => manifest,
    execute: async req => {
      if (new URL(req.url).pathname.endsWith("/cancel")) { cancellations.push((await req.json() as any).requestId); return Response.json({ status: "cancelled" }); }
      activeId = req.headers.get("x-cpp-request-id")!;
      return new Response(new ReadableStream<Uint8Array>({ start(controller) { source = controller; controller.enqueue(new TextEncoder().encode("data: fixture\n\n")); } }), { headers: { "content-type": "text/event-stream" } });
    } });
  const server = startServer({ ...defaultConfig("browser-only"), purpose: "managed", port: 0, controlToken: token }, { managed: router });
  const base = `http://127.0.0.1:${server.port}`;
  const control = (path: string, value = {}) => fetch(`${base}/admin/${path}`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(value) });
  try {
    const response = await fetch(`${base}/v1/responses`, { method: "POST", body: body("cpp/p/model") });
    const reader = response.body!.getReader(); await reader.read();
    const drain = await (await control("drain")).json() as any;
    expect(drain.active_http_turns).toBe(1);
    const blocked = await fetch(`${base}/v1/responses`, { method: "POST", body: body("cpp/p/model", "next") });
    expect(blocked.status).toBe(503); await blocked.text();
    const interrupt = await control("interrupt-turn", { threadId: "thread", turnId: "turn-1" });
    expect(interrupt.status).toBe(200); await interrupt.text();
    for (let i = 0; i < 100 && !cancellations.length; i++) await Bun.sleep(10);
    expect(cancellations).toContain(activeId);
    await reader.cancel().catch(() => {});
  } finally { try { source.close(); } catch {} await server.stop(true); }
});

test("managed launch contract pins private transport and rejects incompatible owners", () => {
  const root = mkdtempSync(join(tmpdir(), "cpp-managed-contract-"));
  const launch: ManagedLaunchConfig = { schemaVersion: 1, owner: "codex-plusplus", ccwVersion: "5.0.5", profileDir: root,
    apiBase: "http://127.0.0.1:57321", port: 17841, subagentProtocol: "native", runtimeCommand: [process.execPath, join(root, "cli.js")] };
  const file = join(root, "managed-launch.json");
  try {
    writeFileSync(file, JSON.stringify(launch));
    writeFileSync(join(root, "config.json"), JSON.stringify({ port: 1, controlToken: "untrusted", runtimeCommand: ["untrusted"], purpose: "standalone", subagentProtocol: "compatibility-v1", solAvailable: false }));
    const config = buildManagedAppConfig(readManagedLaunchConfig(file), token);
    expect(config.port).toBe(17841); expect(config.controlToken).toBe(token); expect(config.subagentProtocol).toBe("native"); expect(config.solAvailable).toBe(false);
    writeFileSync(file, JSON.stringify({ ...launch, owner: "another-owner" }));
    expect(() => readManagedLaunchConfig(file)).toThrow("incompatible");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("managed profile marker blocks standalone CLI mutations even when selected with --home", () => {
  const root = mkdtempSync(join(tmpdir(), "cpp-managed-cli-"));
  const profile = join(root, "profile"); const codex = join(root, "codex");
  mkdirSync(profile); mkdirSync(codex);
  writeFileSync(join(profile, "managed-launch.json"), "{}");
  const original = 'model = "official-fixture"\n';
  writeFileSync(join(codex, "config.toml"), original);
  try {
    for (const command of ["setup", "doctor", "route", "uninstall", "serve"]) {
      const child = Bun.spawnSync([process.execPath, join(import.meta.dir, "../src/cli.ts"), command, "--home", profile], {
        env: { ...process.env, CODEX_CPP_MANAGED: "0", CODEX_CHATGPT_WEB_HOME: root, CODEX_HOME: codex },
        stdout: "pipe", stderr: "pipe",
      });
      expect(child.exitCode).toBe(1);
      expect(child.stderr.toString()).toContain("Codex++ owns this managed profile");
      expect(readFileSync(join(codex, "config.toml"), "utf8")).toBe(original);
      expect(readdirSync(profile)).toEqual(["managed-launch.json"]);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
