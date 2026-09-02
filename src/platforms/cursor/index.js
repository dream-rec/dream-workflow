import path from 'node:path';
import process from 'node:process';
import { readFile, chmod } from 'node:fs/promises';
import { readJsonObject, writeJsonObject, pushUniqueByCommand } from '../../lib/json.js';
import { writeIfChanged } from '../../lib/files.js';
import { installCommonDreamWfFiles, installRuleFile, installSelectedSkills } from '../shared.js';
import { installMcpServers } from '../../lib/mcp.js';

export async function installCursor(packageRoot, targetRoot, options) {
  const results = [];

  results.push(await installRuleFile(packageRoot, targetRoot, 'templates/rules/cursor/dream-wf.mdc', '.cursor/rules/dream-wf.mdc'));
  results.push(...await installSelectedSkills(packageRoot, targetRoot, '.cursor', options.skills));
  results.push(...await installCommonDreamWfFiles(packageRoot, targetRoot));

  if (options.mcps && options.mcps.length > 0) {
    results.push(await installMcpServers(targetRoot, 'cursor', options.mcps));
  }

  if (options.mode === 'strict') {
    results.push(await installCursorHook(packageRoot, targetRoot));
    results.push(await mergeCursorHooks(targetRoot));
  }

  return results;
}

async function installCursorHook(packageRoot, targetRoot) {
  const sourcePath = path.join(packageRoot, 'templates', 'hooks', 'cursor', 'dream-wf-guard.py');
  const targetPath = path.join(targetRoot, '.cursor', 'hooks', 'dream-wf-guard.py');
  const contents = await readFile(sourcePath, 'utf8');
  const result = await writeIfChanged(targetPath, contents);
  if (process.platform !== 'win32') {
    await chmod(targetPath, 0o755);
  }
  return result;
}

async function mergeCursorHooks(rootDir) {
  const hooksPath = path.join(rootDir, '.cursor', 'hooks.json');
  const hooks = await readJsonObject(hooksPath, { version: 1, hooks: {} });
  hooks.version = hooks.version ?? 1;
  hooks.hooks = hooks.hooks ?? {};
  hooks.hooks.preToolUse = hooks.hooks.preToolUse ?? [];

  const changed = pushUniqueByCommand(hooks.hooks.preToolUse, {
    command: '.cursor/hooks/dream-wf-guard.py',
    failClosed: true,
    timeout: 10
  });

  if (changed) {
    await writeJsonObject(hooksPath, hooks);
  }

  return { changed, action: changed ? 'updated' : 'unchanged', path: hooksPath };
}
