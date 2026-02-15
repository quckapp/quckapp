export type Environment = 'local' | 'development' | 'qa' | 'uat1' | 'uat2' | 'uat3' | 'staging' | 'production';
export type ServiceCategory = 'SPRING' | 'NESTJS' | 'ELIXIR' | 'GO' | 'PYTHON';

export const ENVIRONMENTS: Environment[] = [
  'local', 'development', 'qa', 'uat1', 'uat2', 'uat3', 'staging', 'production',
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

export interface User {
  id: string;
  displayName: string;
  phoneNumber: string;
  role: string;
}
