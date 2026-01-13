import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ScheduledMessage, ScheduledMessageDocument } from './schemas/scheduled-message.schema';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class ScheduledMessagesService implements OnModuleInit, OnModuleDestroy {
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(ScheduledMessage.name)
    private scheduledMessageModel: Model<ScheduledMessageDocument>,
    private messagesService: MessagesService,
  ) {}

  onModuleInit() {
    // Start the scheduler that checks for pending messages every minute
    this.schedulerInterval = setInterval(() => {
      this.processScheduledMessages();
    }, 60000); // Check every minute

    // Also run immediately on startup
    this.processScheduledMessages();
  }

  onModuleDestroy() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
  }

  async scheduleMessage(
    senderId: string,
    conversationId: string,
    type: string,
    scheduledAt: Date,
    content?: string,
    attachments?: any[],
    replyTo?: string,
    metadata?: Record<string, any>,
  ): Promise<ScheduledMessageDocument> {
    // Validate scheduled time is in the future
    if (new Date(scheduledAt) <= new Date()) {
      throw new ForbiddenException('Scheduled time must be in the future');
    }

    const scheduledMessage = new this.scheduledMessageModel({
      senderId,
      conversationId,
      type,
      content,
      attachments,
      replyTo,
      scheduledAt,
      metadata,
      status: 'pending',
    });

    return scheduledMessage.save();
  }

  async findById(id: string): Promise<ScheduledMessageDocument> {
    const message = await this.scheduledMessageModel.findById(id).exec();
    if (!message) {
      throw new NotFoundException('Scheduled message not found');
    }
    return message;
  }

  async getUserScheduledMessages(
    userId: string,
    status?: string,
  ): Promise<ScheduledMessageDocument[]> {
    const query: any = { senderId: userId };
    if (status) {
      query.status = status;
    }

    return this.scheduledMessageModel
      .find(query)
      .populate('conversationId', 'name type avatar')
      .sort({ scheduledAt: 1 })
      .exec();
  }

  async getConversationScheduledMessages(
    conversationId: string,
    userId: string,
  ): Promise<ScheduledMessageDocument[]> {
    return this.scheduledMessageModel
      .find({
        conversationId,
        senderId: userId,
        status: 'pending',
      })
      .sort({ scheduledAt: 1 })
      .exec();
  }

  async updateScheduledMessage(
    id: string,
    userId: string,
    updates: {
      content?: string;
      scheduledAt?: Date;
      attachments?: any[];
    },
  ): Promise<ScheduledMessageDocument> {
    const message = await this.findById(id);

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own scheduled messages');
    }

    if (message.status !== 'pending') {
      throw new ForbiddenException('Cannot edit a message that has already been sent or cancelled');
    }

    if (updates.scheduledAt && new Date(updates.scheduledAt) <= new Date()) {
      throw new ForbiddenException('Scheduled time must be in the future');
    }

    Object.assign(message, updates);
    return message.save();
  }

  async cancelScheduledMessage(id: string, userId: string): Promise<ScheduledMessageDocument> {
    const message = await this.findById(id);

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only cancel your own scheduled messages');
    }

    if (message.status !== 'pending') {
      throw new ForbiddenException(
        'Cannot cancel a message that has already been sent or cancelled',
      );
    }

    message.status = 'cancelled';
    return message.save();
  }

  async deleteScheduledMessage(id: string, userId: string): Promise<void> {
    const message = await this.findById(id);

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own scheduled messages');
    }

    await this.scheduledMessageModel.findByIdAndDelete(id).exec();
  }

  async processScheduledMessages(): Promise<void> {
    const now = new Date();

    // Find all pending messages that should be sent
    const pendingMessages = await this.scheduledMessageModel
      .find({
        status: 'pending',
        scheduledAt: { $lte: now },
      })
      .exec();

    for (const scheduledMsg of pendingMessages) {
      try {
        // Send the actual message
        const sentMessage = await this.messagesService.createMessage(
          scheduledMsg.conversationId,
          scheduledMsg.senderId,
          scheduledMsg.type,
          scheduledMsg.content,
          scheduledMsg.attachments,
          scheduledMsg.replyTo,
          {
            ...scheduledMsg.metadata,
            wasScheduled: true,
            originalScheduledAt: scheduledMsg.scheduledAt,
          },
        );

        // Update scheduled message status
        scheduledMsg.status = 'sent';
        scheduledMsg.sentAt = new Date();
        scheduledMsg.sentMessageId = sentMessage._id.toString();
        await scheduledMsg.save();
      } catch (error) {
        // Mark as failed
        scheduledMsg.status = 'failed';
        scheduledMsg.failureReason = error.message;
        await scheduledMsg.save();
      }
    }
  }
}
