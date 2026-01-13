import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersServiceController } from './users-service.controller';
import { UsersServiceHandler } from './users-service.handler';
import { User, UserSchema } from './schemas/user.schema';
import { UserSettings, UserSettingsSchema } from './schemas/user-settings.schema';
import { Contact, ContactSchema } from './schemas/contact.schema';

/**
 * Users Microservice Module
 *
 * Responsibilities:
 * - User CRUD operations
 * - Profile management (displayName, avatar, bio, status)
 * - User search and discovery
 * - Contact management and syncing
 * - User blocking functionality
 * - Presence management (online/offline status)
 * - Privacy settings
 * - Device linking
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
      { name: User.name, schema: UserSchema },
      { name: UserSettings.name, schema: UserSettingsSchema },
      { name: Contact.name, schema: ContactSchema },
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 1000,
    }),
  ],
  controllers: [UsersServiceController],
  providers: [UsersServiceHandler],
  exports: [UsersServiceHandler],
})
export class UsersServiceModule {}
