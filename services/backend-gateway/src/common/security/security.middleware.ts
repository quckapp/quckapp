import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

// Use require for hpp since it has CommonJS default export
// eslint-disable-next-line @typescript-eslint/no-var-requires
const hpp = require('hpp');

/**
 * Security Headers Middleware
 * Adds additional security headers not covered by helmet
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    // Prevent caching of sensitive data
    if (req.path.includes('/auth/') || req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Add custom security headers
    res.setHeader('X-Request-Id', this.generateRequestId());
    res.setHeader('X-Response-Time', Date.now().toString());

    // Permissions Policy (formerly Feature-Policy)
    if (!isDevelopment) {
      res.setHeader(
        'Permissions-Policy',
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
      );
    }

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Request Sanitization Middleware
 * Sanitizes incoming requests to prevent common attacks
 */
@Injectable()
export class RequestSanitizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Sanitize query parameters
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }

    next();
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = this.sanitizeObject(value);
    }
    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove null bytes
    value = value.replace(/\0/g, '');

    // Basic HTML entity encoding for common XSS vectors
    // Note: This is a basic sanitization. Use a proper library like DOMPurify for HTML content
    value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return value;
  }
}

/**
 * IP Extraction Middleware
 * Correctly extracts client IP considering proxies
 */
@Injectable()
export class IpExtractionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get IP from various headers (in order of trust)
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare

    let clientIp: string;

    if (cfConnectingIp) {
      clientIp = Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
    } else if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, first one is the client
      const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      clientIp = forwarded.split(',')[0].trim();
    } else if (realIp) {
      clientIp = Array.isArray(realIp) ? realIp[0] : realIp;
    } else {
      clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    }

    // Attach to request for later use
    (req as any).clientIp = clientIp;

    next();
  }
}

/**
 * Request Logging Middleware
 * Logs incoming requests for security auditing
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const clientIp = (req as any).clientIp || req.ip;

    // Log request start
    const requestLog = {
      method: req.method,
      path: req.path,
      ip: clientIp,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const responseLog = {
        ...requestLog,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      };

      // Only log in development or for non-2xx responses
      const isDevelopment = this.configService.get('NODE_ENV') === 'development';
      if (isDevelopment || res.statusCode >= 400) {
        console.log(JSON.stringify(responseLog));
      }
    });

    next();
  }
}

/**
 * HTTP Parameter Pollution (HPP) Protection Middleware
 * Prevents attackers from polluting HTTP parameters by sending multiple
 * parameters with the same name to exploit application logic.
 *
 * Example attack:
 * GET /api/users?admin=false&admin=true
 * Without protection, the application might use the last value (true)
 *
 * With HPP middleware:
 * - Query parameters: Takes the last value (or whitelist specific params to allow arrays)
 * - Body parameters: Same behavior
 *
 * Usage:
 * - Add to middleware consumer in AppModule
 * - Configure whitelist for parameters that legitimately need arrays
 */
@Injectable()
export class HppMiddleware implements NestMiddleware {
  private hppMiddleware: any;

  constructor(private configService: ConfigService) {
    // Parameters that are allowed to have multiple values (arrays)
    const whitelist = [
      'ids',           // Common for bulk operations: ?ids=1&ids=2&ids=3
      'tags',          // Tags filtering: ?tags=tag1&tags=tag2
      'categories',    // Category filtering
      'fields',        // Field selection: ?fields=name&fields=email
      'include',       // Related resources to include
      'exclude',       // Resources to exclude
      'sort',          // Multiple sort fields
      'filters',       // Multiple filters
      'participants',  // Multiple participants in chat
      'userIds',       // Multiple user IDs
      'messageIds',    // Multiple message IDs
    ];

    // @ts-ignore - CommonJS module compatibility
    this.hppMiddleware = (hpp.default || hpp)({
      whitelist,
      // Optional: checkBody - also check POST body parameters (default: false)
      // checkBody: true,
      // Optional: checkBodyOnlyForContentType - only check body for specific content types
      // checkBodyOnlyForContentType: 'urlencoded',
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.hppMiddleware(req, res, next);
  }
}

/**
 * SQL Injection Prevention Middleware
 * Detects common SQL injection patterns
 */
@Injectable()
export class SqlInjectionMiddleware implements NestMiddleware {
  private sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    /((\%27)|(\'))union/gi,
    /exec(\s|\+)+(s|x)p\w+/gi,
    /UNION(\s+)SELECT/gi,
    /INSERT(\s+)INTO/gi,
    /DELETE(\s+)FROM/gi,
    /DROP(\s+)TABLE/gi,
    /UPDATE(\s+)\w+(\s+)SET/gi,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    const checkValue = (value: any): boolean => {
      if (typeof value !== 'string') {
        return false;
      }
      return this.sqlPatterns.some((pattern) => pattern.test(value));
    };

    const checkObject = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') {
        return false;
      }

      for (const value of Object.values(obj)) {
        if (typeof value === 'string' && checkValue(value)) {
          return true;
        }
        if (typeof value === 'object' && checkObject(value)) {
          return true;
        }
      }
      return false;
    };

    // Check query parameters
    if (checkObject(req.query)) {
      res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Potentially malicious input detected',
      });
      return;
    }

    // Check body
    if (checkObject(req.body)) {
      res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Potentially malicious input detected',
      });
      return;
    }

    next();
  }
}
