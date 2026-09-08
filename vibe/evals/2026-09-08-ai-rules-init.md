# AI Rules Initialization Eval

Tool: cursor
Project: `codex-chatgpt-web`
Date: 2026-09-08

## Migration Summary

- Cloned `git@github.com:CzzRef/codex-chatgpt-web.git` to `GitFork/codex-chatgpt-web`.
- Added `upstream=miuuyy/codex-chatgpt-web` and created local working branch `czz-dev` at `0b053b6` (v5.0.5).
- Applied CodeNote starter-kit + current project-rules projections: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc`, `vibe/rules/`, knowledge/process hubs.
- Did not copy the CodeNote master body.
- DB workspace created: no.
- Requirement Manifest created: no.

## Verification

### Final Project Audit

```text
AI rule audit [working]: ISSUES
- adapter does not route to documentation rules: AGENTS.md
- adapter does not route to process hub: AGENTS.md
```

These two match the current official short `AGENTS.md` projection on wechat-download-api and GitFork/codex-host. They are inherited publisher shape, not this clone's extra drift.

### Authored Code Link Audit

Ran `audit_code_links.py` on authored vibe/adapter files after adding line suffixes. Generated `*.generated.md` portable projections keep CodeNote-relative fragments and were not rewritten.

### Workspace Resolver

```text
--project codex-chatgpt-web -> /Users/gdkmjd/work/czz/GitFork/codex-chatgpt-web
```

## Remaining Notes

- Default project audit checks AI rule surfaces only.
- Live launcher / ChatGPT / MCP / `bun test` not executed.
- `czz-dev` is local-only; commit/push not authorized.
