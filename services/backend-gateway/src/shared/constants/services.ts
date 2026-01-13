/**
 * Microservice Names and Identifiers
 * Used for service discovery and message routing
 */

export const SERVICES = {
  API_GATEWAY: 'API_GATEWAY',
  AUTH_SERVICE: 'AUTH_SERVICE',
  USERS_SERVICE: 'USERS_SERVICE',
  MESSAGES_SERVICE: 'MESSAGES_SERVICE',
  CONVERSATIONS_SERVICE: 'CONVERSATIONS_SERVICE',
  NOTIFICATIONS_SERVICE: 'NOTIFICATIONS_SERVICE',
  MEDIA_SERVICE: 'MEDIA_SERVICE',
  CALLS_SERVICE: 'CALLS_SERVICE',
  ANALYTICS_SERVICE: 'ANALYTICS_SERVICE',
  REALTIME_SERVICE: 'REALTIME_SERVICE',
} as const;

export type ServiceName = (typeof SERVICES)[keyof typeof SERVICES];

/**
 * Service HTTP Ports Configuration (for API Gateway)
 */
export const SERVICE_PORTS = {
  API_GATEWAY: parseInt(process.env.GATEWAY_PORT || '3000', 10),
  AUTH_SERVICE: parseInt(process.env.AUTH_SERVICE_HTTP_PORT || '3001', 10),
  USERS_SERVICE: parseInt(process.env.USERS_SERVICE_HTTP_PORT || '3002', 10),
  MESSAGES_SERVICE: parseInt(process.env.MESSAGES_SERVICE_HTTP_PORT || '3003', 10),
  CONVERSATIONS_SERVICE: parseInt(process.env.CONVERSATIONS_SERVICE_HTTP_PORT || '3004', 10),
  NOTIFICATIONS_SERVICE: parseInt(process.env.NOTIFICATIONS_SERVICE_HTTP_PORT || '3005', 10),
  MEDIA_SERVICE: parseInt(process.env.MEDIA_SERVICE_HTTP_PORT || '3006', 10),
  CALLS_SERVICE: parseInt(process.env.CALLS_SERVICE_HTTP_PORT || '3007', 10),
  ANALYTICS_SERVICE: parseInt(process.env.ANALYTICS_SERVICE_HTTP_PORT || '3008', 10),
  REALTIME_SERVICE: parseInt(process.env.REALTIME_SERVICE_PORT || '3009', 10),
} as const;

// Alias for backwards compatibility
export const PORTS = SERVICE_PORTS;

/**
 * TCP Transport Configuration for Microservice Communication
 */
export const TCP_CONFIG = {
  AUTH_SERVICE: {
    host: process.env.AUTH_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.AUTH_SERVICE_TCP_PORT || '4001', 10),
  },
  USERS_SERVICE: {
    host: process.env.USERS_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.USERS_SERVICE_TCP_PORT || '4002', 10),
  },
  MESSAGES_SERVICE: {
    host: process.env.MESSAGES_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.MESSAGES_SERVICE_TCP_PORT || '4003', 10),
  },
  CONVERSATIONS_SERVICE: {
    host: process.env.CONVERSATIONS_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.CONVERSATIONS_SERVICE_TCP_PORT || '4004', 10),
  },
  NOTIFICATIONS_SERVICE: {
    host: process.env.NOTIFICATIONS_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.NOTIFICATIONS_SERVICE_TCP_PORT || '4005', 10),
  },
  MEDIA_SERVICE: {
    host: process.env.MEDIA_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.MEDIA_SERVICE_TCP_PORT || '4006', 10),
  },
  CALLS_SERVICE: {
    host: process.env.CALLS_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.CALLS_SERVICE_TCP_PORT || '4007', 10),
  },
  ANALYTICS_SERVICE: {
    host: process.env.ANALYTICS_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.ANALYTICS_SERVICE_TCP_PORT || '4008', 10),
  },
};

/**
 * Redis Configuration for Pub/Sub Transport and Caching
 */
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

/**
 * MongoDB Configuration
 */
export const MONGODB_CONFIG = {
  // Always use Atlas - MONGODB_URI must be set in environment
  uri: process.env.MONGODB_URI_PROD || process.env.MONGODB_URI_DEV || process.env.MONGODB_URI,
  // Service-specific databases (optional - can share single DB)
  databases: {
    AUTH_SERVICE: process.env.AUTH_DB_NAME || 'quickchat_auth',
    USERS_SERVICE: process.env.USERS_DB_NAME || 'quickchat_users',
    MESSAGES_SERVICE: process.env.MESSAGES_DB_NAME || 'quickchat_messages',
    CONVERSATIONS_SERVICE: process.env.CONVERSATIONS_DB_NAME || 'quickchat_conversations',
    NOTIFICATIONS_SERVICE: process.env.NOTIFICATIONS_DB_NAME || 'quickchat_notifications',
    MEDIA_SERVICE: process.env.MEDIA_DB_NAME || 'quickchat_media',
    CALLS_SERVICE: process.env.CALLS_DB_NAME || 'quickchat_calls',
    ANALYTICS_SERVICE: process.env.ANALYTICS_DB_NAME || 'quickchat_analytics',
  },
};

/**
 * Service Health Check Endpoints
 */
export const HEALTH_ENDPOINTS = {
  API_GATEWAY: '/health',
  AUTH_SERVICE: '/health',
  USERS_SERVICE: '/health',
  MESSAGES_SERVICE: '/health',
  CONVERSATIONS_SERVICE: '/health',
  NOTIFICATIONS_SERVICE: '/health',
  MEDIA_SERVICE: '/health',
  CALLS_SERVICE: '/health',
  ANALYTICS_SERVICE: '/health',
};

/**
 * Service Queue Names for BullMQ
 */
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications-queue',
  MEDIA_PROCESSING: 'media-processing-queue',
  ANALYTICS_EVENTS: 'analytics-events-queue',
  SCHEDULED_MESSAGES: 'scheduled-messages-queue',
  EMAIL: 'email-queue',
  SMS: 'sms-queue',
};

/**
 * Redis Pub/Sub Channels
 */
export const PUBSUB_CHANNELS = {
  USER_EVENTS: 'user:events',
  MESSAGE_EVENTS: 'message:events',
  CONVERSATION_EVENTS: 'conversation:events',
  CALL_EVENTS: 'call:events',
  NOTIFICATION_EVENTS: 'notification:events',
  PRESENCE_EVENTS: 'presence:events',
  TYPING_EVENTS: 'typing:events',
};

/**
 * Rate Limiting Configuration per Service
 */
export const RATE_LIMITS = {
  API_GATEWAY: {
    default: { ttl: 60, limit: 100 },
    auth: { ttl: 60, limit: 10 },
    upload: { ttl: 60, limit: 20 },
  },
  AUTH_SERVICE: {
    otp: { ttl: 60, limit: 3 },
    login: { ttl: 60, limit: 10 },
  },
};
