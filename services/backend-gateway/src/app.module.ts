import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { LoggerModule } from './common/logger/logger.module';
import { CacheModule } from './common/cache/cache.module';
import { HttpModule } from './common/http/http.module';
import { EmailModule } from './common/email/email.module';
import { UploadModule } from './modules/upload/upload.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BroadcastModule } from './modules/broadcast/broadcast.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { StarredModule } from './modules/starred/starred.module';
import { StatusModule } from './modules/status/status.module';
import { CallsModule } from './modules/calls/calls.module';
import { HuddleModule } from './modules/huddle/huddle.module';
import { AdminModule } from './modules/admin/admin.module';
import { ExportModule } from './modules/export/export.module';
import { ScheduledMessagesModule } from './modules/scheduled-messages/scheduled-messages.module';
import { PollsModule } from './modules/polls/polls.module';
import { TranscriptionModule } from './modules/transcription/transcription.module';
import { LinkPreviewModule } from './modules/link-preview/link-preview.module';
import { HealthModule } from './modules/health/health.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { EventsModule } from './common/events/events.module';
import { AppCqrsModule } from './common/cqrs/cqrs.module';
import { getThrottlerConfig } from './common/throttler';
import { CasbinModule } from './common/casbin';
import { I18nModule } from './common/i18n';
import { PdfModule } from './modules/pdf/pdf.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { CsvModule } from './modules/csv/csv.module';
import { XmlModule } from './modules/xml/xml.module';
import { GifsModule } from './modules/gifs/gifs.module';
import { StickersModule } from './modules/stickers/stickers.module';
import { BackupModule } from './modules/backup/backup.module';
import { GatewaysModule } from './gateways/gateways.module';
import { S3Module } from './common/storage/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const env = config.get('NODE_ENV') || 'development';

        // Always use AWS/Production MongoDB
        const mongoUri =
          config.get<string>('MONGODB_URI_PROD') ||
          config.get<string>('MONGODB_URI');

        if (!mongoUri) {
          throw new Error('MongoDB URI not configured. Set MONGODB_URI_PROD or MONGODB_URI in .env');
        }

        // eslint-disable-next-line no-console
        console.log(`[MongoDB] Connecting to ${env} database...`);
        // Mask credentials in URI for logging (simple replacement to avoid regex backtracking)
        const maskedUri = mongoUri.includes('@')
          ? mongoUri.replace(/\/\/.*@/, '//***:***@')
          : mongoUri;
        // eslint-disable-next-line no-console
        console.log(`[MongoDB] URI: ${maskedUri}`);

        // Disable mongoose debug mode in development to reduce startup overhead
        // const mongoose = await import('mongoose');
        // mongoose.set('debug', true);

        return {
          uri: mongoUri,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 10000,
          // Completely disable auto-indexing for faster startup (create indexes manually in production)
          autoIndex: false,
          autoCreate: false,
        };
      },
    }),
    // Enhanced throttler with multiple rate limit tiers
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
        const isDevelopment = nodeEnv === 'development';
        return getThrottlerConfig(isDevelopment);
      },
    }),
    // Caching with Redis support
    CacheModule.forRoot(),
    // S3 storage for file uploads
    S3Module.forRoot(),
    // BullMQ disabled - requires Redis. Uncomment when Redis is available.
    // BullMQModule.forRoot(),
    // BullBoardModule,
    // HTTP client module
    HttpModule,
    // Email service with nodemailer
    EmailModule,
    LoggerModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    UploadModule,
    NotificationsModule,
    AnalyticsModule,
    BroadcastModule,
    CommunitiesModule,
    StarredModule,
    StatusModule,
    CallsModule,
    HuddleModule,
    AdminModule,
    ExportModule,
    ScheduledMessagesModule,
    PollsModule,
    TranscriptionModule,
    LinkPreviewModule,
    HealthModule,
    SchedulerModule,
    EventsModule,
    AppCqrsModule,
    // Monitoring and Observability - disabled in development
    // PrometheusModule,
    // SentryModule,
    // TracingModule,
    // Access Control with Casbin (RBAC/ABAC)
    CasbinModule,
    // Internationalization (i18n) support
    I18nModule.forRoot(),
    // Database migrations management - disabled in development
    // MigrationsModule.forRoot(),
    // PDF generation
    PdfModule,
    // ZIP archive generation
    ArchiveModule,
    // CSV import/export
    CsvModule,
    // XML parsing and generation
    XmlModule,
    // GIFs from GIPHY
    GifsModule,
    // User saved stickers
    StickersModule,
    // Backup to Google Cloud Storage
    BackupModule,
    // WebSocket gateways for real-time chat and WebRTC
    GatewaysModule,
  ],
  providers: [],
})
export class AppModule {}
