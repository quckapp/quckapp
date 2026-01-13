import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  DatadogService,
  DATADOG_MODULE_OPTIONS,
  DatadogModuleOptions,
} from './datadog.service';

/**
 * Async options for Datadog module
 */
export interface DatadogModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<DatadogModuleOptions> | DatadogModuleOptions;
  inject?: any[];
}

/**
 * DatadogModule - Datadog APM integration for NestJS
 *
 * Provides:
 * - Automatic tracing for HTTP, databases, and messaging
 * - Custom span creation
 * - Metrics collection
 * - Log injection for trace correlation
 * - Error tracking
 *
 * Setup:
 * 1. Add to main.ts (BEFORE any other imports):
 *    ```typescript
 *    import './common/monitoring/datadog/datadog.init';
 *    ```
 *
 * 2. Import module:
 *    ```typescript
 *    DatadogModule.forRoot({ enabled: true })
 *    ```
 *
 * Environment Variables:
 * - DD_TRACE_ENABLED: Enable/disable tracing
 * - DD_SERVICE: Service name
 * - DD_ENV: Environment (dev/staging/prod)
 * - DD_VERSION: Application version
 * - DD_AGENT_HOST: Datadog agent host
 * - DD_TRACE_AGENT_PORT: Datadog agent port
 * - DD_TRACE_SAMPLE_RATE: Sample rate (0-1)
 * - DD_RUNTIME_METRICS_ENABLED: Enable runtime metrics
 * - DD_LOGS_INJECTION: Enable log injection
 * - DD_PROFILING_ENABLED: Enable profiling
 */
@Global()
@Module({})
export class DatadogModule {
  /**
   * Register Datadog module with static configuration
   */
  static forRoot(options?: DatadogModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: DATADOG_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: DatadogModule,
      imports: [ConfigModule],
      providers: [optionsProvider, DatadogService],
      exports: [DatadogService],
    };
  }

  /**
   * Register Datadog module with async configuration
   */
  static forRootAsync(options: DatadogModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: DATADOG_MODULE_OPTIONS,
      useFactory: options.useFactory || (() => ({})),
      inject: options.inject || [],
    };

    return {
      module: DatadogModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [asyncOptionsProvider, DatadogService],
      exports: [DatadogService],
    };
  }
}
