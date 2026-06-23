import path from 'node:path';
import { pathExists, readTextIfExists, writeTextFile } from './files.js';
import { readJsonObject, writeJsonObject } from './json.js';

// 把一个 mcp catalog 条目规范化成可写入的 server 描述对象。
// 去掉 catalog 里的 type 字段时保留 type（如果原始 server 已带），并保证字段顺序稳定。
function normalizeServer(entry) {
  const server = entry.server;
  const out = {};
  if (server.type) {
    out.type = server.type;
  }
  out.command = server.command;
  if (Array.isArray(server.args)) {
    out.args = server.args;
  }
  if (server.env && Object.keys(server.env).length > 0) {
    out.env = server.env;
  }
  return out;
}

// Cursor: .cursor/mcp.json -> { mcpServers: { name: {...} } }
async function installCursorMcp(rootDir, mcpEntries) {
  const configPath = path.join(rootDir, '.cursor', 'mcp.json');
  const config = await readJsonObject(configPath, { mcpServers: {} });
  config.mcpServers = config.mcpServers ?? {};

  let changed = false;
  for (const entry of mcpEntries) {
    const server = normalizeServer(entry);
    if (!deepEqual(config.mcpServers[entry.name], server)) {
      config.mcpServers[entry.name] = server;
      changed = true;
    }
  }

  if (changed) {
    await writeJsonObject(configPath, config);
  }
  return { changed, action: changed ? 'updated' : 'unchanged', path: configPath };
}

// Claude Code: .mcp.json -> { mcpServers: { name: {...} } }
async function installClaudeMcp(rootDir, mcpEntries) {
  const configPath = path.join(rootDir, '.mcp.json');
  const config = await readJsonObject(configPath, { mcpServers: {} });
  config.mcpServers = config.mcpServers ?? {};

  let changed = false;
  for (const entry of mcpEntries) {
    const server = normalizeServer(entry);
    if (!deepEqual(config.mcpServers[entry.name], server)) {
      config.mcpServers[entry.name] = server;
      changed = true;
    }
  }

  if (changed) {
    await writeJsonObject(configPath, config);
  }
  return { changed, action: changed ? 'updated' : 'unchanged', path: configPath };
}

// OpenCode: opencode.json -> { mcp: { servers: { name: {...} } } }
async function installOpenCodeMcp(rootDir, mcpEntries) {
  const configPath = path.join(rootDir, 'opencode.json');
  const config = await readJsonObject(configPath, { mcp: { servers: {} } });
  config.mcp = config.mcp ?? {};
  config.mcp.servers = config.mcp.servers ?? {};

  let changed = false;
  for (const entry of mcpEntries) {
    const server = normalizeServer(entry);
    if (!deepEqual(config.mcp.servers[entry.name], server)) {
      config.mcp.servers[entry.name] = server;
      changed = true;
    }
  }

  if (changed) {
    await writeJsonObject(configPath, config);
  }
  return { changed, action: changed ? 'updated' : 'unchanged', path: configPath };
}

// Codex: ~/.codex/config.toml 的 [mcp_servers.<name>] 段。
// 项目级 Codex 配置也支持放到 .codex/config.toml（Codex CLI 0.8+ 读取项目目录）。
async function installCodexMcp(rootDir, mcpEntries) {
  const configPath = path.join(rootDir, '.codex', 'config.toml');
  const existing = await readTextIfExists(configPath);
  const lines = existing ? existing.split('\n') : [];

  let working = [...lines];

  for (const entry of mcpEntries) {
    const block = renderCodexServerBlock(entry);
    const marker = `[mcp_servers.${entry.name}]`;
    const next = replaceOrAppendTomlBlock(working, marker, block);
    working = next.lines;
  }

  // 规范化：去掉末尾空行后再统一加一个尾换行。
  while (working.length > 0 && working[working.length - 1] === '') {
    working.pop();
  }
  const normalized = [...working, ''].join('\n');
  const original = existing ? `${existing.replace(/\s+$/, '')}\n` : '';

  const changed = normalized !== original;
  if (changed) {
    await writeTextFile(configPath, normalized);
  }
  return { changed, action: changed ? (existing ? 'updated' : 'created') : 'unchanged', path: configPath };
}

function renderCodexServerBlock(entry) {
  const server = entry.server;
  const out = [`[mcp_servers.${entry.name}]`];
  out.push(`command = ${tomlString(server.command)}`);
  if (Array.isArray(server.args) && server.args.length > 0) {
    out.push(`args = [${server.args.map(tomlString).join(', ')}]`);
  }
  if (server.env && Object.keys(server.env).length > 0) {
    out.push(`[mcp_servers.${entry.name}.env]`);
    for (const [key, value] of Object.entries(server.env)) {
      out.push(`${key} = ${tomlString(value)}`);
    }
  }
  return out.join('\n');
}

function replaceOrAppendTomlBlock(lines, marker, blockText) {
  const start = lines.findIndex((line) => line.trim() === marker.trim());
  if (start === -1) {
    const newLines = [...lines];
    if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
      newLines.push('');
    }
    newLines.push(blockText, '');
    return { changed: true, lines: newLines };
  }

  // 找到该块的结束位置：下一个顶层 [ 开头的行或文件末尾。
  let end = start + 1;
  while (end < lines.length) {
    const trimmed = lines[end].trim();
    if (trimmed.startsWith('[') && !trimmed.startsWith('[mcp_servers.') || trimmed === marker) {
      break;
    }
    if (trimmed.startsWith('[') && !trimmed.startsWith(`[mcp_servers.${extractTableName(marker)}.`)) {
      break;
    }
    end += 1;
  }

  const blockLines = blockText.split('\n');
  const before = lines.slice(0, start);
  const after = lines.slice(end);
  const next = [...before, ...blockLines, '', ...after];
  return { changed: true, lines: next };
}

function extractTableName(marker) {
  const match = marker.match(/^\[mcp_servers\.([^\].]+)\]$/);
  return match ? match[1] : '';
}

function tomlString(value) {
  if (typeof value !== 'string') {
    return String(value);
  }
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function deepEqual(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortKeys(value[key]);
      return acc;
    }, {});
  }
  return value;
}

const INSTALLERS = {
  cursor: installCursorMcp,
  claude: installClaudeMcp,
  opencode: installOpenCodeMcp,
  codex: installCodexMcp
};

export async function installMcpServers(rootDir, platform, mcpEntries) {
  const installer = INSTALLERS[platform];
  if (!installer) {
    throw new Error(`MCP install is not supported for platform "${platform}".`);
  }
  return installer(rootDir, mcpEntries);
}

// 读取已存在的 mcp 配置，用于 doctor 检查。
export async function readMcpServers(rootDir, platform) {
  switch (platform) {
    case 'cursor': {
      const config = await readJsonObject(path.join(rootDir, '.cursor', 'mcp.json'), { mcpServers: {} });
      return config.mcpServers ?? {};
    }
    case 'claude': {
      const config = await readJsonObject(path.join(rootDir, '.mcp.json'), { mcpServers: {} });
      return config.mcpServers ?? {};
    }
    case 'opencode': {
      const config = await readJsonObject(path.join(rootDir, 'opencode.json'), { mcp: { servers: {} } });
      return config.mcp?.servers ?? {};
    }
    case 'codex': {
      const text = await readTextIfExists(path.join(rootDir, '.codex', 'config.toml'));
      return parseCodexMcpServers(text ?? '');
    }
    default:
      return {};
  }
}

function parseCodexMcpServers(text) {
  const servers = {};
  const lines = text.split('\n');
  let currentName = null;
  let inEnv = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const head = trimmed.match(/^\[mcp_servers\.([^\].]+)\]$/);
    if (head) {
      currentName = head[1];
      servers[currentName] = {};
      inEnv = false;
      continue;
    }
    if (currentName && trimmed.startsWith(`[mcp_servers.${currentName}.env]`)) {
      servers[currentName].env = {};
      inEnv = true;
      continue;
    }
    if (currentName && trimmed.startsWith('[')) {
      currentName = null;
      inEnv = false;
      continue;
    }
    if (!currentName) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    const value = parseTomlValue(rawValue);
    if (inEnv) {
      servers[currentName].env[key] = value;
    } else if (key === 'args' && Array.isArray(value)) {
      servers[currentName].args = value;
    } else {
      servers[currentName][key] = value;
    }
  }
  return servers;
}

function parseTomlValue(raw) {
  const value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return inner.split(',').map((item) => parseTomlValue(item.trim())).filter((item) => item !== undefined);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return value;
}

export async function mcpConfigExists(rootDir, platform) {
  switch (platform) {
    case 'cursor':
      return pathExists(path.join(rootDir, '.cursor', 'mcp.json'));
    case 'claude':
      return pathExists(path.join(rootDir, '.mcp.json'));
    case 'opencode':
      return pathExists(path.join(rootDir, 'opencode.json'));
    case 'codex':
      return pathExists(path.join(rootDir, '.codex', 'config.toml'));
    default:
      return false;
  }
}
