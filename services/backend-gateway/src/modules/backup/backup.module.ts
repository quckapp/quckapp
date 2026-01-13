import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { GcsStorageService } from './gcs-storage.service';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [BackupController],
  providers: [BackupService, GcsStorageService],
  exports: [BackupService, GcsStorageService],
})
export class BackupModule {}
