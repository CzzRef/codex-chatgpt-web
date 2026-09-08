const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveLauncherProfile } = require("../electron/profile.cjs");
const { RuntimeHost } = require("../electron/runtime.cjs");
const { RuntimeSupervisor, validateConfig } = require("../electron/runtime-supervisor.cjs");
const { BrowserControlServer } = require("../electron/control-server.cjs");

test("managed helper uses a distinct browser partition and private durable paths", () => {
  const profile = resolveLauncherProfile({ argv: ["electron", "--managed-profile"], env: { CODEX_CHATGPT_WEB_HOME: "/private/cpp-web" }, homeDir: "/home/example", appData: "/app-data" });
  assert.equal(profile.kind, "managed"); assert.equal(profile.userData, "/private/cpp-web/launcher");
  assert.equal(profile.browserPartition, "persist:codex-plus-managed-chatgpt");
  assert.throws(() => resolveLauncherProfile({ argv: ["--managed-profile"], env: { CODEX_CHATGPT_WEB_HOME: "/home/example/.codex" }, homeDir: "/home/example", appData: "/app-data" }), /must not use/);
});

test("managed helper refuses setup and process ownership before touching runtime state", async () => {
  const app = { getPath: () => "/private/cpp-web/launcher", getVersion: () => "5.0.5" };
  const options = { app, logger: { info() {}, warn() {}, error() {} }, sourceRoot: "/fixture", coreHome: "/private/cpp-web", launcherProfile: "managed", browserDescriptorPath: "/private/cpp-web/runtime/browser.json" };
  const supervisor = new RuntimeSupervisor(options);
  const host = new RuntimeHost({ ...options, supervisor });
  await assert.rejects(host.run("fixture", ["setup"]), /Codex\+\+ owns/);
  await assert.rejects(host.runSetup("fixture", ["setup"], {}), /Codex\+\+ owns/);
  await assert.rejects(supervisor.startIfConfigured(), /owned by Codex\+\+/);
  await assert.rejects(supervisor.stopForSetup(), /owned by Codex\+\+/);
  assert.equal(supervisor.daemon, null); assert.equal(supervisor.tunnel, null);
});

test("managed browser operations require the descriptor credential and an exact action", async () => {
  const server = await new BrowserControlServer({ logger: { info() {}, warn() {}, error() {} }, getBrowserHost: () => ({}), getPreferences: () => ({}),
    managedActions: { status: async () => ({ status: "ready", activeTurnCount: 2 }) } }).start();
  const descriptor = server.descriptor();
  try {
    assert.equal((await fetch(`${descriptor.endpoint}/v1/managed/status`, { method: "POST" })).status, 401);
    const response = await fetch(`${descriptor.endpoint}/v1/managed/status`, { method: "POST", headers: { authorization: `Bearer ${descriptor.token}` } });
    assert.deepEqual(await response.json(), { status: "ready", activeTurnCount: 2 });
    assert.equal((await fetch(`${descriptor.endpoint}/v1/managed/constructor`, { method: "POST", headers: { authorization: `Bearer ${descriptor.token}` } })).status, 404);
  } finally { await server.close(); }
});

test("managed Full MCP browser can start before tunnel setup without weakening standalone validation", () => {
  const descriptor = "/private/cpp-web/runtime/browser.json";
  const config = { version: 3, purpose: "managed", releaseVersion: "5.0.5", mode: "full", browserHost: "launcher",
    browserHostDescriptorPath: descriptor, host: "127.0.0.1", port: 17841, controlToken: "a".repeat(64),
    contextWindow: 128000, appName: "Codex Native2", chromeExecutablePath: "/fixture/chrome", storageStatePath: "/private/cpp-web/browser/state.json",
    brokerSocketPath: "/private/cpp-web/runtime/broker.sock", headed: true, solAvailable: true, proAvailable: false,
    autoApproveToolCalls: false, runtimeCommand: ["/fixture/bun", "/fixture/cli.js"] };
  assert.equal(validateConfig(config, descriptor, "darwin", "managed").mode, "full");
  assert.throws(() => validateConfig({ ...config, purpose: undefined }, descriptor, "darwin", "production"), /missing tunnel/);
  assert.throws(() => validateConfig({ ...config, tunnel: {} }, descriptor, "darwin", "managed"), /missing tunnel.binaryPath/);
});
