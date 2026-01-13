import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  NewRelicService,
  NEWRELIC_MODULE_OPTIONS,
  NewRelicModuleOptions,
} from './newrelic.service';

/**
 * Async options for New Relic module
 */
export interface NewRelicModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<NewRelicModuleOptions> | NewRelicModuleOptions;
  inject?: any[];
}

/**
 * NewRelicModule - New Relic APM integration for NestJS
 *
 * Provides:
 * - Automatic transaction tracking
 * - Custom segments and spans
 * - Error tracking with context
 * - Custom attributes and events
 * - Distributed tracing
 * - Browser monitoring support
 *
 * Setup:
 * 1. Create newrelic.js in project root (see template)
 *
 * 2. Add to main.ts (BEFORE any other imports):
 *    ```typescript
 *    import './common/monitoring/newrelic/newrelic.init';
 *    ```
 *
 * 3. Import module:
 *    ```typescript
 *    NewRelicModule.forRoot({ enabled: true })
 *    ```
 *
 * Environment Variables:
 * - NEW_RELIC_ENABLED: Enable/disable New Relic
 * - NEW_RELIC_APP_NAME: Application name
 * - NEW_RELIC_LICENSE_KEY: License key
 * - NEW_RELIC_LOG_LEVEL: Log level (info, debug, trace)
 */
@Global()
@Module({})
export class NewRelicModule {
  /**
   * Register New Relic module with static configuration
   */
  static forRoot(options?: NewRelicModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: NEWRELIC_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: NewRelicModule,
      imports: [ConfigModule],
      providers: [optionsProvider, NewRelicService],
      exports: [NewRelicService],
    };
  }

  /**
   * Register New Relic module with async configuration
   */
  static forRootAsync(options: NewRelicModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: NEWRELIC_MODULE_OPTIONS,
      useFactory: options.useFactory || (() => ({})),
      inject: options.inject || [],
    };

    return {
      module: NewRelicModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [asyncOptionsProvider, NewRelicService],
      exports: [NewRelicService],
    };
  }
}
