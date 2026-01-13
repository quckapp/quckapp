import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserSettings, UserSettingsSchema } from './schemas/user-settings.schema';
import { UserProfileClientService } from './user-profile-client.service';
import { HttpModule } from '../../common/http/http.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSettings.name, schema: UserSettingsSchema },
    ]),
    ConfigModule,
    HttpModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserProfileClientService],
  exports: [UsersService, UserProfileClientService],
})
export class UsersModule {}
