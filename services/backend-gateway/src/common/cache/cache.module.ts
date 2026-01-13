import { DynamicModule, Global, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { RedisService } from './redis.service';
import { LoggerModule } from '../logger/logger.module';

/**
 * CacheModule - Global module for caching with Redis support
 * Design Pattern: Singleton (Global module)
 * Supports both in-memory cache (development) and Redis (production)
 * Includes RedisService for advanced Redis operations
 */
@Global()
@Module({})
export class CacheModule {
  static forRoot(): DynamicModule {
    return {
      module: CacheModule,
      imports: [
        ConfigModule,
        LoggerModule,
        NestCacheModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const redisHost = configService.get('REDIS_HOST');
            const isDevelopment = configService.get('NODE_ENV') === 'development';
            const useRedisInDev = configService.get('USE_REDIS_IN_DEV') === 'true';

            // Use Redis if configured and either in production or explicitly enabled for dev
            if (redisHost && (!isDevelopment || useRedisInDev)) {
              try {
                const redisStore = await import('cache-manager-redis-store');
                console.log('[Cache] Initializing Redis cache...');

                return {
                  store: redisStore.default || redisStore,
                  host: redisHost,
                  port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
                  password: configService.get('REDIS_PASSWORD') || undefined,
                  ttl: parseInt(configService.get('CACHE_TTL') || '300', 10),
                  max: parseInt(configService.get('CACHE_MAX_ITEMS') || '1000', 10),
                  db: parseInt(configService.get('REDIS_CACHE_DB') || '0', 10),
                };
              } catch (error) {
                console.warn('[Cache] Redis not available, using in-memory cache');
              }
            }

            // In-memory cache for development or fallback
            console.log('[Cache] Using in-memory cache');
            return {
              ttl: parseInt(configService.get('CACHE_TTL') || '300', 10),
              max: parseInt(configService.get('CACHE_MAX_ITEMS') || '500', 10),
            };
          },
        }),
      ],
      providers: [CacheService, RedisService],
      exports: [NestCacheModule, CacheService, RedisService],
    };
  }

  // Simple in-memory only version (for backwards compatibility)
  static forRootSimple(): DynamicModule {
    return {
      module: CacheModule,
      imports: [LoggerModule],
      providers: [CacheService],
      exports: [CacheService],
    };
  }
}
