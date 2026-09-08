# Knowledge Rules

Tool: tool-neutral (codex, claude, grok, and any CodeNote-routed agent)

## Routing

- Canonical product docs: `docs/`
- Architecture map: `vibe/knowledge/architecture.md`
- Error memories: `vibe/knowledge/error-memory/`
- ADRs: `vibe/knowledge/adr/`
- New process docs: `vibe/specs/`
- Eval records: `vibe/evals/`

## Initialization Notes

- No AI-DB workspace was created.
- Upstream `docs/` and multilingual README files remain product evidence; they are not the AI rule entry.
- This clone had no prior `vibe/` tree.

## Write Policy

- Search existing knowledge before adding new records.
- Store only reusable, verified, safe knowledge.
- Mark evidence as code, test, user-confirmed, official-doc, or inference.
- Never store ChatGPT cookies, tunnel IDs, runtime keys, control tokens, diagnostic bundles, or local home paths that embed secrets.
- Link old and new docs when business behavior changes.

## Document Governance Map

- Knowledge index: [../knowledge/README.md](../knowledge/README.md)
- Specs index: [../specs/README.md](../specs/README.md)
- DB workspace: not configured for this project
- Use `--all-markdown` only for deep historical document hygiene; default audit covers active AI rule surfaces.
