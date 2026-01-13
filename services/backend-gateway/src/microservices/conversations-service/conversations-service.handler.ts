import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { SERVICES } from '../../shared/constants/services';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../shared/utils/service-response.util';
import {
  IPaginatedResponse,
  IServiceResponse,
} from '../../shared/interfaces/microservice.interface';

interface ParticipantDto {
  userId: string;
  role: string;
  joinedAt: Date;
  isMuted: boolean;
  mutedUntil?: Date;
  lastReadAt?: Date;
  lastReadMessageId?: string;
}

interface ConversationDto {
  id: string;
  type: string;
  name: string;
  description: string;
  avatarUrl?: string;
  participants: ParticipantDto[];
  admins: string[];
  createdBy: string;
  settings: {
    muteNotifications: boolean;
    isArchived: boolean;
    isPinned: boolean;
    disappearingMessagesTime: number;
    allowReactions: boolean;
    allowReplies: boolean;
  };
  pinnedMessages: string[];
  lastMessageId?: string;
  lastMessageAt?: Date;
  lastMessagePreview: string;
  messageCount: number;
  isGroup: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateConversationDto {
  type?: string;
  name?: string;
  description?: string;
  avatarUrl?: string;
  participants: string[];
}

/**
 * Conversations Service Handler
 * Business logic for conversation operations with MongoDB
 */
@Injectable()
export class ConversationsServiceHandler {
  private readonly logger = new Logger(ConversationsServiceHandler.name);

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(SERVICES.USERS_SERVICE) private usersClient: ClientProxy,
    @Inject(SERVICES.MESSAGES_SERVICE) private messagesClient: ClientProxy,
  ) {}

  private toConversationDto(doc: ConversationDocument): ConversationDto {
    return {
      id: doc._id.toString(),
      type: doc.type,
      name: doc.name,
      description: doc.description,
      avatarUrl: doc.avatarUrl,
      participants: doc.participants.map((p) => ({
        userId: p.userId.toString(),
        role: p.role,
        joinedAt: p.joinedAt,
        isMuted: p.isMuted,
        mutedUntil: p.mutedUntil,
        lastReadAt: p.lastReadAt,
        lastReadMessageId: p.lastReadMessageId?.toString(),
      })),
      admins: doc.admins.map((id) => id.toString()),
      createdBy: doc.createdBy.toString(),
      settings: doc.settings,
      pinnedMessages: doc.pinnedMessages.map((id) => id.toString()),
      lastMessageId: doc.lastMessageId?.toString(),
      lastMessageAt: doc.lastMessageAt,
      lastMessagePreview: doc.lastMessagePreview,
      messageCount: doc.messageCount,
      isGroup: doc.type === 'group' || doc.type === 'channel',
      metadata: doc.metadata,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }

  async createConversation(dto: CreateConversationDto): Promise<IServiceResponse<ConversationDto>> {
    try {
      const type = dto.type || 'direct';

      // For direct chats, check if conversation already exists between participants
      if (type === 'direct' && dto.participants.length === 2) {
        const existingConv = await this.findDirectConversation(
          dto.participants[0],
          dto.participants[1],
        );
        if (existingConv) {
          return successResponse(
            this.toConversationDto(existingConv),
            SERVICES.CONVERSATIONS_SERVICE,
          );
        }
      }

      const creatorId = dto.participants[0];
      const participantDocs = dto.participants.map((userId, index) => ({
        userId: new Types.ObjectId(userId),
        role: type === 'group' && index === 0 ? 'admin' : 'member',
        joinedAt: new Date(),
        isMuted: false,
      }));

      const conversation = new this.conversationModel({
        type,
        name: dto.name || '',
        description: dto.description || '',
        avatarUrl: dto.avatarUrl,
        participants: participantDocs,
        admins: type === 'group' ? [new Types.ObjectId(creatorId)] : [],
        createdBy: new Types.ObjectId(creatorId),
        settings: {
          muteNotifications: false,
          isArchived: false,
          isPinned: false,
          disappearingMessagesTime: 0,
          allowReactions: true,
          allowReplies: true,
        },
        pinnedMessages: [],
        messageCount: 0,
      });

      const saved = await conversation.save();

      // Invalidate user conversation caches
      for (const userId of dto.participants) {
        await this.cacheManager.del(`user_convs:${userId}`);
      }

      this.logger.log(`Conversation created: ${saved._id} (${type})`);

      return successResponse(this.toConversationDto(saved), SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to create conversation: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async getConversation(dto: {
    conversationId: string;
    userId: string;
  }): Promise<IServiceResponse<ConversationDto>> {
    try {
      // Try cache first
      const cacheKey = `conv:${dto.conversationId}`;
      const cached = await this.cacheManager.get<ConversationDto>(cacheKey);
      if (cached) {
        // Still verify participant access
        const isParticipant = cached.participants.some((p) => p.userId === dto.userId);
        if (!isParticipant) {
          return errorResponse(
            ERROR_CODES.FORBIDDEN,
            'You are not a participant of this conversation',
            SERVICES.CONVERSATIONS_SERVICE,
          );
        }
        return successResponse(cached, SERVICES.CONVERSATIONS_SERVICE);
      }

      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Check if user is participant
      const isParticipant = conversation.participants.some(
        (p) => p.userId.toString() === dto.userId,
      );
      if (!isParticipant) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'You are not a participant of this conversation',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      const conversationDto = this.toConversationDto(conversation);

      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, conversationDto, 300000);

      return successResponse(conversationDto, SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get conversation: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async getUserConversations(dto: {
    userId: string;
    limit?: number;
    offset?: number;
    type?: string;
  }): Promise<IServiceResponse<IPaginatedResponse<ConversationDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;

      const query: any = {
        'participants.userId': new Types.ObjectId(dto.userId),
        isDeleted: { $ne: true },
      };

      if (dto.type) {
        query.type = dto.type;
      }

      const [conversations, total] = await Promise.all([
        this.conversationModel
          .find(query)
          .sort({ lastMessageAt: -1, updatedAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        this.conversationModel.countDocuments(query),
      ]);

      return successResponse(
        {
          items: conversations.map((c) => this.toConversationDto(c)),
          total,
          limit,
          offset,
          hasMore: offset + conversations.length < total,
        },
        SERVICES.CONVERSATIONS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get user conversations: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async updateConversation(dto: {
    conversationId: string;
    userId: string;
    name?: string;
    description?: string;
    avatarUrl?: string;
    settings?: Partial<ConversationDto['settings']>;
  }): Promise<IServiceResponse<ConversationDto>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Check if user is admin for group updates
      const isGroup = conversation.type === 'group' || conversation.type === 'channel';
      if (isGroup && !conversation.admins.some((id) => id.toString() === dto.userId)) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'Only admins can update group settings',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      if (dto.name !== undefined) {
        conversation.name = dto.name;
      }
      if (dto.description !== undefined) {
        conversation.description = dto.description;
      }
      if (dto.avatarUrl !== undefined) {
        conversation.avatarUrl = dto.avatarUrl;
      }
      if (dto.settings) {
        conversation.settings = { ...conversation.settings, ...dto.settings };
      }

      const updated = await conversation.save();

      // Invalidate cache
      await this.cacheManager.del(`conv:${dto.conversationId}`);

      return successResponse(this.toConversationDto(updated), SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to update conversation: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async deleteConversation(dto: {
    conversationId: string;
    userId: string;
  }): Promise<IServiceResponse<{ deleted: boolean }>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // For groups, only creator can delete
      if (conversation.type === 'group' && conversation.createdBy.toString() !== dto.userId) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'Only the group creator can delete the group',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Soft delete
      conversation.isDeleted = true;
      conversation.deletedAt = new Date();
      await conversation.save();

      // Invalidate caches
      await this.cacheManager.del(`conv:${dto.conversationId}`);
      for (const participant of conversation.participants) {
        await this.cacheManager.del(`user_convs:${participant.userId}`);
      }

      return successResponse({ deleted: true }, SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to delete conversation: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async getOrCreateDirect(dto: {
    userId1: string;
    userId2: string;
  }): Promise<IServiceResponse<ConversationDto>> {
    try {
      // Check if direct conversation exists
      const existing = await this.findDirectConversation(dto.userId1, dto.userId2);
      if (existing) {
        return successResponse(this.toConversationDto(existing), SERVICES.CONVERSATIONS_SERVICE);
      }

      // Create new direct conversation
      return this.createConversation({
        type: 'direct',
        participants: [dto.userId1, dto.userId2],
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to get or create direct conversation: ${error.message}`,
        error.stack,
      );
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async addParticipant(dto: {
    conversationId: string;
    userId: string;
    addedBy: string;
  }): Promise<IServiceResponse<ConversationDto>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      if (conversation.type === 'direct') {
        return errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Cannot add participants to a direct conversation',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Check if already a participant
      if (conversation.participants.some((p) => p.userId.toString() === dto.userId)) {
        return errorResponse(
          ERROR_CODES.ALREADY_EXISTS,
          'User is already a participant',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      conversation.participants.push({
        userId: dto.userId as any,
        role: 'member',
        joinedAt: new Date(),
        isMuted: false,
        mutedUntil: null as any,
        lastReadAt: null as any,
        lastReadMessageId: null as any,
      });

      const updated = await conversation.save();

      // Invalidate caches
      await this.cacheManager.del(`conv:${dto.conversationId}`);
      await this.cacheManager.del(`user_convs:${dto.userId}`);

      return successResponse(this.toConversationDto(updated), SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to add participant: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async removeParticipant(dto: {
    conversationId: string;
    userId: string;
    removedBy: string;
  }): Promise<IServiceResponse<ConversationDto>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      if (conversation.type === 'direct') {
        return errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Cannot remove participants from a direct conversation',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Check permissions (admin or self-remove)
      const isAdmin = conversation.admins.some((id) => id.toString() === dto.removedBy);
      if (dto.userId !== dto.removedBy && !isAdmin) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'Only admins can remove other participants',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      conversation.participants = conversation.participants.filter(
        (p) => p.userId.toString() !== dto.userId,
      );
      conversation.admins = conversation.admins.filter((id) => id.toString() !== dto.userId);

      const updated = await conversation.save();

      // Invalidate caches
      await this.cacheManager.del(`conv:${dto.conversationId}`);
      await this.cacheManager.del(`user_convs:${dto.userId}`);

      return successResponse(this.toConversationDto(updated), SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to remove participant: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async leaveConversation(dto: {
    conversationId: string;
    userId: string;
  }): Promise<IServiceResponse<{ left: boolean }>> {
    const result = await this.removeParticipant({
      conversationId: dto.conversationId,
      userId: dto.userId,
      removedBy: dto.userId,
    });

    if (result.success) {
      return successResponse({ left: true }, SERVICES.CONVERSATIONS_SERVICE);
    }
    return result as unknown as IServiceResponse<{ left: boolean }>;
  }

  async makeAdmin(dto: {
    conversationId: string;
    userId: string;
    adminBy: string;
  }): Promise<IServiceResponse<ConversationDto>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Check if requester is admin
      if (!conversation.admins.some((id) => id.toString() === dto.adminBy)) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'Only admins can promote other members',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Check if user is participant
      const participant = conversation.participants.find((p) => p.userId.toString() === dto.userId);
      if (!participant) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'User is not a participant',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Add to admins if not already
      if (!conversation.admins.some((id) => id.toString() === dto.userId)) {
        conversation.admins.push(new Types.ObjectId(dto.userId) as any);
        participant.role = 'admin';
      }

      const updated = await conversation.save();

      await this.cacheManager.del(`conv:${dto.conversationId}`);

      return successResponse(this.toConversationDto(updated), SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to make admin: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async removeAdmin(dto: {
    conversationId: string;
    userId: string;
    removedBy: string;
  }): Promise<IServiceResponse<ConversationDto>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      // Only creator can remove admins
      if (conversation.createdBy.toString() !== dto.removedBy) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'Only the group creator can remove admins',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      conversation.admins = conversation.admins.filter((id) => id.toString() !== dto.userId);
      const participant = conversation.participants.find((p) => p.userId.toString() === dto.userId);
      if (participant) {
        participant.role = 'member';
      }

      const updated = await conversation.save();

      await this.cacheManager.del(`conv:${dto.conversationId}`);

      return successResponse(this.toConversationDto(updated), SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to remove admin: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async muteConversation(dto: {
    conversationId: string;
    userId: string;
    until?: Date;
  }): Promise<IServiceResponse<{ muted: boolean }>> {
    try {
      const result = await this.conversationModel.updateOne(
        {
          _id: new Types.ObjectId(dto.conversationId),
          'participants.userId': new Types.ObjectId(dto.userId),
        },
        {
          $set: {
            'participants.$.isMuted': true,
            'participants.$.mutedUntil': dto.until || null,
          },
        },
      );

      if (result.matchedCount === 0) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found or you are not a participant',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      await this.cacheManager.del(`conv:${dto.conversationId}`);

      return successResponse({ muted: true }, SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to mute conversation: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async unmuteConversation(dto: {
    conversationId: string;
    userId: string;
  }): Promise<IServiceResponse<{ unmuted: boolean }>> {
    try {
      const result = await this.conversationModel.updateOne(
        {
          _id: new Types.ObjectId(dto.conversationId),
          'participants.userId': new Types.ObjectId(dto.userId),
        },
        {
          $set: {
            'participants.$.isMuted': false,
            'participants.$.mutedUntil': null,
          },
        },
      );

      if (result.matchedCount === 0) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found or you are not a participant',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      await this.cacheManager.del(`conv:${dto.conversationId}`);

      return successResponse({ unmuted: true }, SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to unmute conversation: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async archiveConversation(dto: {
    conversationId: string;
    userId: string;
  }): Promise<IServiceResponse<{ archived: boolean }>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      conversation.settings.isArchived = true;
      await conversation.save();

      await this.cacheManager.del(`conv:${dto.conversationId}`);

      return successResponse({ archived: true }, SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to archive conversation: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async unarchiveConversation(dto: {
    conversationId: string;
    userId: string;
  }): Promise<IServiceResponse<{ unarchived: boolean }>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      conversation.settings.isArchived = false;
      await conversation.save();

      await this.cacheManager.del(`conv:${dto.conversationId}`);

      return successResponse({ unarchived: true }, SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to unarchive conversation: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async setTyping(dto: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }): Promise<IServiceResponse<{ typing: boolean }>> {
    // In production, this would emit real-time events via WebSocket/Redis pub-sub
    this.logger.debug(
      `User ${dto.userId} ${dto.isTyping ? 'started' : 'stopped'} typing in ${dto.conversationId}`,
    );
    return successResponse({ typing: dto.isTyping }, SERVICES.CONVERSATIONS_SERVICE);
  }

  async getParticipants(dto: {
    conversationId: string;
  }): Promise<IServiceResponse<{ participants: ParticipantDto[] }>> {
    try {
      const conversation = await this.conversationModel.findById(dto.conversationId);

      if (!conversation || conversation.isDeleted) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      const participants = conversation.participants.map((p) => ({
        userId: p.userId.toString(),
        role: p.role,
        joinedAt: p.joinedAt,
        isMuted: p.isMuted,
        mutedUntil: p.mutedUntil,
        lastReadAt: p.lastReadAt,
        lastReadMessageId: p.lastReadMessageId?.toString(),
      }));

      return successResponse({ participants }, SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get participants: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async updateLastMessage(dto: {
    conversationId: string;
    messageId: string;
    preview: string;
    timestamp: Date;
  }): Promise<IServiceResponse<ConversationDto>> {
    try {
      const conversation = await this.conversationModel.findByIdAndUpdate(
        dto.conversationId,
        {
          $set: {
            lastMessageId: new Types.ObjectId(dto.messageId),
            lastMessageAt: dto.timestamp,
            lastMessagePreview: dto.preview.substring(0, 100),
          },
          $inc: { messageCount: 1 },
        },
        { new: true },
      );

      if (!conversation) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Conversation not found',
          SERVICES.CONVERSATIONS_SERVICE,
        );
      }

      await this.cacheManager.del(`conv:${dto.conversationId}`);

      return successResponse(this.toConversationDto(conversation), SERVICES.CONVERSATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to update last message: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.CONVERSATIONS_SERVICE,
      );
    }
  }

  async getUnreadCount(dto: {
    userId: string;
    conversationId?: string;
  }): Promise<IServiceResponse<{ count: number }>> {
    // This would typically query the messages service or use cached unread counts
    // For now, return 0 as placeholder
    return successResponse({ count: 0 }, SERVICES.CONVERSATIONS_SERVICE);
  }

  private async findDirectConversation(
    userId1: string,
    userId2: string,
  ): Promise<ConversationDocument | null> {
    return this.conversationModel.findOne({
      type: 'direct',
      isDeleted: { $ne: true },
      'participants.userId': { $all: [new Types.ObjectId(userId1), new Types.ObjectId(userId2)] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    });
  }
}
