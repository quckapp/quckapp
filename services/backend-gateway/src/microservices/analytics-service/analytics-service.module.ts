import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsServiceController } from './analytics-service.controller';
import { AnalyticsServiceHandler } from './analytics-service.handler';
import {
  AnalyticsEvent,
  AnalyticsEventSchema,
  AppMetrics,
  AppMetricsSchema,
  RetentionCohort,
  RetentionCohortSchema,
  UserMetrics,
  UserMetricsSchema,
  UserSession,
  UserSessionSchema,
} from './schemas/analytics.schema';

/**
 * Analytics Microservice Module
 *
 * Responsibilities:
 * - Event tracking and logging
 * - User session management
 * - User metrics aggregation
 * - App-wide metrics aggregation
 * - Retention cohort analysis
 * - Feature usage tracking
 * - Dashboard summary generation
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGODB_URI_PROD') || config.get('MONGODB_URI_DEV') || config.get('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: UserMetrics.name, schema: UserMetricsSchema },
      { name: AppMetrics.name, schema: AppMetricsSchema },
      { name: RetentionCohort.name, schema: RetentionCohortSchema },
    ]),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 300000, // 5 minutes
        max: 500,
      }),
    }),
  ],
  controllers: [AnalyticsServiceController],
  providers: [AnalyticsServiceHandler],
})
export class AnalyticsServiceModule {}
