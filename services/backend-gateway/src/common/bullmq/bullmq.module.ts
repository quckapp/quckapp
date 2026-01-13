import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from '../logger/logger.module';

/**
 * BullMQ Queue Names - Centralized queue name constants
 */
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  MEDIA: 'media',
  EMAIL: 'email',
  ANALYTICS: 'analytics',
  SCHEDULED_TASKS: 'scheduled-tasks',
} as const;

/**
 * Queue Priority Levels
 */
export const QUEUE_PRIORITY = {
  LOW: 10,
  NORMAL: 5,
  HIGH: 2,
  URGENT: 1,
} as const;

/**
 * Default job options
 */
export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: {
    count: 100,
    age: 3600, // 1 hour
  },
  removeOnFail: {
    count: 500,
    age: 86400, // 24 hours
  },
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
};

/**
 * BullMQModule - Global module for BullMQ queue management
 * Design Pattern: Factory Pattern with Dynamic Module
 * Uses Redis as backend for distributed, persistent job queues
 */
@Global()
@Module({})
export class BullMQModule {
  static forRoot(): DynamicModule {
    return {
      module: BullMQModule,
      imports: [
        ConfigModule,
        LoggerModule,
        // Register BullMQ with Redis connection
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const redisHost = configService.get('REDIS_HOST');

            // Skip Redis connection if not configured
            if (!redisHost) {
              console.log('[BullMQ] Redis host not configured. BullMQ queues will be disabled.');
              return {
                connection: {
                  host: 'localhost',
                  port: 6379,
                  maxRetriesPerRequest: null,
                  enableReadyCheck: false,
                  lazyConnect: true,
                  retryStrategy: () => null, // Don't retry - Redis is intentionally disabled
                },
                defaultJobOptions: DEFAULT_JOB_OPTIONS,
              };
            }

            const redisPort = parseInt(configService.get('REDIS_PORT', '6379'), 10);
            const redisPassword = configService.get('REDIS_PASSWORD');
            const redisDb = parseInt(configService.get('REDIS_QUEUE_DB', '1'), 10);

            console.log(
              `[BullMQ] Connecting to Redis at ${redisHost}:${redisPort} (DB: ${redisDb})`,
            );

            return {
              connection: {
                host: redisHost,
                port: redisPort,
                password: redisPassword || undefined,
                db: redisDb,
                maxRetriesPerRequest: null, // Required for BullMQ
                enableReadyCheck: false,
                retryStrategy: (times: number) => {
                  // Stop retrying after 3 attempts during startup
                  if (times > 3) {
                    console.warn('[BullMQ] Redis connection failed after 3 attempts. Queues will be disabled.');
                    return null; // Stop retrying
                  }
                  return Math.min(times * 200, 2000); // Retry with exponential backoff
                },
                lazyConnect: true, // Don't block startup if Redis is unavailable
              },
              defaultJobOptions: DEFAULT_JOB_OPTIONS,
            };
          },
        }),
        // Register individual queues
        BullModule.registerQueue(
          { name: QUEUE_NAMES.NOTIFICATIONS },
          { name: QUEUE_NAMES.MESSAGES },
          { name: QUEUE_NAMES.MEDIA },
          { name: QUEUE_NAMES.EMAIL },
          { name: QUEUE_NAMES.ANALYTICS },
          { name: QUEUE_NAMES.SCHEDULED_TASKS },
        ),
      ],
      exports: [BullModule],
    };
  }

  /**
   * Register specific queues for feature modules
   */
  static registerQueues(...queues: string[]): DynamicModule {
    return {
      module: BullMQModule,
      imports: [BullModule.registerQueue(...queues.map((name) => ({ name })))],
      exports: [BullModule],
    };
  }
}
