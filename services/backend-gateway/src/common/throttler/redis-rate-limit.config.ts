import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage, ThrottlerModuleOptions } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { RateLimitConfigs, ThrottlerSkipPaths, ThrottlerKeys } from './throttler.config';

/**
 * Redis-based Rate Limiting Configuration
 *
 * Uses Redis for distributed rate limiting across multiple server instances.
 * This is essential for:
 * - Horizontal scaling (multiple servers)
 * - Consistent rate limiting across instances
 * - Persistence of rate limit counters across restarts
 *
 * Implements sliding window algorithm for more accurate rate limiting.
 */

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  total: number;
  retryAfter?: number;
}

/**
 * Rate limit options
 */
export interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests in the window */
  max: number;
  /** Key prefix for Redis */
  keyPrefix?: string;
  /** Custom key generator */
  keyGenerator?: (req: any) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (req: any) => boolean;
  /** Handler for rate limit exceeded */
  handler?: (req: any, res: any, options: RateLimitOptions) => void;
  /** Include headers in response */
  headers?: boolean;
  /** Use sliding window instead of fixed window */
  slidingWindow?: boolean;
}

/**
 * Redis Rate Limiter using sliding window algorithm
 */
@Injectable()
export class RedisRateLimiter {
  private redis: Redis;
  private defaultOptions: RateLimitOptions;

  constructor(redis: Redis, options?: Partial<RateLimitOptions>) {
    this.redis = redis;
    this.defaultOptions = {
      windowMs: 60000, // 1 minute
      max: 100,
      keyPrefix: 'rl:',
      headers: true,
      slidingWindow: true,
      ...options,
    };
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkLimit(key: string, options?: Partial<RateLimitOptions>): Promise<RateLimitResult> {
    const opts = { ...this.defaultOptions, ...options };
    const fullKey = `${opts.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    if (opts.slidingWindow) {
      return this.slidingWindowCheck(fullKey, now, windowStart, opts);
    }
    return this.fixedWindowCheck(fullKey, now, opts);
  }

  /**
   * Sliding window rate limit check
   * More accurate than fixed window, prevents request bursts at window boundaries
   */
  private async slidingWindowCheck(
    key: string,
    now: number,
    windowStart: number,
    opts: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const multi = this.redis.multi();

    // Remove expired entries
    multi.zremrangebyscore(key, 0, windowStart);
    // Add current request
    multi.zadd(key, now.toString(), `${now}:${Math.random()}`);
    // Count requests in window
    multi.zcard(key);
    // Set expiry
    multi.pexpire(key, opts.windowMs);

    const results = await multi.exec();
    const count = results?.[2]?.[1] as number || 0;

    const reset = Math.ceil((now + opts.windowMs) / 1000);
    const remaining = Math.max(0, opts.max - count);

    if (count > opts.max) {
      // Find oldest request in window to calculate retry-after
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTime = oldest?.[1] ? parseInt(oldest[1], 10) : now;
      const retryAfter = Math.ceil((oldestTime + opts.windowMs - now) / 1000);

      return {
        success: false,
        remaining: 0,
        reset,
        total: opts.max,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    return {
      success: true,
      remaining,
      reset,
      total: opts.max,
    };
  }

  /**
   * Fixed window rate limit check
   * Simpler but can allow bursts at window boundaries
   */
  private async fixedWindowCheck(
    key: string,
    now: number,
    opts: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const windowKey = `${key}:${Math.floor(now / opts.windowMs)}`;

    const multi = this.redis.multi();
    multi.incr(windowKey);
    multi.pexpire(windowKey, opts.windowMs);

    const results = await multi.exec();
    const count = results?.[0]?.[1] as number || 0;

    const reset = Math.ceil((Math.floor(now / opts.windowMs) * opts.windowMs + opts.windowMs) / 1000);
    const remaining = Math.max(0, opts.max - count);

    if (count > opts.max) {
      return {
        success: false,
        remaining: 0,
        reset,
        total: opts.max,
        retryAfter: Math.ceil((reset * 1000 - now) / 1000),
      };
    }

    return {
      success: true,
      remaining,
      reset,
      total: opts.max,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    const fullKey = `${this.defaultOptions.keyPrefix}${key}`;
    await this.redis.del(fullKey);
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(key: string, options?: Partial<RateLimitOptions>): Promise<RateLimitResult> {
    const opts = { ...this.defaultOptions, ...options };
    const fullKey = `${opts.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    // Remove expired and count
    await this.redis.zremrangebyscore(fullKey, 0, windowStart);
    const count = await this.redis.zcard(fullKey);

    const reset = Math.ceil((now + opts.windowMs) / 1000);
    const remaining = Math.max(0, opts.max - count);

    return {
      success: count <= opts.max,
      remaining,
      reset,
      total: opts.max,
    };
  }

  /**
   * Block a key for a specified duration
   */
  async block(key: string, durationMs: number): Promise<void> {
    const blockKey = `${this.defaultOptions.keyPrefix}block:${key}`;
    await this.redis.set(blockKey, '1', 'PX', durationMs);
  }

  /**
   * Check if a key is blocked
   */
  async isBlocked(key: string): Promise<boolean> {
    const blockKey = `${this.defaultOptions.keyPrefix}block:${key}`;
    const blocked = await this.redis.exists(blockKey);
    return blocked === 1;
  }

  /**
   * Unblock a key
   */
  async unblock(key: string): Promise<void> {
    const blockKey = `${this.defaultOptions.keyPrefix}block:${key}`;
    await this.redis.del(blockKey);
  }
}

/**
 * Redis Throttler Storage for NestJS Throttler module
 * Implements ThrottlerStorage interface with Redis backend
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private redis: Redis;
  private keyPrefix = 'throttle:';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Increment the request count for a key
   * Returns total hits and time to expire
   */
  async increment(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number }> {
    const fullKey = `${this.keyPrefix}${key}`;

    const multi = this.redis.multi();
    multi.incr(fullKey);
    multi.pttl(fullKey);

    const results = await multi.exec();
    const totalHits = results?.[0]?.[1] as number || 0;
    let timeToExpire = results?.[1]?.[1] as number || -1;

    // Set expiry if new key
    if (timeToExpire === -1) {
      await this.redis.pexpire(fullKey, ttl);
      timeToExpire = ttl;
    }

    return {
      totalHits,
      timeToExpire: Math.max(0, timeToExpire),
    };
  }
}

/**
 * Custom Redis Throttler Guard with enhanced features
 */
@Injectable()
export class RedisThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;

    // Skip for health checks and other whitelisted paths
    if (ThrottlerSkipPaths.some((skipPath) => path.startsWith(skipPath))) {
      return true;
    }

    return false;
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use combination of IP and user for more accurate tracking
    const ip = req.clientIp || req.ip || req.connection?.remoteAddress || 'unknown';
    const userId = req.user?.userId || req.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }

  protected throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: any): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded',
        error: 'Too Many Requests',
        path,
        retryAfter: Math.ceil(throttlerLimitDetail.timeToExpire / 1000),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Rate limit presets for common use cases
 */
export const RateLimitPresets = {
  /** Very strict - for sensitive operations like login */
  STRICT: {
    windowMs: 900000, // 15 minutes
    max: 5,
    slidingWindow: true,
  },

  /** Authentication - moderate limits */
  AUTH: {
    windowMs: 60000, // 1 minute
    max: 10,
    slidingWindow: true,
  },

  /** Standard API - general use */
  STANDARD: {
    windowMs: 60000, // 1 minute
    max: 100,
    slidingWindow: true,
  },

  /** Relaxed - for high-traffic endpoints */
  RELAXED: {
    windowMs: 60000, // 1 minute
    max: 500,
    slidingWindow: false, // Use fixed window for performance
  },

  /** WebSocket - per-second limits */
  WEBSOCKET: {
    windowMs: 1000, // 1 second
    max: 20,
    slidingWindow: false,
  },

  /** Upload - hourly limits */
  UPLOAD: {
    windowMs: 3600000, // 1 hour
    max: 50,
    slidingWindow: true,
  },

  /** Admin - moderate limits for admin actions */
  ADMIN: {
    windowMs: 60000, // 1 minute
    max: 60,
    slidingWindow: true,
  },
};

/**
 * Create Redis rate limiter factory
 */
export function createRedisRateLimiter(redis: Redis, preset?: keyof typeof RateLimitPresets): RedisRateLimiter {
  const options = preset ? RateLimitPresets[preset] : undefined;
  return new RedisRateLimiter(redis, options);
}

/**
 * Headers for rate limit responses
 */
export function setRateLimitHeaders(res: any, result: RateLimitResult): void {
  res.setHeader('X-RateLimit-Limit', result.total);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.reset);

  if (result.retryAfter) {
    res.setHeader('Retry-After', result.retryAfter);
  }
}

/**
 * Generate rate limit key from request
 */
export function generateRateLimitKey(
  req: any,
  options?: { includeUserId?: boolean; includePath?: boolean; custom?: string },
): string {
  const parts: string[] = [];

  // IP address
  const ip = req.clientIp || req.ip || req.connection?.remoteAddress || 'unknown';
  parts.push(ip);

  // User ID if authenticated
  if (options?.includeUserId && req.user) {
    parts.push(req.user.userId || req.user.id || 'anonymous');
  }

  // Path
  if (options?.includePath) {
    parts.push(req.path || req.url || '/');
  }

  // Custom suffix
  if (options?.custom) {
    parts.push(options.custom);
  }

  return parts.join(':');
}
