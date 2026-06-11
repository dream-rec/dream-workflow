import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathExists, readTextIfExists } from '../lib/files.js';
import { commandExists } from '../lib/trellis.js';

export async function checkDependencies(rootDir, platform) {
  const checks = [];

  checks.push(binaryCheck('node', 'Node.js >= 18 is required.'));
  checks.push(binaryCheck('python3', 'Python >= 3.9 is required by Trellis.'));
  checks.push(binaryCheck('trellis', 'Install with: npm install -g @mindfoldhq/trellis@latest'));
  checks.push(binaryCheck('uvx', 'Required for grok-search-mcp. Install uv: https://docs.astral.sh/uv/'));

  checks.push(await fileCheck(path.join(rootDir, '.trellis'), 'Trellis project directory'));
  checks.push(await fileCheck(path.join(rootDir, '.trellis', 'workflow.md'), 'Trellis workflow'));

  if (platform === 'cursor') {
    checks.push(await fileCheck(path.join(rootDir, '.cursor', 'rules', 'dream-wf.mdc'), 'Cursor dream-wf always-on rule'));
    checks.push(await fileCheck(path.join(rootDir, '.cursor', 'skills', 'dream-wf-grill-prd', 'SKILL.md'), 'Cursor dream-wf grill PRD skill'));
    checks.push(await fileCheck(path.join(rootDir, '.cursor', 'skills', 'dream-wf-mcp-policy', 'SKILL.md'), 'Cursor dream-wf MCP policy skill'));
  }

  if (platform === 'claude') {
    checks.push(await contentCheck(path.join(rootDir, 'CLAUDE.md'), '<!-- DREAM-WF:START -->', 'Claude Code dream-wf entry block'));
    checks.push(await fileCheck(path.join(rootDir, '.claude', 'skills', 'dream-wf-grill-prd', 'SKILL.md'), 'Claude Code dream-wf grill PRD skill'));
    checks.push(await fileCheck(path.join(rootDir, '.claude', 'skills', 'dream-wf-mcp-policy', 'SKILL.md'), 'Claude Code dream-wf MCP policy skill'));
  }

  if (platform === 'opencode') {
    checks.push(await contentCheck(path.join(rootDir, 'AGENTS.md'), '<!-- DREAM-WF:START -->', 'OpenCode dream-wf entry block'));
    checks.push(await fileCheck(path.join(rootDir, '.opencode', 'skills', 'dream-wf-grill-prd', 'SKILL.md'), 'OpenCode dream-wf grill PRD skill'));
    checks.push(await fileCheck(path.join(rootDir, '.opencode', 'skills', 'dream-wf-mcp-policy', 'SKILL.md'), 'OpenCode dream-wf MCP policy skill'));
  }

  checks.push(await secretScan(rootDir));

  return checks;
}

function binaryCheck(command, hint) {
  return {
    name: command,
    ok: commandExists(command),
    hint
  };
}

async function fileCheck(filePath, label) {
  return {
    name: label,
    ok: await pathExists(filePath),
    hint: `Missing ${filePath}`
  };
}

async function contentCheck(filePath, needle, label) {
  const text = await readTextIfExists(filePath);
  return {
    name: label,
    ok: Boolean(text?.includes(needle)),
    hint: `Missing ${needle} in ${filePath}`
  };
}

async function secretScan(rootDir) {
  const boardPath = path.join(rootDir, 'board.md');
  const text = await readTextIfExists(boardPath);
  if (!text) {
    return { name: 'secret scan', ok: true, hint: 'No obvious project secret sample file found.' };
  }

  const suspicious = [
    /GROK_API_KEY\s*[:=]/,
    /TAVILY_API_KEY\s*[:=]/,
    /WINDSURF_API_KEY\s*[:=]/,
    /devin-session-/,
    /tvly-[A-Za-z0-9_-]+/
  ];

  const hasSuspiciousContent = suspicious.some((pattern) => pattern.test(text));
  return {
    name: 'secret scan',
    ok: !hasSuspiciousContent,
    hint: hasSuspiciousContent ? 'Potential MCP secrets found in board.md. Do not commit real API keys.' : 'No obvious MCP secrets detected.'
  };
}

export function installTrellisIfRequested() {
  const result = spawnSync('npm', ['install', '-g', '@mindfoldhq/trellis@latest'], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`Failed to install Trellis with npm, exit code ${result.status ?? 'unknown'}.`);
  }
}
