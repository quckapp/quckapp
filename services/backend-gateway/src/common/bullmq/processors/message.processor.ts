import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { LoggerService } from '../../logger/logger.service';
import { QUEUE_NAMES } from '../bullmq.module';
import { MessageJobData } from '../services/queue.service';

/**
 * MessageProcessor - BullMQ worker for processing message-related jobs
 * Design Pattern: Worker Pattern
 * Handles message encryption, indexing, forwarding, and cleanup
 */
@Processor(QUEUE_NAMES.MESSAGES, {
  concurrency: 10, // Process 10 jobs concurrently
})
@Injectable()
export class MessageProcessor extends WorkerHost {
  constructor(private readonly logger: LoggerService) {
    super();
  }

  /**
   * Process message job
   */
  async process(job: Job<MessageJobData>): Promise<any> {
    this.logger.log(
      `Processing message job ${job.id} (type: ${job.data.type})`,
      'MessageProcessor',
    );

    const { type, messageId, conversationId, payload } = job.data;

    try {
      await job.updateProgress(10);

      switch (type) {
        case 'encrypt':
          return await this.processEncryption(job);
        case 'decrypt':
          return await this.processDecryption(job);
        case 'index':
          return await this.processIndexing(job);
        case 'delete':
          return await this.processDeletion(job);
        case 'forward':
          return await this.processForwarding(job);
        default:
          throw new Error(`Unknown message job type: ${type}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to process message job ${job.id}`,
        error.message,
        'MessageProcessor',
      );
      throw error;
    }
  }

  /**
   * Process message encryption
   * Used for end-to-end encryption of message content
   */
  private async processEncryption(job: Job<MessageJobData>): Promise<any> {
    await job.updateProgress(30);

    const { messageId, payload } = job.data;

    this.logger.log(`Encrypting message ${messageId}`, 'MessageProcessor');

    // In production, this would call MessagesService.encryptMessage
    // Simulating encryption processing
    await job.updateProgress(70);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'encrypt',
      messageId,
    };
  }

  /**
   * Process message decryption
   * Used for decrypting message content on retrieval
   */
  private async processDecryption(job: Job<MessageJobData>): Promise<any> {
    await job.updateProgress(30);

    const { messageId, payload } = job.data;

    this.logger.log(`Decrypting message ${messageId}`, 'MessageProcessor');

    await job.updateProgress(70);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'decrypt',
      messageId,
    };
  }

  /**
   * Process message indexing for full-text search
   */
  private async processIndexing(job: Job<MessageJobData>): Promise<any> {
    await job.updateProgress(30);

    const { messageId, conversationId, payload } = job.data;

    this.logger.log(
      `Indexing message ${messageId} in conversation ${conversationId}`,
      'MessageProcessor',
    );

    // In production, this would update search indexes
    await job.updateProgress(70);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'index',
      messageId,
      indexed: true,
    };
  }

  /**
   * Process message deletion (for disappearing messages)
   */
  private async processDeletion(job: Job<MessageJobData>): Promise<any> {
    await job.updateProgress(30);

    const { messageId, conversationId } = job.data;

    this.logger.log(`Processing deletion for message ${messageId}`, 'MessageProcessor');

    // In production, this would call MessagesService.deleteMessage
    await job.updateProgress(70);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'delete',
      messageId,
      deleted: true,
    };
  }

  /**
   * Process message forwarding to multiple conversations
   */
  private async processForwarding(job: Job<MessageJobData>): Promise<any> {
    await job.updateProgress(30);

    const { messageId, payload } = job.data;
    const { targetConversations } = payload;

    this.logger.log(
      `Forwarding message ${messageId} to ${targetConversations?.length || 0} conversations`,
      'MessageProcessor',
    );

    // In production, this would forward the message to each target conversation
    await job.updateProgress(70);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'forward',
      messageId,
      forwardedTo: targetConversations?.length || 0,
    };
  }
}
