import path from 'node:path';
import { readFile, chmod } from 'node:fs/promises';
import { readJsonObject, writeJsonObject, pushUniqueByCommand } from '../../lib/json.js';
import { writeIfChanged, readTextIfExists, writeTextFile } from '../../lib/files.js';
import { installCommonDreamWfFiles, installManagedBlock, installSelectedSkills } from '../shared.js';
import { installMcpServers } from '../../lib/mcp.js';

const CODEX_GUARD_MATCHER = 'Bash|Shell|shell|apply_patch|Edit|Write';
const CODEX_GUARD_COMMAND = 'python3 -X utf8 .codex/hooks/dream-wf-guard.py';
const LEGACY_CODEX_GUARD_COMMAND = 'python3 "$CODEX_PROJECT_DIR/.codex/hooks/dream-wf-guard.py"';

// Codex CLI 读取项目根的 AGENTS.md 作为入口规则。
// Codex 支持 PreToolUse 阻塞式 hook，配置在 .codex/hooks.json（和 config.toml [hooks] 段等效）。
// 需要在 config.toml 里加 [features] hooks = true 来启用 hooks 功能。
// hook 脚本放在 .codex/hooks/dream-wf-guard.py。
export async function installCodex(packageRoot, targetRoot, options) {
  const results = [];

  results.push(await installManagedBlock(packageRoot, targetRoot, 'templates/rules/codex/dream-wf-block.md', 'AGENTS.md', '<!-- DREAM-WF:START -->', '<!-- DREAM-WF:END -->'));
  results.push(...await installSelectedSkills(packageRoot, targetRoot, '.codex', options.skills));
  results.push(...await installCommonDreamWfFiles(packageRoot, targetRoot));

  if (options.mcps && options.mcps.length > 0) {
    results.push(await installMcpServers(targetRoot, 'codex', options.mcps));
  }

  if (options.mode === 'strict') {
    results.push(await installCodexHook(packageRoot, targetRoot));
    results.push(await ensureCodexHooksFeature(targetRoot));
    results.push(await mergeCodexHooks(targetRoot));
  }

  return results;
}

async function installCodexHook(packageRoot, targetRoot) {
  const sourcePath = path.join(packageRoot, 'templates', 'hooks', 'codex', 'dream-wf-guard.py');
  const targetPath = path.join(targetRoot, '.codex', 'hooks', 'dream-wf-guard.py');
  const contents = await readFile(sourcePath, 'utf8');
  const result = await writeIfChanged(targetPath, contents);
  await chmod(targetPath, 0o755);
  return result;
}

// 在 config.toml 里确保 [features] hooks = true 存在。
// 用简单的文本检查实现幂等：如果已有则不动。
async function ensureCodexHooksFeature(rootDir) {
  const configPath = path.join(rootDir, '.codex', 'config.toml');
  const existing = await readTextIfExists(configPath);
  const hasFeature = existing?.includes('hooks = true') || existing?.includes('hooks=true');

  if (hasFeature) {
    return { changed: false, action: 'unchanged', path: configPath };
  }

  const featureBlock = '[features]\nhooks = true\n';
  const prefix = existing && !existing.endsWith('\n') ? `${existing}\n\n` : existing ? `${existing}\n` : '';
  await writeTextFile(configPath, `${prefix}${featureBlock}`);
  return { changed: true, action: existing ? 'updated' : 'created', path: configPath };
}

// Codex hooks.json 格式和 Claude Code 的 settings.json hooks 段一致：
// { "hooks": { "PreToolUse": [ { "matcher": "...", "hooks": [ { "type": "command", "command": "...", "timeout": 10 } ] } ] } }
// Codex 的 matcher 是正则匹配 tool_name，用 Bash|Shell|apply_patch|Edit|Write 匹配变更类工具。
async function mergeCodexHooks(rootDir) {
  const hooksPath = path.join(rootDir, '.codex', 'hooks.json');
  const hooks = await readJsonObject(hooksPath, { hooks: {} });
  hooks.hooks = hooks.hooks ?? {};
  hooks.hooks.PreToolUse = hooks.hooks.PreToolUse ?? [];

  const migrated = replaceHookCommand(hooks.hooks.PreToolUse, LEGACY_CODEX_GUARD_COMMAND, CODEX_GUARD_COMMAND);
  const added = pushUniqueByCommand(hooks.hooks.PreToolUse, {
    matcher: CODEX_GUARD_MATCHER,
    hooks: [
      {
        type: 'command',
        command: CODEX_GUARD_COMMAND,
        timeout: 10
      }
    ]
  });
  const changed = migrated || added;

  if (changed) {
    await writeJsonObject(hooksPath, hooks);
  }

  return { changed, action: changed ? 'updated' : 'unchanged', path: hooksPath };
}

function replaceHookCommand(items, oldCommand, newCommand) {
  let changed = false;
  for (const item of items) {
    if (!item || typeof item !== 'object' || !Array.isArray(item.hooks)) {
      continue;
    }

    for (const hook of item.hooks) {
      if (hook?.command === oldCommand) {
        hook.command = newCommand;
        changed = true;
      }
    }
  }
  return changed;
}
