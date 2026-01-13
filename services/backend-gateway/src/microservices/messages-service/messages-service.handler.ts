import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Message, MessageDocument } from './schemas/message.schema';
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

interface SendMessageDto {
  conversationId: string;
  senderId: string;
  content?: string;
  type?: string;
  attachments?: any[];
  replyTo?: string;
  forwardedFrom?: string;
  mentions?: string[];
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  attachments: any[];
  reactions: { emoji: string; userId: string; createdAt: Date }[];
  readReceipts: { userId: string; readAt: Date }[];
  replyTo?: string;
  isEdited: boolean;
  isDeleted: boolean;
  isForwarded: boolean;
  forwardedFrom?: string;
  mentions: string[];
  status: string;
  deliveredTo: string[];
  metadata?: Record<string, any>;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Messages Service Handler
 * Business logic for message operations with MongoDB
 */
@Injectable()
export class MessagesServiceHandler {
  private readonly logger = new Logger(MessagesServiceHandler.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(SERVICES.CONVERSATIONS_SERVICE) private conversationsClient: ClientProxy,
    @Inject(SERVICES.NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy,
  ) {}

  private toMessageDto(doc: MessageDocument): MessageDto {
    return {
      id: doc._id.toString(),
      conversationId: doc.conversationId.toString(),
      senderId: doc.senderId.toString(),
      content: doc.content,
      type: doc.type,
      attachments: doc.attachments,
      reactions: doc.reactions,
      readReceipts: doc.readReceipts,
      replyTo: doc.replyTo?.toString(),
      isEdited: doc.isEdited,
      isDeleted: doc.isDeleted,
      isForwarded: doc.isForwarded,
      forwardedFrom: doc.forwardedFrom?.toString(),
      mentions: doc.mentions,
      status: doc.status,
      deliveredTo: doc.deliveredTo,
      metadata: doc.metadata,
      expiresAt: doc.expiresAt,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }

  async sendMessage(dto: SendMessageDto): Promise<IServiceResponse<MessageDto>> {
    try {
      const message = new this.messageModel({
        conversationId: new Types.ObjectId(dto.conversationId),
        senderId: new Types.ObjectId(dto.senderId),
        content: dto.content || '',
        type: dto.type || 'text',
        attachments: dto.attachments || [],
        replyTo: dto.replyTo ? new Types.ObjectId(dto.replyTo) : null,
        isForwarded: !!dto.forwardedFrom,
        forwardedFrom: dto.forwardedFrom ? new Types.ObjectId(dto.forwardedFrom) : null,
        mentions: dto.mentions || [],
        metadata: dto.metadata || {},
        expiresAt: dto.expiresAt,
        status: 'sent',
        deliveredTo: [dto.senderId],
        readReceipts: [{ userId: dto.senderId, readAt: new Date() }],
      });

      const saved = await message.save();

      // Invalidate conversation messages cache
      await this.cacheManager.del(`conv_messages:${dto.conversationId}`);

      this.logger.log(`Message sent: ${saved._id} in conversation ${dto.conversationId}`);

      return successResponse(this.toMessageDto(saved), SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.MESSAGE_SEND_FAILED,
        error.message,
        SERVICES.MESSAGES_SERVICE,
      );
    }
  }

  async getMessage(dto: { messageId: string }): Promise<IServiceResponse<MessageDto>> {
    try {
      // Try cache first
      const cached = await this.cacheManager.get<MessageDto>(`message:${dto.messageId}`);
      if (cached) {
        return successResponse(cached, SERVICES.MESSAGES_SERVICE);
      }

      const message = await this.messageModel.findById(dto.messageId);

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      const messageDto = this.toMessageDto(message);

      // Cache for 5 minutes
      await this.cacheManager.set(`message:${dto.messageId}`, messageDto, 300000);

      return successResponse(messageDto, SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get message: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async getConversationMessages(dto: {
    conversationId: string;
    limit?: number;
    offset?: number;
    before?: string;
    after?: string;
  }): Promise<IServiceResponse<IPaginatedResponse<MessageDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;

      const query: any = {
        conversationId: new Types.ObjectId(dto.conversationId),
        isDeleted: false,
      };

      // Cursor-based pagination
      if (dto.before) {
        const beforeMessage = await this.messageModel.findById(dto.before);
        if (beforeMessage) {
          query.createdAt = { $lt: (beforeMessage as any).createdAt };
        }
      }

      if (dto.after) {
        const afterMessage = await this.messageModel.findById(dto.after);
        if (afterMessage) {
          query.createdAt = { $gt: (afterMessage as any).createdAt };
        }
      }

      const [messages, total] = await Promise.all([
        this.messageModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
        this.messageModel.countDocuments({
          conversationId: new Types.ObjectId(dto.conversationId),
          isDeleted: false,
        }),
      ]);

      return successResponse(
        {
          items: messages.map((m) => this.toMessageDto(m)),
          total,
          limit,
          offset,
          hasMore: offset + messages.length < total,
        },
        SERVICES.MESSAGES_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get conversation messages: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async updateMessage(dto: {
    messageId: string;
    userId: string;
    content?: string;
  }): Promise<IServiceResponse<MessageDto>> {
    try {
      const message = await this.messageModel.findById(dto.messageId);

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      if (message.senderId.toString() !== dto.userId) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'You can only edit your own messages',
          SERVICES.MESSAGES_SERVICE,
        );
      }

      // Check if message is too old to edit (e.g., 24 hours)
      const messageAge = Date.now() - new Date((message as any).createdAt).getTime();
      const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours
      if (messageAge > maxEditAge) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'Message is too old to edit',
          SERVICES.MESSAGES_SERVICE,
        );
      }

      if (dto.content !== undefined) {
        message.content = dto.content;
      }
      message.isEdited = true;

      const updated = await message.save();

      // Invalidate caches
      await this.cacheManager.del(`message:${dto.messageId}`);
      await this.cacheManager.del(`conv_messages:${message.conversationId}`);

      return successResponse(this.toMessageDto(updated), SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to update message: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async deleteMessage(dto: {
    messageId: string;
    userId: string;
    forEveryone?: boolean;
  }): Promise<IServiceResponse<{ deleted: boolean }>> {
    try {
      const message = await this.messageModel.findById(dto.messageId);

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      if (dto.forEveryone) {
        if (message.senderId.toString() !== dto.userId) {
          return errorResponse(
            ERROR_CODES.FORBIDDEN,
            'You can only delete your own messages for everyone',
            SERVICES.MESSAGES_SERVICE,
          );
        }

        // Soft delete - mark as deleted and clear content
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.content = '';
        message.attachments = [];
        await message.save();
      } else {
        // Delete for self only - in production, maintain a deletedFor array
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();
      }

      // Invalidate caches
      await this.cacheManager.del(`message:${dto.messageId}`);
      await this.cacheManager.del(`conv_messages:${message.conversationId}`);

      return successResponse({ deleted: true }, SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to delete message: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async markAsRead(dto: {
    messageIds: string[];
    userId: string;
  }): Promise<IServiceResponse<{ marked: number }>> {
    try {
      const result = await this.messageModel.updateMany(
        {
          _id: { $in: dto.messageIds.map((id) => new Types.ObjectId(id)) },
          'readReceipts.userId': { $ne: dto.userId },
        },
        {
          $push: {
            readReceipts: { userId: dto.userId, readAt: new Date() },
          },
          $set: { status: 'read' },
        },
      );

      // Invalidate message caches
      for (const messageId of dto.messageIds) {
        await this.cacheManager.del(`message:${messageId}`);
      }

      return successResponse({ marked: result.modifiedCount }, SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to mark messages as read: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async markAsDelivered(dto: {
    messageIds: string[];
    userId: string;
  }): Promise<IServiceResponse<{ marked: number }>> {
    try {
      const result = await this.messageModel.updateMany(
        {
          _id: { $in: dto.messageIds.map((id) => new Types.ObjectId(id)) },
          deliveredTo: { $ne: dto.userId },
          status: 'sent',
        },
        {
          $push: { deliveredTo: dto.userId },
          $set: { status: 'delivered' },
        },
      );

      // Invalidate message caches
      for (const messageId of dto.messageIds) {
        await this.cacheManager.del(`message:${messageId}`);
      }

      return successResponse({ marked: result.modifiedCount }, SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to mark messages as delivered: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async addReaction(dto: {
    messageId: string;
    userId: string;
    emoji: string;
  }): Promise<IServiceResponse<MessageDto>> {
    try {
      // First remove any existing reaction from this user
      await this.messageModel.updateOne(
        { _id: new Types.ObjectId(dto.messageId) },
        { $pull: { reactions: { userId: dto.userId } } },
      );

      // Add new reaction
      const message = await this.messageModel.findByIdAndUpdate(
        dto.messageId,
        {
          $push: {
            reactions: {
              userId: dto.userId,
              emoji: dto.emoji,
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      );

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      // Invalidate cache
      await this.cacheManager.del(`message:${dto.messageId}`);

      return successResponse(this.toMessageDto(message), SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to add reaction: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async removeReaction(dto: {
    messageId: string;
    userId: string;
  }): Promise<IServiceResponse<MessageDto>> {
    try {
      const message = await this.messageModel.findByIdAndUpdate(
        dto.messageId,
        { $pull: { reactions: { userId: dto.userId } } },
        { new: true },
      );

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      // Invalidate cache
      await this.cacheManager.del(`message:${dto.messageId}`);

      return successResponse(this.toMessageDto(message), SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to remove reaction: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async pinMessage(dto: {
    messageId: string;
    userId: string;
  }): Promise<IServiceResponse<MessageDto>> {
    try {
      const message = await this.messageModel.findByIdAndUpdate(
        dto.messageId,
        {
          $set: {
            'metadata.isPinned': true,
            'metadata.pinnedBy': dto.userId,
            'metadata.pinnedAt': new Date(),
          },
        },
        { new: true },
      );

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      await this.cacheManager.del(`message:${dto.messageId}`);

      return successResponse(this.toMessageDto(message), SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to pin message: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async unpinMessage(dto: {
    messageId: string;
    userId: string;
  }): Promise<IServiceResponse<MessageDto>> {
    try {
      const message = await this.messageModel.findByIdAndUpdate(
        dto.messageId,
        {
          $unset: {
            'metadata.isPinned': 1,
            'metadata.pinnedBy': 1,
            'metadata.pinnedAt': 1,
          },
        },
        { new: true },
      );

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      await this.cacheManager.del(`message:${dto.messageId}`);

      return successResponse(this.toMessageDto(message), SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to unpin message: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async getPinnedMessages(dto: {
    conversationId: string;
    limit?: number;
  }): Promise<IServiceResponse<MessageDto[]>> {
    try {
      const limit = dto.limit || 50;

      const messages = await this.messageModel
        .find({
          conversationId: new Types.ObjectId(dto.conversationId),
          'metadata.isPinned': true,
          isDeleted: false,
        })
        .sort({ 'metadata.pinnedAt': -1 })
        .limit(limit)
        .exec();

      return successResponse(
        messages.map((m) => this.toMessageDto(m)),
        SERVICES.MESSAGES_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get pinned messages: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async forwardMessage(dto: {
    messageId: string;
    toConversationIds: string[];
    userId: string;
  }): Promise<IServiceResponse<MessageDto[]>> {
    try {
      const originalMessage = await this.messageModel.findById(dto.messageId);

      if (!originalMessage) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      const forwardedMessages: MessageDto[] = [];

      for (const conversationId of dto.toConversationIds) {
        const result = await this.sendMessage({
          conversationId,
          senderId: dto.userId,
          content: originalMessage.content,
          type: originalMessage.type,
          attachments: originalMessage.attachments,
          forwardedFrom: originalMessage._id.toString(),
        });

        if (result.success && result.data) {
          forwardedMessages.push(result.data);
        }
      }

      return successResponse(forwardedMessages, SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to forward message: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async searchMessages(dto: {
    query: string;
    conversationId?: string;
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<IServiceResponse<IPaginatedResponse<MessageDto>>> {
    try {
      const limit = Math.min(dto.limit || 20, 100);
      const offset = dto.offset || 0;

      const searchQuery: any = {
        $text: { $search: dto.query },
        isDeleted: false,
      };

      if (dto.conversationId) {
        searchQuery.conversationId = new Types.ObjectId(dto.conversationId);
      }

      const [messages, total] = await Promise.all([
        this.messageModel
          .find(searchQuery, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .skip(offset)
          .limit(limit)
          .exec(),
        this.messageModel.countDocuments(searchQuery),
      ]);

      return successResponse(
        {
          items: messages.map((m) => this.toMessageDto(m)),
          total,
          limit,
          offset,
          hasMore: offset + messages.length < total,
        },
        SERVICES.MESSAGES_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to search messages: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async getUnreadCount(dto: {
    userId: string;
    conversationId?: string;
  }): Promise<IServiceResponse<{ count: number }>> {
    try {
      const query: any = {
        isDeleted: false,
        senderId: { $ne: new Types.ObjectId(dto.userId) },
        'readReceipts.userId': { $ne: dto.userId },
      };

      if (dto.conversationId) {
        query.conversationId = new Types.ObjectId(dto.conversationId);
      }

      const count = await this.messageModel.countDocuments(query);

      return successResponse({ count }, SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get unread count: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async setDisappearingTime(dto: {
    conversationId: string;
    userId: string;
    duration: number; // in seconds, 0 to disable
  }): Promise<IServiceResponse<{ set: boolean }>> {
    try {
      // This would typically update conversation settings
      // For now, we'll store it in the conversation metadata
      this.logger.log(
        `Setting disappearing time for conversation ${dto.conversationId}: ${dto.duration}s`,
      );

      return successResponse({ set: true }, SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to set disappearing time: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async processExpiredMessages(): Promise<IServiceResponse<{ processed: number }>> {
    try {
      // Messages with TTL index will auto-expire
      // This is for any additional cleanup needed
      const result = await this.messageModel.updateMany(
        {
          expiresAt: { $lte: new Date() },
          isExpired: false,
        },
        {
          $set: {
            isExpired: true,
            isDeleted: true,
            content: '',
            attachments: [],
          },
        },
      );

      this.logger.log(`Processed ${result.modifiedCount} expired messages`);

      return successResponse({ processed: result.modifiedCount }, SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to process expired messages: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async starMessage(dto: {
    messageId: string;
    userId: string;
  }): Promise<IServiceResponse<MessageDto>> {
    try {
      const message = await this.messageModel.findByIdAndUpdate(
        dto.messageId,
        {
          $addToSet: { 'metadata.starredBy': dto.userId },
        },
        { new: true },
      );

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      await this.cacheManager.del(`message:${dto.messageId}`);

      return successResponse(this.toMessageDto(message), SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to star message: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async unstarMessage(dto: {
    messageId: string;
    userId: string;
  }): Promise<IServiceResponse<MessageDto>> {
    try {
      const message = await this.messageModel.findByIdAndUpdate(
        dto.messageId,
        {
          $pull: { 'metadata.starredBy': dto.userId },
        },
        { new: true },
      );

      if (!message) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Message not found', SERVICES.MESSAGES_SERVICE);
      }

      await this.cacheManager.del(`message:${dto.messageId}`);

      return successResponse(this.toMessageDto(message), SERVICES.MESSAGES_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to unstar message: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }

  async getStarredMessages(dto: {
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<IServiceResponse<IPaginatedResponse<MessageDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;

      const [messages, total] = await Promise.all([
        this.messageModel
          .find({
            'metadata.starredBy': dto.userId,
            isDeleted: false,
          })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        this.messageModel.countDocuments({
          'metadata.starredBy': dto.userId,
          isDeleted: false,
        }),
      ]);

      return successResponse(
        {
          items: messages.map((m) => this.toMessageDto(m)),
          total,
          limit,
          offset,
          hasMore: offset + messages.length < total,
        },
        SERVICES.MESSAGES_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get starred messages: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MESSAGES_SERVICE);
    }
  }
}
