import path from 'node:path';
import process from 'node:process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathExists } from '../../lib/files.js';
import { installCommonDreamWfFiles, installManagedBlock, installSelectedSkills } from '../shared.js';
import { installMcpServers } from '../../lib/mcp.js';

const PI_PACKAGES = [
  'npm:pi-tool-display@0.5.0',
  'npm:pi-nano-context@0.1.1',
  'npm:pi-cometix-footer@1.1.1',
  'npm:pi-mcp-adapter@2.15.0',
  'npm:@arcaneorion/pi-provider-manager@0.3.9',
];

const PI_CLI = '@earendil-works/pi-coding-agent@0.82.1';
const NANO_CONTEXT_FOOTER = /ctx\.ui\.setFooter\(\(_tui,\s*theme,\s*footerData\)\s*=>\s*\(\{[\s\S]*?renderFooter\(pi,\s*ctx,\s*footerData,\s*width,\s*theme\),[\s\S]*?\}\)\);/;
const NANO_CONTEXT_FOOTER_CLEANUP = /ctx\.ui\.setFooter\(undefined\);/;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status ?? 'unknown'}).`);
  }
}

export async function installPiProject(packageRoot, targetRoot, options) {
  const results = [];
  results.push(await installManagedBlock(packageRoot, targetRoot, 'templates/rules/codex/dream-wf-block.md', 'AGENTS.md', '<!-- DREAM-WF:START -->', '<!-- DREAM-WF:END -->'));
  results.push(...await installSelectedSkills(packageRoot, targetRoot, '.agents', options.skills));
  results.push(...await installCommonDreamWfFiles(packageRoot, targetRoot));

  // pi-mcp-adapter 原生读取项目根 .mcp.json；使用共享格式也方便其他客户端复用。
  if (options.mcps && options.mcps.length > 0) {
    results.push(await installMcpServers(targetRoot, 'pi', options.mcps));
  }
  return results;
}

export async function repairNanoContextFooter(agentDir) {
  const nanoPath = path.join(agentDir, 'npm', 'node_modules', 'pi-nano-context', 'index.ts');
  if (!(await pathExists(nanoPath))) {
    throw new Error(`pi-nano-context entrypoint not found: ${nanoPath}`);
  }

  const source = await readFile(nanoPath, 'utf8');
  const next = source
    .replace(NANO_CONTEXT_FOOTER, '')
    .replace(NANO_CONTEXT_FOOTER_CLEANUP, '');

  if (next !== source) {
    await writeFile(nanoPath, next, 'utf8');
    return { changed: true, action: 'updated', path: nanoPath };
  }
  if (!source.includes('ctx.ui.setFooter(')) {
    return { changed: false, action: 'unchanged', path: nanoPath };
  }
  throw new Error(`Unable to safely repair pi-nano-context footer conflict: ${nanoPath}`);
}

export async function repairProviderManagerManifest(agentDir) {
  const packagePath = path.join(agentDir, 'npm', 'node_modules', '@arcaneorion', 'pi-provider-manager', 'package.json');
  if (!(await pathExists(packagePath))) {
    throw new Error(`pi-provider-manager package.json not found: ${packagePath}`);
  }

  // 0.3.9 发布包遗漏了本应加入的 pi manifest（上游补丁中的“+”行未正确进入包）。
  // 显式指定唯一聚合入口，避免 Pi 按约定扫描 extensions/ 后重复或错误加载子模块。
  const manifest = JSON.parse(await readFile(packagePath, 'utf8'));
  const expected = ['./index.ts'];
  if (JSON.stringify(manifest.pi?.extensions) === JSON.stringify(expected)) {
    return { changed: false, action: 'unchanged', path: packagePath };
  }
  manifest.pi = { ...(manifest.pi ?? {}), extensions: expected };
  await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { changed: true, action: 'updated', path: packagePath };
}

export async function installPi() {
  run('npm', ['install', '-g', '--ignore-scripts', PI_CLI]);
  for (const spec of PI_PACKAGES) run('pi', ['install', spec]);

  const agentDir = process.env.PI_CODING_AGENT_DIR || path.join(process.env.HOME || '', '.pi', 'agent');
  const footerRepair = await repairNanoContextFooter(agentDir);
  const providerManagerRepair = await repairProviderManagerManifest(agentDir);
  return [
    { changed: true, action: 'installed', path: agentDir },
    footerRepair,
    providerManagerRepair,
  ];
}

export async function ensurePiConfig() {
  const agentDir = process.env.PI_CODING_AGENT_DIR || path.join(process.env.HOME || '', '.pi', 'agent');
  await mkdir(agentDir, { recursive: true });

  const settingsPath = path.join(agentDir, 'settings.json');
  let settings = {};
  if (await pathExists(settingsPath)) {
    settings = JSON.parse(await readFile(settingsPath, 'utf8'));
  }
  const nextSettings = {
    ...settings,
    theme: settings.theme ?? 'dark',
    defaultProvider: settings.defaultProvider ?? 'agentrouter',
    defaultModel: settings.defaultModel ?? 'gpt-5.6-sol',
  };
  const settingsChanged = JSON.stringify(settings) !== JSON.stringify(nextSettings);
  if (settingsChanged) {
    await writeFile(settingsPath, `${JSON.stringify(nextSettings, null, 2)}\n`, 'utf8');
  }

  const modelsPath = path.join(agentDir, 'models.json');
  if (await pathExists(modelsPath)) {
    return { changed: settingsChanged, action: settingsChanged ? 'updated' : 'unchanged', path: agentDir };
  }
  const models = {
    providers: {
      agentrouter: {
        baseUrl: 'https://agentrouter.org/v1',
        api: 'openai-completions',
        apiKey: '$AGENTROUTER_API_KEY',
        models: [{ id: 'gpt-5.6-sol', name: 'gpt-5.6-sol' }],
      },
    },
  };
  await writeFile(modelsPath, `${JSON.stringify(models, null, 2)}\n`, 'utf8');
  return { changed: true, action: 'created', path: agentDir };
}

export { PI_PACKAGES, PI_CLI };
