# DREAM-WORKFLOW

面向 Cursor、Claude Code 和 OpenCode 的个人 Trellis workflow patch 安装器。

`dream-wf` 不替代 Trellis。它是在 Trellis 之上安装一组项目级个人 workflow 约束：

- PRD 澄清自动采用 grill-me 风格，用户不需要显式提到 `dream-wf`。
- Trellis 原生的任务生命周期、spec、hooks、skills、sub-agents、checks 和 finish-work 保持不变。
- 初始 spec 候选内容来自用户回答、PRD 决策和已验证的项目事实。
- 代码语义检索优先使用 `fast-context-mcp`。
- 外部文档和实时网络检索优先使用 `grok-search-mcp`。
- strict 模式会阻止无活跃任务或 PRD 未确认时的实现类操作。

## 安装

```bash
npx dream-wf init -p cursor
npx dream-wf init -p claude
npx dream-wf init -p opencode
```

`-p` 是必填参数。默认安装范围是项目级，默认模式是 `strict`。

## 命令

```bash
npx dream-wf init -p cursor
npx dream-wf doctor -p cursor
npx dream-wf update -p cursor
```

参数：

```bash
-p cursor|claude|opencode
--mode strict|advisory
--install-deps
--developer <name>
```

## Trellis 

来源：https://github.com/mindfold-ai/trellis

```bash
npm install -g @mindfoldhq/trellis@latest
```

先初始化 Trellis，或者让 `dream-wf` 输出对应的初始化命令：

```bash
trellis init -u your-name --cursor
trellis init -u your-name --claude
trellis init -u your-name --opencode
```

## Grill Me 

来源：https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md

`dream-wf` 会安装项目级 `dream-wf-grill-prd` skill，用于复用 grill-me 的交互风格：

- 一次只问一个问题。
- 给出选项和推荐答案。
- 尽可能先检查代码再提问。
- 用户回答后更新 `prd.md`。
- 实现开始前必须获得明确的 PRD 确认。

## Fast Context MCP

来源：https://github.com/SammySnake-d/fast-context-mcp

```bash
npm install @sammysnake/fast-context-mcp
```

MCP server 配置示例：

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

来源：https://github.com/GuDaStudio/GrokSearch

需要 Python 3.10+ 和 `uv` / `uvx`。

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


## 生成文件

Cursor：

- `.cursor/rules/dream-wf.mdc`
- `.cursor/skills/dream-wf-grill-prd/SKILL.md`
- `.cursor/skills/dream-wf-mcp-policy/SKILL.md`
- `.cursor/hooks/dream-wf-guard.py`
- `.cursor/hooks.json`

Claude Code：

- `CLAUDE.md` dream-wf entry block
- `.claude/skills/dream-wf-grill-prd/SKILL.md`
- `.claude/skills/dream-wf-mcp-policy/SKILL.md`
- `.claude/hooks/dream-wf-guard.py`
- `.claude/settings.json`

OpenCode：

- `AGENTS.md` dream-wf entry block
- `.opencode/skills/dream-wf-grill-prd/SKILL.md`
- `.opencode/skills/dream-wf-mcp-policy/SKILL.md`
- `.opencode/plugins/dream-wf-guard.js`

Trellis：

- 向 `.trellis/workflow.md` 追加 `Dream WF Profile` 区块。
- 安装 `.trellis/spec/guides/dream-wf-prd-policy.md`。
- 安装 `.trellis/spec/guides/dream-wf-mcp-policy.md`。

## Strict 模式

strict 模式会阻止以下变更类操作：

- 当前没有活跃 Trellis task。
- task 仍处于 `planning` 状态，且 `prd.md` 尚未确认。

可以在 `prd.md` 中使用以下任一标记表示 PRD 已确认：

```markdown
PRD confirmed
confirmed: true
status: confirmed
```

## 安全检查

提交前运行 doctor：

```bash
npx dream-wf doctor -p cursor
```
