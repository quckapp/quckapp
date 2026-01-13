import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CallsServiceController } from './calls-service.controller';
import { CallsServiceHandler } from './calls-service.handler';
import { Call, CallSchema, CallSignal, CallSignalSchema } from './schemas/call.schema';
import { SERVICES, TCP_CONFIG } from '../../shared/constants/services';

/**
 * Calls Microservice Module
 *
 * Responsibilities:
 * - Voice and video call management
 * - WebRTC signaling
 * - Call state management
 * - Screen sharing
 * - Call history
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
      { name: Call.name, schema: CallSchema },
      { name: CallSignal.name, schema: CallSignalSchema },
    ]),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 60000, // 1 minute for active calls
        max: 500,
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
      {
        name: SERVICES.NOTIFICATIONS_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('NOTIFICATIONS_SERVICE_HOST') || TCP_CONFIG.NOTIFICATIONS_SERVICE.host,
            port:
              parseInt(config.get('NOTIFICATIONS_SERVICE_TCP_PORT') || '', 10) ||
              TCP_CONFIG.NOTIFICATIONS_SERVICE.port,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [CallsServiceController],
  providers: [CallsServiceHandler],
})
export class CallsServiceModule {}
