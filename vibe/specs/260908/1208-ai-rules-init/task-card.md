# Task Card

> Standard non-requirement work only.

Tool: cursor
Date: 2026-09-08
Task: 1208-ai-rules-init

## Task Documentation Sync Group

- Group key: `dsg:codex-chatgpt-web:1208-ai-rules-init`
- Group owner: this `task-card.md`
- Git document prefixes: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc`, `vibe/`
- Durable document members: adapters, `vibe/rules/*`, `vibe/specs/*`, `vibe/knowledge/*`; CodeNote `vibe/knowledge/project-index.json` and ignored `workspace.local.json`
- Declared code/config dependencies: none (read-only on application source)
- Linked current/canonical/rule/memory authorities: CodeNote starter-kit, configure-agent-ecosystem project-rules, wechat-download-api / GitFork/codex-host adapter shape, this hub
- Excluded unrelated dirty documents: CodeNote mixed dirty tree except the catalog row and hub row for this project
- Lookup contract: `get --lookup-only` returns `present/freshness=unchecked`; only `check status=hit` may reuse the gate.

```json documentation-sync-group-v1
{
  "schema": "documentation-sync-group-v1",
  "group_key": "dsg:codex-chatgpt-web:1208-ai-rules-init",
  "group_owner": "vibe/specs/260908/1208-ai-rules-init/task-card.md",
  "documents": [
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules/project.mdc",
    "vibe/rules/README.md",
    "vibe/rules/local-context.md",
    "vibe/rules/project.md",
    "vibe/rules/workflow.md",
    "vibe/rules/knowledge.md",
    "vibe/rules/documentation.md",
    "vibe/specs/README.md",
    "vibe/specs/PROJECT_STATUS.md",
    "vibe/specs/260908/1208-ai-rules-init/task-card.md",
    "vibe/specs/260908/1208-ai-rules-init/changes.md",
    "vibe/knowledge/README.md",
    "vibe/knowledge/architecture.md",
    "vibe/knowledge/adr/README.md",
    "vibe/knowledge/error-memory/README.md"
  ],
  "dependencies": ["docs/architecture.md", "docs/security-model.md", "package.json"],
  "validators": [],
  "git_scope_prefixes": ["AGENTS.md", "CLAUDE.md", ".cursor/rules/project.mdc", "vibe"]
}
```

## Goal And Scope

- Goal: place the CzzRef fork at the GitFork checkout, make `czz-dev` the local working branch, and initialize the CodeNote adapter/rule/knowledge/process chain.
- In scope: clone; `origin`/`upstream`; local `czz-dev`; short adapters; `vibe/rules`; `vibe/knowledge`; `vibe/specs`; CodeNote catalog + this-host binding; project-rules publication.
- Out of scope: application code; live launcher / ChatGPT / tunnel; `bun install` / app tests; commit/push; sending `vibe/` upstream; Home/Hook/MCP machine apply.
- Success evidence: checkout exists on `czz-dev`; project audit green; adapters route to CodeNote master or portable projections; resolver `--project codex-chatgpt-web` matches this clone.

## Decision

- Documentation level: `standard`
- Execution: `main-only`
- Automation lane: `not-applicable`
- Key decision and reason: apply the current starter-kit + project-rules publisher used by wechat-download-api / GitFork/codex-host; do not copy VibeAi body; do not enable intent-note, design-preference, or AI-DB; keep upstream `docs/` as product authority.
- High-risk / DB boundary: none; no SQL; no live Codex config write.
- Plan-mode preflight completed before first edit: `yes`
- Plan artifact scope and documentation impact: `project-current`
- Verification map: absent — static analysis
- Provisional `VerificationImpactTrace` completed before verification commands: `yes`
- Verification-command provenance: `impact-trace`
- Test additions/execution: impact-selected only; no separate user enumeration required

## Prior Task Overlap

- Relationship: `reference-only`
- Prior authority and verified state: wechat-download-api `260824/1404-wechat-api-rules-init` and GitFork/codex-host `260901/2034-ai-rules-init` already encode the downstream adapter shape.
- Document governance: this repository had no `AGENTS.md` / `vibe/` tree before this task.
- Execution logic verification / residual gates: CodeNote catalog had no `codex-chatgpt-web` row.
- Traceability and decision: `new-task` with template delta (do not rerun those migrations).

## Documentation Realization

- not applicable (initialization, not a runtime/rule correction)

## Optimization And Template Propagation

- Optimization promotion: `not-applicable`
- Applied project/template impact: this root only; starter-kit unchanged
- Parent task / excluded roots: none

## Rule Task Trace

- Registry scope: `project-local / not-admitted`
- Registry identity / row: none
- Requirement and implementation authority: this task card + project rules
- Propagation / delegation / Root acceptance: project-local

## Work And Verification

- Changed surface: clone + czz-dev; adapters; new vibe tree; CodeNote project-index + workspace binding
- Verification: project-mode AI rule audit; authored-file code-link audit; resolver `--project codex-chatgpt-web`
- Unverified gaps: live launcher, ChatGPT, MCP, `bun test`, commit/push

### Verification Decision

- Route: `static`
- Reason: docs/rules only; no executable behavior change
- Impact source and freshness: inspected 2026-09-08 source tree at `0b053b6`
- Plan verification clauses reconciled before execution: `yes`
- Affected modules / boundaries: adapters, vibe tree, CodeNote catalog
- Checked: clone remotes and `czz-dev` at `0b053b6`; `audit_ai_rules.py --mode project` (2 inherited official-entry findings, same as wechat-download-api / GitFork/codex-host); authored vibe/adapter code-link suffixes; resolver path
- Skipped: `bun test`; live launcher; doctor; package; generated-file CodeNote-relative fragments
- Full-suite escalation: `none`
- Owner: this task card
- Residual risk: application runtime unproven

### Verification Impact Trace

| Changed surface / claim | Direct consumers | Material transitive or failure boundary | Selected evidence | Skipped suites / reason | Outcome / residual |
| --- | --- | --- | --- | --- | --- |
| GitFork clone + `czz-dev` | later implementation tasks | wrong remote or branch | `git remote -v`; `czz-dev` == `0b053b6` | push — not authorized | pending closeout |
| New short adapters / `vibe/rules` | future agents in this repo | broken relative link to CodeNote master | `audit_ai_rules.py --mode project` | app tests — no behavior change | 2 inherited official-entry findings |
| CodeNote `project-index.json` | workspace resolver | invalid identity/markers | resolver `--project codex-chatgpt-web` | full master audit — catalog row only | resolves to this clone |
| Application source | runtime | none this round | read-only | live launcher/MCP | no code change |

## Authority Packet And Documentation Impact

- Authority refs read: session-title, routing, VibeAi, CodeNote project entry, starter-kit, migration playbook, configure-agent-ecosystem project-rules, wechat-download-api / GitFork/codex-host adapters, process/rules §1–3
- Decisive source evidence: this checkout had no adapters and no `vibe/` tree; GitFork is the established fork root
- `doc_drift`: none in this repository
- Document impact: `project-current`
- Synchronized authorities and verification: this repo hubs + CodeNote catalog
- Root acceptance gate: `accepted` for this repository; local commit authorized this turn; push not authorized

## Execution Journal

| Event ID | Local Time | Work Unit / Attempt | Actor / Surface | Event | Prior -> Resulting State | Trigger / Evidence | Root Decision / Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | 2026-09-08 12:06 +08:00 | inspect | cursor | inventory | no local clone -> confirmed | find under work/czz | clone to GitFork |
| E2 | 2026-09-08 12:07 +08:00 | git | cursor | clone + czz-dev | empty path -> `0b053b6` on `czz-dev` | origin CzzRef, upstream miuuyy | write vibe tree |
| E3 | 2026-09-08 12:08 +08:00 | adapters | cursor | write vibe owners + projections | uninitialized -> CodeNote chain | starter-kit / project-rules compiler | verify |
| E4 | 2026-09-08 12:15 +08:00 | verify | cursor | project audit + resolver | unverified -> 2 inherited official-entry findings; resolver hits this clone | authored code-link suffixes repaired | local commit |
| E5 | 2026-09-08 12:16 +08:00 | git | cursor | user authorized this-repo local commit | uncommitted adapters -> commit candidates `AGENTS.md` `CLAUDE.md` `.cursor/rules/project.mdc` `vibe/` | exclude CodeNote mixed dirty tree | commit this repo only |

## Efficiency / Token Evidence

| Metric | Baseline | Observed | Delta | Confidence / Source |
| --- | --- | --- | --- | --- |
| runtime usage | n/a | usage unavailable | n/a | host does not expose counters |

## TaskExperienceObservation

- Result: `not applicable`

## Implementation Sync

- Authoritative current behavior: [architecture.md](../../../knowledge/architecture.md)
- Module / document mapping: product docs remain in `docs/`; agent facts in [project.md](../../../rules/project.md)
- Evidence: source read 2026-09-08; runtime unproven

## Closeout

- Sidecar: `main-thread`
- Requirement / business / tech route: no product requirement delta; architecture map written
- Memory / error route: project knowledge created; error archive none
- Evolution Candidate: `none`

## 任务规则声明

- Global entry: CodeNote VibeAi + routing, loaded once
- Project entry: root `AGENTS.md` -> `vibe/rules/README.md`
- Sidecar mode: main-thread
- Document routing: `vibe/rules/documentation.md` + this task card
- High-risk gate: no SQL mutation; no live ChatGPT / Codex config write; no overwrite of unrelated dirty files
