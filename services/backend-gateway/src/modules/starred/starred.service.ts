import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StarredMessage, StarredMessageDocument } from './schemas/starred-message.schema';

@Injectable()
export class StarredService {
  constructor(
    @InjectModel(StarredMessage.name) private starredMessageModel: Model<StarredMessageDocument>,
  ) {}

  async starMessage(
    userId: string,
    messageId: string,
    conversationId: string,
  ): Promise<StarredMessage> {
    // Check if already starred
    const existing = await this.starredMessageModel.findOne({ userId, messageId });
    if (existing) {
      throw new ConflictException('Message is already starred');
    }

    const starredMessage = new this.starredMessageModel({
      userId,
      messageId,
      conversationId,
      starredAt: new Date(),
    });

    return starredMessage.save();
  }

  async unstarMessage(userId: string, messageId: string): Promise<void> {
    const result = await this.starredMessageModel.deleteOne({ userId, messageId });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Starred message not found');
    }
  }

  async getStarredMessages(userId: string): Promise<StarredMessage[]> {
    return this.starredMessageModel
      .find({ userId })
      .populate({
        path: 'messageId',
        populate: [
          { path: 'senderId', select: 'displayName phoneNumber avatar' },
          { path: 'conversationId', select: 'type name avatar' },
        ],
      })
      .populate('conversationId', 'type name avatar participants')
      .sort({ starredAt: -1 })
      .exec();
  }

  async getStarredMessagesByConversation(
    userId: string,
    conversationId: string,
  ): Promise<StarredMessage[]> {
    return this.starredMessageModel
      .find({ userId, conversationId })
      .populate({
        path: 'messageId',
        populate: [{ path: 'senderId', select: 'displayName phoneNumber avatar' }],
      })
      .sort({ starredAt: -1 })
      .exec();
  }

  async isMessageStarred(userId: string, messageId: string): Promise<boolean> {
    const starred = await this.starredMessageModel.findOne({ userId, messageId });
    return !!starred;
  }
}
