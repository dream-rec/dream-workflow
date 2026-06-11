import path from 'node:path';
import { readFile, chmod } from 'node:fs/promises';
import { readJsonObject, writeJsonObject, pushUniqueByCommand } from '../../lib/json.js';
import { writeIfChanged } from '../../lib/files.js';
import { installCommonDreamWfFiles, installManagedBlock, installSkill } from '../shared.js';

export async function installClaudeCode(packageRoot, targetRoot, options) {
  const results = [];

  results.push(await installManagedBlock(packageRoot, targetRoot, 'templates/rules/claude-code/dream-wf-block.md', 'CLAUDE.md', '<!-- DREAM-WF:START -->', '<!-- DREAM-WF:END -->'));
  results.push(await installSkill(packageRoot, targetRoot, '.claude', 'dream-wf-grill-prd'));
  results.push(await installSkill(packageRoot, targetRoot, '.claude', 'dream-wf-mcp-policy'));
  results.push(...await installCommonDreamWfFiles(packageRoot, targetRoot));

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

  const changed = pushUniqueByCommand(settings.hooks.PreToolUse, {
    matcher: '*',
    hooks: [
      {
        type: 'command',
        command: 'python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/dream-wf-guard.py"',
        timeout: 10
      }
    ]
  });

  if (changed) {
    await writeJsonObject(settingsPath, settings);
  }

  return { changed, action: changed ? 'updated' : 'unchanged', path: settingsPath };
}
