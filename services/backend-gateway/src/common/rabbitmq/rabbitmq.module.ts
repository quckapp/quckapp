import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  RabbitMQService,
  RABBITMQ_MODULE_OPTIONS,
  RabbitMQModuleOptions,
} from './rabbitmq.service';

/**
 * Async options for RabbitMQ module
 */
export interface RabbitMQModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
  inject?: any[];
}

/**
 * RabbitMQModule - Global module for RabbitMQ/AMQP integration
 * Provides reliable message queuing with complex routing patterns
 *
 * Features:
 * - Direct, Topic, Fanout, and Headers exchanges
 * - Durable queues with persistence
 * - Dead letter queues for failed messages
 * - Publisher confirms for reliability
 * - Automatic reconnection with backoff
 * - Message priority support
 * - TTL (Time-To-Live) for messages
 *
 * Usage:
 * ```typescript
 * // In app.module.ts
 * RabbitMQModule.forRoot({
 *   host: 'localhost',
 *   port: 5672,
 *   username: 'guest',
 *   password: 'guest',
 * })
 *
 * // Or with URL
 * RabbitMQModule.forRoot({
 *   url: 'amqp://guest:guest@localhost:5672/',
 * })
 *
 * // Or with async configuration
 * RabbitMQModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     url: config.get('RABBITMQ_URL'),
 *   }),
 * })
 * ```
 */
@Global()
@Module({})
export class RabbitMQModule {
  /**
   * Register RabbitMQ module with static configuration
   */
  static forRoot(options?: RabbitMQModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: RABBITMQ_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: RabbitMQModule,
      imports: [ConfigModule],
      providers: [optionsProvider, RabbitMQService],
      exports: [RabbitMQService],
    };
  }

  /**
   * Register RabbitMQ module with async configuration
   */
  static forRootAsync(options: RabbitMQModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: RABBITMQ_MODULE_OPTIONS,
      useFactory: options.useFactory || (() => ({})),
      inject: options.inject || [],
    };

    return {
      module: RabbitMQModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [asyncOptionsProvider, RabbitMQService],
      exports: [RabbitMQService],
    };
  }
}
