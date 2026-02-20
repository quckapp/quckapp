export type Environment = 'local' | 'development' | 'qa' | 'uat1' | 'uat2' | 'uat3' | 'staging' | 'production' | 'live';
export type ServiceCategory = 'SPRING' | 'NESTJS' | 'ELIXIR' | 'GO' | 'PYTHON' | 'WEB' | 'MOBILE' | 'CDN';

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
  WEB: 'Web',
  MOBILE: 'Mobile',
  CDN: 'CDN / Static',
};

export const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  SPRING: 'bg-green-100 text-green-700',
  NESTJS: 'bg-red-100 text-red-700',
  ELIXIR: 'bg-purple-100 text-purple-700',
  GO: 'bg-blue-100 text-blue-700',
  PYTHON: 'bg-yellow-100 text-yellow-700',
  WEB: 'bg-sky-100 text-sky-700',
  MOBILE: 'bg-rose-100 text-rose-700',
  CDN: 'bg-teal-100 text-teal-700',
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

// ── Secrets & Configuration ──

export type SecretCategory = 'AUTH' | 'LIVEKIT' | 'TURN' | 'OAUTH' | 'PUSH' | 'INTERNAL' | 'STORAGE' | 'OTHER';

export const SECRET_CATEGORY_LABELS: Record<SecretCategory, string> = {
  AUTH: 'Authentication',
  LIVEKIT: 'LiveKit (Video/Audio)',
  TURN: 'TURN Server',
  OAUTH: 'OAuth Providers',
  PUSH: 'Push Notifications',
  INTERNAL: 'Internal Services',
  STORAGE: 'Storage (S3/MinIO)',
  OTHER: 'Other',
};

export const SECRET_CATEGORY_COLORS: Record<SecretCategory, string> = {
  AUTH: 'bg-indigo-100 text-indigo-700',
  LIVEKIT: 'bg-cyan-100 text-cyan-700',
  TURN: 'bg-teal-100 text-teal-700',
  OAUTH: 'bg-pink-100 text-pink-700',
  PUSH: 'bg-amber-100 text-amber-700',
  INTERNAL: 'bg-slate-100 text-slate-700',
  STORAGE: 'bg-emerald-100 text-emerald-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export interface SecretConfig {
  id: string;
  environment: Environment;
  secretKey: string;
  category: SecretCategory;
  value: string;
  valueMasked: string;
  description: string;
  isRequired: boolean;
  isActive: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Pre-defined secrets template for quick setup */
export interface SecretTemplate {
  secretKey: string;
  category: SecretCategory;
  description: string;
  isRequired: boolean;
  placeholder: string;
  inputType: 'text' | 'password' | 'textarea';
}

export const SECRET_TEMPLATES: SecretTemplate[] = [
  // Auth
  { secretKey: 'JWT_SECRET', category: 'AUTH', description: 'JWT signing secret (shared by all services)', isRequired: true, placeholder: 'Min 32 chars — run: openssl rand -base64 48', inputType: 'password' },
  { secretKey: 'SECRET_KEY_BASE', category: 'AUTH', description: 'Elixir/Phoenix secret key base', isRequired: true, placeholder: 'Min 64 chars — run: openssl rand -base64 64', inputType: 'password' },
  { secretKey: 'ERLANG_COOKIE', category: 'AUTH', description: 'Erlang distributed node cookie', isRequired: false, placeholder: 'quckapp_dev_cookie', inputType: 'text' },

  // LiveKit
  { secretKey: 'LIVEKIT_API_KEY', category: 'LIVEKIT', description: 'LiveKit API key (must match livekit.yaml)', isRequired: true, placeholder: 'devkey', inputType: 'text' },
  { secretKey: 'LIVEKIT_API_SECRET', category: 'LIVEKIT', description: 'LiveKit API secret (must match livekit.yaml)', isRequired: true, placeholder: 'secret_dev_change_in_production', inputType: 'password' },
  { secretKey: 'LIVEKIT_URL', category: 'LIVEKIT', description: 'LiveKit server WebSocket URL', isRequired: false, placeholder: 'ws://localhost:7880', inputType: 'text' },

  // TURN
  { secretKey: 'TURN_STATIC_AUTH_SECRET', category: 'TURN', description: 'COTURN static-auth-secret', isRequired: true, placeholder: 'coturn_secret_change_in_production', inputType: 'password' },
  { secretKey: 'TURN_SERVER_URL', category: 'TURN', description: 'TURN server URL for WebRTC NAT traversal', isRequired: false, placeholder: 'turn:localhost:3478', inputType: 'text' },
  { secretKey: 'TURN_REALM', category: 'TURN', description: 'TURN server realm', isRequired: false, placeholder: 'quckapp.local', inputType: 'text' },

  // OAuth
  { secretKey: 'GOOGLE_CLIENT_ID', category: 'OAUTH', description: 'Google OAuth 2.0 Client ID', isRequired: false, placeholder: 'xxx.apps.googleusercontent.com', inputType: 'text' },
  { secretKey: 'GOOGLE_CLIENT_SECRET', category: 'OAUTH', description: 'Google OAuth 2.0 Client Secret', isRequired: false, placeholder: 'GOCSPX-...', inputType: 'password' },
  { secretKey: 'GITHUB_CLIENT_ID', category: 'OAUTH', description: 'GitHub OAuth App Client ID', isRequired: false, placeholder: 'Iv1.xxxxxxxxxx', inputType: 'text' },
  { secretKey: 'GITHUB_CLIENT_SECRET', category: 'OAUTH', description: 'GitHub OAuth App Client Secret', isRequired: false, placeholder: '', inputType: 'password' },
  { secretKey: 'APPLE_CLIENT_ID', category: 'OAUTH', description: 'Apple Sign-In Client ID', isRequired: false, placeholder: 'com.example.app', inputType: 'text' },
  { secretKey: 'APPLE_CLIENT_SECRET', category: 'OAUTH', description: 'Apple Sign-In Client Secret', isRequired: false, placeholder: '', inputType: 'password' },
  { secretKey: 'FACEBOOK_CLIENT_ID', category: 'OAUTH', description: 'Facebook App ID', isRequired: false, placeholder: '', inputType: 'text' },
  { secretKey: 'FACEBOOK_CLIENT_SECRET', category: 'OAUTH', description: 'Facebook App Secret', isRequired: false, placeholder: '', inputType: 'password' },

  // Push Notifications
  { secretKey: 'FCM_PROJECT_ID', category: 'PUSH', description: 'Firebase Cloud Messaging Project ID', isRequired: false, placeholder: 'my-project-id', inputType: 'text' },
  { secretKey: 'FCM_CLIENT_EMAIL', category: 'PUSH', description: 'FCM service account email', isRequired: false, placeholder: 'firebase-adminsdk-xxx@project.iam.gserviceaccount.com', inputType: 'text' },
  { secretKey: 'FCM_PRIVATE_KEY', category: 'PUSH', description: 'FCM service account private key (PEM)', isRequired: false, placeholder: '-----BEGIN PRIVATE KEY-----\\n...', inputType: 'textarea' },
  { secretKey: 'APNS_KEY_ID', category: 'PUSH', description: 'Apple Push Notification Key ID', isRequired: false, placeholder: 'ABC123DEFG', inputType: 'text' },
  { secretKey: 'APNS_TEAM_ID', category: 'PUSH', description: 'Apple Developer Team ID', isRequired: false, placeholder: 'ABCDE12345', inputType: 'text' },

  // Internal
  { secretKey: 'INTERNAL_API_KEY', category: 'INTERNAL', description: 'API key for service-to-service calls (go-bff)', isRequired: true, placeholder: 'dev_internal_api_key', inputType: 'password' },
  { secretKey: 'AIRFLOW_FERNET_KEY', category: 'INTERNAL', description: 'Airflow Fernet encryption key', isRequired: false, placeholder: 'base64-encoded-32-byte-key', inputType: 'password' },

  // Storage
  { secretKey: 'MINIO_ROOT_USER', category: 'STORAGE', description: 'MinIO / S3 access key', isRequired: false, placeholder: 'minioadmin', inputType: 'text' },
  { secretKey: 'MINIO_ROOT_PASSWORD', category: 'STORAGE', description: 'MinIO / S3 secret key', isRequired: false, placeholder: 'minioadmin123', inputType: 'password' },
  { secretKey: 'S3_ENDPOINT', category: 'STORAGE', description: 'S3-compatible endpoint URL', isRequired: false, placeholder: 'http://minio:9000', inputType: 'text' },
  { secretKey: 'S3_REGION', category: 'STORAGE', description: 'S3 region', isRequired: false, placeholder: 'us-east-1', inputType: 'text' },
];

export interface EnvironmentSummary {
  environment: Environment;
  serviceCount: number;
  infraCount: number;
  secretCount: number;
  hasFirebase: boolean;
  lastUpdated: string | null;
}

export interface BulkExportResponse {
  environment: string;
  services: ServiceUrlConfig[];
  infrastructure: InfrastructureConfig[];
  secrets: SecretConfig[];
  firebase: FirebaseConfig | null;
}

export interface User {
  id: string;
  displayName: string;
  phoneNumber: string;
  role: string;
}

// ── API Keys ──

export interface ConfigAPIKey {
  id: string;
  keyPrefix: string;
  name: string;
  description: string | null;
  serviceName: string | null;
  environments: string[];
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  description?: string;
  serviceName?: string;
  environments?: string[];
}

export interface CreateAPIKeyResponse {
  key: string;
  apiKey: ConfigAPIKey;
}
