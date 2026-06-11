import { readTextIfExists, writeTextFile } from './files.js';

export async function readJsonObject(filePath, fallback = {}) {
  const text = await readTextIfExists(filePath);
  if (!text) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${error.message}`);
  }
}

export async function writeJsonObject(filePath, value) {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function pushUniqueByCommand(items, candidate) {
  const command = extractCommand(candidate);
  if (command && items.some((item) => extractCommand(item) === command)) {
    return false;
  }
  items.push(candidate);
  return true;
}

function extractCommand(item) {
  if (!item || typeof item !== 'object') {
    return undefined;
  }

  if (typeof item.command === 'string') {
    return item.command;
  }

  if (Array.isArray(item.hooks) && item.hooks.length > 0) {
    return item.hooks.map((hook) => hook?.command).filter(Boolean).join('|');
  }

  return undefined;
}
