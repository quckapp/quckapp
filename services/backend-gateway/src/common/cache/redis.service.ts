import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '../logger/logger.service';

/**
 * RedisService - Direct Redis client for advanced operations
 * Provides access to Redis features not available through cache-manager
 * Used for pub/sub, streams, and other advanced Redis operations
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    const redisHost = this.configService.get('REDIS_HOST');

    if (!redisHost) {
      this.logger.warn(
        'Redis host not configured. Redis features will be disabled.',
        'RedisService',
      );
      return;
    }

    const redisConfig = {
      host: redisHost,
      port: parseInt(this.configService.get('REDIS_PORT', '6379'), 10),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: parseInt(this.configService.get('REDIS_DB', '0'), 10),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    try {
      this.client = new Redis(redisConfig);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${redisHost}:${redisConfig.port}`, 'RedisService');
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis connection error', error.message, 'RedisService');
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Redis connection closed', 'RedisService');
      });

      await this.client.connect();
    } catch (error: any) {
      this.logger.error('Failed to connect to Redis', error.message, 'RedisService');
      this.client = null;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.isConnected = false;
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get the raw Redis client
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.get(key);
  }

  /**
   * Set value in Redis with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      return;
    }
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key: string): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.del(key);
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.client) {
      return 0;
    }

    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    return (await this.client.exists(key)) === 1;
  }

  /**
   * Set key expiration
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.expire(key, seconds);
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) {
      return -2;
    }
    return this.client.ttl(key);
  }

  /**
   * Increment a value
   */
  async incr(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.incr(key);
  }

  /**
   * Increment by specific amount
   */
  async incrBy(key: string, amount: number): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.incrby(key, amount);
  }

  /**
   * Decrement a value
   */
  async decr(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.decr(key);
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) {
      return {};
    }
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.hdel(key, ...fields);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    return (await this.client.sismember(key, member)) === 1;
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.llen(key);
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    return this.client.zrange(key, start, stop);
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    return this.client.zrangebyscore(key, min, max);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.zrem(key, ...members);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const redisHost = this.configService.get('REDIS_HOST');
    if (!redisHost) {
      this.logger.warn('Redis host not configured. Subscribe operation skipped.', 'RedisService');
      return;
    }

    if (!this.subscriber) {
      const redisConfig = {
        host: redisHost,
        port: parseInt(this.configService.get('REDIS_PORT', '6379'), 10),
        password: this.configService.get('REDIS_PASSWORD') || undefined,
        db: parseInt(this.configService.get('REDIS_DB', '0'), 10),
      };
      this.subscriber = new Redis(redisConfig);
    }

    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(channel);
    }
  }

  /**
   * Execute raw command
   */
  async exec(command: string, ...args: (string | number)[]): Promise<any> {
    if (!this.client) {
      return null;
    }
    return this.client.call(command, ...args);
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    if (!this.client) {
      return '';
    }
    return this.client.info();
  }

  /**
   * Flush current database
   */
  async flushDb(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.flushdb();
  }
}
