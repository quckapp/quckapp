import { ApiVersion } from './types';

/**
 * Parse a version string into its numeric parts.
 * Accepts: "v1", "v1.1", "v2", "v2.0.1"
 */
export function parseVersion(version: ApiVersion): { major: number; minor: number; patch: number } {
  const raw = version.replace(/^v/i, '');
  const parts = raw.split('.').map(Number);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
}

/**
 * Format version parts back into a version string.
 * "v1", "v1.1", "v2.0.1"
 */
export function formatVersion(major: number, minor = 0, patch = 0): ApiVersion {
  if (patch > 0) return `v${major}.${minor}.${patch}`;
  if (minor > 0) return `v${major}.${minor}`;
  return `v${major}`;
}

/**
 * Compare two version strings.
 * Returns  1 if a > b,  -1 if a < b,  0 if equal.
 */
export function compareVersions(a: ApiVersion, b: ApiVersion): -1 | 0 | 1 {
  const pa = parseVersion(a);
  const pb = parseVersion(b);

  if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1;
  if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1;
  if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1;
  return 0;
}

/**
 * Check whether a version string is valid.
 */
export function isValidVersion(version: string): boolean {
  return /^v?\d+(\.\d+){0,2}$/.test(version);
}

/**
 * Normalise a version string so it always starts with "v".
 */
export function normalizeVersion(version: string): ApiVersion {
  const v = version.startsWith('v') ? version : `v${version}`;
  if (!isValidVersion(v)) {
    throw new Error(`Invalid API version: "${version}". Expected format: v1, v1.1, v2.0.1`);
  }
  return v;
}
