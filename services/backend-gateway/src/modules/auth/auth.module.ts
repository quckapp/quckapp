import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { SessionController } from './session.controller';
import { TwoFactorService } from './two-factor.service';
import { OAuthService } from './oauth.service';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { SpringAuthClientService } from './spring-auth-client.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SpringJwtStrategy } from './strategies/spring-jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { UsersModule } from '../users/users.module';
import { UserSettings, UserSettingsSchema } from '../users/schemas/user-settings.schema';
import { HttpModule } from '../../common/http/http.module';
import { KafkaModule } from '../../common/kafka/kafka.module';

@Module({
  imports: [
    UsersModule,
    HttpModule,
    // Kafka for auth events - configured via environment variables
    KafkaModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        clientId: configService.get('KAFKA_CLIENT_ID') || 'quckchat-auth',
        brokers: (configService.get('KAFKA_BROKERS') || 'localhost:9092').split(','),
        ssl: configService.get('KAFKA_SSL') === 'true',
      }),
    }),
    PassportModule.register({ session: true }),
    MongooseModule.forFeature([{ name: UserSettings.name, schema: UserSettingsSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, OAuthController, SessionController],
  providers: [
    AuthService,
    TwoFactorService,
    OAuthService,
    TokenService,
    PasswordService,
    SpringAuthClientService,
    JwtStrategy,
    SpringJwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    AppleStrategy,
  ],
  exports: [
    AuthService,
    TwoFactorService,
    OAuthService,
    TokenService,
    PasswordService,
    SpringAuthClientService,
    JwtModule,
  ],
})
export class AuthModule {}
