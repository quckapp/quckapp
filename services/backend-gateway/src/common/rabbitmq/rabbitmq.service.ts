import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

/**
 * RabbitMQ Exchanges - Centralized exchange constants
 */
export const RABBITMQ_EXCHANGES = {
  // Direct exchanges
  NOTIFICATIONS: 'notifications.direct',
  TASKS: 'tasks.direct',

  // Topic exchanges for routing
  EVENTS: 'events.topic',
  LOGS: 'logs.topic',

  // Fanout exchanges for broadcasting
  BROADCAST: 'broadcast.fanout',
  SYSTEM_ALERTS: 'system.alerts.fanout',

  // Dead letter exchange
  DEAD_LETTER: 'dead.letter.exchange',
} as const;

export type RabbitMQExchange = (typeof RABBITMQ_EXCHANGES)[keyof typeof RABBITMQ_EXCHANGES];

/**
 * RabbitMQ Queues - Centralized queue constants
 */
export const RABBITMQ_QUEUES = {
  // Notification queues
  PUSH_NOTIFICATIONS: 'push.notifications',
  EMAIL_NOTIFICATIONS: 'email.notifications',
  SMS_NOTIFICATIONS: 'sms.notifications',

  // Task queues
  IMAGE_PROCESSING: 'image.processing',
  VIDEO_PROCESSING: 'video.processing',
  FILE_PROCESSING: 'file.processing',
  THUMBNAIL_GENERATION: 'thumbnail.generation',

  // Scheduled task queues
  SCHEDULED_MESSAGES: 'scheduled.messages',
  CLEANUP_TASKS: 'cleanup.tasks',
  REPORT_GENERATION: 'report.generation',

  // Dead letter queues
  DEAD_LETTER: 'dead.letter.queue',
} as const;

export type RabbitMQQueue = (typeof RABBITMQ_QUEUES)[keyof typeof RABBITMQ_QUEUES];

/**
 * Routing keys for topic exchanges
 */
export const ROUTING_KEYS = {
  // User events
  USER_ALL: 'user.*',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Message events
  MESSAGE_ALL: 'message.*',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_READ: 'message.read',

  // Notification priority
  NOTIFICATION_HIGH: 'notification.high',
  NOTIFICATION_NORMAL: 'notification.normal',
  NOTIFICATION_LOW: 'notification.low',

  // System events
  SYSTEM_ALL: 'system.*',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
} as const;

/**
 * Message handler type
 */
export type MessageHandler<T = any> = (
  message: T,
  metadata: {
    routingKey: string;
    exchange: string;
    deliveryTag: number;
    redelivered: boolean;
    messageId?: string;
    correlationId?: string;
    headers?: Record<string, any>;
  },
) => Promise<void>;

/**
 * RabbitMQ configuration interface
 */
export interface RabbitMQModuleOptions {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  vhost?: string;
  heartbeat?: number;
  prefetch?: number;
  reconnectDelay?: number;
}

export const RABBITMQ_MODULE_OPTIONS = 'RABBITMQ_MODULE_OPTIONS';

/**
 * Queue options interface
 */
export interface QueueOptions {
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  messageTtl?: number;
  maxLength?: number;
  maxPriority?: number;
}

/**
 * Publish options interface
 */
export interface PublishOptions {
  routingKey?: string;
  persistent?: boolean;
  priority?: number;
  expiration?: string | number;
  messageId?: string;
  correlationId?: string;
  replyTo?: string;
  headers?: Record<string, any>;
  contentType?: string;
  contentEncoding?: string;
}

/**
 * RabbitMQService - Service for RabbitMQ/AMQP integration
 * Provides reliable message queuing with complex routing
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private confirmChannel: amqp.ConfirmChannel | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly handlers: Map<string, MessageHandler[]> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(RABBITMQ_MODULE_OPTIONS)
    private readonly options?: RabbitMQModuleOptions,
  ) {}

  async onModuleInit() {
    try {
      await this.connect();
    } catch (error) {
      this.logger.warn(
        `RabbitMQ connection failed on init: ${error.message}. Will retry on usage.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Get connection URL from options or config
   */
  private getConnectionUrl(): string {
    if (this.options?.url) {
      return this.options.url;
    }

    const host = this.options?.host || this.configService.get('RABBITMQ_HOST', 'localhost');
    const port = this.options?.port || parseInt(this.configService.get('RABBITMQ_PORT', '5672'), 10);
    const username =
      this.options?.username || this.configService.get('RABBITMQ_USERNAME', 'guest');
    const password =
      this.options?.password || this.configService.get('RABBITMQ_PASSWORD', 'guest');
    const vhost = this.options?.vhost || this.configService.get('RABBITMQ_VHOST', '/');

    return `amqp://${username}:${password}@${host}:${port}${vhost}`;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    const url = this.getConnectionUrl();
    const heartbeat = this.options?.heartbeat || 60;

    try {
      const conn = await amqp.connect(url, { heartbeat });
      this.connection = conn as unknown as amqp.Connection;

      // Handle connection events
      conn.on('error', (error: Error) => {
        this.logger.error(`RabbitMQ connection error: ${error.message}`);
        this.handleConnectionError();
      });

      conn.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        this.handleConnectionError();
      });

      // Create channels
      this.channel = await conn.createChannel();
      this.confirmChannel = await conn.createConfirmChannel();

      // Set prefetch
      const prefetch = this.options?.prefetch || 10;
      await this.channel.prefetch(prefetch);
      await this.confirmChannel.prefetch(prefetch);

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('Successfully connected to RabbitMQ');
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle connection errors with reconnection logic
   */
  private async handleConnectionError(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached for RabbitMQ');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options?.reconnectDelay || 5000;

    this.logger.log(
      `Attempting to reconnect to RabbitMQ (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.logger.error(`Reconnection attempt failed: ${error.message}`);
      }
    }, delay);
  }

  /**
   * Disconnect from RabbitMQ
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.confirmChannel) {
        await this.confirmChannel.close();
      }
      if (this.connection) {
        await (this.connection as any).close();
      }

      this.isConnected = false;
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error: any) {
      this.logger.error(`Error disconnecting from RabbitMQ: ${error.message}`);
    }
  }

  /**
   * Assert an exchange
   */
  async assertExchange(
    exchange: RabbitMQExchange | string,
    type: 'direct' | 'topic' | 'fanout' | 'headers' = 'direct',
    options?: amqp.Options.AssertExchange,
  ): Promise<amqp.Replies.AssertExchange> {
    if (!this.channel) {
      await this.connect();
    }

    return this.channel!.assertExchange(exchange, type, {
      durable: true,
      ...options,
    });
  }

  /**
   * Assert a queue
   */
  async assertQueue(
    queue: RabbitMQQueue | string,
    options?: QueueOptions,
  ): Promise<amqp.Replies.AssertQueue> {
    if (!this.channel) {
      await this.connect();
    }

    const queueOptions: amqp.Options.AssertQueue = {
      durable: options?.durable ?? true,
      exclusive: options?.exclusive ?? false,
      autoDelete: options?.autoDelete ?? false,
      arguments: {},
    };

    if (options?.deadLetterExchange) {
      queueOptions.arguments!['x-dead-letter-exchange'] = options.deadLetterExchange;
    }
    if (options?.deadLetterRoutingKey) {
      queueOptions.arguments!['x-dead-letter-routing-key'] = options.deadLetterRoutingKey;
    }
    if (options?.messageTtl) {
      queueOptions.arguments!['x-message-ttl'] = options.messageTtl;
    }
    if (options?.maxLength) {
      queueOptions.arguments!['x-max-length'] = options.maxLength;
    }
    if (options?.maxPriority) {
      queueOptions.arguments!['x-max-priority'] = options.maxPriority;
    }

    return this.channel!.assertQueue(queue, queueOptions);
  }

  /**
   * Bind a queue to an exchange
   */
  async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string = '',
  ): Promise<amqp.Replies.Empty> {
    if (!this.channel) {
      await this.connect();
    }

    return this.channel!.bindQueue(queue, exchange, routingKey);
  }

  /**
   * Publish a message to an exchange
   */
  async publish<T = any>(
    exchange: RabbitMQExchange | string,
    message: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    if (!this.channel) {
      await this.connect();
    }

    const routingKey = options?.routingKey || '';
    const content = Buffer.from(JSON.stringify(message));

    const publishOptions: amqp.Options.Publish = {
      persistent: options?.persistent ?? true,
      priority: options?.priority,
      expiration: options?.expiration?.toString(),
      messageId: options?.messageId,
      correlationId: options?.correlationId,
      replyTo: options?.replyTo,
      headers: options?.headers,
      contentType: options?.contentType || 'application/json',
      contentEncoding: options?.contentEncoding || 'utf-8',
      timestamp: Date.now(),
    };

    const result = this.channel!.publish(exchange, routingKey, content, publishOptions);
    this.logger.debug(`Published message to exchange ${exchange} with routing key ${routingKey}`);
    return result;
  }

  /**
   * Publish with confirmation
   */
  async publishWithConfirm<T = any>(
    exchange: RabbitMQExchange | string,
    message: T,
    options?: PublishOptions,
  ): Promise<void> {
    if (!this.confirmChannel) {
      await this.connect();
    }

    const routingKey = options?.routingKey || '';
    const content = Buffer.from(JSON.stringify(message));

    const publishOptions: amqp.Options.Publish = {
      persistent: options?.persistent ?? true,
      priority: options?.priority,
      expiration: options?.expiration?.toString(),
      messageId: options?.messageId,
      correlationId: options?.correlationId,
      headers: options?.headers,
      contentType: 'application/json',
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      this.confirmChannel!.publish(exchange, routingKey, content, publishOptions, (error) => {
        if (error) {
          this.logger.error(`Failed to publish message: ${error.message}`);
          reject(error);
        } else {
          this.logger.debug(`Confirmed message published to ${exchange}:${routingKey}`);
          resolve();
        }
      });
    });
  }

  /**
   * Send directly to a queue
   */
  async sendToQueue<T = any>(
    queue: RabbitMQQueue | string,
    message: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    if (!this.channel) {
      await this.connect();
    }

    const content = Buffer.from(JSON.stringify(message));

    const sendOptions: amqp.Options.Publish = {
      persistent: options?.persistent ?? true,
      priority: options?.priority,
      expiration: options?.expiration?.toString(),
      messageId: options?.messageId,
      correlationId: options?.correlationId,
      headers: options?.headers,
      contentType: 'application/json',
      timestamp: Date.now(),
    };

    const result = this.channel!.sendToQueue(queue, content, sendOptions);
    this.logger.debug(`Sent message to queue ${queue}`);
    return result;
  }

  /**
   * Consume messages from a queue
   */
  async consume<T = any>(
    queue: RabbitMQQueue | string,
    handler: MessageHandler<T>,
    options?: amqp.Options.Consume,
  ): Promise<amqp.Replies.Consume> {
    if (!this.channel) {
      await this.connect();
    }

    // Store handler
    if (!this.handlers.has(queue)) {
      this.handlers.set(queue, []);
    }
    this.handlers.get(queue)!.push(handler as MessageHandler);

    return this.channel!.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          const metadata = {
            routingKey: msg.fields.routingKey,
            exchange: msg.fields.exchange,
            deliveryTag: msg.fields.deliveryTag,
            redelivered: msg.fields.redelivered,
            messageId: msg.properties.messageId,
            correlationId: msg.properties.correlationId,
            headers: msg.properties.headers,
          };

          await handler(content, metadata);
          this.channel!.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing message from ${queue}: ${error.message}`);
          // Reject and requeue on error
          this.channel!.nack(msg, false, true);
        }
      },
      {
        noAck: false,
        ...options,
      },
    );
  }

  /**
   * Acknowledge a message
   */
  ack(deliveryTag: number, allUpTo: boolean = false): void {
    if (this.channel) {
      this.channel.ack({ fields: { deliveryTag } } as amqp.Message, allUpTo);
    }
  }

  /**
   * Negative acknowledge a message
   */
  nack(deliveryTag: number, allUpTo: boolean = false, requeue: boolean = true): void {
    if (this.channel) {
      this.channel.nack({ fields: { deliveryTag } } as amqp.Message, allUpTo, requeue);
    }
  }

  /**
   * Purge a queue
   */
  async purgeQueue(queue: string): Promise<amqp.Replies.PurgeQueue> {
    if (!this.channel) {
      await this.connect();
    }

    return this.channel!.purgeQueue(queue);
  }

  /**
   * Delete a queue
   */
  async deleteQueue(
    queue: string,
    options?: amqp.Options.DeleteQueue,
  ): Promise<amqp.Replies.DeleteQueue> {
    if (!this.channel) {
      await this.connect();
    }

    return this.channel!.deleteQueue(queue, options);
  }

  /**
   * Delete an exchange
   */
  async deleteExchange(
    exchange: string,
    options?: amqp.Options.DeleteExchange,
  ): Promise<amqp.Replies.Empty> {
    if (!this.channel) {
      await this.connect();
    }

    return this.channel!.deleteExchange(exchange, options);
  }

  /**
   * Get queue message count
   */
  async getQueueMessageCount(queue: string): Promise<number> {
    if (!this.channel) {
      await this.connect();
    }

    const result = await this.channel!.checkQueue(queue);
    return result.messageCount;
  }

  /**
   * Get queue consumer count
   */
  async getQueueConsumerCount(queue: string): Promise<number> {
    if (!this.channel) {
      await this.connect();
    }

    const result = await this.channel!.checkQueue(queue);
    return result.consumerCount;
  }

  /**
   * Check if connected
   */
  isRabbitMQConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Setup dead letter infrastructure
   */
  async setupDeadLetterInfrastructure(): Promise<void> {
    // Create dead letter exchange
    await this.assertExchange(RABBITMQ_EXCHANGES.DEAD_LETTER, 'fanout');

    // Create dead letter queue
    await this.assertQueue(RABBITMQ_QUEUES.DEAD_LETTER, {
      durable: true,
      messageTtl: 86400000 * 7, // 7 days
    });

    // Bind queue to exchange
    await this.bindQueue(RABBITMQ_QUEUES.DEAD_LETTER, RABBITMQ_EXCHANGES.DEAD_LETTER);

    this.logger.log('Dead letter infrastructure set up');
  }

  /**
   * Create a queue with dead letter support
   */
  async createQueueWithDLQ(
    queue: string,
    options?: Omit<QueueOptions, 'deadLetterExchange' | 'deadLetterRoutingKey'>,
  ): Promise<amqp.Replies.AssertQueue> {
    return this.assertQueue(queue, {
      ...options,
      deadLetterExchange: RABBITMQ_EXCHANGES.DEAD_LETTER,
      deadLetterRoutingKey: queue,
    });
  }
}
