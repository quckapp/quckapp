import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { WebrtcGateway } from './webrtc.gateway';
import { MessagesModule } from '../modules/messages/messages.module';
import { UsersModule } from '../modules/users/users.module';
import { ConversationsModule } from '../modules/conversations/conversations.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { LoggerModule } from '../common/logger/logger.module';
import { CallsModule } from '../modules/calls/calls.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
    MessagesModule,
    UsersModule,
    ConversationsModule,
    NotificationsModule,
    LoggerModule,
    forwardRef(() => CallsModule),
  ],
  providers: [ChatGateway, WebrtcGateway],
  exports: [ChatGateway, WebrtcGateway],
})
export class GatewaysModule {}
