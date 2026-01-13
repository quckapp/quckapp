import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';
import { Message, MessageDocument } from './schemas/message.schema';
import { ConversationsService } from '../conversations/conversations.service';

@Injectable()
export class MessagesService {
  private encryptionKey: string;

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private conversationsService: ConversationsService,
    private configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.get('ENCRYPTION_KEY') || '';
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    type: string,
    content?: string,
    attachments?: any[],
    replyTo?: string,
    metadata?: Record<string, any>,
    isForwarded?: boolean,
    forwardedFrom?: string,
    expiresInSeconds?: number,
  ): Promise<MessageDocument> {
    let encryptedContent = null;

    if (content && type === 'text') {
      encryptedContent = CryptoJS.AES.encrypt(content, this.encryptionKey).toString();
    }

    // Calculate expiration time if disappearing messages are enabled
    let expiresAt: Date | undefined;
    if (expiresInSeconds && expiresInSeconds > 0) {
      expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    }

    const message = new this.messageModel({
      conversationId,
      senderId,
      type,
      content,
      encryptedContent,
      attachments,
      replyTo,
      metadata,
      isForwarded: isForwarded || false,
      forwardedFrom,
      expiresAt,
    });

    const savedMessage = await message.save();

    await this.conversationsService.updateLastMessage(conversationId, savedMessage._id.toString());

    return savedMessage;
  }

  async findById(id: string): Promise<MessageDocument> {
    const message = await this.messageModel.findById(id).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    before?: string,
  ): Promise<MessageDocument[]> {
    const query: any = { conversationId, isDeleted: false };

    if (before) {
      const beforeMessage = await this.findById(before);
      query.createdAt = { $lt: beforeMessage.createdAt };
    }

    return this.messageModel
      .find(query)
      .populate('senderId', '-password')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<MessageDocument> {
    const message = await this.findById(messageId);

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    if (message.type !== 'text') {
      throw new ForbiddenException('Only text messages can be edited');
    }

    const encryptedContent = CryptoJS.AES.encrypt(newContent, this.encryptionKey).toString();

    const updated = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          content: newContent,
          encryptedContent,
          isEdited: true,
        },
        { new: true },
      )
      .populate('senderId', '-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Message not found');
    }

    return updated;
  }

  async deleteMessage(messageId: string, userId: string): Promise<MessageDocument> {
    const message = await this.findById(messageId);

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    const updated = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          isDeleted: true,
          deletedAt: new Date(),
          content: null,
          encryptedContent: null,
          attachments: [],
        },
        { new: true },
      )
      .populate('senderId', '-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Message not found');
    }

    return updated;
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageDocument> {
    const message = await this.findById(messageId);

    const existingReaction = message.reactions.find(
      (r) => r.userId.toString() === userId && r.emoji === emoji,
    );

    if (existingReaction) {
      return message;
    }

    const updated = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          $push: {
            reactions: { emoji, userId },
          },
        },
        { new: true },
      )
      .populate('senderId', '-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Message not found');
    }

    return updated;
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<MessageDocument> {
    const updated = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          $pull: {
            reactions: { emoji, userId },
          },
        },
        { new: true },
      )
      .populate('senderId', '-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Message not found');
    }

    return updated;
  }

  async addReadReceipt(messageId: string, userId: string): Promise<void> {
    const message = await this.findById(messageId);

    const existingReceipt = message.readReceipts.find((r) => r.userId.toString() === userId);

    if (existingReceipt) {
      return;
    }

    await this.messageModel
      .updateOne(
        { _id: messageId },
        {
          $push: {
            readReceipts: { userId, readAt: new Date() },
          },
        },
      )
      .exec();
  }

  async clearConversationMessages(conversationId: string): Promise<void> {
    await this.messageModel
      .updateMany(
        { conversationId, isDeleted: false },
        {
          isDeleted: true,
          deletedAt: new Date(),
          content: null,
          encryptedContent: null,
          attachments: [],
        },
      )
      .exec();
  }

  async decryptMessage(encryptedContent: string): Promise<string> {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Message Search with full-text indexing
  async searchMessages(
    userId: string,
    query: string,
    options?: {
      conversationId?: string;
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ messages: MessageDocument[]; total: number }> {
    const { conversationId, limit = 20, skip = 0, startDate, endDate } = options || {};

    // Build the search query
    const searchQuery: any = {
      $text: { $search: query },
      isDeleted: false,
    };

    // If conversationId provided, search only in that conversation
    if (conversationId) {
      searchQuery.conversationId = conversationId;
    } else {
      // Otherwise, search in all conversations the user is part of
      const userConversations = await this.conversationsService.getUserConversations(userId);
      const conversationIds = userConversations.map((c: any) => c._id.toString());
      searchQuery.conversationId = { $in: conversationIds };
    }

    // Date range filter
    if (startDate || endDate) {
      searchQuery.createdAt = {};
      if (startDate) {
        searchQuery.createdAt.$gte = startDate;
      }
      if (endDate) {
        searchQuery.createdAt.$lte = endDate;
      }
    }

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(searchQuery, { score: { $meta: 'textScore' } })
        .populate('senderId', '-password')
        .populate('conversationId', 'name type avatar')
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(searchQuery).exec(),
    ]);

    return { messages, total };
  }
}
