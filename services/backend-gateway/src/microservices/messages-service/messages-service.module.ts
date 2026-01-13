import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MessagesServiceController } from './messages-service.controller';
import { MessagesServiceHandler } from './messages-service.handler';
import { Message, MessageSchema } from './schemas/message.schema';
import { SERVICES, TCP_CONFIG } from '../../shared/constants/services';

/**
 * Messages Microservice Module
 *
 * Responsibilities:
 * - Message sending and receiving
 * - Message status tracking (sent, delivered, read)
 * - Reactions and replies
 * - Message search
 * - Message forwarding
 * - Pin/unpin messages
 * - Disappearing messages
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
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 300000, // 5 minutes
        max: 1000,
      }),
    }),
    // Register other service clients for inter-service communication
    ClientsModule.registerAsync([
      {
        name: SERVICES.CONVERSATIONS_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('CONVERSATIONS_SERVICE_HOST') || TCP_CONFIG.CONVERSATIONS_SERVICE.host,
            port:
              parseInt(config.get('CONVERSATIONS_SERVICE_TCP_PORT') || '', 10) ||
              TCP_CONFIG.CONVERSATIONS_SERVICE.port,
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
  controllers: [MessagesServiceController],
  providers: [MessagesServiceHandler],
})
export class MessagesServiceModule {}
