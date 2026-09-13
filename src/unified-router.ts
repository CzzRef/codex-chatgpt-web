import { randomUUID } from "node:crypto";
import { extractCodexTurnIdentityFromBody } from "./adapters/chatgpt-web/environment";
import { VERSION } from "./version";
import {
  COMPACT_PROMPT, SUMMARY_PREFIX, buildCompactV1Output, decodeCompactionSummary,
  encodeCompactionSummary, extractCompactUserMessages,
} from "./responses/compaction";

type Json = Record<string, any>;
export interface UnifiedManifest {
  schemaVersion: 1;
  ccwVersion: string;
  revision: string;
  models: Json[];
  profiles: { id: string; name: string; protocol: string; models: string[] }[];
  groups: {
    id: string; name: string;
    strategy: "failover" | "conversationRoundRobin" | "requestRoundRobin" | "weightedRoundRobin";
    members: { relayId: string; weight: number }[];
    defaultProfileId?: string | null;
  }[];
}

interface Preference { efforts: Record<string, string>; groups: Record<string, { profileId?: string; selectionMode?: "lastUsed" | "strategy" }>; }
interface Binding {
  threadId: string; turnId: string; model: string; revision: string;
  profileId: string; groupId?: string; candidates: string[]; delivered: boolean;
  supportedEfforts?: string[];
}
export interface UnifiedRoutingState {
  version: 1;
  preferences: Record<string, Preference>;
  bindings: Record<string, Binding>;
  lastUsed: Record<string, string>;
  counters: Record<string, number>;
  nativeCapabilities?: Record<string, string[]>;
}
export interface UnifiedRouterOptions {
  manifest: () => Promise<UnifiedManifest>;
  execute: (request: Request) => Promise<Response>;
  apiBase: string;
  controlToken: string;
  nativeContext?: { contextWindow?: number; autoCompactTokenLimit?: number };
  state?: UnifiedRoutingState;
  persist?: (state: UnifiedRoutingState) => void;
}

export function validateUnifiedManifest(value: unknown): UnifiedManifest {
  const manifest = value as UnifiedManifest;
  if (!manifest || manifest.schemaVersion !== 1 || manifest.ccwVersion !== VERSION
    || typeof manifest.revision !== "string" || !manifest.revision
    || !Array.isArray(manifest.models) || !Array.isArray(manifest.profiles) || !Array.isArray(manifest.groups)
    || manifest.models.length > 20_000 || manifest.profiles.length > 1_000 || manifest.groups.length > 1_000) {
    throw new Error("Unsupported Codex++ routing manifest");
  }
  const slugs = new Set<string>();
  for (const row of manifest.models) {
    if (typeof row.slug !== "string" || !/^(cpp|cpp-agg)\/[^/]+\/.+/.test(row.slug) || slugs.has(row.slug)
      || !row.cpp_route || !["api", "aggregate"].includes(row.cpp_route.kind)) throw new Error("Invalid unified model row");
    slugs.add(row.slug);
  }
  for (const group of manifest.groups) {
    if (!group.id || !Array.isArray(group.members) || !group.members.length
      || group.members.some(m => !Number.isSafeInteger(m.weight) || m.weight < 1 || m.weight > 10_000
        || !manifest.profiles.some(p => p.id === m.relayId))
      || new Set(group.members.map(m => m.relayId)).size !== group.members.length
      || !["failover", "conversationRoundRobin", "requestRoundRobin", "weightedRoundRobin"].includes(group.strategy)) {
      throw new Error("Invalid unified aggregate");
    }
    if (group.defaultProfileId && !group.members.some(m => m.relayId === group.defaultProfileId)) throw new Error("Aggregate default is not a member");
  }
  return manifest;
}

function object(value: unknown): Json | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Json : undefined;
}

export function bindHeaderIdentity(raw: Json, req: Request): void {
  const header = req.headers.get("x-codex-turn-metadata");
  if (!header) return;
  const metadata = object(raw.client_metadata) ?? {};
  const existing = metadata["x-codex-turn-metadata"];
  // Preserve all metadata fields. Reject ambiguous identities instead of joining tasks.
  if (existing !== undefined) {
    const bodyIdentity = extractCodexTurnIdentityFromBody(raw);
    const headerIdentity = extractCodexTurnIdentityFromBody({ client_metadata: { "x-codex-turn-metadata": header } });
    if (bodyIdentity.threadId !== headerIdentity.threadId || bodyIdentity.turnId !== headerIdentity.turnId) {
      throw new Error("Conflicting Codex turn identity");
    }
  } else raw.client_metadata = { ...metadata, "x-codex-turn-metadata": header };
}

/** Decode only bridge-readable history; opaque cross-backend state is never silently dropped. */
export function normalizeUnifiedApiInput(input: unknown): unknown {
  if (!Array.isArray(input)) return input;
  return input.map(item => {
    if (!object(item)) return item;
    if (item.type === "compaction") {
      const summary = typeof item.encrypted_content === "string" ? decodeCompactionSummary(item.encrypted_content) : null;
      if (!summary?.trim() || encodeCompactionSummary(summary) !== item.encrypted_content) throw new Error("This API model cannot read the encrypted compaction history; start an independent task");
      return { type: "message", role: "user", content: [{ type: "input_text", text: `${SUMMARY_PREFIX}\n\n${summary}` }] };
    }
    if (item.encrypted_content || (Array.isArray(item.encrypted_function_args) && item.encrypted_function_args.length)) {
      throw new Error("This API model cannot read opaque cross-backend history; start an independent task");
    }
    return item;
  });
}

function supportedEfforts(row: Json): string[] {
  return Array.isArray(row.supported_reasoning_levels)
    ? row.supported_reasoning_levels.map((level: unknown) => typeof level === "string" ? level : object(level)?.effort).filter((v: unknown): v is string => typeof v === "string") : [];
}

function key(...parts: string[]): string { return JSON.stringify(parts); }

function safeIdentity(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 256 || ["__proto__", "constructor", "prototype"].includes(value)) throw new Error(`${name} is required`);
  return value;
}

export class UnifiedRouter {
  private readonly state: UnifiedRoutingState;
  private readonly busy = new Set<string>();
  private catalog: Json[] = [];
  private currentManifest?: UnifiedManifest;

  constructor(private readonly options: UnifiedRouterOptions) {
    const base = new URL(options.apiBase);
    if (base.protocol !== "http:" || base.hostname !== "127.0.0.1" || !base.port || base.username || base.password || base.search || base.hash
      || !["", "/"].includes(base.pathname)) throw new Error("Codex++ executor must be an explicit loopback origin");
    if (options.controlToken.length < 32) throw new Error("Managed control credential is missing");
    if (options.state && options.state.version !== 1) throw new Error("Unsupported unified routing state");
    this.state = options.state ?? { version: 1, preferences: {}, bindings: {}, lastUsed: {}, counters: {} };
  }

  private save(): void { this.options.persist?.(this.state); }

  private async manifest(): Promise<UnifiedManifest> {
    this.currentManifest = validateUnifiedManifest(await this.options.manifest());
    return this.currentManifest;
  }

  async mergeCatalog(catalog: Json): Promise<Json> {
    const manifest = await this.manifest();
    const native = structuredClone(Array.isArray(catalog.models) ? catalog.models : []);
    for (const row of native) {
      if (typeof row.slug !== "string" || row.slug.startsWith("chatgpt-web/")) continue;
      const override = this.options.nativeContext;
      if (override?.contextWindow) { row.context_window = override.contextWindow; row.max_context_window = Math.max(row.max_context_window || 0, override.contextWindow); }
      if (override?.autoCompactTokenLimit) row.auto_compact_token_limit = override.autoCompactTokenLimit;
    }
    const seen = new Set(native.map(row => row.slug));
    this.catalog = [...native, ...manifest.models.filter(row => !seen.has(row.slug))];
    this.state.nativeCapabilities = Object.fromEntries(native.filter(row => typeof row.slug === "string" && !row.slug.startsWith("chatgpt-web/")).map(row => [row.slug, supportedEfforts(row)]));
    this.save();
    return { ...catalog, models: this.catalog, cpp_manifest_revision: manifest.revision };
  }

  async status(): Promise<Json> {
    const manifest = await this.manifest();
    return { schemaVersion: 1, revision: manifest.revision, profiles: manifest.profiles, groups: manifest.groups,
      models: [...this.catalog.filter(row => !/^(cpp|cpp-agg)\//.test(row.slug)), ...manifest.models], preferences: this.state.preferences,
      turns: Object.values(this.state.bindings).slice(-100).map(({ candidates: _, ...binding }) => binding),
      activeRequests: this.busy.size };
  }

  async control(value: unknown): Promise<Json> {
    const command = object(value);
    if (!command) throw new Error("Invalid unified control request");
    const threadId = safeIdentity(command.threadId, "threadId");
    const manifest = await this.manifest();
    const preference = structuredClone(this.state.preferences[threadId] ?? { efforts: {}, groups: {} });
    if (command.reasoningEffort !== undefined) {
      const model = safeIdentity(command.model, "model");
      const row = manifest.models.find(row => row.slug === model) ?? this.catalog.find(row => row.slug === model);
      const levels = row ? supportedEfforts(row) : this.state.nativeCapabilities?.[model];
      if (!levels) throw new Error("Load the model catalog before changing reasoning effort");
      if (model.startsWith("chatgpt-web/")) throw new Error("Web effort is fixed by its model row; select the Web mode in the model picker for the next turn");
      if (command.reasoningEffort === null) delete preference.efforts[model];
      else if (levels.includes(command.reasoningEffort)) preference.efforts[model] = command.reasoningEffort;
      else throw new Error("The selected model does not support that reasoning effort");
    }
    if (command.groupId !== undefined) {
      const group = manifest.groups.find(group => group.id === command.groupId);
      if (!group) throw new Error("Unknown aggregate group");
      const selection = { ...preference.groups[group.id] };
      if (command.profileId === null) delete selection.profileId;
      else if (command.profileId !== undefined) {
        if (!group.members.some(member => member.relayId === command.profileId)) throw new Error("Provider is not a member of the group");
        selection.profileId = command.profileId;
      }
      if (command.selectionMode !== undefined) {
        if (!["lastUsed", "strategy"].includes(command.selectionMode)) throw new Error("Invalid aggregate selection mode");
        selection.selectionMode = command.selectionMode;
      }
      preference.groups[group.id] = selection;
    }
    if (!this.state.preferences[threadId] && Object.keys(this.state.preferences).length >= 4096) throw new Error("Unified thread preference limit reached");
    this.state.preferences[threadId] = preference;
    this.save();
    return { status: "ok", effortApplies: "next_request", providerApplies: "next_turn", preference };
  }

  private select(manifest: UnifiedManifest, raw: Json, threadId?: string, turnId?: string): Binding {
    const bindingKey = threadId && turnId ? key(threadId, turnId) : undefined;
    const prior = bindingKey ? this.state.bindings[bindingKey] : undefined;
    if (prior) {
      if (prior.model !== raw.model) throw new Error("A turn cannot change model or provider after it has started");
      return prior;
    }
    const row = manifest.models.find(row => row.slug === raw.model);
    if (!row) throw new Error("Unknown unified model; refresh the model list");
    const route = row.cpp_route;
    if (route.kind === "aggregate") {
      safeIdentity(threadId, "Canonical thread_id"); safeIdentity(turnId, "Canonical turn_id");
    }
    let profileId = route.profileId;
    let candidates: string[] = [profileId];
    if (route.kind === "aggregate") {
      const group = manifest.groups.find(g => g.id === route.groupId);
      if (!group) throw new Error("Unknown aggregate");
      const preference = this.state.preferences[threadId!]?.groups[group.id];
      const members = group.members.map(m => m.relayId);
      const lastUsed = preference?.selectionMode !== "strategy" ? this.state.lastUsed[key(threadId!, group.id)] : undefined;
      const preferred = preference?.profileId ?? (preference?.selectionMode === "strategy" ? undefined : lastUsed ?? group.defaultProfileId);
      if (preferred && !members.includes(preferred)) throw new Error("Saved aggregate selection is no longer a member; choose a provider again");
      if (preferred) profileId = preferred;
      else {
        const counterKey = key(group.id, manifest.revision);
        const counter = this.state.counters[counterKey] ?? 0;
        if (group.strategy === "weightedRoundRobin") {
          let offset = counter % group.members.reduce((sum, member) => sum + member.weight, 0);
          profileId = group.members.find(member => { if (offset < member.weight) return true; offset -= member.weight; return false; })!.relayId;
        } else if (group.strategy === "conversationRoundRobin") {
          const conversationKey = key(threadId!, group.id, manifest.revision);
          profileId = this.state.lastUsed[conversationKey] ?? members[counter % members.length];
          if (!this.state.lastUsed[conversationKey]) this.state.counters[counterKey] = counter + 1;
          this.state.lastUsed[conversationKey] = profileId;
        } else profileId = members[group.strategy === "failover" ? 0 : counter % members.length];
        if (["requestRoundRobin", "weightedRoundRobin"].includes(group.strategy)) this.state.counters[counterKey] = counter + 1;
      }
      candidates = [profileId, ...members.filter(id => id !== profileId)];
    }
    if (!manifest.profiles.some(p => p.id === profileId)) throw new Error("Unknown API provider");
    const binding: Binding = { threadId: threadId ?? "", turnId: turnId ?? "", model: raw.model,
      revision: manifest.revision, profileId, candidates, delivered: false, supportedEfforts: supportedEfforts(row),
      ...(route.kind === "aggregate" ? { groupId: route.groupId } : {}) };
    if (bindingKey) {
      // Retain exact turn bindings across restarts. Never evict and silently rebind a turn.
      if (Object.keys(this.state.bindings).length >= 20_000) throw new Error("Unified turn binding limit reached; archive routing state before new turns");
      this.state.bindings[bindingKey] = binding;
      this.save();
    }
    return binding;
  }

  /** Native and Web return undefined; API models are handled without touching the native Bearer. */
  async request(req: Request, raw: Json, endpoint: "responses" | "responses/compact"): Promise<Response | undefined> {
    bindHeaderIdentity(raw, req);
    const identity = extractCodexTurnIdentityFromBody(raw);
    const isApi = typeof raw.model === "string" && /^(cpp|cpp-agg)\//.test(raw.model);
    const manifest = isApi ? await this.manifest() : undefined;
    const binding = manifest ? this.select(manifest, raw, identity.threadId, identity.turnId) : undefined;
    const effort = identity.threadId ? this.state.preferences[identity.threadId]?.efforts[raw.model] : undefined;
    if (effort) {
      const levels = binding?.supportedEfforts ?? (binding ? undefined : this.state.nativeCapabilities?.[raw.model]);
      if (!levels?.includes(effort)) throw new Error("Saved reasoning effort is unsupported by the bound model; refresh the model list or start a new turn");
      raw.reasoning = { ...object(raw.reasoning), effort };
    }
    if (!binding) return undefined;
    const requestKey = identity.threadId && identity.turnId ? key(identity.threadId, identity.turnId) : randomUUID();
    if (this.busy.has(requestKey)) throw new Error("Another HTTP request is already active for this Codex turn");
    this.busy.add(requestKey);
    let executorRequestId = randomUUID();
    const cancelExecutor = () => {
      void this.options.execute(new Request(`${this.options.apiBase}/internal/unified/cancel`, {
        method: "POST", headers: { authorization: `Bearer ${this.options.controlToken}`, "content-type": "application/json" },
        body: JSON.stringify({ requestId: executorRequestId }), signal: AbortSignal.timeout(2500),
      })).then(response => response.body?.cancel()).catch(() => {});
    };
    req.signal.addEventListener("abort", cancelExecutor, { once: true });
    const release = () => { this.busy.delete(requestKey); req.signal.removeEventListener("abort", cancelExecutor); };
    let streamOwnsRelease = false;
    try {
      const input = normalizeUnifiedApiInput(raw.input);
      const triggers = Array.isArray(input) ? input.filter(item => item?.type === "compaction_trigger") : [];
      if (triggers.length && (triggers.length !== 1 || !Array.isArray(input) || input.at(-1)?.type !== "compaction_trigger")) throw new Error("Invalid compaction trigger placement");
      const compaction = endpoint === "responses/compact" || triggers.length > 0;
      const upstreamModel = binding.model.split("/").slice(2).join("/");
      const body: Json = { ...raw, model: upstreamModel, input };
      if (compaction) {
        Object.assign(body, { input: Array.isArray(input) ? input.filter(item => item?.type !== "compaction_trigger") : input,
          instructions: COMPACT_PROMPT, tools: [], tool_choice: "none", parallel_tool_calls: false, stream: false, store: false });
        delete body.previous_response_id;
        delete body.include;
      }
      const candidates = binding.delivered ? [binding.profileId] : binding.candidates;
      let response: Response | undefined;
      for (const profileId of candidates) {
        executorRequestId = randomUUID();
        req.signal.throwIfAborted();
        const headers = new Headers(req.headers);
        for (const name of ["host", "content-length", "content-encoding", "connection", "authorization", "cookie", "openai-organization", "openai-project", "chatgpt-account-id"]) headers.delete(name);
        headers.set("authorization", `Bearer ${this.options.controlToken}`);
        headers.set("x-cpp-profile-id", profileId);
        headers.set("x-cpp-manifest-revision", binding.revision);
        headers.set("x-cpp-request-id", executorRequestId);
        headers.set("content-type", "application/json");
        try {
          response = await this.options.execute(new Request(`${this.options.apiBase}/internal/unified/responses`, {
            method: "POST", headers, body: JSON.stringify(body), signal: req.signal,
          }));
        } catch (error) {
          if (req.signal.aborted) throw error;
          if (profileId === candidates.at(-1)) throw Object.assign(new Error("Codex++ API executor is unavailable"), { status: 502 });
          continue;
        }
        if (response.ok) {
          binding.profileId = profileId;
          // Commit conservatively at successful headers: stream errors can never replay tools.
          binding.delivered = true;
          if (binding.groupId) this.state.lastUsed[key(binding.threadId, binding.groupId)] = profileId;
          this.save();
          break;
        }
        if (profileId !== candidates.at(-1)) await response.body?.cancel();
      }
      if (!response) throw new Error("Codex++ API executor is unavailable");
      if (compaction && response.ok) {
        const summary = await compactionSummary(response).catch(error => { throw Object.assign(new Error(error instanceof Error ? error.message : "API compaction failed"), { status: 502 }); });
        if (endpoint === "responses/compact") return Response.json({ output: buildCompactV1Output(extractCompactUserMessages(raw.input), summary) });
        return compactV2Response(summary, raw.stream === true, raw.model);
      }
      if (!response.body) return response;
      const reader = response.body.getReader();
      streamOwnsRelease = true;
      return new Response(new ReadableStream<Uint8Array>({
        async pull(controller) {
          try { const { value, done } = await reader.read(); if (done) { release(); controller.close(); } else controller.enqueue(value); }
          catch (error) { release(); controller.error(error); }
        },
        async cancel(reason) { cancelExecutor(); release(); await reader.cancel(reason); },
      }), { status: response.status, statusText: response.statusText, headers: response.headers });
    } finally { if (!streamOwnsRelease) release(); }
  }
}

async function compactionSummary(response: Response): Promise<string> {
  let result: Json | undefined;
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    // A provider may force SSE even for a unary request. Only a completed response is a checkpoint.
    const text = await response.text();
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const event = JSON.parse(data);
      if (["error", "response.failed", "response.incomplete"].includes(event.type)) throw new Error("API compaction did not complete");
      if (event.type === "response.completed") result = event.response;
    }
  } else result = await response.json() as Json;
  if (!result || result.status !== "completed" || !Array.isArray(result.output)
    || result.output.some((item: Json) => /tool|function_call/.test(item.type))) throw new Error("API compaction did not return a completed summary");
  const summary = result.output.flatMap((item: Json) => item.type === "message" && Array.isArray(item.content)
    ? item.content.filter((part: Json) => part.type === "output_text").map((part: Json) => part.text) : []).join("\n");
  if (!summary.trim()) throw new Error("API compaction returned an empty summary");
  return summary;
}

function compactV2Response(summary: string, stream: boolean, model: string): Response {
  const item = { type: "compaction", id: `cmp_${randomUUID()}`, encrypted_content: encodeCompactionSummary(summary) };
  const response = { id: `resp_${randomUUID()}`, object: "response", created_at: Math.floor(Date.now() / 1000), status: "completed", model, output: [item], usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } };
  if (!stream) return Response.json(response);
  const events = [
    { type: "response.created", response: { ...response, status: "in_progress", output: [] } },
    { type: "response.output_item.added", output_index: 0, item },
    { type: "response.output_item.done", output_index: 0, item },
    { type: "response.completed", response },
  ];
  return new Response(events.map((event, sequence_number) => `event: ${event.type}\ndata: ${JSON.stringify({ ...event, sequence_number })}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
  });
}
