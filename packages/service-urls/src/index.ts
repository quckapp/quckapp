/**
 * @quckapp/service-urls
 *
 * Centralized API service URL configuration with semantic versioning
 * and per-environment version management.
 *
 * Usage:
 *
 *   import {
 *     resolveServiceUrl,
 *     getAbsoluteUrl,
 *     buildServiceUrlMap,
 *   } from '@quckapp/service-urls';
 *
 *   // Get the versioned path for auth-service in production
 *   const auth = resolveServiceUrl('auth-service', 'production');
 *   // → { name: 'auth-service', version: 'v1', paths: ['/api/v1/auth'], ... }
 *
 *   // Get full absolute URL
 *   const url = getAbsoluteUrl('auth-service', 'production');
 *   // → "https://api.quckapp.io/api/v1/auth"
 *
 *   // Get a complete map for the api-client
 *   const map = buildServiceUrlMap('staging');
 *   // → { "/auth": { version: "v1", fullPath: "/api/v1/auth", ... }, ... }
 */

// ── Types ────────────────────────────────────────────────────────────────
export type {
  Environment,
  ApiVersion,
  ServiceCategory,
  ServiceName,
  ServiceDefinition,
  EnvironmentVersionConfig,
  ResolvedServiceUrl,
  EnvironmentHosts,
} from './types';

// ── Service Registry ─────────────────────────────────────────────────────
export { SERVICE_REGISTRY } from './services';

// ── Version Utilities ────────────────────────────────────────────────────
export {
  parseVersion,
  formatVersion,
  compareVersions,
  isValidVersion,
  normalizeVersion,
} from './version';

// ── Environment Configs ──────────────────────────────────────────────────
export { VERSION_CONFIGS, HOST_CONFIGS } from './environments';

// ── Core Resolver ────────────────────────────────────────────────────────
export {
  resolveVersion,
  buildServicePath,
  resolveServiceUrl,
  resolveAllServiceUrls,
  resolveServiceUrlsByCategory,
  getAbsoluteUrl,
  getHosts,
  buildServiceUrlMap,
} from './config';
