/**
 * Supported deployment environments.
 */
export type Environment =
  | 'local'
  | 'dev'
  | 'qa'
  | 'uat1'
  | 'uat2'
  | 'uat3'
  | 'staging'
  | 'production';

/**
 * Semantic version string (e.g. "v1", "v1.1", "v2").
 */
export type ApiVersion = string;

/**
 * Logical service group for categorised version management.
 */
export type ServiceCategory =
  | 'auth'
  | 'user'
  | 'workspace'
  | 'messaging'
  | 'realtime'
  | 'media'
  | 'notification'
  | 'analytics'
  | 'ai'
  | 'data'
  | 'bff';

/**
 * Unique service identifier — every micro-service in the platform.
 */
export type ServiceName =
  | 'auth-service'
  | 'permission-service'
  | 'security-service'
  | 'user-service'
  | 'admin-service'
  | 'audit-service'
  | 'workspace-service'
  | 'channel-service'
  | 'thread-service'
  | 'message-service'
  | 'search-service'
  | 'bookmark-service'
  | 'realtime-service'
  | 'presence-service'
  | 'call-service'
  | 'huddle-service'
  | 'file-service'
  | 'media-service'
  | 'attachment-service'
  | 'cdn-service'
  | 'notification-service'
  | 'notification-orchestrator'
  | 'event-broadcast-service'
  | 'reminder-service'
  | 'analytics-service'
  | 'insights-service'
  | 'ml-service'
  | 'moderation-service'
  | 'sentiment-service'
  | 'smart-reply-service'
  | 'export-service'
  | 'integration-service'
  | 'go-bff';

/**
 * Definition of a single service endpoint.
 */
export interface ServiceDefinition {
  /** Unique service identifier */
  name: ServiceName;
  /** Logical category for grouped version management */
  category: ServiceCategory;
  /** Public-facing path segments (without the /api/vX prefix) */
  paths: string[];
  /** Default API version (used when no environment override exists) */
  defaultVersion: ApiVersion;
}

/**
 * Per-environment version overrides.
 * Allows setting a version at the category level OR the individual service level.
 */
export interface EnvironmentVersionConfig {
  environment: Environment;
  /** Global default version for ALL services in this environment */
  defaultVersion: ApiVersion;
  /** Override version per category — applies to every service in the category */
  categoryOverrides?: Partial<Record<ServiceCategory, ApiVersion>>;
  /** Override version for individual services — highest priority */
  serviceOverrides?: Partial<Record<ServiceName, ApiVersion>>;
}

/**
 * Resolved URL information for a service in a specific environment.
 */
export interface ResolvedServiceUrl {
  name: ServiceName;
  category: ServiceCategory;
  version: ApiVersion;
  /** Full path, e.g. "/api/v1/auth" */
  paths: string[];
  /** Version-stripped base for Kong upstream rewriting */
  basePaths: string[];
}

/**
 * Base host configuration per environment.
 */
export interface EnvironmentHosts {
  /** API gateway base URL, e.g. "https://api.quckapp.io" */
  apiBaseUrl: string;
  /** WebSocket base URL */
  wsBaseUrl: string;
  /** CDN base URL */
  cdnBaseUrl: string;
}
