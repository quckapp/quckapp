import { CorsOptions } from 'cors';
import { HelmetOptions } from 'helmet';

/**
 * Security Configuration
 * Centralized security settings for helmet, CORS, and other security middleware
 */

export interface SecurityConfig {
  helmet: HelmetOptions;
  cors: CorsOptions;
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
}

/**
 * Get Helmet configuration based on environment
 * Note: HTTPS-only headers are disabled when USE_HTTPS is not set
 */
export function getHelmetConfig(isDevelopment: boolean): HelmetOptions {
  // Check if HTTPS is enabled (via env var or behind a proxy)
  const useHttps = process.env.USE_HTTPS === 'true' || process.env.NODE_ENV === 'production_ssl';

  return {
    // Content Security Policy - disabled for Swagger UI compatibility
    contentSecurityPolicy: false,

    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false, // Set to false for compatibility with external resources

    // Cross-Origin-Opener-Policy - disable for HTTP
    crossOriginOpenerPolicy: false,

    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin for APIs

    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },

    // Frameguard (X-Frame-Options)
    frameguard: { action: 'deny' },

    // Hide Powered By (removes X-Powered-By header)
    hidePoweredBy: true,

    // HSTS (HTTP Strict Transport Security) - only enable with HTTPS
    hsts: useHttps
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // IE No Open (X-Download-Options)
    ieNoOpen: true,

    // No Sniff (X-Content-Type-Options)
    noSniff: true,

    // Origin Agent Cluster - disable for HTTP compatibility
    originAgentCluster: false,

    // Permitted Cross-Domain Policies (X-Permitted-Cross-Domain-Policies)
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },

    // Referrer Policy
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },

    // XSS Filter (X-XSS-Protection) - Note: Modern browsers have this built-in
    xssFilter: true,
  };
}

/**
 * Get CORS configuration based on environment and allowed origins
 */
export function getCorsConfig(
  allowedOrigins: string | string[],
  isDevelopment: boolean,
): CorsOptions {
  // Parse origins if string
  const origins =
    typeof allowedOrigins === 'string'
      ? allowedOrigins.split(',').map((o) => o.trim())
      : allowedOrigins;

  return {
    // Origin configuration
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // In development, allow all origins
      if (isDevelopment) {
        callback(null, true);
        return;
      }

      // Check if origin is allowed
      if (origins.includes('*') || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },

    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],

    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-CSRF-Token',
      'X-Device-Id',
      'X-App-Version',
      'X-Platform',
    ],

    // Headers exposed to the client
    exposedHeaders: [
      'Content-Length',
      'Content-Range',
      'X-Total-Count',
      'X-Page',
      'X-Per-Page',
      'X-Total-Pages',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Preflight cache duration (in seconds)
    maxAge: 86400, // 24 hours

    // Pass preflight response to next handler
    preflightContinue: false,

    // Success status for preflight requests
    optionsSuccessStatus: 204,
  };
}

/**
 * Get rate limiting configuration
 */
export function getRateLimitConfig(isDevelopment: boolean) {
  return {
    // General API rate limit
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isDevelopment ? 1000 : 100, // requests per window
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    },

    // Authentication rate limit (stricter)
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isDevelopment ? 100 : 10, // requests per window
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    },

    // Upload rate limit
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: isDevelopment ? 500 : 50, // requests per window
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Upload limit exceeded. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    },

    // OTP/SMS rate limit (very strict)
    otp: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: isDevelopment ? 20 : 5, // requests per window
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many OTP requests. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    },
  };
}

/**
 * Security headers to add manually if needed
 */
export const additionalSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * Trusted proxy configuration
 */
export const trustedProxies = [
  'loopback', // 127.0.0.1/8, ::1/128
  'linklocal', // 169.254.0.0/16, fe80::/10
  'uniquelocal', // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
];
