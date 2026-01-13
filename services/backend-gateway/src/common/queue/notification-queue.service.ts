import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

/**
 * NotificationQueueService - Implements notification queue with priority
 * Data Structure: Priority Queue using binary heap
 * Algorithm: O(log n) enqueue/dequeue operations
 * Design Pattern: Queue with worker pool for parallel processing
 * SOLID: Single Responsibility - Only manages notification queue
 */

export enum NotificationPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

export interface NotificationJob {
  id: string;
  type: 'message' | 'call' | 'mention' | 'system';
  priority: NotificationPriority;
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  // Priority queue implementation using array
  private queue: NotificationJob[] = [];
  private processing: Set<string> = new Set();
  private workers: number = 3; // Parallel workers
  private isProcessing: boolean = false;

  constructor(private readonly logger: LoggerService) {}

  onModuleInit() {
    // Start processing queue
    this.startProcessing();
  }

  /**
   * Enqueue notification job
   * Time Complexity: O(log n) - Binary heap insertion
   * @param job - Notification job
   */
  enqueue(job: Omit<NotificationJob, 'id' | 'timestamp' | 'retries'>): void {
    const notification: NotificationJob = {
      ...job,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    // Add to queue
    this.queue.push(notification);

    // Bubble up to maintain heap property (max heap based on priority)
    this.bubbleUp(this.queue.length - 1);

    this.logger.log(
      `Notification enqueued: ${notification.id} (priority: ${notification.priority})`,
      'NotificationQueue',
    );
  }

  /**
   * Dequeue highest priority notification
   * Time Complexity: O(log n) - Binary heap extraction
   * @returns Highest priority notification or null
   */
  private dequeue(): NotificationJob | null {
    if (this.queue.length === 0) {
      return null;
    }

    if (this.queue.length === 1) {
      return this.queue.pop()!;
    }

    // Extract max (highest priority)
    const max = this.queue[0];
    this.queue[0] = this.queue.pop()!;

    // Bubble down to maintain heap property
    this.bubbleDown(0);

    return max;
  }

  /**
   * Bubble up operation for heap
   * Time Complexity: O(log n)
   * @param index - Current index
   */
  private bubbleUp(index: number): void {
    if (index === 0) {
      return;
    }

    const parentIndex = Math.floor((index - 1) / 2);

    // Compare priority (max heap - higher priority on top)
    if (this.queue[index].priority > this.queue[parentIndex].priority) {
      // Swap
      [this.queue[index], this.queue[parentIndex]] = [this.queue[parentIndex], this.queue[index]];

      this.bubbleUp(parentIndex);
    }
  }

  /**
   * Bubble down operation for heap
   * Time Complexity: O(log n)
   * @param index - Current index
   */
  private bubbleDown(index: number): void {
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;
    let largest = index;

    if (
      leftChild < this.queue.length &&
      this.queue[leftChild].priority > this.queue[largest].priority
    ) {
      largest = leftChild;
    }

    if (
      rightChild < this.queue.length &&
      this.queue[rightChild].priority > this.queue[largest].priority
    ) {
      largest = rightChild;
    }

    if (largest !== index) {
      // Swap
      [this.queue[index], this.queue[largest]] = [this.queue[largest], this.queue[index]];

      this.bubbleDown(largest);
    }
  }

  /**
   * Start processing queue with worker pool
   * Design Pattern: Worker pool for parallel processing
   */
  private startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    // Create worker pool
    for (let i = 0; i < this.workers; i++) {
      this.processWorker();
    }
  }

  /**
   * Worker function to process notifications
   * Algorithm: Continuous polling with backoff
   */
  private async processWorker(): Promise<void> {
    while (this.isProcessing) {
      try {
        // Get next job
        const job = this.dequeue();

        if (!job) {
          // No jobs available, wait before checking again
          await this.sleep(1000);
          continue;
        }

        // Check if already processing
        if (this.processing.has(job.id)) {
          // Re-queue and continue
          this.enqueue(job);
          continue;
        }

        // Mark as processing
        this.processing.add(job.id);

        // Process notification
        await this.processNotification(job);

        // Remove from processing
        this.processing.delete(job.id);
      } catch (error) {
        this.logger.error('Error in notification worker', error.message, 'NotificationQueue');
        await this.sleep(5000);
      }
    }
  }

  /**
   * Process individual notification
   * @param job - Notification job
   */
  private async processNotification(job: NotificationJob): Promise<void> {
    try {
      this.logger.log(
        `Processing notification: ${job.id} (type: ${job.type})`,
        'NotificationQueue',
      );

      // Simulate processing (in real implementation, this would call NotificationsService)
      await this.sleep(100);

      this.logger.log(`Notification processed: ${job.id}`, 'NotificationQueue');
    } catch (error) {
      this.logger.error(
        `Error processing notification: ${job.id}`,
        error.message,
        'NotificationQueue',
      );

      // Retry logic
      if (job.retries < job.maxRetries) {
        job.retries++;
        this.enqueue({
          type: job.type,
          priority: job.priority,
          payload: job.payload,
          maxRetries: job.maxRetries,
        });
      }
    }
  }

  /**
   * Get queue statistics
   * @returns Queue stats
   */
  getStats(): {
    queueSize: number;
    processing: number;
    workers: number;
  } {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      workers: this.workers,
    };
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    this.isProcessing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
