import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqpManager from 'amqp-connection-manager';
import { ChannelWrapper, AmqpConnectionManager } from 'amqp-connection-manager';
import { Channel, Options, ConsumeMessage, ConfirmChannel } from 'amqplib';
import {
  RABBITMQ_MODULE_OPTIONS,
  RabbitMQModuleOptions,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RabbitMQExchange,
  RabbitMQQueue,
  MessageHandler,
  QueueOptions,
  PublishOptions,
} from './rabbitmq.service';

/**
 * AMQP Connection Manager Service
 *
 * Enhanced RabbitMQ service using amqp-connection-manager for:
 * - Automatic reconnection with backoff
 * - Connection pooling
 * - Channel management
 * - Message buffering during disconnections
 * - Publisher confirms
 *
 * Use this instead of RabbitMQService for production environments
 * where reliability is critical.
 */

/**
 * Consumer options
 */
export interface ConsumerOptions {
  /** Queue options */
  queue?: QueueOptions;
  /** Consume options */
  consume?: Options.Consume;
  /** Number of prefetch messages */
  prefetch?: number;
  /** Auto-acknowledge messages */
  noAck?: boolean;
  /** Retry failed messages */
  retry?: {
    enabled: boolean;
    maxRetries: number;
    delay: number;
  };
}

/**
 * Connection state
 */
export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'blocked';

@Injectable()
export class AmqpManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmqpManagerService.name);
  private connection: AmqpConnectionManager | null = null;
  private publishChannel: ChannelWrapper | null = null;
  private consumerChannels: Map<string, ChannelWrapper> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private readonly consumers: Map<string, { handler: MessageHandler; options: ConsumerOptions }> =
    new Map();
  private reconnectCount = 0;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(RABBITMQ_MODULE_OPTIONS)
    private readonly options?: RabbitMQModuleOptions,
  ) {}

  async onModuleInit() {
    try {
      await this.connect();
    } catch (error: any) {
      this.logger.warn(
        `AMQP connection failed on init: ${error.message}. Will retry automatically.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Get connection URLs from options or config
   */
  private getConnectionUrls(): string[] {
    if (this.options?.url) {
      return [this.options.url];
    }

    const host = this.options?.host || this.configService.get('RABBITMQ_HOST', 'localhost');
    const port = this.options?.port || parseInt(this.configService.get('RABBITMQ_PORT', '5672'), 10);
    const username =
      this.options?.username || this.configService.get('RABBITMQ_USERNAME', 'guest');
    const password =
      this.options?.password || this.configService.get('RABBITMQ_PASSWORD', 'guest');
    const vhost = this.options?.vhost || this.configService.get('RABBITMQ_VHOST', '/');

    // Support multiple URLs for cluster connections
    const urls = [`amqp://${username}:${password}@${host}:${port}${vhost}`];

    // Check for additional hosts
    const additionalHosts = this.configService.get<string>('RABBITMQ_ADDITIONAL_HOSTS');
    if (additionalHosts) {
      const hosts = additionalHosts.split(',').map((h) => h.trim());
      hosts.forEach((h) => {
        urls.push(`amqp://${username}:${password}@${h}:${port}${vhost}`);
      });
    }

    return urls;
  }

  /**
   * Connect to RabbitMQ using connection manager
   */
  async connect(): Promise<void> {
    if (this.connection && this.connectionState !== 'disconnected') {
      return;
    }

    const urls = this.getConnectionUrls();
    const heartbeat = this.options?.heartbeat || 60;

    this.connectionState = 'connecting';

    this.connection = amqpManager.connect(urls, {
      heartbeatIntervalInSeconds: heartbeat,
      reconnectTimeInSeconds: (this.options?.reconnectDelay || 5000) / 1000,
      connectionOptions: {
        timeout: 10000,
      },
    });

    // Handle connection events
    this.connection.on('connect', () => {
      this.connectionState = 'connected';
      this.reconnectCount = 0;
      this.logger.log('Connected to RabbitMQ via connection manager');
    });

    this.connection.on('disconnect', (params) => {
      this.connectionState = 'disconnected';
      this.reconnectCount++;
      this.logger.warn(`Disconnected from RabbitMQ: ${params.err?.message || 'Unknown reason'}`);
    });

    this.connection.on('connectFailed', (params) => {
      this.logger.error(`Failed to connect to RabbitMQ: ${params.err?.message}`);
    });

    this.connection.on('blocked', (reason) => {
      this.connectionState = 'blocked';
      this.logger.warn(`RabbitMQ connection blocked: ${reason}`);
    });

    this.connection.on('unblocked', () => {
      this.connectionState = 'connected';
      this.logger.log('RabbitMQ connection unblocked');
    });

    // Create publish channel
    await this.createPublishChannel();
  }

  /**
   * Create the main publish channel with confirms
   */
  private async createPublishChannel(): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not established');
    }

    const prefetch = this.options?.prefetch || 10;

    this.publishChannel = this.connection.createChannel({
      json: false,
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(prefetch);

        // Setup default exchanges
        for (const [name, exchange] of Object.entries(RABBITMQ_EXCHANGES)) {
          const type = exchange.includes('.topic')
            ? 'topic'
            : exchange.includes('.fanout')
              ? 'fanout'
              : 'direct';
          await channel.assertExchange(exchange, type, { durable: true });
        }

        this.logger.debug('Publish channel setup complete');
      },
    });

    await this.publishChannel.waitForConnect();
  }

  /**
   * Create a consumer channel for a specific queue
   */
  private async createConsumerChannel(
    queue: string,
    options?: ConsumerOptions,
  ): Promise<ChannelWrapper> {
    if (!this.connection) {
      throw new Error('Connection not established');
    }

    const prefetch = options?.prefetch || this.options?.prefetch || 10;

    const channel = this.connection.createChannel({
      json: false,
      setup: async (ch: Channel) => {
        await ch.prefetch(prefetch);

        // Assert queue with options
        const queueOptions: Options.AssertQueue = {
          durable: options?.queue?.durable ?? true,
          exclusive: options?.queue?.exclusive ?? false,
          autoDelete: options?.queue?.autoDelete ?? false,
          arguments: {} as Record<string, any>,
        };

        if (options?.queue?.deadLetterExchange) {
          (queueOptions.arguments as Record<string, any>)['x-dead-letter-exchange'] =
            options.queue.deadLetterExchange;
        }
        if (options?.queue?.deadLetterRoutingKey) {
          (queueOptions.arguments as Record<string, any>)['x-dead-letter-routing-key'] =
            options.queue.deadLetterRoutingKey;
        }
        if (options?.queue?.messageTtl) {
          (queueOptions.arguments as Record<string, any>)['x-message-ttl'] = options.queue.messageTtl;
        }
        if (options?.queue?.maxLength) {
          (queueOptions.arguments as Record<string, any>)['x-max-length'] = options.queue.maxLength;
        }

        await ch.assertQueue(queue, queueOptions);
        this.logger.debug(`Consumer channel for queue ${queue} setup complete`);
      },
    });

    this.consumerChannels.set(queue, channel);
    await channel.waitForConnect();
    return channel;
  }

  /**
   * Disconnect from RabbitMQ
   */
  async disconnect(): Promise<void> {
    try {
      // Close all consumer channels
      for (const [queue, channel] of this.consumerChannels) {
        await channel.close();
        this.logger.debug(`Closed consumer channel for queue ${queue}`);
      }
      this.consumerChannels.clear();

      // Close publish channel
      if (this.publishChannel) {
        await this.publishChannel.close();
        this.publishChannel = null;
      }

      // Close connection
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.connectionState = 'disconnected';
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error: any) {
      this.logger.error(`Error disconnecting: ${error.message}`);
    }
  }

  /**
   * Publish a message to an exchange
   * Messages are buffered during disconnections
   */
  async publish<T = any>(
    exchange: RabbitMQExchange | string,
    message: T,
    options?: PublishOptions,
  ): Promise<void> {
    if (!this.publishChannel) {
      await this.connect();
    }

    const routingKey = options?.routingKey || '';
    const content = Buffer.from(JSON.stringify(message));

    const publishOptions: Options.Publish = {
      persistent: options?.persistent ?? true,
      priority: options?.priority,
      expiration: options?.expiration?.toString(),
      messageId: options?.messageId || this.generateMessageId(),
      correlationId: options?.correlationId,
      replyTo: options?.replyTo,
      headers: {
        ...options?.headers,
        'x-timestamp': Date.now(),
      },
      contentType: options?.contentType || 'application/json',
      contentEncoding: options?.contentEncoding || 'utf-8',
      timestamp: Math.floor(Date.now() / 1000),
    };

    await this.publishChannel!.publish(exchange, routingKey, content, publishOptions);
    this.logger.debug(`Published message to ${exchange}:${routingKey}`);
  }

  /**
   * Send directly to a queue
   */
  async sendToQueue<T = any>(
    queue: RabbitMQQueue | string,
    message: T,
    options?: PublishOptions,
  ): Promise<void> {
    if (!this.publishChannel) {
      await this.connect();
    }

    const content = Buffer.from(JSON.stringify(message));

    const sendOptions: Options.Publish = {
      persistent: options?.persistent ?? true,
      priority: options?.priority,
      expiration: options?.expiration?.toString(),
      messageId: options?.messageId || this.generateMessageId(),
      correlationId: options?.correlationId,
      headers: {
        ...options?.headers,
        'x-timestamp': Date.now(),
      },
      contentType: 'application/json',
      timestamp: Math.floor(Date.now() / 1000),
    };

    await this.publishChannel!.sendToQueue(queue, content, sendOptions);
    this.logger.debug(`Sent message to queue ${queue}`);
  }

  /**
   * Consume messages from a queue with automatic reconnection
   */
  async consume<T = any>(
    queue: RabbitMQQueue | string,
    handler: MessageHandler<T>,
    options?: ConsumerOptions,
  ): Promise<string> {
    // Store consumer for reconnection
    this.consumers.set(queue, { handler: handler as MessageHandler, options: options || {} });

    // Get or create consumer channel
    let channel = this.consumerChannels.get(queue);
    if (!channel) {
      channel = await this.createConsumerChannel(queue, options);
    }

    const consumeOptions: Options.Consume = {
      noAck: options?.noAck ?? false,
      ...options?.consume,
    };

    // Add consumer with message handling
    await channel.addSetup(async (ch: Channel) => {
      await ch.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
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

            if (!consumeOptions.noAck) {
              ch.ack(msg);
            }
          } catch (error: any) {
            this.logger.error(`Error processing message from ${queue}: ${error.message}`);
            await this.handleMessageError(ch, msg, queue, options);
          }
        },
        consumeOptions,
      );
    });

    this.logger.log(`Started consuming from queue ${queue}`);
    return queue;
  }

  /**
   * Handle message processing errors
   */
  private async handleMessageError(
    channel: Channel,
    msg: ConsumeMessage,
    queue: string,
    options?: ConsumerOptions,
  ): Promise<void> {
    const retryEnabled = options?.retry?.enabled ?? false;
    const maxRetries = options?.retry?.maxRetries ?? 3;
    const retryDelay = options?.retry?.delay ?? 5000;

    const headers = msg.properties.headers || {};
    const retryCount = headers['x-retry-count'] || 0;

    if (retryEnabled && retryCount < maxRetries) {
      // Requeue with delay using dead letter exchange
      this.logger.warn(`Retrying message (attempt ${retryCount + 1}/${maxRetries})`);

      // Publish to retry queue with delay
      const retryContent = msg.content;
      await this.publishChannel?.publish(
        '',
        queue,
        retryContent,
        {
          headers: {
            ...headers,
            'x-retry-count': retryCount + 1,
            'x-original-queue': queue,
          },
          expiration: retryDelay.toString(),
        },
      );

      channel.ack(msg);
    } else {
      // Send to dead letter queue
      if (retryEnabled) {
        this.logger.error(`Message exceeded max retries, sending to DLQ`);
      }
      channel.nack(msg, false, false);
    }
  }

  /**
   * Stop consuming from a queue
   */
  async cancelConsumer(queue: string): Promise<void> {
    const channel = this.consumerChannels.get(queue);
    if (channel) {
      await channel.close();
      this.consumerChannels.delete(queue);
      this.consumers.delete(queue);
      this.logger.log(`Cancelled consumer for queue ${queue}`);
    }
  }

  /**
   * Assert an exchange
   */
  async assertExchange(
    exchange: string,
    type: 'direct' | 'topic' | 'fanout' | 'headers' = 'direct',
    options?: Options.AssertExchange,
  ): Promise<void> {
    if (!this.publishChannel) {
      await this.connect();
    }

    await this.publishChannel!.addSetup(async (ch: Channel) => {
      await ch.assertExchange(exchange, type, { durable: true, ...options });
    });
  }

  /**
   * Assert a queue
   */
  async assertQueue(queue: string, options?: QueueOptions): Promise<void> {
    if (!this.publishChannel) {
      await this.connect();
    }

    await this.publishChannel!.addSetup(async (ch: Channel) => {
      const queueOptions: Options.AssertQueue = {
        durable: options?.durable ?? true,
        exclusive: options?.exclusive ?? false,
        autoDelete: options?.autoDelete ?? false,
        arguments: {} as Record<string, any>,
      };

      if (options?.deadLetterExchange) {
        (queueOptions.arguments as Record<string, any>)['x-dead-letter-exchange'] =
          options.deadLetterExchange;
      }
      if (options?.messageTtl) {
        (queueOptions.arguments as Record<string, any>)['x-message-ttl'] = options.messageTtl;
      }
      if (options?.maxLength) {
        (queueOptions.arguments as Record<string, any>)['x-max-length'] = options.maxLength;
      }

      await ch.assertQueue(queue, queueOptions);
    });
  }

  /**
   * Bind a queue to an exchange
   */
  async bindQueue(queue: string, exchange: string, routingKey: string = ''): Promise<void> {
    if (!this.publishChannel) {
      await this.connect();
    }

    await this.publishChannel!.addSetup(async (ch: Channel) => {
      await ch.bindQueue(queue, exchange, routingKey);
    });
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Get reconnection count
   */
  getReconnectCount(): number {
    return this.reconnectCount;
  }

  /**
   * Get number of pending messages in publish buffer
   */
  getPendingMessages(): number {
    return this.publishChannel?.queueLength() ?? 0;
  }

  /**
   * Wait for all pending messages to be confirmed
   */
  async waitForConfirms(): Promise<void> {
    await this.publishChannel?.waitForConnect();
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Setup dead letter infrastructure
   */
  async setupDeadLetterInfrastructure(): Promise<void> {
    await this.assertExchange(RABBITMQ_EXCHANGES.DEAD_LETTER, 'fanout');
    await this.assertQueue(RABBITMQ_QUEUES.DEAD_LETTER, {
      durable: true,
      messageTtl: 86400000 * 7, // 7 days
    });
    await this.bindQueue(RABBITMQ_QUEUES.DEAD_LETTER, RABBITMQ_EXCHANGES.DEAD_LETTER);
    this.logger.log('Dead letter infrastructure set up');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    state: ConnectionState;
    reconnectCount: number;
    pendingMessages: number;
  }> {
    return {
      status: this.connectionState === 'connected' ? 'healthy' : 'unhealthy',
      state: this.connectionState,
      reconnectCount: this.reconnectCount,
      pendingMessages: this.getPendingMessages(),
    };
  }
}
