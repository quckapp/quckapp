import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../../common/cache/cache.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const redisHost = this.configService.get('REDIS_HOST');
    const isRedisConfigured = !!redisHost;

    // If Redis is not configured, return healthy with info
    if (!isRedisConfigured) {
      return this.getStatus(key, true, {
        status: 'not_configured',
        message: 'Redis is not configured, using in-memory cache',
      });
    }

    try {
      // Test Redis connectivity by setting and getting a test value
      const testKey = `health:${Date.now()}`;
      const testValue = 'health_check';

      await this.cacheService.set(testKey, testValue, 10);
      const retrieved = await this.cacheService.get<string>(testKey);
      await this.cacheService.delete(testKey);

      if (retrieved === testValue) {
        const stats = this.cacheService.getStats();
        return this.getStatus(key, true, {
          status: 'connected',
          host: redisHost,
          port: this.configService.get('REDIS_PORT') || 6379,
          cacheStats: {
            size: stats.size,
            hitRate: stats.hitRate, // Already a formatted string from CacheService
          },
        });
      }

      throw new Error('Redis read/write verification failed');
    } catch (error) {
      const result = this.getStatus(key, false, {
        status: 'disconnected',
        error: (error as Error).message,
      });
      throw new HealthCheckError('Redis health check failed', result);
    }
  }
}
