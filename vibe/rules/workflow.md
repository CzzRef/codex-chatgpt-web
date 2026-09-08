# Workflow Rules

Tool: tool-neutral (codex, claude, grok, and any CodeNote-routed agent)

## Commands

Prefer documented project scripts over inventing new ones. Do not run live ChatGPT、tunnel、系统服务安装或生产 launcher，unless the current task explicitly authorizes them.

```bash
bun run app                 # 源码启动桌面 launcher（会碰本机 ChatGPT profile）
bun run dev:launcher        # 隔离 DEV profile：~/.codex-chatgpt-web-dev
bun run dev:chat            # 合成外层 Codex；无消息时进入 /status 等命令
bun run src/cli.ts doctor   # 只读健康检查（仍可能读本机配置）
bun run typecheck           # tsc --noEmit
bun test tests/*.test.ts    # 仓库根 Bun 单测
bun run launcher:typecheck
bun run launcher:test
bun run verify              # 发布前聚合核验
bun run smoke:subagents     # 子代理契约；不是真机 ChatGPT
bun run app:package         # 打包安装器
```

`dev:chat` 示例（隔离、不占生产端口）：

```bash
bun run dev:chat compaction-lab "Reply with exactly: DEV READY"
```

Source path requires Bun 1.4.0. Do not invent npm scripts that the repo does not declare.

## Verification

- Rule-only edits: run the CodeNote project audit below. Do not start the launcher, `bun install`, or live ChatGPT just to prove docs/rules.
- Code changes: run the nearest focused check — `bunx tsc --noEmit` and the touched `bun test tests/<file>.test.ts`.
- Do not claim browser smoke, MCP connector, doctor-against-a-running-daemon, or packaged install passed without runtime evidence.
- For documentation-heavy changes, validate Markdown links and record unresolved links.

## Required AI Rule Audit

From the repository root, using the CodeNote audit relative to this clone:

```bash
python3 ../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project --fix-links
python3 ../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project
```
