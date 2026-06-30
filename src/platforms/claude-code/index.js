import path from 'node:path';
import { readFile, chmod } from 'node:fs/promises';
import { readJsonObject, writeJsonObject, pushUniqueByCommand } from '../../lib/json.js';
import { writeIfChanged } from '../../lib/files.js';
import { installCommonDreamWfFiles, installManagedBlock, installSelectedSkills } from '../shared.js';
import { installMcpServers } from '../../lib/mcp.js';

const CLAUDE_GUARD_COMMAND = 'python3 -X utf8 .claude/hooks/dream-wf-guard.py';
const LEGACY_CLAUDE_GUARD_COMMAND = 'python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/dream-wf-guard.py"';

export async function installClaudeCode(packageRoot, targetRoot, options) {
  const results = [];

  results.push(await installManagedBlock(packageRoot, targetRoot, 'templates/rules/claude-code/dream-wf-block.md', 'CLAUDE.md', '<!-- DREAM-WF:START -->', '<!-- DREAM-WF:END -->'));
  results.push(...await installSelectedSkills(packageRoot, targetRoot, '.claude', options.skills));
  results.push(...await installCommonDreamWfFiles(packageRoot, targetRoot));

  if (options.mcps && options.mcps.length > 0) {
    results.push(await installMcpServers(targetRoot, 'claude', options.mcps));
  }

  if (options.mode === 'strict') {
    results.push(await installClaudeHook(packageRoot, targetRoot));
    results.push(await mergeClaudeSettings(targetRoot));
  }

  return results;
}

async function installClaudeHook(packageRoot, targetRoot) {
  const sourcePath = path.join(packageRoot, 'templates', 'hooks', 'claude-code', 'dream-wf-guard.py');
  const targetPath = path.join(targetRoot, '.claude', 'hooks', 'dream-wf-guard.py');
  const contents = await readFile(sourcePath, 'utf8');
  const result = await writeIfChanged(targetPath, contents);
  await chmod(targetPath, 0o755);
  return result;
}

async function mergeClaudeSettings(rootDir) {
  const settingsPath = path.join(rootDir, '.claude', 'settings.json');
  const settings = await readJsonObject(settingsPath, {});
  settings.hooks = settings.hooks ?? {};
  settings.hooks.PreToolUse = settings.hooks.PreToolUse ?? [];

  const migrated = replaceHookCommand(settings.hooks.PreToolUse, LEGACY_CLAUDE_GUARD_COMMAND, CLAUDE_GUARD_COMMAND);
  const added = pushUniqueByCommand(settings.hooks.PreToolUse, {
    matcher: '*',
    hooks: [
      {
        type: 'command',
        command: CLAUDE_GUARD_COMMAND,
        timeout: 10
      }
    ]
  });
  const changed = migrated || added;

  if (changed) {
    await writeJsonObject(settingsPath, settings);
  }

  return { changed, action: changed ? 'updated' : 'unchanged', path: settingsPath };
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
