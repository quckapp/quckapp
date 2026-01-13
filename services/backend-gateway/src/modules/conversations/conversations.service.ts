import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
  ) {}

  async createSingleConversation(userId1: string, userId2: string): Promise<ConversationDocument> {
    const existing = await this.conversationModel
      .findOne({
        type: 'single',
        'participants.userId': { $all: [userId1, userId2] },
      })
      .exec();

    if (existing) {
      return existing;
    }

    const conversation = new this.conversationModel({
      type: 'single',
      participants: [{ userId: userId1 }, { userId: userId2 }],
      createdBy: userId1,
    });

    return conversation.save();
  }

  async createGroupConversation(
    creatorId: string,
    name: string,
    participantIds: string[],
    description?: string,
  ): Promise<ConversationDocument> {
    const uniqueParticipants = Array.from(new Set([creatorId, ...participantIds]));

    const conversation = new this.conversationModel({
      type: 'group',
      name,
      description,
      participants: uniqueParticipants.map((id) => ({ userId: id })),
      admins: [creatorId],
      createdBy: creatorId,
    });

    return conversation.save();
  }

  async findById(id: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(id)
      .populate('participants.userId', '-password')
      .populate('lastMessage')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  // Get all conversations for a user
  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    const conversations = await this.conversationModel
      .find({
        'participants.userId': userId,
        isArchived: false,
      })
      .populate({
        path: 'participants.userId',
        model: 'User',
        select: '-password',
      })
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .exec();

    return conversations;
  }

  async addParticipants(
    conversationId: string,
    userId: string,
    participantIds: string[],
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);

    if (conversation.type === 'single') {
      throw new ForbiddenException('Cannot add participants to single conversation');
    }

    if (!conversation.admins.includes(userId)) {
      throw new ForbiddenException('Only admins can add participants');
    }

    const newParticipants = participantIds.map((id) => ({ userId: id }));

    const updated = await this.conversationModel
      .findByIdAndUpdate(
        conversationId,
        {
          $addToSet: {
            participants: { $each: newParticipants },
          },
        },
        { new: true },
      )
      .populate('participants.userId', '-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Conversation not found');
    }

    return updated;
  }

  async removeParticipant(
    conversationId: string,
    adminId: string,
    participantId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);

    if (conversation.type === 'single') {
      throw new ForbiddenException('Cannot remove participants from single conversation');
    }

    if (!conversation.admins.includes(adminId)) {
      throw new ForbiddenException('Only admins can remove participants');
    }

    const updated = await this.conversationModel
      .findByIdAndUpdate(
        conversationId,
        {
          $pull: {
            participants: { userId: participantId },
          },
        },
        { new: true },
      )
      .populate('participants.userId', '-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Conversation not found');
    }

    return updated;
  }

  async updateLastMessage(conversationId: string, messageId: string): Promise<void> {
    await this.conversationModel
      .findByIdAndUpdate(conversationId, {
        lastMessage: messageId,
        lastMessageAt: new Date(),
      })
      .exec();
  }

  async markAsRead(conversationId: string, userId: string, messageId: string): Promise<void> {
    await this.conversationModel
      .updateOne(
        {
          _id: conversationId,
          'participants.userId': userId,
        },
        {
          $set: {
            'participants.$.lastReadMessageId': messageId,
            'participants.$.unreadCount': 0,
          },
        },
      )
      .exec();
  }

  async toggleMute(conversationId: string, userId: string, isMuted: boolean): Promise<void> {
    await this.conversationModel
      .updateOne(
        {
          _id: conversationId,
          'participants.userId': userId,
        },
        {
          $set: {
            'participants.$.isMuted': isMuted,
          },
        },
      )
      .exec();
  }

  async incrementUnreadCount(conversationId: string, userIds: string[]): Promise<void> {
    await this.conversationModel
      .updateMany(
        {
          _id: conversationId,
          'participants.userId': { $in: userIds },
        },
        {
          $inc: { 'participants.$.unreadCount': 1 },
        },
      )
      .exec();
  }

  async updateConversation(
    conversationId: string,
    userId: string,
    updates: Partial<Conversation>,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);

    if (conversation.type === 'group' && !conversation.admins.includes(userId)) {
      throw new ForbiddenException('Only admins can update group conversation');
    }

    const updated = await this.conversationModel
      .findByIdAndUpdate(conversationId, updates, { new: true })
      .populate('participants.userId', '-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Conversation not found');
    }

    return updated;
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.findById(conversationId);

    if (conversation.type === 'group' && !conversation.admins.includes(userId)) {
      throw new ForbiddenException('Only admins can delete group conversation');
    }

    await this.conversationModel.findByIdAndDelete(conversationId).exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    // Find all conversations for this user
    const conversations = await this.conversationModel
      .find({
        'participants.userId': userId,
      })
      .exec();

    // Update all conversations to mark as read for this user
    for (const conversation of conversations) {
      const participantIndex = conversation.participants.findIndex(
        (p: any) => p.userId.toString() === userId,
      );

      if (participantIndex >= 0) {
        conversation.participants[participantIndex].unreadCount = 0;
        // Set lastReadMessageId to the last message if exists
        if (conversation.lastMessage) {
          conversation.participants[participantIndex].lastReadMessageId =
            conversation.lastMessage.toString();
        }
      }
    }

    // Save all conversations
    await Promise.all(conversations.map((c) => c.save()));
  }

  // Message Pinning Methods
  async pinMessage(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p: any) => p.userId._id?.toString() === userId || p.userId.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    // For group conversations, only admins can pin messages
    if (conversation.type === 'group' && !conversation.admins.includes(userId)) {
      throw new ForbiddenException('Only admins can pin messages in group conversations');
    }

    // Check if message is already pinned
    if (conversation.pinnedMessages?.includes(messageId)) {
      return conversation;
    }

    // Limit pinned messages (e.g., max 10)
    if (conversation.pinnedMessages && conversation.pinnedMessages.length >= 10) {
      throw new ForbiddenException('Maximum number of pinned messages reached (10)');
    }

    const updated = await this.conversationModel
      .findByIdAndUpdate(
        conversationId,
        {
          $addToSet: { pinnedMessages: messageId },
          pinnedMessagesUpdatedAt: new Date(),
        },
        { new: true },
      )
      .populate('participants.userId', '-password')
      .populate('pinnedMessages')
      .exec();

    if (!updated) {
      throw new NotFoundException('Conversation not found');
    }

    return updated;
  }

  async unpinMessage(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p: any) => p.userId._id?.toString() === userId || p.userId.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    // For group conversations, only admins can unpin messages
    if (conversation.type === 'group' && !conversation.admins.includes(userId)) {
      throw new ForbiddenException('Only admins can unpin messages in group conversations');
    }

    const updated = await this.conversationModel
      .findByIdAndUpdate(
        conversationId,
        {
          $pull: { pinnedMessages: messageId },
          pinnedMessagesUpdatedAt: new Date(),
        },
        { new: true },
      )
      .populate('participants.userId', '-password')
      .populate('pinnedMessages')
      .exec();

    if (!updated) {
      throw new NotFoundException('Conversation not found');
    }

    return updated;
  }

  async getPinnedMessages(conversationId: string, userId: string): Promise<any[]> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate({
        path: 'pinnedMessages',
        populate: {
          path: 'senderId',
          select: '-password',
        },
      })
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p: any) => p.userId.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    return conversation.pinnedMessages || [];
  }

  // Disappearing Messages Methods
  async setDisappearingMessagesTimer(
    conversationId: string,
    userId: string,
    timerInSeconds: number,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p: any) => p.userId._id?.toString() === userId || p.userId.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    // For group conversations, only admins can change this setting
    if (conversation.type === 'group' && !conversation.admins.includes(userId)) {
      throw new ForbiddenException(
        'Only admins can change disappearing messages settings in group conversations',
      );
    }

    // Valid timer values: 0 (off), 86400 (24h), 604800 (7d), 2592000 (30d)
    const validTimers = [0, 86400, 604800, 2592000];
    if (!validTimers.includes(timerInSeconds)) {
      throw new ForbiddenException(
        'Invalid timer value. Must be 0 (off), 86400 (24h), 604800 (7d), or 2592000 (30d)',
      );
    }

    const updated = await this.conversationModel
      .findByIdAndUpdate(
        conversationId,
        {
          disappearingMessagesTimer: timerInSeconds,
          disappearingMessagesUpdatedAt: new Date(),
          disappearingMessagesUpdatedBy: userId,
        },
        { new: true },
      )
      .populate('participants.userId', '-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Conversation not found');
    }

    return updated;
  }

  async getDisappearingMessagesTimer(conversationId: string): Promise<number> {
    const conversation = await this.conversationModel.findById(conversationId).exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation.disappearingMessagesTimer || 0;
  }
}
