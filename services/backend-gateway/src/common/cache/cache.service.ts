import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggerService } from '../logger/logger.service';

/**
 * CacheService - Unified caching with support for both in-memory and Redis
 * Supports NestJS cache-manager for Redis, with fallback to in-memory
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// Cache key prefixes for different data types
export enum CachePrefix {
  USER = 'user:',
  CONVERSATION = 'conv:',
  MESSAGE = 'msg:',
  SESSION = 'session:',
  RATE_LIMIT = 'rate:',
  OTP = 'otp:',
  TOKEN = 'token:',
  SETTINGS = 'settings:',
  ANALYTICS = 'analytics:',
  LINK_PREVIEW = 'preview:',
}

// Default TTL values (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
  SESSION: 604800, // 7 days
};

@Injectable()
export class CacheService implements OnModuleDestroy {
  private localCache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private useRedis: boolean = false;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(
    @Optional() @Inject(CACHE_MANAGER) private cacheManager?: Cache,
    @Optional() private logger?: LoggerService,
  ) {
    this.useRedis = !!cacheManager;

    if (this.useRedis) {
      this.log('CacheService initialized with Redis');
    } else {
      this.log('CacheService initialized with in-memory cache');
    }

    // Automatic cleanup every 60 seconds for local cache
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.cacheManager) {
        const value = await this.cacheManager.get<T>(key);
        if (value !== undefined && value !== null) {
          this.stats.hits++;
          return value;
        }
        this.stats.misses++;
        return null;
      }

      // Fallback to local cache
      const entry = this.localCache.get(key);
      if (!entry) {
        this.stats.misses++;
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        this.localCache.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.value as T;
    } catch (error) {
      this.logError('Cache get error', error);
      return null;
    }
  }

  /**
   * Get value synchronously (local cache only)
   */
  getSync<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.localCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   * @param ttl - Time to live in seconds
   */
  async set<T>(key: string, value: T, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    try {
      this.stats.sets++;

      if (this.useRedis && this.cacheManager) {
        await this.cacheManager.set(key, value, ttl * 1000);
      }

      // Always set in local cache as well for fast access
      const expiresAt = Date.now() + ttl * 1000;
      this.localCache.set(key, { value, expiresAt });
    } catch (error) {
      this.logError('Cache set error', error);
    }
  }

  /**
   * Set value synchronously (local cache only)
   * @param ttl - Time to live in seconds
   */
  setSync<T>(key: string, value: T, ttl: number = CacheTTL.MEDIUM): void {
    const expiresAt = Date.now() + ttl * 1000;
    this.localCache.set(key, { value, expiresAt });
    this.stats.sets++;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      this.stats.deletes++;

      if (this.useRedis && this.cacheManager) {
        await this.cacheManager.del(key);
      }

      this.localCache.delete(key);
    } catch (error) {
      this.logError('Cache delete error', error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    let count = 0;

    // Delete from local cache
    for (const key of this.localCache.keys()) {
      if (key.startsWith(pattern) || key.includes(pattern)) {
        this.localCache.delete(key);
        count++;
      }
    }

    // For Redis, we'd need to use SCAN and DEL
    // This is a simplified version
    if (this.useRedis && this.cacheManager) {
      // Note: cache-manager doesn't support pattern deletion directly
      // In production, you'd use ioredis directly for this
      this.log(`Pattern deletion requested for: ${pattern}`);
    }

    return count;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      if (this.useRedis && this.cacheManager) {
        // cache-manager v5 uses store.reset() or we can delete all keys
        const store = (this.cacheManager as any).store;
        if (store && typeof store.reset === 'function') {
          await store.reset();
        }
      }
      this.localCache.clear();
      this.log('Cache cleared');
    } catch (error) {
      this.logError('Cache clear error', error);
    }
  }

  /**
   * Get or set value (memoization pattern)
   * @param ttl - Time to live in seconds
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        results.set(key, value);
      }),
    );

    return results;
  }

  /**
   * Set multiple values
   * @param ttl - Time to live in seconds
   */
  async mset<T>(
    entries: Array<{ key: string; value: T }>,
    ttl: number = CacheTTL.MEDIUM,
  ): Promise<void> {
    await Promise.all(entries.map(({ key, value }) => this.set(key, value, ttl)));
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current + amount;
    await this.set(key, newValue, CacheTTL.MEDIUM);
    return newValue;
  }

  /**
   * Decrement a numeric value
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  /**
   * Add to a set
   */
  async addToSet(key: string, value: string, ttl: number = CacheTTL.LONG): Promise<void> {
    const set = (await this.get<Set<string>>(key)) || new Set();
    set.add(value);
    await this.set(key, set, ttl);
  }

  /**
   * Remove from a set
   */
  async removeFromSet(key: string, value: string): Promise<void> {
    const set = await this.get<Set<string>>(key);
    if (set) {
      set.delete(value);
      await this.set(key, set);
    }
  }

  /**
   * Check if value is in set
   */
  async isInSet(key: string, value: string): Promise<boolean> {
    const set = await this.get<Set<string>>(key);
    return set ? set.has(value) : false;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: string;
    useRedis: boolean;
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%';

    return {
      size: this.localCache.size,
      ...this.stats,
      hitRate,
      useRedis: this.useRedis,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Cleanup expired entries from local cache
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.localCache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.localCache.delete(key));

    if (keysToDelete.length > 0) {
      this.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  private log(message: string): void {
    if (this.logger) {
      this.logger.debug(message, { context: 'CacheService' });
    }
  }

  private logError(message: string, error: any): void {
    if (this.logger) {
      this.logger.error(message, { context: 'CacheService', error: error.message });
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.localCache.clear();
  }
}

/**
 * Cache key builder utilities
 */
export class CacheKey {
  static user(userId: string): string {
    return `${CachePrefix.USER}${userId}`;
  }

  static userSettings(userId: string): string {
    return `${CachePrefix.USER}${userId}:settings`;
  }

  static conversation(conversationId: string): string {
    return `${CachePrefix.CONVERSATION}${conversationId}`;
  }

  static conversationMessages(conversationId: string, page?: number): string {
    return `${CachePrefix.CONVERSATION}${conversationId}:messages${page ? `:${page}` : ''}`;
  }

  static message(messageId: string): string {
    return `${CachePrefix.MESSAGE}${messageId}`;
  }

  static session(sessionId: string): string {
    return `${CachePrefix.SESSION}${sessionId}`;
  }

  static userSessions(userId: string): string {
    return `${CachePrefix.SESSION}user:${userId}`;
  }

  static rateLimit(ip: string, endpoint: string): string {
    return `${CachePrefix.RATE_LIMIT}${ip}:${endpoint}`;
  }

  static otp(phoneNumber: string): string {
    return `${CachePrefix.OTP}${phoneNumber}`;
  }

  static token(tokenId: string): string {
    return `${CachePrefix.TOKEN}${tokenId}`;
  }

  static linkPreview(url: string): string {
    // Hash the URL for consistent key length
    const hash = url.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `${CachePrefix.LINK_PREVIEW}${Math.abs(hash)}`;
  }

  static analytics(type: string, period: string): string {
    return `${CachePrefix.ANALYTICS}${type}:${period}`;
  }
}
