export const SUPPORTED_PLATFORMS = new Set(['cursor', 'claude', 'opencode']);

export function normalizePlatform(value) {
  if (!value) {
    return undefined;
  }

  return value.trim().toLowerCase();
}

export function assertSupportedPlatform(platform) {
  if (!platform) {
    throw new Error('Missing required -p <cursor|claude|opencode>.');
  }

  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new Error(`Unsupported platform "${platform}". Use one of: cursor, claude, opencode.`);
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
  assertSupportedPlatform(platform);
}
