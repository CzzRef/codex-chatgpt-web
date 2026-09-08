# Changes：codex-chatgpt-web AI 规则初始化

> Inventory only. This file answers which files changed and what each change was.

## 1. 概览

| 批次 | 提交 | 文件数 | 核心说明 |
| --- | --- | --- | --- |
| 规则初始化 | local-commit | 见下表 | 克隆 fork、建 `czz-dev`、写入 CodeNote 适配层；未改业务代码 |

## 2. 交付物清单

| 对象 | 类型 | 核心说明 |
| --- | --- | --- |
| `/Users/gdkmjd/work/czz/GitFork/codex-chatgpt-web/` | 新增 clone | `CzzRef/codex-chatgpt-web` @ `main` `0b053b6`；本地 `czz-dev` |
| `AGENTS.md` / `CLAUDE.md` / `.cursor/rules/project.mdc` | 新增 | 短路由适配器，不复制 VibeAi |
| `vibe/rules/` | 新增 | 项目规则、栈/风险、命令、文档路由 |
| `vibe/specs/` | 新增 | 过程枢纽 + 本任务 card/changes |
| `vibe/knowledge/` | 新增 | 架构地图、空 ADR/error-memory 索引 |
| `vibe/evals/2026-09-08-ai-rules-init.md` | 新增 | 初始化核验记录 |
| CodeNote `vibe/knowledge/project-index.json` | 改动 | 登记项目身份与 authority routes |
| CodeNote `vibe/knowledge/workspace-config/workspace.local.json` | 改动 | 本机 binding（该文件本就 gitignore） |

## 3. 逐批清单

### 规则初始化 uncommitted

| 文件 | 核心说明 |
| --- | --- |
| Git remotes / `czz-dev` | origin fork + upstream 官方；本地工作分支 |
| `vibe/rules/project.md` | Bun/Electron/ChatGPT Web 事实与高风险面 |
| `vibe/knowledge/architecture.md` | 从源码核对的模块地图 |
| `vibe/specs/260908/1208-ai-rules-init/task-card.md` | Standard 任务卡 |

## 4. 明确没做的（分流，不是遗漏）

| 对象 | 数量 | 核心说明 |
| --- | --- | --- |
| 业务源码 | 0 | 本轮只读理解 |
| `vibe/ai-db/` | 0 | 非 AI-DB 项目 |
| `vibe/requirements/` | 0 | 无需求增量 |
| 远端 `czz-dev` / push | 0 | 未授权 |
| 生产 launcher / ChatGPT / tunnel | 0 | 未授权 |

## 5. 用户可见行为变化

无。应用代码、启动器、Codex 配置均未改。

## 6. 顺手发现但未处理

| 位置 | 现象 | 核心说明 |
| --- | --- | --- |
| `package.json` repository URL | 仍写上游 `miuuyy/codex-chatgpt-web` | fork 元数据，不在本轮改 |
| 语言字段 | GitHub `language` 为 null | gh API 观察；不影响 clone |

## 7. 回归数字

| 批次 | 测试 | 构建 | 静态检查 |
| --- | --- | --- | --- |
| 规则初始化 | 未跑 `bun test` | 未构建 | `audit_ai_rules.py --mode project` 仅余官方短 `AGENTS.md` 2 条 inherited；authored code-link 已补行锚 |
