# Codex ChatGPT Web Architecture Map

Tool: cursor
Date: 2026-09-08

## Sync Rule

Update this file when a maintained module's entrypoint, storage/data contract, integration boundary, key workflow, or verification command changes. Keep entries as module + technology + code address. Do not copy [../../docs/architecture.md](../../docs/architecture.md).

## Request Path

```text
Codex app / CLI
  └─ Responses API on 127.0.0.1:17841
      └─ launcher-owned daemon (src/server.ts + src/service.ts)
          ├─ official /models passthrough + fixed ChatGPT Web models
          ├─ native Responses passthrough or ChatGPT Responses/SSE bridge
          ├─ ChatGPT browser worker (up to five task-bound Electron tabs)
          ├─ capability broker (full mode only)
          └─ stdio MCP → outbound OpenAI Tunnel → ChatGPT connector
```

## Module Index

| Module | Technology / Mechanism | Code Address | Current Notes | Last Verified |
| --- | --- | --- | --- | --- |
| Version | package + const | [../../package.json](../../package.json#L3), [../../src/version.ts](../../src/version.ts#L1) | `5.0.5` at clone `0b053b6` | 2026-09-08 |
| CLI | Bun shebang | [../../src/cli.ts](../../src/cli.ts#L1) | setup / serve / doctor / login / MCP / subagents / dev | 2026-09-08 |
| Config home | env override | [../../src/config.ts](../../src/config.ts#L154) | `CODEX_CHATGPT_WEB_HOME` or `~/.codex-chatgpt-web`; default port `17841` | 2026-09-08 |
| Connector ABI | exact names | [../../src/config.ts](../../src/config.ts#L22) | `Codex Native2` / `Codex Native2 DEV` / `Codex Zero Risk`; never fall back to `Codex Native` | 2026-09-08 |
| Responses server | loopback HTTP | [../../src/server.ts](../../src/server.ts#L1) | service id `codex-chatgpt-web` | 2026-09-08 |
| ChatGPT adapter | Temporary Chat + SSE | [../../src/adapters/chatgpt-web/index.ts](../../src/adapters/chatgpt-web/index.ts#L1) | browser-only / full / zero-risk | 2026-09-08 |
| Codex integration | config rewrite | [../../src/codex-integration.ts](../../src/codex-integration.ts#L1) | setup writes Codex models; uninstall must restore | 2026-09-08 |
| DEV profile | isolated home | [../../src/dev-chat/profile.ts](../../src/dev-chat/profile.ts#L48) | DEV home must differ from production | 2026-09-08 |
| Launcher | Electron | [../../launcher/package.json](../../launcher/package.json#L2) | `codex-web-gpt-launcher` 5.0.5 | 2026-09-08 |

## Data Contract

- Production home: `~/.codex-chatgpt-web` (`config.json`, browser profile, runtime state).
- DEV home: `~/.codex-chatgpt-web-dev`.
- Daemon binds loopback only. Same-user processes can reach the listener.
- Generated artifacts (`dist/`, `runtime/`, launcher build/release) are not hand-edited.

## Unproven

- Live launcher sign-in, browser smoke, MCP connector, doctor against a running daemon, and packaged install were not exercised in the 2026-09-08 rules-init task.
