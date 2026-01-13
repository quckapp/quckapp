import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  keyPrefix?: string; // Key prefix for different rate limit types
  message?: string; // Custom error message
}

export const RateLimit = (options: RateLimitOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private reflector: Reflector) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler());

    // If no rate limit decorator, allow the request
    if (!options) {
      return true;
    }

    const {
      windowMs = 60000, // 1 minute default
      max = 60, // 60 requests default
      keyPrefix = 'default',
      message = 'Too many requests, please try again later',
    } = options;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Generate key based on IP and route
    const clientIp = (request as any).clientIp || request.ip || 'unknown';
    const key = `${keyPrefix}:${clientIp}:${request.path}`;

    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    response.setHeader('X-RateLimit-Limit', max);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', resetSeconds);

    if (entry.count > max) {
      response.setHeader('Retry-After', resetSeconds);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message,
          retryAfter: resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Specific rate limit decorators for common use cases
 */
export const AuthRateLimit = () =>
  RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    keyPrefix: 'auth',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  });

export const OtpRateLimit = () =>
  RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    keyPrefix: 'otp',
    message: 'Too many OTP requests. Please try again in 1 hour.',
  });

export const UploadRateLimit = () =>
  RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    keyPrefix: 'upload',
    message: 'Upload limit exceeded. Please try again later.',
  });

export const ApiRateLimit = () =>
  RateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    keyPrefix: 'api',
    message: 'Too many requests. Please slow down.',
  });

export const SearchRateLimit = () =>
  RateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    keyPrefix: 'search',
    message: 'Too many search requests. Please slow down.',
  });
