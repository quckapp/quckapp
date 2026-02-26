/**
 * Configuration for the API version middleware.
 *
 * @remarks
 * Mirrors the configuration shape used by the Go and Python version middleware
 * packages to keep behavior consistent across all QuckApp services.
 */
export interface VersionConfig {
  /** Identifies the service for environment variable lookups (e.g. "workspace"). */
  serviceKey: string;

  /** API versions that are fully supported. */
  activeVersions: string[];

  /** API versions that still work but are deprecated. */
  deprecatedVersions: string[];

  /**
   * Maps version strings to sunset ISO dates (e.g. `{ "v1": "2026-06-01" }`).
   */
  sunsetConfig: Record<string, string>;

  /** The version to advertise as the successor in deprecation headers. */
  defaultVersion: string;

  /**
   * Controls validation behavior.
   * - `"local"` skips validation (useful for development).
   * - `"deployed"` enforces version checks.
   */
  versionMode: 'local' | 'deployed';
}

/**
 * Build a {@link VersionConfig} from environment variables.
 *
 * The function checks service-specific env vars first (e.g.
 * `WORKSPACE_SUPPORTED_VERSIONS`) then falls back to generic ones
 * (e.g. `SUPPORTED_VERSIONS`).
 *
 * Environment variables:
 * - `SUPPORTED_VERSIONS` / `{KEY}_SUPPORTED_VERSIONS`: comma-separated active versions
 * - `DEPRECATED_VERSIONS` / `{KEY}_DEPRECATED_VERSIONS`: comma-separated deprecated versions
 * - `SUNSET_CONFIG` / `{KEY}_SUNSET_CONFIG`: format `"v1:2026-06-01,v2:2026-12-01"`
 * - `API_VERSION`: default version (falls back to `"v1"`)
 * - `VERSION_MODE`: `"local"` or `"deployed"` (falls back to `"local"`)
 */
export function configFromEnv(serviceKey: string): VersionConfig {
  const key = serviceKey.toUpperCase().replace(/-/g, '_');

  // Active versions
  const supportedRaw = envWithFallback(
    `${key}_SUPPORTED_VERSIONS`,
    'SUPPORTED_VERSIONS',
  );
  const activeVersions = supportedRaw ? splitCsv(supportedRaw) : [];

  // Deprecated versions
  const deprecatedRaw = envWithFallback(
    `${key}_DEPRECATED_VERSIONS`,
    'DEPRECATED_VERSIONS',
  );
  const deprecatedVersions = deprecatedRaw ? splitCsv(deprecatedRaw) : [];

  // Sunset config
  const sunsetRaw = envWithFallback(`${key}_SUNSET_CONFIG`, 'SUNSET_CONFIG');
  const sunsetConfig = sunsetRaw ? parseSunsetConfig(sunsetRaw) : {};

  // Default version
  const defaultVersion = process.env['API_VERSION'] || 'v1';

  // Version mode
  const versionMode =
    (process.env['VERSION_MODE'] as 'local' | 'deployed') || 'local';

  // If no versions configured at all, default to the default version
  const finalActiveVersions =
    activeVersions.length === 0 && deprecatedVersions.length === 0
      ? [defaultVersion]
      : activeVersions;

  return {
    serviceKey,
    activeVersions: finalActiveVersions,
    deprecatedVersions,
    sunsetConfig,
    defaultVersion,
    versionMode,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function envWithFallback(primary: string, fallback: string): string {
  const val = process.env[primary] || '';
  if (val) return val;
  return process.env[fallback] || '';
}

function splitCsv(s: string): string[] {
  return s
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseSunsetConfig(s: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of s.split(',')) {
    const trimmed = pair.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();
    if (key && val) {
      result[key] = val;
    }
  }
  return result;
}
