import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationsServiceController } from './notifications-service.controller';
import { NotificationsServiceHandler } from './notifications-service.handler';
import {
  Notification,
  NotificationPreferences,
  NotificationPreferencesSchema,
  NotificationSchema,
  PushToken,
  PushTokenSchema,
} from './schemas/notification.schema';
import { SERVICES, TCP_CONFIG } from '../../shared/constants/services';

/**
 * Notifications Microservice Module
 *
 * Responsibilities:
 * - Push notification management (FCM, APNs, Expo)
 * - In-app notifications
 * - Notification preferences
 * - Device token management
 * - Bulk notifications
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
      { name: Notification.name, schema: NotificationSchema },
      { name: PushToken.name, schema: PushTokenSchema },
      { name: NotificationPreferences.name, schema: NotificationPreferencesSchema },
    ]),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 300000,
        max: 1000,
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: SERVICES.USERS_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('USERS_SERVICE_HOST') || TCP_CONFIG.USERS_SERVICE.host,
            port:
              parseInt(config.get('USERS_SERVICE_TCP_PORT') || '', 10) ||
              TCP_CONFIG.USERS_SERVICE.port,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [NotificationsServiceController],
  providers: [NotificationsServiceHandler],
})
export class NotificationsServiceModule {}
