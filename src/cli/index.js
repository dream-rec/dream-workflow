import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSupportedPlatform, normalizePlatform } from '../lib/platforms.js';
import { ensureTrellisInitialized, installTrellisProfile } from '../lib/trellis.js';
import { formatRelative } from '../lib/files.js';
import { installCursor } from '../platforms/cursor/index.js';
import { installClaudeCode } from '../platforms/claude-code/index.js';
import { installOpenCode } from '../platforms/opencode/index.js';
import { runDoctor, formatDoctorReport } from '../doctor/index.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function run(argv) {
  const { command, options } = parseArgs(argv);

  if (options.help || command === 'help') {
    writeOutput(helpText());
    return;
  }

  if (!command) {
    throw new Error(`Missing command.\n\n${helpText()}`);
  }

  const platform = normalizePlatform(options.platform);
  assertSupportedPlatform(platform);

  const rootDir = process.cwd();
  const mode = options.mode ?? 'strict';
  if (!['strict', 'advisory'].includes(mode)) {
    throw new Error('Invalid --mode. Use strict or advisory.');
  }

  if (command === 'init') {
    await init(rootDir, { ...options, platform, mode });
    return;
  }

  if (command === 'doctor') {
    const report = await runDoctor(rootDir, platform);
    writeOutput(formatDoctorReport(report));
    return;
  }

  if (command === 'update') {
    await init(rootDir, { ...options, platform, mode });
    return;
  }

  if (command === 'uninstall') {
    throw new Error('uninstall is planned but not implemented in this MVP. Remove dream-wf generated files manually if needed.');
  }

  throw new Error(`Unknown command "${command}".\n\n${helpText()}`);
}

async function init(rootDir, options) {
  writeOutput(formatBanner());

  const results = [];
  const trellis = await ensureTrellisInitialized(rootDir, options);

  if (!trellis.initialized) {
    writeOutput([
      'Trellis is not initialized in this project.',
      `Run: ${trellis.initCommand}`,
      'Then rerun dream-wf init.'
    ].join('\n'));
    return;
  }

  results.push(await installTrellisProfile(rootDir));

  if (options.platform === 'cursor') {
    results.push(...await installCursor(packageRoot, rootDir, options));
  }

  if (options.platform === 'claude') {
    results.push(...await installClaudeCode(packageRoot, rootDir, options));
  }

  if (options.platform === 'opencode') {
    results.push(...await installOpenCode(packageRoot, rootDir, options));
  }

  const report = await runDoctor(rootDir, options.platform);
  writeOutput(`${formatInstallReport(rootDir, results)}\n\n${formatDoctorReport(report)}`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--install-deps') {
      options.installDeps = true;
      continue;
    }

    if (arg === '--skip-deps') {
      options.installDeps = false;
      continue;
    }

    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }

    if (arg === '-p') {
      const value = rest[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for -p. Use -p <cursor|claude|opencode>.');
      }
      options.platform = value;
      index += 1;
      continue;
    }

    if (arg === '--mode') {
      options.mode = readOptionValue(arg, rest, index);
      index += 1;
      continue;
    }

    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length);
      continue;
    }

    if (arg === '--developer') {
      options.developer = readOptionValue(arg, rest, index);
      index += 1;
      continue;
    }

    if (arg.startsWith('--developer=')) {
      options.developer = arg.slice('--developer='.length);
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  return { command, options };
}

function readOptionValue(arg, rest, index) {
  const value = rest[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error(`Missing value for ${arg}.`);
  }
  return value;
}

function formatInstallReport(rootDir, results) {
  const lines = ['dream-wf install report:'];
  for (const result of results.flat().filter(Boolean)) {
    const suffix = result.reason ? ` (${result.reason})` : '';
    lines.push(`- ${result.action}: ${formatRelative(rootDir, result.path)}${suffix}`);
  }
  return lines.join('\n');
}

function writeOutput(message) {
  process.stdout.write(`${message}\n`);
}

function formatBanner() {
  const banner = [
    '██████╗ ██████╗ ███████╗ █████╗ ███╗   ███╗',
    '██╔══██╗██╔══██╗██╔════╝██╔══██╗████╗ ████║',
    '██║  ██║██████╔╝█████╗  ███████║██╔████╔██║',
    '██║  ██║██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║',
    '██████╔╝██║  ██║███████╗██║  ██║██║ ╚═╝ ██║',
    '╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝',
    '',
    '  Dream WF · Trellis workflow profile installer'
  ].join('\n');

  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    return banner;
  }

  return `\u001B[35m${banner}\u001B[0m`;
}

function helpText() {
  return `dream-wf\n\nUsage:\n  dream-wf init -p <cursor|claude|opencode> [--mode strict|advisory] [--install-deps --developer <name>]\n  dream-wf doctor -p <cursor|claude|opencode>\n  dream-wf update -p <cursor|claude|opencode>\n\nDefaults:\n  --mode strict\n  project-level install\n\nExamples:\n  npx dream-wf init -p cursor\n  npx dream-wf init -p claude --install-deps --developer ashe\n  npx dream-wf doctor -p opencode`;
}
