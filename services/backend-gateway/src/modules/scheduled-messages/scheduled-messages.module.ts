import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { ScheduledMessagesController } from './scheduled-messages.controller';
import { ScheduledMessage, ScheduledMessageSchema } from './schemas/scheduled-message.schema';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ScheduledMessage.name, schema: ScheduledMessageSchema }]),
    forwardRef(() => MessagesModule),
  ],
  controllers: [ScheduledMessagesController],
  providers: [ScheduledMessagesService],
  exports: [ScheduledMessagesService],
})
export class ScheduledMessagesModule {}
