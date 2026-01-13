import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BroadcastList, BroadcastListDocument } from './schemas/broadcast-list.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class BroadcastService {
  constructor(
    @InjectModel(BroadcastList.name) private broadcastListModel: Model<BroadcastListDocument>,
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
  ) {}

  async createBroadcastList(
    userId: string,
    name: string,
    recipients: string[],
    description?: string,
  ): Promise<BroadcastList> {
    const broadcastList = new this.broadcastListModel({
      name,
      createdBy: userId,
      recipients,
      description,
    });

    return broadcastList.save();
  }

  async getBroadcastLists(userId: string): Promise<BroadcastList[]> {
    return this.broadcastListModel
      .find({ createdBy: userId })
      .populate('recipients', 'displayName phoneNumber avatar')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  async getBroadcastList(id: string, userId: string): Promise<BroadcastListDocument> {
    const broadcastList = await this.broadcastListModel
      .findById(id)
      .populate('recipients', 'displayName phoneNumber avatar')
      .populate('lastMessage')
      .exec();

    if (!broadcastList) {
      throw new NotFoundException('Broadcast list not found');
    }

    if (broadcastList.createdBy.toString() !== userId) {
      throw new ForbiddenException('You do not have access to this broadcast list');
    }

    return broadcastList;
  }

  async updateBroadcastList(id: string, userId: string, updates: any): Promise<BroadcastList> {
    const broadcastList = await this.broadcastListModel.findById(id);

    if (!broadcastList) {
      throw new NotFoundException('Broadcast list not found');
    }

    if (broadcastList.createdBy.toString() !== userId) {
      throw new ForbiddenException('You do not have access to this broadcast list');
    }

    Object.assign(broadcastList, updates);
    return broadcastList.save();
  }

  async deleteBroadcastList(id: string, userId: string): Promise<void> {
    const broadcastList = await this.broadcastListModel.findById(id);

    if (!broadcastList) {
      throw new NotFoundException('Broadcast list not found');
    }

    if (broadcastList.createdBy.toString() !== userId) {
      throw new ForbiddenException('You do not have access to this broadcast list');
    }

    await this.broadcastListModel.deleteOne({ _id: id });
  }

  async sendBroadcastMessage(
    id: string,
    userId: string,
    messageData: { type: string; content?: string; attachments?: any[] },
  ): Promise<{ success: boolean; messageCount: number }> {
    try {
      console.log('[BroadcastService] Starting sendBroadcastMessage', { id, userId, messageData });

      const broadcastList = await this.getBroadcastList(id, userId);
      console.log('[BroadcastService] Broadcast list found:', {
        id: (broadcastList as any)._id,
        recipientCount: broadcastList.recipients.length,
      });

      let lastMessageId: string | null = null;

      // Send individual messages to each recipient
      const promises = broadcastList.recipients.map(async (recipient: any) => {
        try {
          // Extract the actual recipient ID (could be populated object or just ID)
          const recipientId = recipient._id ? recipient._id.toString() : recipient.toString();
          console.log('[BroadcastService] Processing recipient ID:', recipientId);

          // Get or create conversation with this recipient
          const conversation = await this.conversationsService.createSingleConversation(
            userId,
            recipientId,
          );
          console.log('[BroadcastService] Conversation created/found:', conversation._id);

          // Create and send the actual message
          const message = await this.messagesService.createMessage(
            conversation._id.toString(),
            userId,
            messageData.type,
            messageData.content,
            messageData.attachments,
          );
          console.log('[BroadcastService] Message created:', message._id);

          lastMessageId = message._id.toString();
          return message;
        } catch (error) {
          console.error('[BroadcastService] Error processing recipient:', error);
          throw error;
        }
      });

      await Promise.all(promises);

      // Update last message info
      const updateData: any = {
        lastMessageAt: new Date(),
      };

      if (lastMessageId) {
        updateData.lastMessage = lastMessageId;
      }

      await this.broadcastListModel.findByIdAndUpdate(id, updateData);
      console.log('[BroadcastService] Broadcast sent successfully');

      return { success: true, messageCount: broadcastList.recipients.length };
    } catch (error) {
      console.error('[BroadcastService] Error in sendBroadcastMessage:', error);
      throw error;
    }
  }
}
