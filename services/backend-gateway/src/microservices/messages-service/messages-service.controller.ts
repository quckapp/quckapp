import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MESSAGES_PATTERNS } from '../../shared/contracts/message-patterns';
import { MessagesServiceHandler } from './messages-service.handler';

/**
 * Messages Service Controller
 * Handles incoming messages from the message broker
 */
@Controller()
export class MessagesServiceController {
  constructor(private handler: MessagesServiceHandler) {}

  @MessagePattern(MESSAGES_PATTERNS.SEND_MESSAGE)
  async sendMessage(@Payload() dto: any) {
    return this.handler.sendMessage(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.GET_MESSAGE)
  async getMessage(@Payload() dto: { messageId: string }) {
    return this.handler.getMessage(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.GET_CONVERSATION_MESSAGES)
  async getConversationMessages(
    @Payload()
    dto: {
      conversationId: string;
      limit?: number;
      offset?: number;
      before?: string;
      after?: string;
    },
  ) {
    return this.handler.getConversationMessages(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.UPDATE_MESSAGE)
  async updateMessage(@Payload() dto: { messageId: string; userId: string; content?: string }) {
    return this.handler.updateMessage(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.DELETE_MESSAGE)
  async deleteMessage(
    @Payload() dto: { messageId: string; userId: string; forEveryone?: boolean },
  ) {
    return this.handler.deleteMessage(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.MARK_AS_READ)
  async markAsRead(@Payload() dto: { messageIds: string[]; userId: string }) {
    return this.handler.markAsRead(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.MARK_AS_DELIVERED)
  async markAsDelivered(@Payload() dto: { messageIds: string[]; userId: string }) {
    return this.handler.markAsDelivered(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.ADD_REACTION)
  async addReaction(@Payload() dto: { messageId: string; userId: string; emoji: string }) {
    return this.handler.addReaction(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.REMOVE_REACTION)
  async removeReaction(@Payload() dto: { messageId: string; userId: string }) {
    return this.handler.removeReaction(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.PIN_MESSAGE)
  async pinMessage(@Payload() dto: { messageId: string; userId: string }) {
    return this.handler.pinMessage(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.UNPIN_MESSAGE)
  async unpinMessage(@Payload() dto: { messageId: string; userId: string }) {
    return this.handler.unpinMessage(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.FORWARD_MESSAGE)
  async forwardMessage(
    @Payload() dto: { messageId: string; toConversationIds: string[]; userId: string },
  ) {
    return this.handler.forwardMessage(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.SEARCH_MESSAGES)
  async searchMessages(
    @Payload()
    dto: {
      query: string;
      conversationId?: string;
      userId: string;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.handler.searchMessages(dto);
  }

  @MessagePattern(MESSAGES_PATTERNS.GET_UNREAD_COUNT)
  async getUnreadCount(@Payload() dto: { userId: string; conversationId?: string }) {
    return this.handler.getUnreadCount(dto);
  }
}
