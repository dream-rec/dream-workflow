import { mkdir, readFile, writeFile, access, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

export async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readTextIfExists(filePath) {
  if (!(await pathExists(filePath))) {
    return undefined;
  }
  return readFile(filePath, 'utf8');
}

export async function writeTextFile(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
}

export async function writeIfChanged(filePath, contents) {
  const current = await readTextIfExists(filePath);
  if (current === contents) {
    return { changed: false, action: 'unchanged', path: filePath };
  }

  await writeTextFile(filePath, contents);
  return { changed: true, action: current === undefined ? 'created' : 'updated', path: filePath };
}

export async function backupIfExists(filePath) {
  if (!(await pathExists(filePath))) {
    return undefined;
  }

  const backupPath = `${filePath}.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await copyFile(filePath, backupPath);
  return backupPath;
}

export async function appendBlockOnce(filePath, marker, block, options = {}) {
  const existing = await readTextIfExists(filePath);
  if (existing?.includes(marker)) {
    return { changed: false, action: 'unchanged', path: filePath };
  }

  const prefix = existing ? ensureTrailingNewline(existing) : '';
  const next = `${prefix}${options.heading ? `\n${options.heading}\n` : '\n'}${block.trim()}\n`;
  await writeTextFile(filePath, next);
  return { changed: true, action: existing === undefined ? 'created' : 'updated', path: filePath };
}

export function ensureTrailingNewline(value) {
  return value.endsWith('\n') ? value : `${value}\n`;
}

export function formatRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath) || '.';
}
