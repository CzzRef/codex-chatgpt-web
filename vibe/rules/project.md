# Project Rules

Tool: tool-neutral (codex, claude, grok, and any CodeNote-routed agent)

## Project Profile

- Name: `codex-chatgpt-web`
- Path: GitFork clone at `GitFork/codex-chatgpt-web`
- Origin: `origin=CzzRef/codex-chatgpt-web`，`upstream=miuuyy/codex-chatgpt-web`
- Local working branch: `czz-dev`（从 fork `main@0b053b6` / v5.0.5 拉出）
- License: MIT
- Stack: Bun 1.4.0 + TypeScript；launcher 为 Electron 41 + Vite + React 19
- Purpose: 用已登录的 ChatGPT Web 会话作为 Codex 原生模型，而不是 OpenAI API key
- Initialization date: 2026-09-08

## Detected Manifests

- `package.json` / `bun.lock`（仓库根）
- `launcher/package.json`
- `tsconfig.json`
- `docs/architecture.md` / `docs/security-model.md` / `docs/dev-chat.md`
- `tests/*.test.ts`

## Runtime Layout

| Area | Path | Role |
| --- | --- | --- |
| CLI | `src/cli.ts` | setup / serve / doctor / login / MCP / subagents / dev |
| Daemon / Responses | `src/server.ts`, `src/service.ts` | loopback Responses 桥与本机服务生命周期 |
| Model catalog | `src/model-catalog.ts`, `src/chatgpt-web-models.ts` | 固定 ChatGPT Web 模型行；账户能力决定是否露出 Pro |
| ChatGPT adapter | `src/adapters/chatgpt-web/` | Temporary Chat、流式解析、compaction、MCP broker |
| Codex integration | `src/codex-integration.ts` | 写 Codex `config.toml` / 模型目录；卸载时回滚 |
| Browser host | `src/launcher-browser-host.ts`, `launcher/` | 启动器私有 Electron profile，最多五个任务绑定标签 |
| Tunnel | `src/tunnel.ts`, `src/tunnel-service.ts` | Full 模式出站 OpenAI tunnel-client |
| DEV harness | `src/dev-chat/` | 合成外层 Codex，不占生产 17841、不改生产 Codex |
| Tests | `tests/` | Bun 单测；launcher 另有 `launcher/tests` |

Directories that do **not** exist and must not be invented: `vibe/ai-db/`, `vibe/requirements/`.

## Local Rule Policy

- Keep project-specific constraints here; move reusable cross-project rules to CodeNote.
- Do not overwrite existing user work or unrelated business files.
- Before implementation, inspect the relevant source paths and existing `docs/` for the current task.
- Product architecture and security remain in `docs/`; this file only records agent-facing boundaries.
- `vibe/` belongs to `czz-dev`. Do not include it in PRs to `upstream`.

## High-Risk Areas

- ChatGPT login cookies / launcher profile under `~/.codex-chatgpt-web` and `~/.codex-chatgpt-web-dev`
- Tunnel ID、runtime key、`controlToken`、诊断包与 browser screenshot
- 改写用户 `CODEX_HOME` / `config.toml` 的 setup / uninstall
- Full 模式把未信任模型响应接到当前 Codex 工具；`--auto-approve-tool-calls` 只允许点一次性 Allow
- 本机 loopback `127.0.0.1:17841` 对同用户进程可见
- 系统服务安装（`io.github.codex-chatgpt-web.daemon` / `.tunnel`）
- 生成物：`dist/`、`runtime/`、`launcher/build/`、`launcher/release/`、`node_modules/`。不要手改

## Business Constraints

- 这是非官方浏览器自动化，不是 OpenAI API。ChatGPT UI 漂移必须显式失败，禁止静默换模型或传输。
- Browser-only 不启动 broker / tunnel / MCP；Full 才挂 `Codex Native2`。
- Zero Risk 永不读或改 ChatGPT 页面，也不代发 prompt。
- 每个自动 picker 条目对应一个固定 ChatGPT mode；Codex Effort/Speed 行不能偷偷改浏览器模型。
- DEV launcher 与生产 launcher 可并行，但 cookie、connector、tunnel、`CODEX_HOME` 必须隔离。
- 连接器身份是公开 MCP ABI：不得把 `Codex Native` 当 `Codex Native2` 的回退。
