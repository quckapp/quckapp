import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceHandler } from './auth-service.handler';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { TwoFactorAuthService } from './services/two-factor.service';
import { OAuthService } from './services/oauth.service';
import { SmsService } from '../../common/services/sms.service';
import { Session, SessionSchema } from './schemas/session.schema';
import { OtpRecord, OtpRecordSchema } from './schemas/otp.schema';
import { TwoFactorSecret, TwoFactorSecretSchema } from './schemas/two-factor.schema';
import { REDIS_CONFIG, SERVICES, TCP_CONFIG } from '../../shared/constants/services';

/**
 * Auth Microservice Module
 *
 * Responsibilities:
 * - OTP generation and verification
 * - JWT token management (access & refresh tokens)
 * - Session management (active sessions, device tracking)
 * - 2FA authentication (TOTP, SMS backup)
 * - OAuth integration (Google, Facebook, Apple)
 * - Token blacklisting and revocation
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
      { name: Session.name, schema: SessionSchema },
      { name: OtpRecord.name, schema: OtpRecordSchema },
      { name: TwoFactorSecret.name, schema: TwoFactorSecretSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'your-super-secret-jwt-key',
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN') || '1h',
        },
      }),
    }),
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum items in cache
    }),
    // Client for Users Service (to fetch/create users)
    ClientsModule.registerAsync([
      {
        name: SERVICES.USERS_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('USERS_SERVICE_HOST') || TCP_CONFIG.USERS_SERVICE.host,
            port: config.get('USERS_SERVICE_TCP_PORT') || TCP_CONFIG.USERS_SERVICE.port,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AuthServiceController],
  providers: [
    AuthServiceHandler,
    OtpService,
    TokenService,
    SessionService,
    TwoFactorAuthService,
    OAuthService,
    SmsService,
  ],
  exports: [AuthServiceHandler, TokenService, SessionService],
})
export class AuthServiceModule {}
