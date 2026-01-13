import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CONVERSATIONS_PATTERNS } from '../../shared/contracts/message-patterns';
import { ConversationsServiceHandler } from './conversations-service.handler';
import { CreateConversationDto, UpdateConversationDto } from '../../shared/dto';

/**
 * Conversations Service Controller
 * Handles incoming messages from the message broker
 */
@Controller()
export class ConversationsServiceController {
  constructor(private handler: ConversationsServiceHandler) {}

  @MessagePattern(CONVERSATIONS_PATTERNS.CREATE_CONVERSATION)
  async createConversation(@Payload() dto: CreateConversationDto) {
    return this.handler.createConversation(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.GET_CONVERSATION)
  async getConversation(@Payload() dto: { conversationId: string; userId: string }) {
    return this.handler.getConversation(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.GET_USER_CONVERSATIONS)
  async getUserConversations(
    @Payload() dto: { userId: string; limit?: number; offset?: number; type?: string },
  ) {
    return this.handler.getUserConversations(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.UPDATE_CONVERSATION)
  async updateConversation(
    @Payload() dto: UpdateConversationDto & { conversationId: string; userId: string },
  ) {
    return this.handler.updateConversation(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.DELETE_CONVERSATION)
  async deleteConversation(@Payload() dto: { conversationId: string; userId: string }) {
    return this.handler.deleteConversation(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.ADD_PARTICIPANT)
  async addParticipant(
    @Payload() dto: { conversationId: string; userId: string; addedBy: string },
  ) {
    return this.handler.addParticipant(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.REMOVE_PARTICIPANT)
  async removeParticipant(
    @Payload() dto: { conversationId: string; userId: string; removedBy: string },
  ) {
    return this.handler.removeParticipant(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.MAKE_ADMIN)
  async makeAdmin(@Payload() dto: { conversationId: string; userId: string; adminBy: string }) {
    return this.handler.makeAdmin(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.REMOVE_ADMIN)
  async removeAdmin(@Payload() dto: { conversationId: string; userId: string; removedBy: string }) {
    return this.handler.removeAdmin(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.MUTE_CONVERSATION)
  async muteConversation(@Payload() dto: { conversationId: string; userId: string; until?: Date }) {
    return this.handler.muteConversation(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.UNMUTE_CONVERSATION)
  async unmuteConversation(@Payload() dto: { conversationId: string; userId: string }) {
    return this.handler.unmuteConversation(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.ARCHIVE_CONVERSATION)
  async archiveConversation(@Payload() dto: { conversationId: string; userId: string }) {
    return this.handler.archiveConversation(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.UNARCHIVE_CONVERSATION)
  async unarchiveConversation(@Payload() dto: { conversationId: string; userId: string }) {
    return this.handler.unarchiveConversation(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.SET_TYPING)
  async setTyping(@Payload() dto: { conversationId: string; userId: string; isTyping: boolean }) {
    return this.handler.setTyping(dto);
  }

  @MessagePattern(CONVERSATIONS_PATTERNS.GET_PARTICIPANTS)
  async getParticipants(@Payload() dto: { conversationId: string }) {
    return this.handler.getParticipants(dto);
  }
}
