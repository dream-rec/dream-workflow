# DREAM-WORKFLOW

Personal Trellis workflow patch installer for Cursor, Claude Code, and OpenCode.

`dream-wf` does not replace Trellis. It installs a small custom profile on top of Trellis:

- PRD clarification uses grill-me behavior automatically; the user does not need to mention `dream-wf`.
- Trellis task lifecycle, specs, hooks, skills, sub-agents, checks, and finish-work remain native.
- Initial spec candidates combine user answers, PRD decisions, and verified project facts.
- Code semantic search prefers `fast-context-mcp`.
- External docs and live web search prefer `grok-search-mcp`.
- Strict mode guards against implementation before active task / PRD confirmation.

## Install

```bash
npx dream-wf init -p cursor
npx dream-wf init -p claude
npx dream-wf init -p opencode
```

`-p` is required. Default install is project-level and default mode is `strict`.

## Commands

```bash
npx dream-wf init -p cursor
npx dream-wf doctor -p cursor
npx dream-wf update -p cursor
```

Options:

```bash
-p cursor|claude|opencode
--mode strict|advisory
--install-deps
--developer <name>
```

## Trellis Dependency

Source: https://github.com/mindfold-ai/trellis

```bash
npm install -g @mindfoldhq/trellis@latest
```

Initialize Trellis first, or let `dream-wf` tell you the exact command:

```bash
trellis init -u your-name --cursor
trellis init -u your-name --claude
trellis init -u your-name --opencode
```

## Grill Me Dependency

Source: https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md

`dream-wf` installs a project-local `dream-wf-grill-prd` skill that vendors the behavior:

- Ask one question at a time.
- Provide options and a recommended answer.
- Inspect code before asking when possible.
- Update `prd.md` after each answer.
- Require explicit PRD confirmation before implementation.

## Fast Context MCP

Source: https://github.com/SammySnake-d/fast-context-mcp

```bash
npm install @sammysnake/fast-context-mcp
```

Example MCP server config:

```json
{
  "fast-context": {
    "command": "npx",
    "args": [
      "-y",
      "--prefer-online",
      "fast-context-mcp@latest"
    ],
    "env": {
      "WINDSURF_API_KEY": "devin-session-xx"
    }
  }
}
```

## Grok Search MCP

Source: https://github.com/GuDaStudio/GrokSearch

Requires Python 3.10+ and `uv` / `uvx`.

```json
{
  "grok-search": {
    "type": "stdio",
    "command": "uvx",
    "args": [
      "--from",
      "git+https://github.com/GuDaStudio/GrokSearch@grok-with-tavily",
      "grok-search"
    ],
    "env": {
      "GROK_API_URL": "https://your-api-endpoint.com/v1",
      "GROK_API_KEY": "your-grok-api-key",
      "GROK_MODEL":"your-model",
      "TAVILY_API_KEY": "optional-tavily-key",
      "TAVILY_API_URL": "https://api.tavily.com"
    }
  }
}
```

Do not commit real API keys or MCP secrets into project files.

## Generated Files

Cursor:

- `.cursor/rules/dream-wf.mdc`
- `.cursor/skills/dream-wf-grill-prd/SKILL.md`
- `.cursor/skills/dream-wf-mcp-policy/SKILL.md`
- `.cursor/hooks/dream-wf-guard.py`
- `.cursor/hooks.json`

Claude Code:

- `CLAUDE.md` dream-wf entry block
- `.claude/skills/dream-wf-grill-prd/SKILL.md`
- `.claude/skills/dream-wf-mcp-policy/SKILL.md`
- `.claude/hooks/dream-wf-guard.py`
- `.claude/settings.json`

OpenCode:

- `AGENTS.md` dream-wf entry block
- `.opencode/skills/dream-wf-grill-prd/SKILL.md`
- `.opencode/skills/dream-wf-mcp-policy/SKILL.md`
- `.opencode/plugins/dream-wf-guard.js`

Trellis:

- Appends a `Dream WF Profile` section to `.trellis/workflow.md`.
- Installs `.trellis/spec/guides/dream-wf-prd-policy.md`.
- Installs `.trellis/spec/guides/dream-wf-mcp-policy.md`.

## Strict Mode

Strict mode blocks mutating actions when:

- No active Trellis task exists.
- A task is still in `planning` and `prd.md` is not confirmed.

Mark PRD confirmation with one of these markers in `prd.md`:

```markdown
PRD confirmed
confirmed: true
status: confirmed
```

## Security

Run doctor before committing:

```bash
npx dream-wf doctor -p cursor
```

The doctor checks for obvious MCP secret patterns in project files and reports suspicious findings.
