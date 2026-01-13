import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Throttler Configuration
 * Provides multiple rate limiting strategies for different use cases
 */

export interface ThrottlerConfig {
  default: ThrottlerModuleOptions;
  auth: { ttl: number; limit: number };
  api: { ttl: number; limit: number };
  upload: { ttl: number; limit: number };
  otp: { ttl: number; limit: number };
  websocket: { ttl: number; limit: number };
}

/**
 * Get throttler configuration based on environment
 */
export function getThrottlerConfig(isDevelopment: boolean): ThrottlerModuleOptions {
  // In development, allow more requests for testing
  const multiplier = isDevelopment ? 10 : 1;

  return [
    {
      name: 'short',
      ttl: 1000, // 1 second
      limit: 3 * multiplier, // 3 requests per second
    },
    {
      name: 'medium',
      ttl: 10000, // 10 seconds
      limit: 20 * multiplier, // 20 requests per 10 seconds
    },
    {
      name: 'long',
      ttl: 60000, // 1 minute
      limit: 100 * multiplier, // 100 requests per minute
    },
  ];
}

/**
 * Rate limit configurations for specific endpoints
 */
export const RateLimitConfigs = {
  // Authentication endpoints - stricter limits
  auth: {
    login: { ttl: 900000, limit: 5 }, // 5 attempts per 15 minutes
    register: { ttl: 3600000, limit: 3 }, // 3 registrations per hour
    forgotPassword: { ttl: 3600000, limit: 3 }, // 3 requests per hour
    verifyOtp: { ttl: 300000, limit: 5 }, // 5 attempts per 5 minutes
  },

  // OTP/SMS - very strict (costs money)
  otp: {
    send: { ttl: 3600000, limit: 5 }, // 5 OTPs per hour
    verify: { ttl: 300000, limit: 5 }, // 5 verifications per 5 minutes
  },

  // API endpoints - general limits
  api: {
    read: { ttl: 60000, limit: 100 }, // 100 reads per minute
    write: { ttl: 60000, limit: 30 }, // 30 writes per minute
    search: { ttl: 60000, limit: 30 }, // 30 searches per minute
  },

  // File uploads - limit bandwidth abuse
  upload: {
    file: { ttl: 3600000, limit: 50 }, // 50 uploads per hour
    avatar: { ttl: 86400000, limit: 10 }, // 10 avatar changes per day
  },

  // WebSocket events
  websocket: {
    message: { ttl: 1000, limit: 10 }, // 10 messages per second
    typing: { ttl: 1000, limit: 5 }, // 5 typing events per second
  },

  // Admin endpoints
  admin: {
    action: { ttl: 60000, limit: 60 }, // 60 actions per minute
    export: { ttl: 3600000, limit: 5 }, // 5 exports per hour
  },
};

/**
 * Skip throttling for certain paths
 */
export const ThrottlerSkipPaths = ['/health', '/api/v1/health', '/metrics', '/favicon.ico'];

/**
 * Custom key generator for throttling
 * Uses combination of IP and user ID for more accurate limiting
 */
export function generateThrottlerKey(context: any, trackerKey: string): string {
  const request = context.switchToHttp().getRequest();
  const ip = request.clientIp || request.ip || 'unknown';
  const userId = request.user?.userId || 'anonymous';
  const path = request.path || '';

  return `${trackerKey}:${ip}:${userId}:${path}`;
}

/**
 * Throttler storage key prefixes
 */
export const ThrottlerKeys = {
  AUTH: 'throttle:auth',
  API: 'throttle:api',
  UPLOAD: 'throttle:upload',
  OTP: 'throttle:otp',
  WS: 'throttle:ws',
  ADMIN: 'throttle:admin',
};
