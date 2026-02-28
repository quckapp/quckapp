import {
  Environment,
  ApiVersion,
  ServiceName,
  ServiceCategory,
  ResolvedServiceUrl,
  EnvironmentHosts,
} from './types';
import { SERVICE_REGISTRY } from './services';
import { VERSION_CONFIGS, HOST_CONFIGS } from './environments';
import { normalizeVersion } from './version';

/**
 * Resolve the effective API version for a service in a given environment.
 *
 * Priority (highest → lowest):
 *   1. Service-level override
 *   2. Category-level override
 *   3. Environment default version
 *   4. Service default version (from SERVICE_REGISTRY)
 */
export function resolveVersion(
  serviceName: ServiceName,
  environment: Environment,
): ApiVersion {
  const envConfig = VERSION_CONFIGS[environment];
  const serviceDef = SERVICE_REGISTRY.find((s) => s.name === serviceName);

  if (!serviceDef) {
    throw new Error(`Unknown service: "${serviceName}"`);
  }

  // 1. Service-level override
  const serviceOverride = envConfig.serviceOverrides?.[serviceName];
  if (serviceOverride) return normalizeVersion(serviceOverride);

  // 2. Category-level override
  const categoryOverride = envConfig.categoryOverrides?.[serviceDef.category];
  if (categoryOverride) return normalizeVersion(categoryOverride);

  // 3. Environment default
  return normalizeVersion(envConfig.defaultVersion);
}

/**
 * Build the full public-facing API path for a service.
 * e.g. "/api/v1/auth", "/api/v1.1/messages"
 */
export function buildServicePath(basePath: string, version: ApiVersion): string {
  const v = normalizeVersion(version);
  const cleanPath = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return `/api/${v}${cleanPath}`;
}

/**
 * Resolve all URL information for a single service in a given environment.
 */
export function resolveServiceUrl(
  serviceName: ServiceName,
  environment: Environment,
): ResolvedServiceUrl {
  const serviceDef = SERVICE_REGISTRY.find((s) => s.name === serviceName);
  if (!serviceDef) {
    throw new Error(`Unknown service: "${serviceName}"`);
  }

  const version = resolveVersion(serviceName, environment);

  return {
    name: serviceDef.name,
    category: serviceDef.category,
    version,
    paths: serviceDef.paths.map((p) => buildServicePath(p, version)),
    basePaths: [...serviceDef.paths],
  };
}

/**
 * Resolve URLs for ALL services in a given environment.
 */
export function resolveAllServiceUrls(
  environment: Environment,
): ResolvedServiceUrl[] {
  return SERVICE_REGISTRY.map((s) => resolveServiceUrl(s.name, environment));
}

/**
 * Resolve URLs for all services in a given category.
 */
export function resolveServiceUrlsByCategory(
  category: ServiceCategory,
  environment: Environment,
): ResolvedServiceUrl[] {
  return SERVICE_REGISTRY
    .filter((s) => s.category === category)
    .map((s) => resolveServiceUrl(s.name, environment));
}

/**
 * Get the fully-qualified absolute URL for a service endpoint.
 * Combines the environment host with the versioned path.
 *
 * Example: getAbsoluteUrl('auth-service', 'production')
 *   → "https://api.quckapp.io/api/v1/auth"
 */
export function getAbsoluteUrl(
  serviceName: ServiceName,
  environment: Environment,
  pathIndex = 0,
): string {
  const hosts = getHosts(environment);
  const resolved = resolveServiceUrl(serviceName, environment);
  const path = resolved.paths[pathIndex] ?? resolved.paths[0];
  return `${hosts.apiBaseUrl}${path}`;
}

/**
 * Get host configuration for an environment.
 */
export function getHosts(environment: Environment): EnvironmentHosts {
  return HOST_CONFIGS[environment];
}

/**
 * Generate a lookup map of path → version for quick URL resolution.
 * Useful for the api-client package and mobile/web apps.
 *
 * Example output:
 * {
 *   "/auth":          { version: "v1", fullPath: "/api/v1/auth" },
 *   "/messages":      { version: "v1", fullPath: "/api/v1/messages" },
 * }
 */
export function buildServiceUrlMap(
  environment: Environment,
): Record<string, { version: ApiVersion; fullPath: string; serviceName: ServiceName }> {
  const map: Record<string, { version: ApiVersion; fullPath: string; serviceName: ServiceName }> = {};

  for (const service of SERVICE_REGISTRY) {
    const resolved = resolveServiceUrl(service.name, environment);
    for (let i = 0; i < resolved.basePaths.length; i++) {
      map[resolved.basePaths[i]] = {
        version: resolved.version,
        fullPath: resolved.paths[i],
        serviceName: service.name,
      };
    }
  }

  return map;
}
