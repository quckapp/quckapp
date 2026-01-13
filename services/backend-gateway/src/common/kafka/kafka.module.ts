import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaService, KAFKA_MODULE_OPTIONS, KafkaModuleOptions } from './kafka.service';

/**
 * Async options for Kafka module
 */
export interface KafkaModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<KafkaModuleOptions> | KafkaModuleOptions;
  inject?: any[];
}

/**
 * KafkaModule - Global module for Apache Kafka integration
 * Provides high-throughput, fault-tolerant event streaming
 *
 * Features:
 * - Producer for publishing messages
 * - Consumer groups for subscribing to topics
 * - Admin operations (create/delete topics)
 * - Automatic JSON serialization/deserialization
 * - GZIP compression for messages
 * - Retry mechanisms with exponential backoff
 *
 * Usage:
 * ```typescript
 * // In app.module.ts
 * KafkaModule.forRoot({
 *   clientId: 'quckchat-backend',
 *   brokers: ['localhost:9092'],
 * })
 *
 * // Or with async configuration
 * KafkaModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     clientId: config.get('KAFKA_CLIENT_ID'),
 *     brokers: config.get('KAFKA_BROKERS').split(','),
 *   }),
 * })
 * ```
 */
@Global()
@Module({})
export class KafkaModule {
  /**
   * Register Kafka module with static configuration
   */
  static forRoot(options?: KafkaModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: KAFKA_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: KafkaModule,
      imports: [ConfigModule],
      providers: [optionsProvider, KafkaService],
      exports: [KafkaService],
    };
  }

  /**
   * Register Kafka module with async configuration
   */
  static forRootAsync(options: KafkaModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: KAFKA_MODULE_OPTIONS,
      useFactory: options.useFactory || (() => ({})),
      inject: options.inject || [],
    };

    return {
      module: KafkaModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [asyncOptionsProvider, KafkaService],
      exports: [KafkaService],
    };
  }
}
