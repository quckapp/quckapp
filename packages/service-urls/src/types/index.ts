export type Environment = 'local' | 'development' | 'qa' | 'uat1' | 'uat2' | 'uat3' | 'staging' | 'production' | 'live';
export type TechStack = 'SPRING' | 'NESTJS' | 'ELIXIR' | 'GO' | 'PYTHON';

export const ENVIRONMENTS: Environment[] = [
  'local', 'development', 'qa', 'uat1', 'uat2', 'uat3', 'staging', 'production', 'live',
];

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  local: 'Local',
  development: 'Development',
  qa: 'QA',
  uat1: 'UAT 1',
  uat2: 'UAT 2',
  uat3: 'UAT 3',
  staging: 'Staging',
  production: 'Production',
  live: 'Live',
};

export const ENVIRONMENT_COLORS: Record<Environment, string> = {
  local: 'bg-gray-100 text-gray-700',
  development: 'bg-blue-100 text-blue-700',
  qa: 'bg-yellow-100 text-yellow-700',
  uat1: 'bg-purple-100 text-purple-700',
  uat2: 'bg-purple-100 text-purple-700',
  uat3: 'bg-purple-100 text-purple-700',
  staging: 'bg-orange-100 text-orange-700',
  production: 'bg-red-100 text-red-700',
  live: 'bg-emerald-100 text-emerald-700',
};

export const TECH_STACK_LABELS: Record<TechStack, string> = {
  SPRING: 'Spring Boot',
  NESTJS: 'NestJS',
  ELIXIR: 'Elixir',
  GO: 'Go',
  PYTHON: 'Python',
};

export const TECH_STACK_COLORS: Record<TechStack, string> = {
  SPRING: 'bg-green-100 text-green-700',
  NESTJS: 'bg-red-100 text-red-700',
  ELIXIR: 'bg-purple-100 text-purple-700',
  GO: 'bg-blue-100 text-blue-700',
  PYTHON: 'bg-yellow-100 text-yellow-700',
};

export const SERVICE_REGISTRY: { key: string; label: string; stack: TechStack }[] = [
  // Spring Boot
  { key: 'admin-service', label: 'Admin Service', stack: 'SPRING' },
  { key: 'audit-service', label: 'Audit Service', stack: 'SPRING' },
  { key: 'auth-service', label: 'Auth Service', stack: 'SPRING' },
  { key: 'permission-service', label: 'Permission Service', stack: 'SPRING' },
  { key: 'security-service', label: 'Security Service', stack: 'SPRING' },
  { key: 'user-service', label: 'User Service', stack: 'SPRING' },
  // NestJS
  { key: 'backend-gateway', label: 'Backend Gateway', stack: 'NESTJS' },
  { key: 'notification-service', label: 'Notification Service', stack: 'NESTJS' },
  // Elixir
  { key: 'call-service', label: 'Call Service', stack: 'ELIXIR' },
  { key: 'event-broadcast-service', label: 'Event Broadcast Service', stack: 'ELIXIR' },
  { key: 'huddle-service', label: 'Huddle Service', stack: 'ELIXIR' },
  { key: 'message-service', label: 'Message Service', stack: 'ELIXIR' },
  { key: 'notification-orchestrator', label: 'Notification Orchestrator', stack: 'ELIXIR' },
  { key: 'presence-service', label: 'Presence Service', stack: 'ELIXIR' },
  { key: 'realtime-service', label: 'Realtime Service', stack: 'ELIXIR' },
  // Go
  { key: 'attachment-service', label: 'Attachment Service', stack: 'GO' },
  { key: 'bookmark-service', label: 'Bookmark Service', stack: 'GO' },
  { key: 'cdn-service', label: 'CDN Service', stack: 'GO' },
  { key: 'channel-service', label: 'Channel Service', stack: 'GO' },
  { key: 'file-service', label: 'File Service', stack: 'GO' },
  { key: 'go-bff', label: 'Go BFF', stack: 'GO' },
  { key: 'media-service', label: 'Media Service', stack: 'GO' },
  { key: 'reminder-service', label: 'Reminder Service', stack: 'GO' },
  { key: 'search-service', label: 'Search Service', stack: 'GO' },
  { key: 'thread-service', label: 'Thread Service', stack: 'GO' },
  { key: 'workspace-service', label: 'Workspace Service', stack: 'GO' },
  // Python
  { key: 'analytics-service', label: 'Analytics Service', stack: 'PYTHON' },
  { key: 'export-service', label: 'Export Service', stack: 'PYTHON' },
  { key: 'insights-service', label: 'Insights Service', stack: 'PYTHON' },
  { key: 'integration-service', label: 'Integration Service', stack: 'PYTHON' },
  { key: 'ml-service', label: 'ML Service', stack: 'PYTHON' },
  { key: 'moderation-service', label: 'Moderation Service', stack: 'PYTHON' },
  { key: 'sentiment-service', label: 'Sentiment Service', stack: 'PYTHON' },
  { key: 'smart-reply-service', label: 'Smart Reply Service', stack: 'PYTHON' },
  // Gateway
  { key: 'kong-gateway', label: 'Kong Gateway', stack: 'GO' },
];

/** Lookup: DB service_key → tech stack */
export const SERVICE_STACK_MAP: Record<string, TechStack> = {
  // Spring Boot
  AUTH_SERVICE_URL: 'SPRING',
  PERMISSION_SERVICE_URL: 'SPRING',
  SECURITY_SERVICE_URL: 'SPRING',
  ADMIN_SERVICE_URL: 'SPRING',
  AUDIT_SERVICE_URL: 'SPRING',
  USER_SERVICE_URL: 'SPRING',
  // NestJS
  NOTIFICATION_SERVICE_URL: 'NESTJS',
  BACKEND_GATEWAY_URL: 'NESTJS',
  // Elixir
  REALTIME_SERVICE_URL: 'ELIXIR',
  PRESENCE_SERVICE_URL: 'ELIXIR',
  CALL_SERVICE_URL: 'ELIXIR',
  HUDDLE_SERVICE_URL: 'ELIXIR',
  MESSAGE_SERVICE_URL: 'ELIXIR',
  NOTIFICATION_ORCHESTRATOR_URL: 'ELIXIR',
  EVENT_BROADCAST_SERVICE_URL: 'ELIXIR',
  // Go
  WORKSPACE_SERVICE_URL: 'GO',
  CHANNEL_SERVICE_URL: 'GO',
  THREAD_SERVICE_URL: 'GO',
  SEARCH_SERVICE_URL: 'GO',
  BOOKMARK_SERVICE_URL: 'GO',
  FILE_SERVICE_URL: 'GO',
  MEDIA_SERVICE_URL: 'GO',
  ATTACHMENT_SERVICE_URL: 'GO',
  CDN_SERVICE_URL: 'GO',
  REMINDER_SERVICE_URL: 'GO',
  GO_BFF_URL: 'GO',
  KONG_GATEWAY_URL: 'GO',
  // Python
  ANALYTICS_SERVICE_URL: 'PYTHON',
  INSIGHTS_SERVICE_URL: 'PYTHON',
  ML_SERVICE_URL: 'PYTHON',
  MODERATION_SERVICE_URL: 'PYTHON',
  SENTIMENT_SERVICE_URL: 'PYTHON',
  SMART_REPLY_SERVICE_URL: 'PYTHON',
  EXPORT_SERVICE_URL: 'PYTHON',
  INTEGRATION_SERVICE_URL: 'PYTHON',
};

export interface ServiceUrlConfig {
  id: string;
  environment: Environment;
  serviceKey: string;
  category: NpmServiceCategory;
  url: string;
  description: string;
  isActive: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InfrastructureConfig {
  id: string;
  environment: Environment;
  infraKey: string;
  host: string;
  port: number;
  username?: string;
  connectionString?: string;
  isActive: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseConfig {
  id: string;
  environment: Environment;
  projectId: string;
  clientEmail: string;
  privateKeyMasked: string;
  storageBucket: string;
  isActive: boolean;
  updatedAt: string;
}

// Config Entry Categories (28 categories: 5 tech stacks + 8 databases + 4 cloud + 3 orchestration + 8 cross-cutting)
export type ConfigCategory =
  // Tech Stacks
  | 'SPRING_BOOT' | 'NESTJS' | 'ELIXIR' | 'GO_SERVICES' | 'PYTHON_ML'
  // Databases
  | 'POSTGRES' | 'MYSQL' | 'MONGODB' | 'REDIS' | 'ELASTICSEARCH' | 'CLICKHOUSE' | 'KAFKA' | 'RABBITMQ'
  // Cloud Providers
  | 'AWS' | 'AZURE' | 'GCP' | 'CLOUD_STORAGE'
  // Orchestration
  | 'DOCKER' | 'KUBERNETES' | 'PODS'
  // Cross-cutting
  | 'SECURITY' | 'WEBRTC' | 'OAUTH' | 'SMTP' | 'MONITORING' | 'FIREBASE' | 'EXTERNAL_API' | 'INFRA';

export const CONFIG_CATEGORIES: ConfigCategory[] = [
  // Tech Stacks
  'SPRING_BOOT', 'NESTJS', 'ELIXIR', 'GO_SERVICES', 'PYTHON_ML',
  // Databases
  'POSTGRES', 'MYSQL', 'MONGODB', 'REDIS', 'ELASTICSEARCH', 'CLICKHOUSE', 'KAFKA', 'RABBITMQ',
  // Cloud Providers
  'AWS', 'AZURE', 'GCP', 'CLOUD_STORAGE',
  // Orchestration
  'DOCKER', 'KUBERNETES', 'PODS',
  // Cross-cutting
  'SECURITY', 'WEBRTC', 'OAUTH', 'SMTP', 'MONITORING', 'FIREBASE', 'EXTERNAL_API', 'INFRA',
];

export const CONFIG_CATEGORY_LABELS: Record<ConfigCategory, string> = {
  // Tech Stacks
  SPRING_BOOT: 'Spring Boot',
  NESTJS: 'NestJS',
  ELIXIR: 'Elixir',
  GO_SERVICES: 'Go Services',
  PYTHON_ML: 'Python / ML',
  // Databases
  POSTGRES: 'PostgreSQL',
  MYSQL: 'MySQL',
  MONGODB: 'MongoDB',
  REDIS: 'Redis',
  ELASTICSEARCH: 'Elasticsearch',
  CLICKHOUSE: 'ClickHouse',
  KAFKA: 'Kafka',
  RABBITMQ: 'RabbitMQ',
  // Cloud Providers
  AWS: 'AWS',
  AZURE: 'Azure',
  GCP: 'GCP',
  CLOUD_STORAGE: 'Cloud Storage',
  // Orchestration
  DOCKER: 'Docker',
  KUBERNETES: 'Kubernetes',
  PODS: 'Pods',
  // Cross-cutting
  SECURITY: 'Security',
  WEBRTC: 'WebRTC',
  OAUTH: 'OAuth',
  SMTP: 'SMTP',
  MONITORING: 'Monitoring',
  FIREBASE: 'Firebase',
  EXTERNAL_API: 'External API',
  INFRA: 'Infrastructure',
};

export const CONFIG_CATEGORY_COLORS: Record<ConfigCategory, string> = {
  // Tech Stacks — green/red/purple/blue/yellow (matches existing service category colors)
  SPRING_BOOT: 'bg-green-100 text-green-700',
  NESTJS: 'bg-red-100 text-red-700',
  ELIXIR: 'bg-purple-100 text-purple-700',
  GO_SERVICES: 'bg-cyan-100 text-cyan-700',
  PYTHON_ML: 'bg-yellow-100 text-yellow-700',
  // Databases — distinct shades
  POSTGRES: 'bg-blue-100 text-blue-700',
  MYSQL: 'bg-orange-100 text-orange-700',
  MONGODB: 'bg-emerald-100 text-emerald-700',
  REDIS: 'bg-rose-100 text-rose-700',
  ELASTICSEARCH: 'bg-amber-100 text-amber-700',
  CLICKHOUSE: 'bg-lime-100 text-lime-700',
  KAFKA: 'bg-stone-100 text-stone-700',
  RABBITMQ: 'bg-fuchsia-100 text-fuchsia-700',
  // Cloud Providers — brand-inspired colors
  AWS: 'bg-orange-100 text-orange-700',
  AZURE: 'bg-blue-100 text-blue-800',
  GCP: 'bg-sky-100 text-sky-700',
  CLOUD_STORAGE: 'bg-slate-100 text-slate-700',
  // Orchestration
  DOCKER: 'bg-blue-100 text-blue-700',
  KUBERNETES: 'bg-indigo-100 text-indigo-700',
  PODS: 'bg-violet-100 text-violet-700',
  // Cross-cutting
  SECURITY: 'bg-red-100 text-red-800',
  WEBRTC: 'bg-teal-100 text-teal-700',
  OAUTH: 'bg-violet-100 text-violet-700',
  SMTP: 'bg-amber-100 text-amber-800',
  MONITORING: 'bg-orange-100 text-orange-800',
  FIREBASE: 'bg-pink-100 text-pink-700',
  EXTERNAL_API: 'bg-indigo-100 text-indigo-700',
  INFRA: 'bg-gray-100 text-gray-700',
};

// Grouped categories for optgroup rendering in dropdowns
export const CONFIG_CATEGORY_GROUPS: { label: string; categories: ConfigCategory[] }[] = [
  { label: 'Databases', categories: ['POSTGRES', 'MYSQL', 'MONGODB', 'REDIS', 'ELASTICSEARCH', 'CLICKHOUSE', 'KAFKA', 'RABBITMQ'] },
  { label: 'Cloud Providers', categories: ['AWS', 'AZURE', 'GCP', 'CLOUD_STORAGE'] },
  { label: 'Orchestration', categories: ['DOCKER', 'KUBERNETES', 'PODS'] },
  { label: 'Services', categories: ['SECURITY', 'WEBRTC', 'OAUTH', 'SMTP', 'MONITORING', 'FIREBASE', 'EXTERNAL_API', 'INFRA'] },
];

export interface ConfigEntry {
  id: string;
  environment: Environment;
  category: ConfigCategory;
  configKey: string;
  configValue: string;
  isSecret: boolean;
  description: string;
  isActive: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentSummary {
  environment: Environment;
  serviceCount: number;
  infraCount: number;
  configEntryCount: number;
  hasFirebase: boolean;
  lastUpdated: string | null;
}

export interface BulkExportResponse {
  environment: string;
  services: ServiceUrlConfig[];
  infrastructure: InfrastructureConfig[];
  firebase: FirebaseConfig | null;
  configEntries: ConfigEntry[];
}

// Version Management
export type VersionStatus = 'PLANNED' | 'READY' | 'ACTIVE' | 'DEPRECATED' | 'SUNSET' | 'DISABLED';

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  PLANNED: 'Planned',
  READY: 'Ready',
  ACTIVE: 'Active',
  DEPRECATED: 'Deprecated',
  SUNSET: 'Sunset',
  DISABLED: 'Disabled',
};

export const VERSION_STATUS_COLORS: Record<VersionStatus, string> = {
  PLANNED: 'bg-gray-100 text-gray-700',
  READY: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  DEPRECATED: 'bg-yellow-100 text-yellow-700',
  SUNSET: 'bg-orange-100 text-orange-700',
  DISABLED: 'bg-red-100 text-red-700',
};

export interface VersionConfig {
  id: string;
  environment: string;
  serviceKey: string;
  apiVersion: string;
  releaseVersion: string;
  status: VersionStatus;
  sunsetDate: string | null;
  sunsetDurationDays: number | null;
  deprecatedAt: string | null;
  changelog: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalVersionConfig {
  id: string;
  environment: string;
  defaultApiVersion: string;
  defaultSunsetDays: number;
  updatedBy: string;
  updatedAt: string;
}

export interface VersionProfile {
  id: string;
  name: string;
  description: string;
  entries: VersionProfileEntry[];
  createdBy: string;
  createdAt: string;
}

export interface VersionProfileEntry {
  id: string;
  serviceKey: string;
  apiVersion: string;
  releaseVersion: string;
}

export interface User {
  id: string;
  displayName: string;
  phoneNumber: string;
  role: string;
}

// ── NPM Package Types (used by environments/, services.ts, version.ts) ──

export type ApiVersion = string;

export type NpmServiceCategory =
  | 'auth' | 'user' | 'workspace' | 'messaging' | 'realtime'
  | 'media' | 'notification' | 'analytics' | 'ai' | 'data' | 'bff' | 'gateway';

export const SERVICE_FUNC_CATEGORIES: NpmServiceCategory[] = [
  'auth', 'user', 'workspace', 'messaging', 'realtime',
  'media', 'notification', 'analytics', 'ai', 'data', 'bff', 'gateway',
];

export const SERVICE_FUNC_LABELS: Record<NpmServiceCategory, string> = {
  auth: 'Authentication',
  user: 'Users & Admin',
  workspace: 'Workspace',
  messaging: 'Messaging',
  realtime: 'Real-time',
  media: 'Media & Files',
  notification: 'Notifications',
  analytics: 'Analytics',
  ai: 'AI & ML',
  data: 'Data & Integration',
  bff: 'BFF',
  gateway: 'API Gateway',
};

export const SERVICE_FUNC_COLORS: Record<NpmServiceCategory, string> = {
  auth: 'bg-red-100 text-red-700',
  user: 'bg-blue-100 text-blue-700',
  workspace: 'bg-indigo-100 text-indigo-700',
  messaging: 'bg-green-100 text-green-700',
  realtime: 'bg-cyan-100 text-cyan-700',
  media: 'bg-orange-100 text-orange-700',
  notification: 'bg-amber-100 text-amber-700',
  analytics: 'bg-purple-100 text-purple-700',
  ai: 'bg-pink-100 text-pink-700',
  data: 'bg-teal-100 text-teal-700',
  bff: 'bg-slate-100 text-slate-700',
  gateway: 'bg-emerald-100 text-emerald-700',
};

export const SERVICE_FUNC_GROUPS: { label: string; categories: NpmServiceCategory[] }[] = [
  { label: 'Core', categories: ['auth', 'user', 'workspace'] },
  { label: 'Communication', categories: ['messaging', 'realtime', 'notification'] },
  { label: 'Content & Intelligence', categories: ['media', 'analytics', 'ai', 'data', 'bff'] },
  { label: 'Infrastructure', categories: ['gateway'] },
];

export type ServiceName =
  | 'auth-service' | 'permission-service' | 'security-service' | 'user-service'
  | 'admin-service' | 'audit-service' | 'workspace-service' | 'channel-service'
  | 'thread-service' | 'message-service' | 'search-service' | 'bookmark-service'
  | 'realtime-service' | 'presence-service' | 'call-service' | 'huddle-service'
  | 'file-service' | 'media-service' | 'attachment-service' | 'cdn-service'
  | 'notification-service' | 'notification-orchestrator' | 'event-broadcast-service'
  | 'reminder-service' | 'analytics-service' | 'insights-service' | 'ml-service'
  | 'moderation-service' | 'sentiment-service' | 'smart-reply-service'
  | 'export-service' | 'integration-service' | 'go-bff'
  | 'kong-gateway';

export interface ServiceDefinition {
  name: ServiceName;
  category: NpmServiceCategory;
  paths: string[];
  defaultVersion: ApiVersion;
}

export interface EnvironmentVersionConfig {
  environment: Environment;
  defaultVersion: ApiVersion;
  categoryOverrides?: Partial<Record<NpmServiceCategory, ApiVersion>>;
  serviceOverrides?: Partial<Record<ServiceName, ApiVersion>>;
}

export interface ResolvedServiceUrl {
  name: ServiceName;
  category: NpmServiceCategory;
  version: ApiVersion;
  paths: string[];
  basePaths: string[];
}

export interface EnvironmentHosts {
  apiBaseUrl: string;
  wsBaseUrl: string;
  cdnBaseUrl: string;
}
