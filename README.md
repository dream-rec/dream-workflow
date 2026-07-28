# DREAM-WORKFLOW

面向 Pi、Codex、Claude Code、OpenCode 和 Cursor 的 Workflow patch 安装聚合器。

`dream-wf` 不替代 Trellis。它是在 Trellis 之上安装一组项目级个人 workflow 约束，同时聚合配置 MCP servers 和 skills；也可以安装 Pi 及配套扩展：

- 平台选择：Pi / Cursor / Claude Code / OpenCode / Codex
- Skill 安装：`dream-wf-grill-prd`（Trellis patch · grill-me 风格 PRD）、`dream-wf-mcp-policy`（MCP 优先级策略）
- MCP 配置：`fast-context-mcp`（代码语义检索）、`grok-search-mcp`（外部文档/实时网络检索）
- 交互式 TUI：上下选择、space 选中、enter 下一步/安装
- PRD 澄清自动采用 grill-me 风格，用户不需要显式提到 `dream-wf`
- Trellis 原生的任务生命周期、spec、hooks、skills、sub-agents、checks 和 finish-work 保持不变
- strict 模式会阻止无活跃任务或 PRD 未确认时的实现类操作

## 安装

### 交互式 TUI（推荐）

```bash
npx dream-wf
```

无参数时自动进入 TUI：

1. 第一步选择平台（claude code / codex / opencode / cursor / pi）
2. 第二步选择要安装的 skills（默认全选）
3. 第三步选择要配置的 MCP servers（默认全选）
4. enter 确认安装

操作键：

- `↑/↓` 移动光标
- `space` 切换选中
- `a` 全选/全不选
- `enter` 下一步/确认
- `ctrl+c` 退出

### 命令行模式

```bash
npx dream-wf init -p cursor
npx dream-wf init -p claude
npx dream-wf init -p opencode
npx dream-wf init -p codex
npx dream-wf init -p pi
```

`-p` 是必填参数。默认安装范围是项目级，默认模式是 `strict`，默认安装全部 skills 和 MCPs。

## 命令

```bash
npx dream-wf                                  # 交互式 TUI
npx dream-wf interactive                      # 同上
npx dream-wf init -p <platform> [options]
npx dream-wf doctor -p <platform>
npx dream-wf update -p <platform>
```

参数：

```bash
-p cursor|claude|opencode|codex|pi           # 必填
--mode strict|advisory                        # 默认 strict
--skills <id,id,...>                          # 指定 skill id，默认全部
--mcps <id,id,...>                            # 指定 mcp id，默认全部
--skip-skills                                 # 不安装任何 skill
--skip-mcps                                   # 不配置任何 mcp
--install-deps --developer <name>            # 自动初始化 Trellis
```

Skill ids：

- `trellis-dream-wf-patch`（dream-wf-grill-prd）
- `dream-wf-mcp-policy`

MCP ids：

- `fast-context`（fast-context-mcp）
- `grok-search`（grok-search-mcp）

## 平台支持

| 平台 | 入口规则 | Skills 目录 | Hook 类型 | MCP 配置文件 |
|------|---------|------------|----------|-------------|
| Cursor | `.cursor/rules/dream-wf.mdc` | `.cursor/skills/` | `preToolUse` (python) | `.cursor/mcp.json` |
| Claude Code | `CLAUDE.md` | `.claude/skills/` | `PreToolUse` (python) | `.mcp.json` |
| OpenCode | `AGENTS.md` | `.opencode/skills/` | `tool.execute.before` plugin (js) | `opencode.json` |
| Codex | `AGENTS.md` | `.codex/skills/` | `PreToolUse` (python, hooks.json) | `.codex/config.toml` |
| Pi | `AGENTS.md` + Trellis 原生 `.pi/extensions/trellis/` | `.agents/skills/` | Pi extension events | `.mcp.json`（`pi-mcp-adapter`） |

- Pi：可选的终端编码代理安装，以及当前验证过的扩展组合：
  - `pi-tool-display@0.5.0`
  - `pi-nano-context@0.1.1`
  - `pi-cometix-footer@1.1.1`
  - `pi-mcp-adapter@2.15.0`（Pi 专用 MCP 适配器，按需发现工具，原生读取 `.mcp.json`）
  - `@arcaneorion/pi-provider-manager@0.3.9`

## Pi 安装

```bash
npx dream-wf init -p pi
```

该命令会：

1. 使用 npm 全局安装固定版本的 `@earendil-works/pi-coding-agent`（产品名称统一简称 **Pi**）；
2. 通过 `pi install` 安装上述 Pi 扩展，其中 `pi-mcp-adapter` 负责 MCP；
3. 使用 Trellis 最新版原生支持的 `trellis init ... --pi --yes` 初始化项目级 Pi extension、prompts、agents 和共享 skills；
4. 将选中的 MCP servers 写入项目根 `.mcp.json`，由 `pi-mcp-adapter` 自动读取；
5. 安装完成后自动修复 `pi-nano-context` 与 `pi-cometix-footer` 的 footer 冲突；
6. 修复 `@arcaneorion/pi-provider-manager@0.3.9` 发布包遗漏的 `pi.extensions`（上游“+”补丁行发布错误会导致 Pi 启动失败）；
7. 保留现有 `~/.pi/agent/models.json`，没有配置时写入使用环境变量的 AgentRouter 示例；
8. 执行检查：

```bash
npx dream-wf doctor -p pi
```

API key 不写入安装器或 Git，使用环境变量：

```bash
export AGENTROUTER_API_KEY=your-key
```

升级 Pi 及扩展时执行：

```bash
npx dream-wf update -p pi
```

## Trellis

来源：https://github.com/mindfold-ai/trellis

```bash
npm install -g @mindfoldhq/trellis@latest
```

先初始化 Trellis，或者让 `dream-wf` 输出对应的初始化命令：

```bash
trellis init -u your-name --cursor --yes
trellis init -u your-name --claude --yes
trellis init -u your-name --opencode --yes
trellis init -u your-name --codex --yes
trellis init -u your-name --pi --yes
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
- `.cursor/mcp.json`

Claude Code：

- `CLAUDE.md` dream-wf entry block
- `.claude/skills/dream-wf-grill-prd/SKILL.md`
- `.claude/skills/dream-wf-mcp-policy/SKILL.md`
- `.claude/hooks/dream-wf-guard.py`
- `.claude/settings.json`
- `.mcp.json`

OpenCode：

- `AGENTS.md` dream-wf entry block
- `.opencode/skills/dream-wf-grill-prd/SKILL.md`
- `.opencode/skills/dream-wf-mcp-policy/SKILL.md`
- `.opencode/plugins/dream-wf-guard.js`
- `opencode.json`

Codex：

- `AGENTS.md` dream-wf entry block
- `.codex/skills/dream-wf-grill-prd/SKILL.md`
- `.codex/skills/dream-wf-mcp-policy/SKILL.md`
- `.codex/hooks/dream-wf-guard.py`
- `.codex/hooks.json`
- `.codex/config.toml`（含 `[features] hooks = true` 和 `[mcp_servers.*]`）

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
npx dream-wf doctor -p codex
```

doctor 会检查：

- 必需二进制（node、python3、trellis、uvx）
- Trellis 项目目录和 workflow.md
- 平台对应的规则、skills、hook 文件
- MCP 配置文件存在性和默认 MCP 条目完整性
- 项目文件中的密钥泄露扫描
