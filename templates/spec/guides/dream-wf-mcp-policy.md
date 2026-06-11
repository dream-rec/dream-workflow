# Dream WF MCP Policy

This project prefers MCP tools in a fixed order.

## Codebase Semantic Search

Prefer `fast-context-mcp` and `fast_context_search` for semantic codebase understanding:

- Behavior discovery.
- Architecture tracing.
- Natural-language code search.
- Planning context collection.

Use exact search only for known symbols, strings, paths, or narrow patterns.

## External Web and Documentation

Prefer `grok-search-mcp` for external information:

- `web_search` for live search and technical docs.
- `web_fetch` for webpage content.
- `web_map` for site structure.
- `get_sources` for source URLs.

Built-in web tools are fallback only. State the fallback reason before using them.

## Security

Do not commit API keys, tokens, or MCP secrets into project files.
