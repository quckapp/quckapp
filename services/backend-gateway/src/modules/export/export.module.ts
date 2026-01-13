import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserSettings, UserSettingsSchema } from '../users/schemas/user-settings.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSettings.name, schema: UserSettingsSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
