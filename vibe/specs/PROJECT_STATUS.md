# Codex ChatGPT Web Project Status

Tool: grok
Date: 2026-09-29

## Purpose

Compact process hub for active AI work. This file routes current tasks to project docs without storing durable rules.

## Rule Links

- Project documentation: [../rules/documentation.md](../rules/documentation.md)
- Project knowledge: [../knowledge/README.md](../knowledge/README.md)
- Global process rules: [../../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/process/rules.md](../../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/process/rules.md#3-project-location)

## Current Focus

- `czz-dev` 已合入上游 `6.1.3`（head `3bdf471`）。配套工作分支 `codex/260908-ccw-unified` 已合入该头（`5fbc29b`）。
- 统一组件包 RC5（Codex++ 1.4.0 × CCW 6.1.3）隔离冒烟 9/9；真实账号验收仍 `not_run`。
- AI 规则初始化见 [task card](260908/1208-ai-rules-init/task-card.md)。
- Remotes: `origin=CzzRef/codex-chatgpt-web`，`upstream=miuuyy/codex-chatgpt-web`。

## Active Task Index

| Task | Status | Authoritative Doc | Verification | Notes |
| --- | --- | --- | --- | --- |
| AI rules init | `implemented-local / gitfork-local-committed` | [task-card](260908/1208-ai-rules-init/task-card.md) | project audit 仅余官方短入口 2 条 inherited | no app code |
| Unified V0.1 | `merged-local / origin pending` | [control record](../../docs/worktree-control/260908-ccw-unified.md) | RC5 smoke 9/9; focused 81 + launcher 16; account `not_run` | czz-dev 6.1.3; work `5fbc29b` |

## Verification State

- Last verified: 2026-09-29 (RC5 isolated smoke 9/9; focused bun 81 + launcher 16)
- Commands: CodeNote `audit_ai_rules.py --mode project`；authored-file code-link audit；`bun test` focused
- Unverified gaps: live launcher activation, ChatGPT login, Full MCP, doctor-against-daemon, package install, Voice
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
