import { expect, test } from "bun:test";
import { UnifiedRouter, bindHeaderIdentity, normalizeUnifiedApiInput, type UnifiedManifest, type UnifiedRoutingState } from "../src/unified-router";
import { VERSION } from "../src/version";
import { decodeCompactionSummary, encodeCompactionSummary } from "../src/responses/compaction";

const token = "local-control-credential-with-32-characters";
function manifest(): UnifiedManifest {
  const row = (slug: string, route: object) => ({ slug, supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }], cpp_route: route });
  return { schemaVersion: 1, ccwVersion: VERSION, revision: "revision-1",
    profiles: ["a", "b"].map(id => ({ id, name: id, protocol: "responses", models: [`cpp/${id}/model`] })),
    groups: ["g1", "g2"].map(id => ({ id, name: id, strategy: "requestRoundRobin", members: [{ relayId: "a", weight: 1 }, { relayId: "b", weight: 2 }] })),
    models: [row("cpp/a/model", { kind: "api", profileId: "a", model: "model" }), row("cpp/b/model", { kind: "api", profileId: "b", model: "model" }),
      ...["g1", "g2"].map(groupId => row(`cpp-agg/${groupId}/model`, { kind: "aggregate", groupId, model: "model" }))] };
}
function request(model = "cpp-agg/g1/model", threadId = "thread", turnId = "turn", extra: Record<string, unknown> = {}) {
  const raw: Record<string, any> = { model, input: [{ role: "user", content: "hello" }], stream: false,
    client_metadata: { "x-codex-turn-metadata": JSON.stringify({ thread_id: threadId, turn_id: turnId, parent_thread_id: "parent", request_kind: "turn" }) }, ...extra };
  const req = new Request("http://127.0.0.1:17841/v1/responses?client_version=1.2.3", { method: "POST", headers: { authorization: "Bearer native-private-token", "chatgpt-account-id": "native-account", "x-client-request-id": "request-identity" }, body: JSON.stringify(raw) });
  return { req, raw };
}
function completed(text = "summary") { return Response.json({ status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] }); }
function router(execute: (request: Request) => Promise<Response>, other: Partial<ConstructorParameters<typeof UnifiedRouter>[0]> = {}) {
  return new UnifiedRouter({ manifest: async () => manifest(), execute: req => new URL(req.url).pathname.endsWith("/cancel") ? Promise.resolve(Response.json({status:"cancelled"})) : execute(req), apiBase: "http://127.0.0.1:57321", controlToken: token, ...other });
}
async function run(r: UnifiedRouter, model?: string, thread?: string, turn?: string, extra?: Record<string, unknown>) {
  const { req, raw } = request(model, thread, turn, extra);
  const response = await r.request(req, raw, "responses");
  await response?.text();
  return response;
}

test("API routes use local control auth and exact profile while retaining identity", async () => {
  const r = router(async req => {
    expect(req.headers.get("authorization")).toBe(`Bearer ${token}`);
    expect(req.headers.get("chatgpt-account-id")).toBeNull();
    expect(req.headers.get("x-client-request-id")).toBe("request-identity");
    expect(req.headers.get("x-cpp-profile-id")).toBe("b");
    const body = await req.json() as Record<string, any>;
    expect(body.model).toBe("model");
    expect(JSON.parse(body.client_metadata["x-codex-turn-metadata"]).parent_thread_id).toBe("parent");
    return completed();
  });
  expect((await run(r, "cpp/b/model"))?.status).toBe(200);
});

test("aggregate is stable within a turn and independent across groups and threads", async () => {
  const selected: string[] = [];
  const r = router(async req => { selected.push(req.headers.get("x-cpp-profile-id")!); return completed(); });
  await r.control({ threadId: "t1", groupId: "g1", selectionMode: "strategy" });
  await run(r, "cpp-agg/g1/model", "t1", "turn1");
  await run(r, "cpp-agg/g1/model", "t1", "turn1", { input: [{ type: "function_call_output", call_id: "tool", output: "result" }] });
  await run(r, "cpp-agg/g2/model", "t2", "turn1");
  await run(r, "cpp-agg/g1/model", "t1", "turn2");
  expect(selected).toEqual(["a", "a", "a", "b"]);
});

test("last-used is the default and manual changes apply to the next turn", async () => {
  const selected: string[] = [];
  const r = router(async req => { selected.push(req.headers.get("x-cpp-profile-id")!); return completed(); });
  await run(r);
  await r.control({ threadId: "thread", groupId: "g1", profileId: "b" });
  await run(r);
  await run(r, undefined, undefined, "next");
  await r.control({ threadId: "thread", groupId: "g1", profileId: null });
  await run(r, undefined, undefined, "next-next");
  expect(selected).toEqual(["a", "a", "b", "b"]);
});

test("weighted strategy advances per turn and respects each group revision", async () => {
  const selected: string[] = [];
  const value = manifest(); value.groups[0]!.strategy = "weightedRoundRobin";
  const r = router(async req => { selected.push(req.headers.get("x-cpp-profile-id")!); return completed(); }, { manifest: async () => value });
  await r.control({ threadId: "thread", groupId: "g1", selectionMode: "strategy" });
  for (const turn of ["1", "1", "2", "3", "4"]) await run(r, undefined, undefined, turn);
  expect(selected).toEqual(["a", "a", "b", "b", "a"]);
});

test("missing canonical aggregate identity and model switches fail closed", async () => {
  const r = router(async () => completed());
  const { req, raw } = request(); delete raw.client_metadata;
  await expect(r.request(req, raw, "responses")).rejects.toThrow("thread_id");
  await run(r);
  await expect(run(r, "cpp/b/model")).rejects.toThrow("cannot change");
});

test("fallback before response delivery is permitted, later failures never replay", async () => {
  const selected: string[] = [];
  let first = true;
  const r = router(async req => {
    const id = req.headers.get("x-cpp-profile-id")!; selected.push(id);
    if (id === "a" || !first) return new Response("unavailable", { status: 503 });
    first = false; return completed();
  });
  await run(r);
  expect((await run(r))?.status).toBe(503);
  expect(selected).toEqual(["a", "b", "b"]);
});

test("binding survives a gateway restart and a changed catalog revision", async () => {
  let saved: UnifiedRoutingState | undefined;
  const first = router(async () => completed(), { persist: state => { saved = structuredClone(state); } });
  await first.control({ threadId: "thread", groupId: "g1", profileId: "b" }); await run(first);
  const value = manifest(); value.revision = "new-revision"; value.groups[0]!.defaultProfileId = "a";
  const second = router(async req => { expect(req.headers.get("x-cpp-profile-id")).toBe("b"); return completed(); }, { state: saved, manifest: async () => value });
  await run(second);
});

test("effort changes leave the active HTTP request intact and affect the next request", async () => {
  const efforts: unknown[] = [];
  let invocation = 0;
  const r = router(async req => {
    efforts.push((await req.json() as Record<string, any>).reasoning?.effort);
    return ++invocation === 1 ? new Response(new ReadableStream()) : completed();
  });
  await r.mergeCatalog({ models: [] });
  const { req, raw } = request("cpp/a/model", "thread", "turn", { reasoning: { effort: "low" } });
  const active = await r.request(req, raw, "responses");
  await r.control({ threadId: "thread", model: "cpp/a/model", reasoningEffort: "high" });
  expect(efforts).toEqual(["low"]);
  await active!.body!.cancel();
  await run(r, "cpp/a/model");
  expect(efforts).toEqual(["low", "high"]);
  await expect(r.control({ threadId: "thread", model: "cpp/a/model", reasoningEffort: "max" })).rejects.toThrow("does not support");
});

test("native effort uses the catalog while Web immutable modes remain next-turn choices", async () => {
  const r = router(async () => { throw new Error("Native must not use API executor"); });
  await r.mergeCatalog({ models: [{ slug: "native", supported_reasoning_levels: [{ effort: "high" }] }, { slug: "chatgpt-web/sol/high" }] });
  await r.control({ threadId: "thread", model: "native", reasoningEffort: "high" });
  const { req, raw } = request("native");
  expect(await r.request(req, raw, "responses")).toBeUndefined();
  expect(raw.reasoning.effort).toBe("high");
  await expect(r.control({ threadId: "thread", model: "chatgpt-web/sol/high", reasoningEffort: "high" })).rejects.toThrow("next turn");
});

test("API compaction v1 uses tools-disabled summarization and readable replacement history", async () => {
  const r = router(async req => {
    const body = await req.json() as Record<string, any>;
    expect(body.tools).toEqual([]); expect(body.tool_choice).toBe("none"); expect(body.stream).toBe(false);
    expect(body.input[0].content[0].text).toContain("old checkpoint");
    return completed("new checkpoint");
  });
  const { req, raw } = request("cpp/a/model", "thread", "compact", { tools: [{ type: "function", name: "write_file" }], input: [{ type: "compaction", encrypted_content: encodeCompactionSummary("old checkpoint") }, { role: "user", content: "continue" }] });
  const response = await r.request(req, raw, "responses/compact");
  const result = await response!.json() as Record<string, any>;
  expect(result.output.at(-1).role).toBe("user");
  expect(JSON.stringify(result)).toContain("new checkpoint");
  expect(result.output.some((item: Record<string, any>) => item.type === "compaction")).toBe(false);
});

test("API compaction v2 returns exactly one transparent item in the completed SSE", async () => {
  const r = router(async () => completed("checkpoint"));
  const { req, raw } = request("cpp/a/model", "thread", "compact", { stream: true, input: [{ type: "compaction_trigger" }] });
  const response = await r.request(req, raw, "responses");
  const frames = (await response!.text()).split("\n").filter(line => line.startsWith("data:")).map(line => JSON.parse(line.slice(5)));
  const final = frames.find(frame => frame.type === "response.completed").response;
  expect(final.output).toHaveLength(1);
  expect(final.output[0].type).toBe("compaction");
  expect(decodeCompactionSummary(final.output[0].encrypted_content)).toBe("checkpoint");
  expect(frames.some(frame => frame.type === "response.output_text.delta")).toBe(false);
});

test("opaque history and unsuccessful compaction never become replacement history", async () => {
  expect(() => normalizeUnifiedApiInput([{ type: "compaction", encrypted_content: "opaque" }])).toThrow("cannot read");
  const r = router(async () => Response.json({ status: "incomplete", output: [] }));
  const { req, raw } = request("cpp/a/model");
  await expect(r.request(req, raw, "responses/compact")).rejects.toThrow("completed summary");
});

test("header identity is preserved and conflicting authority is rejected", () => {
  const { raw } = request();
  expect(() => bindHeaderIdentity(raw, new Request("http://127.0.0.1", { headers: { "x-codex-turn-metadata": JSON.stringify({ thread_id: "other", turn_id: "turn" }) } }))).toThrow("Conflicting");
  const headerOnly: Record<string, any> = { client_metadata: { keep: "yes" } };
  bindHeaderIdentity(headerOnly, new Request("http://127.0.0.1", { headers: { "x-codex-turn-metadata": JSON.stringify({ thread_id: "thread", turn_id: "turn" }) } }));
  expect(headerOnly.client_metadata.keep).toBe("yes");
});

test("native and API effort preferences survive a restart before model catalog refresh", async () => {
  let saved: UnifiedRoutingState | undefined;
  const first = router(async () => completed(), { persist: state => { saved = structuredClone(state); } });
  await first.mergeCatalog({ models: [{ slug: "native", supported_reasoning_levels: [{ effort: "high" }] }] });
  for (const model of ["native", "cpp/a/model"]) await first.control({ threadId: "thread", model, reasoningEffort: "high" });
  const second = router(async req => { expect((await req.json() as any).reasoning.effort).toBe("high"); return completed(); }, { state: saved });
  await run(second, "cpp/a/model");
  const { req, raw } = request("native");
  await second.request(req, raw, "responses");
  expect(raw.reasoning.effort).toBe("high");
});

test("removed catalog rows cannot change an existing bound turn", async () => {
  const value = manifest();
  const calls: string[] = [];
  const r = router(async req => { calls.push(req.headers.get("x-cpp-manifest-revision")!); return completed(); }, { manifest: async () => value });
  await run(r, "cpp/a/model");
  value.models = value.models.filter(row => row.slug !== "cpp/a/model"); value.revision = "new";
  await run(r, "cpp/a/model");
  expect(calls).toEqual(["revision-1", "revision-1"]);
  await expect(run(r, "cpp/a/model", "thread", "next")).rejects.toThrow("Unknown unified model");
});

test("group defaults are a next-turn fallback and explicit strategy remains available", async () => {
  const value = manifest(); value.groups[0]!.defaultProfileId = "b";
  const calls: string[] = [];
  const r = router(async req => { calls.push(req.headers.get("x-cpp-profile-id")!); return completed(); }, { manifest: async () => value });
  await run(r);
  await r.control({ threadId: "thread", groupId: "g1", selectionMode: "strategy" });
  await run(r, undefined, undefined, "next");
  expect(calls).toEqual(["b", "a"]);
});

test("malformed transparent compaction data is rejected before executing an API call", () => {
  for (const encrypted_content of ["ocx1:YQ==garbage", "ocx1:////", "ocx1:!!!!"]) {
    expect(() => normalizeUnifiedApiInput([{ type: "compaction", encrypted_content }])).toThrow("cannot read");
  }
});

test("native context overrides do not replace Web or API model limits", async () => {
  const r = router(async () => completed(), { nativeContext: { contextWindow: 600000, autoCompactTokenLimit: 500000 } });
  const catalog = await r.mergeCatalog({ models: [{ slug: "native", context_window: 200000 }, { slug: "chatgpt-web/sol/high", context_window: 128000, auto_compact_token_limit: 110000 }] });
  expect(catalog.models[0].context_window).toBe(600000);
  expect(catalog.models[1].context_window).toBe(128000);
  expect(catalog.models[1].auto_compact_token_limit).toBe(110000);
  expect(catalog.models.find((row: any) => row.slug === "cpp/a/model").context_window).toBeUndefined();
});
