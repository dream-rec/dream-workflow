import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readTextIfExists, writeIfChanged, writeTextFile } from '../lib/files.js';

export async function installSkill(packageRoot, targetRoot, platformDir, skillName) {
  const sourcePath = path.join(packageRoot, 'templates', 'skills', skillName, 'SKILL.md');
  const targetPath = path.join(targetRoot, platformDir, 'skills', skillName, 'SKILL.md');
  const contents = await readFile(sourcePath, 'utf8');
  return writeIfChanged(targetPath, contents);
}

export async function installSpecGuide(packageRoot, targetRoot, fileName) {
  const sourcePath = path.join(packageRoot, 'templates', 'spec', 'guides', fileName);
  const targetPath = path.join(targetRoot, '.trellis', 'spec', 'guides', fileName);
  const contents = await readFile(sourcePath, 'utf8');
  return writeIfChanged(targetPath, contents);
}

export async function installCommonDreamWfFiles(packageRoot, targetRoot) {
  return [
    await installSpecGuide(packageRoot, targetRoot, 'dream-wf-prd-policy.md'),
    await installSpecGuide(packageRoot, targetRoot, 'dream-wf-mcp-policy.md')
  ];
}

export async function installRuleFile(packageRoot, targetRoot, sourceRelativePath, targetRelativePath) {
  const contents = await readFile(path.join(packageRoot, sourceRelativePath), 'utf8');
  return writeIfChanged(path.join(targetRoot, targetRelativePath), contents);
}

export async function installManagedBlock(packageRoot, targetRoot, sourceRelativePath, targetRelativePath, startMarker, endMarker) {
  const block = await readFile(path.join(packageRoot, sourceRelativePath), 'utf8');
  const targetPath = path.join(targetRoot, targetRelativePath);
  const existing = await readTextIfExists(targetPath);

  if (!existing) {
    await writeTextFile(targetPath, block);
    return { changed: true, action: 'created', path: targetPath };
  }

  const start = existing.indexOf(startMarker);
  const end = existing.indexOf(endMarker);
  let next;

  if (start !== -1 && end !== -1 && end > start) {
    const afterEnd = end + endMarker.length;
    next = `${existing.slice(0, start)}${block.trim()}${existing.slice(afterEnd)}`;
  } else {
    next = `${existing.trimEnd()}\n\n${block.trim()}\n`;
  }

  if (next === existing) {
    return { changed: false, action: 'unchanged', path: targetPath };
  }

  await writeTextFile(targetPath, next);
  return { changed: true, action: 'updated', path: targetPath };
}
