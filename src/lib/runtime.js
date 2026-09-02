import { delimiter, extname, join } from 'node:path';
import process from 'node:process';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export function executableCandidates(command, platform = process.platform) {
  if (platform !== 'win32' || extname(command)) {
    return [command];
  }
  return [`${command}.cmd`, `${command}.exe`, `${command}.bat`, command];
}

export function resolveCommand(command, options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const pathValue = options.pathValue ?? env.PATH ?? env.Path ?? env.path ?? '';
  const separator = options.delimiter ?? (platform === 'win32' ? ';' : delimiter);
  const candidates = executableCandidates(command, platform);

  for (const directory of pathValue.split(separator).filter(Boolean)) {
    for (const candidate of candidates) {
      const filePath = join(directory.replace(/^"|"$/g, ''), candidate);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
  }
  return undefined;
}

export function commandExists(command, options) {
  return Boolean(resolveCommand(command, options));
}

export function commandForPlatform(command, platform = process.platform) {
  if (platform === 'win32' && !extname(command)) {
    return `${command}.cmd`;
  }
  return command;
}

export function runCommand(command, args, options = {}) {
  const executable = options.resolve === false ? command : resolveCommand(command, options) ?? commandForPlatform(command, options.platform);
  const isWindowsShim = (options.platform ?? process.platform) === 'win32' && /\.(cmd|bat)$/i.test(executable);
  const result = spawnSync(executable, args, {
    stdio: options.stdio ?? 'inherit',
    encoding: options.encoding,
    cwd: options.cwd,
    env: options.env,
    shell: options.shell ?? isWindowsShim,
    windowsHide: true
  });

  if (result.error) {
    throw new Error(`无法运行 ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} 执行失败（退出码 ${result.status ?? 'unknown'}）。`);
  }
  return result;
}

export function pythonCommand(options) {
  if (commandExists('python3', options)) {
    return 'python3';
  }
  if (commandExists('python', options)) {
    return 'python';
  }
  return undefined;
}

export function projectPythonCommand(relativeScript, options) {
  const platform = options?.platform ?? process.platform;
  const python = pythonCommand(options) ?? (platform === 'win32' ? 'python' : 'python3');
  return `${python} -X utf8 ${relativeScript}`;
}
