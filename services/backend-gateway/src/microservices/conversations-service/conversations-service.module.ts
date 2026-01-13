import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConversationsServiceController } from './conversations-service.controller';
import { ConversationsServiceHandler } from './conversations-service.handler';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { SERVICES, TCP_CONFIG } from '../../shared/constants/services';

/**
 * Conversations Microservice Module
 *
 * Responsibilities:
 * - Conversation creation and management
 * - Group management (add/remove participants)
 * - Admin management
 * - Mute/archive functionality
 * - Typing indicators
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
    MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }]),
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
        name: SERVICES.MESSAGES_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('MESSAGES_SERVICE_HOST') || TCP_CONFIG.MESSAGES_SERVICE.host,
            port:
              parseInt(config.get('MESSAGES_SERVICE_TCP_PORT') || '', 10) ||
              TCP_CONFIG.MESSAGES_SERVICE.port,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ConversationsServiceController],
  providers: [ConversationsServiceHandler],
})
export class ConversationsServiceModule {}
