import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Kafka,
  Producer,
  Consumer,
  Admin,
  KafkaMessage,
  EachMessagePayload,
  CompressionTypes,
  logLevel,
  RecordMetadata,
  ConsumerConfig,
  ProducerConfig,
} from 'kafkajs';

/**
 * Kafka Topics - Centralized topic constants
 */
export const KAFKA_TOPICS = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_STATUS_CHANGED: 'user.status.changed',

  // Auth events (Spring Boot integration)
  AUTH_EVENTS: 'auth.events',
  AUTH_USER_REGISTERED: 'auth.user.registered',
  AUTH_USER_LOGIN: 'auth.user.login',
  AUTH_USER_LOGOUT: 'auth.user.logout',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_TOKEN_REVOKED: 'auth.token.revoked',
  AUTH_PASSWORD_CHANGED: 'auth.password.changed',
  AUTH_PASSWORD_RESET: 'auth.password.reset',
  AUTH_2FA_ENABLED: 'auth.2fa.enabled',
  AUTH_2FA_DISABLED: 'auth.2fa.disabled',
  AUTH_OAUTH_LINKED: 'auth.oauth.linked',
  AUTH_OAUTH_UNLINKED: 'auth.oauth.unlinked',
  AUTH_SESSION_TERMINATED: 'auth.session.terminated',
  AUTH_SUSPICIOUS_ACTIVITY: 'auth.suspicious.activity',

  // Message events
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_READ: 'message.read',
  MESSAGE_DELETED: 'message.deleted',

  // Conversation events
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  CONVERSATION_DELETED: 'conversation.deleted',

  // Call events
  CALL_STARTED: 'call.started',
  CALL_ENDED: 'call.ended',
  CALL_MISSED: 'call.missed',

  // Notification events
  NOTIFICATION_PUSH: 'notification.push',
  NOTIFICATION_EMAIL: 'notification.email',
  NOTIFICATION_SMS: 'notification.sms',

  // Analytics events
  ANALYTICS_USER_ACTION: 'analytics.user.action',
  ANALYTICS_SYSTEM_METRIC: 'analytics.system.metric',

  // Media events
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_PROCESSED: 'media.processed',
  MEDIA_DELETED: 'media.deleted',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/**
 * Kafka Consumer Groups
 */
export const KAFKA_CONSUMER_GROUPS = {
  NOTIFICATION_SERVICE: 'notification-service',
  ANALYTICS_SERVICE: 'analytics-service',
  MEDIA_SERVICE: 'media-service',
  SEARCH_SERVICE: 'search-service',
  AUDIT_SERVICE: 'audit-service',
  AUTH_SERVICE: 'auth-service',
  AUTH_SYNC_SERVICE: 'auth-sync-service',
} as const;

/**
 * Message handler type
 */
export type MessageHandler<T = any> = (
  message: T,
  metadata: {
    topic: string;
    partition: number;
    offset: string;
    timestamp: string;
    key?: string;
  },
) => Promise<void>;

/**
 * Kafka configuration interface
 */
export interface KafkaModuleOptions {
  clientId: string;
  brokers: string[];
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: {
    initialRetryTime?: number;
    retries?: number;
  };
}

export const KAFKA_MODULE_OPTIONS = 'KAFKA_MODULE_OPTIONS';

/**
 * KafkaService - Service for Apache Kafka integration
 * Provides high-throughput, fault-tolerant event streaming
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private admin: Admin;
  private isConnected = false;
  private readonly handlers: Map<string, MessageHandler[]> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(KAFKA_MODULE_OPTIONS)
    private readonly options?: KafkaModuleOptions,
  ) {
    const brokersConfig: string | string[] =
      this.options?.brokers || this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092';
    const brokers = Array.isArray(brokersConfig) ? brokersConfig : brokersConfig.split(',');
    const clientId =
      this.options?.clientId || this.configService.get<string>('KAFKA_CLIENT_ID') || 'quckchat-backend';

    this.kafka = new Kafka({
      clientId,
      brokers,
      ssl: this.options?.ssl || this.configService.get('KAFKA_SSL') === 'true',
      sasl: this.options?.sasl || this.getSaslConfig(),
      connectionTimeout: this.options?.connectionTimeout || 10000,
      requestTimeout: this.options?.requestTimeout || 30000,
      retry: this.options?.retry || {
        initialRetryTime: 100,
        retries: 8,
      },
      logLevel: logLevel.WARN,
      logCreator:
        () =>
        ({ level, log }) => {
          const { message, ...extra } = log;
          switch (level) {
            case logLevel.ERROR:
              this.logger.error(message, JSON.stringify(extra));
              break;
            case logLevel.WARN:
              this.logger.warn(message);
              break;
            case logLevel.INFO:
              this.logger.log(message);
              break;
            case logLevel.DEBUG:
              this.logger.debug(message);
              break;
          }
        },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    } as ProducerConfig);

    this.admin = this.kafka.admin();
  }

  private getSaslConfig(): any {
    const mechanism = this.configService.get('KAFKA_SASL_MECHANISM');
    const username = this.configService.get('KAFKA_SASL_USERNAME');
    const password = this.configService.get('KAFKA_SASL_PASSWORD');

    if (mechanism && username && password) {
      return {
        mechanism,
        username,
        password,
      };
    }
    return undefined;
  }

  async onModuleInit() {
    try {
      await this.connect();
    } catch (error) {
      this.logger.warn(`Kafka connection failed on init: ${error.message}. Will retry on usage.`);
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.producer.connect();
      await this.admin.connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to Kafka');
    } catch (error) {
      this.logger.error(`Failed to connect to Kafka: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.admin.disconnect();

      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        this.logger.log(`Disconnected consumer group: ${groupId}`);
      }
      this.consumers.clear();

      this.isConnected = false;
      this.logger.log('Disconnected from Kafka');
    } catch (error) {
      this.logger.error(`Error disconnecting from Kafka: ${error.message}`);
    }
  }

  /**
   * Publish a message to a topic
   */
  async publish<T = any>(
    topic: KafkaTopic | string,
    message: T,
    options?: {
      key?: string;
      partition?: number;
      headers?: Record<string, string>;
      timestamp?: string;
    },
  ): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    const { key, partition, headers, timestamp } = options || {};

    try {
      const result = await this.producer.send({
        topic,
        compression: CompressionTypes.GZIP,
        messages: [
          {
            key: key || undefined,
            value: JSON.stringify(message),
            partition,
            headers: headers
              ? Object.fromEntries(
                  Object.entries(headers).map(([k, v]) => [k, Buffer.from(v)]),
                )
              : undefined,
            timestamp,
          },
        ],
      });

      this.logger.debug(`Published message to topic ${topic}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to publish message to ${topic}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publish multiple messages to a topic (batch)
   */
  async publishBatch<T = any>(
    topic: KafkaTopic | string,
    messages: Array<{
      value: T;
      key?: string;
      partition?: number;
      headers?: Record<string, string>;
    }>,
  ): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.producer.send({
        topic,
        compression: CompressionTypes.GZIP,
        messages: messages.map((msg) => ({
          key: msg.key || undefined,
          value: JSON.stringify(msg.value),
          partition: msg.partition,
          headers: msg.headers
            ? Object.fromEntries(
                Object.entries(msg.headers).map(([k, v]) => [k, Buffer.from(v)]),
              )
            : undefined,
        })),
      });

      this.logger.debug(`Published ${messages.length} messages to topic ${topic}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to publish batch to ${topic}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe to topics with a consumer group
   */
  async subscribe(
    groupId: string,
    topics: (KafkaTopic | string)[],
    handler: MessageHandler,
    options?: Partial<ConsumerConfig>,
  ): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    let consumer = this.consumers.get(groupId);

    if (!consumer) {
      consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576, // 1MB
        ...options,
      });

      await consumer.connect();
      this.consumers.set(groupId, consumer);
    }

    // Subscribe to topics
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
      this.logger.log(`Subscribed to topic: ${topic} with group: ${groupId}`);

      // Store handler
      const key = `${groupId}:${topic}`;
      if (!this.handlers.has(key)) {
        this.handlers.set(key, []);
      }
      this.handlers.get(key)!.push(handler);
    }

    // Run consumer
    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(groupId, payload);
      },
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(groupId: string, payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const key = `${groupId}:${topic}`;
    const handlers = this.handlers.get(key) || [];

    if (handlers.length === 0) {
      this.logger.warn(`No handlers registered for ${key}`);
      return;
    }

    try {
      const parsedMessage = this.parseMessage(message);
      const metadata = {
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        key: message.key?.toString(),
      };

      for (const handler of handlers) {
        await handler(parsedMessage, metadata);
      }
    } catch (error) {
      this.logger.error(
        `Error processing message from ${topic}:${partition}:${message.offset}: ${error.message}`,
      );
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  /**
   * Parse Kafka message
   */
  private parseMessage(message: KafkaMessage): any {
    if (!message.value) return null;

    const value = message.value.toString();
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Create topics if they don't exist
   */
  async createTopics(
    topics: Array<{
      topic: string;
      numPartitions?: number;
      replicationFactor?: number;
    }>,
  ): Promise<boolean> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.admin.createTopics({
        topics: topics.map((t) => ({
          topic: t.topic,
          numPartitions: t.numPartitions || 3,
          replicationFactor: t.replicationFactor || 1,
        })),
        waitForLeaders: true,
      });

      if (result) {
        this.logger.log(`Created topics: ${topics.map((t) => t.topic).join(', ')}`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to create topics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete topics
   */
  async deleteTopics(topics: string[]): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.admin.deleteTopics({ topics });
      this.logger.log(`Deleted topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to delete topics: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all topics
   */
  async listTopics(): Promise<string[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    return this.admin.listTopics();
  }

  /**
   * Get topic metadata
   */
  async getTopicMetadata(topics?: string[]): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    return this.admin.fetchTopicMetadata(topics ? { topics } : undefined);
  }

  /**
   * Get consumer group offsets
   */
  async getConsumerGroupOffsets(groupId: string, topics: string[]): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    return this.admin.fetchOffsets({ groupId, topics });
  }

  /**
   * Check if connected
   */
  isKafkaConnected(): boolean {
    return this.isConnected;
  }
}
