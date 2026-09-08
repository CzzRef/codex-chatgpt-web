# Codex ChatGPT Web Project Status

Tool: codex
Date: 2026-09-08

## Purpose

Compact process hub for active AI work. This file routes current tasks to project docs without storing durable rules.

## Rule Links

- Project documentation: [../rules/documentation.md](../rules/documentation.md)
- Project knowledge: [../knowledge/README.md](../knowledge/README.md)
- Global process rules: [../../../../../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/process/rules.md](../../../../../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/process/rules.md#3-project-location)

## Current Focus

Unified V0.1 is locally committed in the paired worktrees; the user will carry out real account testing later. See [the delivery record](260908/1421-ccw-unified/changes.md).

## Fork Initialization Baseline

- Status: fork cloned to `GitFork/codex-chatgpt-web`; local working branch is `czz-dev` from `origin/main` `0b053b6` (v5.0.5). CodeNote AI rule chain initialized. No application code changed.
- Latest task docs: [task card](260908/1208-ai-rules-init/task-card.md), [changes](260908/1208-ai-rules-init/changes.md).
- Remotes: `origin=CzzRef/codex-chatgpt-web`，`upstream=miuuyy/codex-chatgpt-web`. `czz-dev` is local-only; not pushed.
- CodeNote catalog: `project-index.json` + this-host `workspace.local.json` binding.

## Active Task Index

| Task | Status | Authoritative Doc | Verification | Notes |
| --- | --- | --- | --- | --- |
| Unified V0.1 | `local-committed / unpushed` | [requirements](260908/1421-ccw-unified/spec.md) | [local verification](260908/1421-ccw-unified/verify.md) | user will perform account acceptance later |
| AI rules init | `implemented-local / gitfork-local-committed / unpushed` | [task-card](260908/1208-ai-rules-init/task-card.md) | project audit 仅余官方短入口 2 条 inherited | no app code |

## AI Initialization Verification State

- Last verified: 2026-09-08 (docs/rules)
- Commands: CodeNote `audit_ai_rules.py --mode project`；authored-file code-link audit
- Unverified gaps: live launcher, ChatGPT login, MCP, doctor-against-daemon, package install, `bun test`
- Latest Sidecar result: main-thread
- Latest Prior Task Overlap: reference-only wechat-download-api / GitFork/codex-host adapter shape; decision `new-task`
- Latest Documentation Impact: `project-current`
- Latest Efficiency / Token Evidence: `usage unavailable`

## Open Risk Or Deploy Gates

- Gate: ChatGPT session and Full-mode tunnel credentials
- Blocking condition: this task does not authorize live browser or Codex config writes
- Rollback note: `czz-dev` 仅含上游 `0b053b6` 加本仓 AI 规则初始化；未推送

## Governance Baseline

- Template propagation: accepted global baseline; this project keeps only project-specific routes and does not copy mother-board rules.
- Codex evolution: `v3-route-accepted`; no Hook, supervisor, or rollout change in this repository.
- Rule Task Trace: accepted global baseline; this initialization is project-local and does not add a CodeNote registry row.
- `w24-primary-objective-continuity-accepted`: primary user work remains ahead of advisory governance lanes.
- `w28-documentation-impact-accepted`: this round synchronized project-current adapters/hubs.
- `w30-standard-requirement-owner-accepted`: Standard requirement ownership remains raw requirement plus the Spec owner; this task is Standard non-requirement (task card).

## Pending Follow-ups

| Item | Source turn / task | Owner | Next gate | Status |
| --- | --- | --- | --- | --- |
|  |  |  |  | no-pending |

## Memory Routing

- Task rule declaration: recorded on the task card
- Sidecar document route: main-thread
- Prior Task Overlap: wechat-download-api / GitFork/codex-host
- Evolution Candidate: none
- Project rules: created this round
- Knowledge: architecture map created this round
- ADR: empty index only
- Error memory: empty index
- DB memory: not configured

## Cross-Repository Links

| Concern | Repository | Status Hub |
| --- | --- | --- |
| Rule kernel / catalog | CodeNote | CodeNote `vibe/knowledge/project-index.json` |
| Adapter shape reference | wechat-download-api, GitFork/codex-host | their `vibe/rules/` |

## Next Update Trigger

Update this hub when current focus, active task docs, verification status, open gates, sibling links, or memory routing changes.

## Unified integration V0.1 (2026-09-08)

Implementation and local batched submission complete: [requirements](260908/1421-ccw-unified/spec.md), [tasks](260908/1421-ccw-unified/tasks.md), [changes](260908/1421-ccw-unified/changes.md), [verification](260908/1421-ccw-unified/verify.md). The user will test the target account later. Prior source verification passed 798 affected automated tests, and the paired package passed 9 isolated macOS component checks. Target account, Full MCP and Voice acceptance remain open. Both worktrees stay on `codex/260908-ccw-unified`; the target branch and remotes were not updated.
