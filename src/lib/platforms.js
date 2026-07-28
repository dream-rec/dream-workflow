export const SUPPORTED_PLATFORMS = new Set(['cursor', 'claude', 'opencode', 'codex', 'pi']);

export const PLATFORM_LABELS = {
  cursor: 'Cursor',
  claude: 'Claude Code',
  opencode: 'OpenCode',
  codex: 'Codex',
  pi: 'Pi'
};

export function normalizePlatform(value) {
  if (!value) {
    return undefined;
  }

  return value.trim().toLowerCase();
}

export function assertSupportedPlatform(platform) {
  if (!platform) {
    throw new Error('Missing required -p <cursor|claude|opencode|codex|pi>.');
  }

  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new Error(`Unsupported platform "${platform}". Use one of: cursor, claude, opencode, codex, pi.`);
  }
}

export function trellisPlatformFlag(platform) {
  if (platform === 'claude') {
    return '--claude';
  }
  if (platform === 'cursor') {
    return '--cursor';
  }
  if (platform === 'opencode') {
    return '--opencode';
  }
  if (platform === 'codex') {
    return '--codex';
  }
  if (platform === 'pi') {
    return '--pi';
  }
  assertSupportedPlatform(platform);
}
