import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { SERVICES, TCP_CONFIG } from '../../shared/constants/services';

// Controllers
import { GatewayController } from './gateway.controller';
import { AuthGatewayController } from './controllers/auth.gateway.controller';
import { UsersGatewayController } from './controllers/users.gateway.controller';
import { MessagesGatewayController } from './controllers/messages.gateway.controller';
import { ConversationsGatewayController } from './controllers/conversations.gateway.controller';
import { NotificationsGatewayController } from './controllers/notifications.gateway.controller';
import { MediaGatewayController } from './controllers/media.gateway.controller';
import { CallsGatewayController } from './controllers/calls.gateway.controller';
import { InternalGatewayController } from './controllers/internal.gateway.controller';

// Services
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

/**
 * API Gateway Module
 *
 * The Gateway acts as the single entry point for all client requests.
 * It routes requests to appropriate microservices and handles:
 * - Request routing to microservices via TCP
 * - JWT Authentication/Authorization
 * - Rate limiting per endpoint
 * - Request/Response transformation
 * - Health checks
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10, // 10 auth requests per minute
      },
    ]),
    // Register all microservice clients
    ClientsModule.registerAsync([
      {
        name: SERVICES.AUTH_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('AUTH_SERVICE_HOST') || TCP_CONFIG.AUTH_SERVICE.host,
            port:
              parseInt(config.get('AUTH_SERVICE_TCP_PORT') || '', 10) ||
              TCP_CONFIG.AUTH_SERVICE.port,
          },
        }),
        inject: [ConfigService],
      },
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
      {
        name: SERVICES.MEDIA_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('MEDIA_SERVICE_HOST') || TCP_CONFIG.MEDIA_SERVICE.host,
            port:
              parseInt(config.get('MEDIA_SERVICE_TCP_PORT') || '', 10) ||
              TCP_CONFIG.MEDIA_SERVICE.port,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: SERVICES.CALLS_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('CALLS_SERVICE_HOST') || TCP_CONFIG.CALLS_SERVICE.host,
            port:
              parseInt(config.get('CALLS_SERVICE_TCP_PORT') || '', 10) ||
              TCP_CONFIG.CALLS_SERVICE.port,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: SERVICES.ANALYTICS_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('ANALYTICS_SERVICE_HOST') || TCP_CONFIG.ANALYTICS_SERVICE.host,
            port:
              parseInt(config.get('ANALYTICS_SERVICE_TCP_PORT') || '', 10) ||
              TCP_CONFIG.ANALYTICS_SERVICE.port,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [
    GatewayController,
    AuthGatewayController,
    UsersGatewayController,
    MessagesGatewayController,
    ConversationsGatewayController,
    NotificationsGatewayController,
    MediaGatewayController,
    CallsGatewayController,
    InternalGatewayController,
  ],
  providers: [
    JwtAuthGuard,
    {
      provide: JwtService,
      useFactory: (config: ConfigService) => {
        return new JwtService({
          secret: config.get('JWT_SECRET') || 'your-super-secret-jwt-key',
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [JwtAuthGuard, JwtService],
})
export class GatewayModule {}
