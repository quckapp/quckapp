import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { MessagesModule } from '../messages/messages.module';
import { AiService } from '../../common/services/ai.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => MessagesModule),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, AiService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
