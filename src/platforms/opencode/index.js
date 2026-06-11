import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { writeIfChanged } from '../../lib/files.js';
import { installCommonDreamWfFiles, installManagedBlock, installSkill } from '../shared.js';

export async function installOpenCode(packageRoot, targetRoot, options) {
  const results = [];

  results.push(await installManagedBlock(packageRoot, targetRoot, 'templates/rules/opencode/dream-wf-block.md', 'AGENTS.md', '<!-- DREAM-WF:START -->', '<!-- DREAM-WF:END -->'));
  results.push(await installSkill(packageRoot, targetRoot, '.opencode', 'dream-wf-grill-prd'));
  results.push(await installSkill(packageRoot, targetRoot, '.opencode', 'dream-wf-mcp-policy'));
  results.push(...await installCommonDreamWfFiles(packageRoot, targetRoot));

  if (options.mode === 'strict') {
    results.push(await installOpenCodePlugin(packageRoot, targetRoot));
  }

  return results;
}

async function installOpenCodePlugin(packageRoot, targetRoot) {
  const sourcePath = path.join(packageRoot, 'templates', 'hooks', 'opencode', 'dream-wf-guard.js');
  const targetPath = path.join(targetRoot, '.opencode', 'plugins', 'dream-wf-guard.js');
  const contents = await readFile(sourcePath, 'utf8');
  return writeIfChanged(targetPath, contents);
}
