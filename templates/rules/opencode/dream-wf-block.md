<!-- DREAM-WF:START -->
# Dream WF Entry

For every software engineering request in this project, use the Dream WF profile on top of Trellis by default. The user does not need to mention Trellis or dream-wf.

## Default Routing

- First classify the request using Trellis task classification.
- For conversation-only or tiny inline work, ask whether a Trellis task is needed only if durable tracking would help.
- For feature work, bug fixes with uncertainty, refactors, architecture decisions, multi-file changes, or unclear requests, create/use a Trellis planning task before implementation.

## PRD First, Grill-Me Style

During planning, do not start by drafting and writing a speculative PRD. Use `dream-wf-grill-prd` behavior first: inspect available context, ask exactly one high-value question at a time, provide 2-3 options and a recommended answer, then update `prd.md` after the user answers.

Do not start implementation until the active Trellis task has a confirmed PRD. Planning artifacts such as `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, `check.jsonl`, and `research/**` are allowed during planning.

## MCP Policy

- Use `fast-context-mcp` for codebase semantic context.
- Use `grok-search-mcp` for external docs, live web information, and webpage fetch.
- If a preferred MCP is unavailable, state the fallback reason before using another tool.
<!-- DREAM-WF:END -->
