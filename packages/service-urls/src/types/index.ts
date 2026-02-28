export type Environment = 'local' | 'development' | 'qa' | 'uat1' | 'uat2' | 'uat3' | 'staging' | 'production' | 'live';
export type ServiceCategory = 'SPRING' | 'NESTJS' | 'ELIXIR' | 'GO' | 'PYTHON';

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

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  SPRING: 'Spring Boot',
  NESTJS: 'NestJS',
  ELIXIR: 'Elixir',
  GO: 'Go',
  PYTHON: 'Python',
};

export const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  SPRING: 'bg-green-100 text-green-700',
  NESTJS: 'bg-red-100 text-red-700',
  ELIXIR: 'bg-purple-100 text-purple-700',
  GO: 'bg-blue-100 text-blue-700',
  PYTHON: 'bg-yellow-100 text-yellow-700',
};

export const SERVICE_REGISTRY: { key: string; label: string; category: ServiceCategory }[] = [
  // Spring Boot
  { key: 'admin-service', label: 'Admin Service', category: 'SPRING' },
  { key: 'audit-service', label: 'Audit Service', category: 'SPRING' },
  { key: 'auth-service', label: 'Auth Service', category: 'SPRING' },
  { key: 'permission-service', label: 'Permission Service', category: 'SPRING' },
  { key: 'security-service', label: 'Security Service', category: 'SPRING' },
  { key: 'user-service', label: 'User Service', category: 'SPRING' },
  // NestJS
  { key: 'backend-gateway', label: 'Backend Gateway', category: 'NESTJS' },
  { key: 'notification-service', label: 'Notification Service', category: 'NESTJS' },
  // Elixir
  { key: 'call-service', label: 'Call Service', category: 'ELIXIR' },
  { key: 'event-broadcast-service', label: 'Event Broadcast Service', category: 'ELIXIR' },
  { key: 'huddle-service', label: 'Huddle Service', category: 'ELIXIR' },
  { key: 'message-service', label: 'Message Service', category: 'ELIXIR' },
  { key: 'notification-orchestrator', label: 'Notification Orchestrator', category: 'ELIXIR' },
  { key: 'presence-service', label: 'Presence Service', category: 'ELIXIR' },
  { key: 'realtime-service', label: 'Realtime Service', category: 'ELIXIR' },
  // Go
  { key: 'attachment-service', label: 'Attachment Service', category: 'GO' },
  { key: 'bookmark-service', label: 'Bookmark Service', category: 'GO' },
  { key: 'cdn-service', label: 'CDN Service', category: 'GO' },
  { key: 'channel-service', label: 'Channel Service', category: 'GO' },
  { key: 'file-service', label: 'File Service', category: 'GO' },
  { key: 'go-bff', label: 'Go BFF', category: 'GO' },
  { key: 'media-service', label: 'Media Service', category: 'GO' },
  { key: 'reminder-service', label: 'Reminder Service', category: 'GO' },
  { key: 'search-service', label: 'Search Service', category: 'GO' },
  { key: 'thread-service', label: 'Thread Service', category: 'GO' },
  { key: 'workspace-service', label: 'Workspace Service', category: 'GO' },
  // Python
  { key: 'analytics-service', label: 'Analytics Service', category: 'PYTHON' },
  { key: 'export-service', label: 'Export Service', category: 'PYTHON' },
  { key: 'insights-service', label: 'Insights Service', category: 'PYTHON' },
  { key: 'integration-service', label: 'Integration Service', category: 'PYTHON' },
  { key: 'ml-service', label: 'ML Service', category: 'PYTHON' },
  { key: 'moderation-service', label: 'Moderation Service', category: 'PYTHON' },
  { key: 'sentiment-service', label: 'Sentiment Service', category: 'PYTHON' },
  { key: 'smart-reply-service', label: 'Smart Reply Service', category: 'PYTHON' },
];

export interface ServiceUrlConfig {
  id: string;
  environment: Environment;
  serviceKey: string;
  category: ServiceCategory;
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

export interface EnvironmentSummary {
  environment: Environment;
  serviceCount: number;
  infraCount: number;
  hasFirebase: boolean;
  lastUpdated: string | null;
}

export interface BulkExportResponse {
  environment: string;
  services: ServiceUrlConfig[];
  infrastructure: InfrastructureConfig[];
  firebase: FirebaseConfig | null;
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
