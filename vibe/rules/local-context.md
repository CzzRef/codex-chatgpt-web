<!-- codenote-local-context:conditional-v3 -->
# Project context

Project-owned conditional detail. Edit this local owner for project-specific facts; global policy stays in the compact core. Commands and inline paths are relative to the repository root unless their original text says otherwise. Read the sections relevant to the affected surface before material work.

## Project context from AGENTS.md

# Codex ChatGPT Web

本仓库是 `CzzRef/codex-chatgpt-web` 的本机 GitFork 检出，上游为 `miuuyy/codex-chatgpt-web`。本地开发主分支是 `czz-dev`。不要复述 CodeNote 规则正文。

- 过程枢纽：[vibe/specs/PROJECT_STATUS.md](<../specs/PROJECT_STATUS.md>)
- 项目规则：[README.md](<README.md>)
- 产品架构：[docs/architecture.md](<../../docs/architecture.md>)
- 安全模型：[docs/security-model.md](<../../docs/security-model.md>)

把 ChatGPT Web（含 Pro）接到官方 Codex 的原生模型选择器。Codex 仍拥有任务、上下文、UI 与工具 harness；本仓提供 loopback Responses 桥、嵌入式浏览器和可选 Full MCP。

栈：Bun 1.4.0 + TypeScript；桌面启动器是 Electron + Vite + React（`launcher/`）。版本以 `package.json` / `src/version.ts` 为准，当前为 `5.0.5`。

## 关键事实

- CLI 入口：[src/cli.ts](<../../src/cli.ts#L1>)
- Responses / 模型目录：[src/server.ts](<../../src/server.ts#L1>)、[src/model-catalog.ts](<../../src/model-catalog.ts#L1>)
- ChatGPT Web 适配：`src/adapters/chatgpt-web/`
- Codex 集成：[src/codex-integration.ts](<../../src/codex-integration.ts#L1>)
- 生产配置目录：`~/.codex-chatgpt-web`（可用 `CODEX_CHATGPT_WEB_HOME` 覆盖）
- DEV 配置目录：`~/.codex-chatgpt-web-dev`（可用 `CODEX_WEB_GPT_DEV_HOME` 覆盖）；禁止与生产 home 相同
- 默认 loopback：`127.0.0.1:17841`
- 自动 Full 连接器名必须是 `Codex Native2`；DEV 用 `Codex Native2 DEV`；Zero Risk 用 `Codex Zero Risk`。退役名 `Codex Native` 不得回退选用
- 浏览器会话、tunnel key、control token、诊断包视为密钥，不得写入仓库、任务文档或公开 issue

## 硬边界

- 不要为这个项目建空的 `vibe/ai-db/` 或 `vibe/requirements/`
- 不要启动生产 launcher、改用户 `CODEX_HOME`、装系统服务、连真实 ChatGPT / tunnel，除非当前任务明确授权
- `dev:launcher` / `dev:chat` 必须走隔离 DEV profile，不得复用生产 cookie 或 `Codex Native2`
- `--auto-approve-tool-calls` 只点一次性 Allow，不得做成永久授权
- 上游 PR 不要带 `vibe/`；`vibe/` 只属于本机 `czz-dev` 治理层
- 未经验证不得声称 browser smoke、MCP 或打包安装已通过

## Conditional task routes

1. 已加载的 CodeNote 内核或 [global-core.generated.md](<global-core.generated.md>)
2. [documentation.md](<documentation.md>)（Standard / Controlled、文档治理）
3. [PROJECT_STATUS.md](<../specs/PROJECT_STATUS.md>)
4. [project.md](<project.md>)
5. [workflow.md](<workflow.md>)
