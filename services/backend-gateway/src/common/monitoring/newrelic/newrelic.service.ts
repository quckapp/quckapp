import { Injectable, OnModuleInit, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * New Relic configuration options
 */
export interface NewRelicModuleOptions {
  /** Enable New Relic (default: based on NEW_RELIC_ENABLED env) */
  enabled?: boolean;
  /** Application name */
  appName?: string;
  /** License key */
  licenseKey?: string;
  /** Enable distributed tracing */
  distributedTracing?: boolean;
  /** Enable error collection */
  errorCollector?: boolean;
  /** Enable transaction tracer */
  transactionTracer?: boolean;
  /** Custom attributes to add to all transactions */
  customAttributes?: Record<string, string | number | boolean>;
}

export const NEWRELIC_MODULE_OPTIONS = 'NEWRELIC_MODULE_OPTIONS';

/**
 * Transaction types
 */
export const TRANSACTION_TYPES = {
  WEB: 'web',
  BACKGROUND: 'background',
  MESSAGE: 'message',
} as const;

/**
 * NewRelicService - New Relic APM integration
 *
 * Features:
 * - Automatic transaction tracking
 * - Custom segments and spans
 * - Error tracking with context
 * - Custom attributes and events
 * - Distributed tracing
 * - Browser monitoring support
 *
 * IMPORTANT: New Relic must be required FIRST in your main.ts.
 * Create a newrelic.js config file in your project root.
 *
 * ```typescript
 * import './common/monitoring/newrelic/newrelic.init';
 * ```
 */
@Injectable()
export class NewRelicService implements OnModuleInit {
  private readonly logger = new Logger(NewRelicService.name);
  private newrelic: any;
  private isEnabled = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(NEWRELIC_MODULE_OPTIONS)
    private readonly options?: NewRelicModuleOptions,
  ) {}

  async onModuleInit() {
    this.isEnabled =
      this.options?.enabled ??
      this.configService.get<string>('NEW_RELIC_ENABLED') === 'true';

    if (!this.isEnabled) {
      this.logger.log('New Relic is disabled');
      return;
    }

    try {
      // Import newrelic dynamically (it should already be required)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.newrelic = require('newrelic');
      this.logger.log('New Relic APM service initialized');
    } catch (error: any) {
      this.logger.warn(`New Relic initialization skipped: ${error.message}`);
    }
  }

  /**
   * Set the name of the current transaction
   */
  setTransactionName(name: string): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.setTransactionName(name);
  }

  /**
   * Add a custom attribute to the current transaction
   */
  addCustomAttribute(name: string, value: string | number | boolean): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.addCustomAttribute(name, value);
  }

  /**
   * Add multiple custom attributes to the current transaction
   */
  addCustomAttributes(attributes: Record<string, string | number | boolean>): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.addCustomAttributes(attributes);
  }

  /**
   * Record a custom event
   */
  recordCustomEvent(eventType: string, attributes: Record<string, any>): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.recordCustomEvent(eventType, {
      ...attributes,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.recordMetric(name, value);
  }

  /**
   * Increment a metric
   */
  incrementMetric(name: string, amount: number = 1): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.incrementMetric(name, amount);
  }

  /**
   * Notice an error
   */
  noticeError(
    error: Error,
    customAttributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.noticeError(error, customAttributes);
  }

  /**
   * Start a background transaction
   */
  startBackgroundTransaction<T>(
    name: string,
    group: string,
    handler: () => Promise<T>,
  ): Promise<T> {
    if (!this.isEnabled || !this.newrelic) {
      return handler();
    }

    return new Promise((resolve, reject) => {
      this.newrelic.startBackgroundTransaction(name, group, async () => {
        try {
          const result = await handler();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.newrelic.endTransaction();
        }
      });
    });
  }

  /**
   * Start a web transaction
   */
  startWebTransaction<T>(name: string, handler: () => Promise<T>): Promise<T> {
    if (!this.isEnabled || !this.newrelic) {
      return handler();
    }

    return new Promise((resolve, reject) => {
      this.newrelic.startWebTransaction(name, async () => {
        try {
          const result = await handler();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.newrelic.endTransaction();
        }
      });
    });
  }

  /**
   * End the current transaction
   */
  endTransaction(): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.endTransaction();
  }

  /**
   * Create a custom segment
   */
  startSegment<T>(
    name: string,
    record: boolean,
    handler: () => Promise<T> | T,
  ): Promise<T> {
    if (!this.isEnabled || !this.newrelic) {
      return Promise.resolve(handler());
    }

    return this.newrelic.startSegment(name, record, handler);
  }

  /**
   * Get browser timing header (for browser monitoring)
   */
  getBrowserTimingHeader(): string {
    if (!this.isEnabled || !this.newrelic) return '';
    return this.newrelic.getBrowserTimingHeader();
  }

  /**
   * Set user ID for the current transaction
   */
  setUserID(userId: string): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.setUserID(userId);
  }

  /**
   * Ignore the current transaction
   */
  ignoreTransaction(): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.setIgnoreTransaction(true);
  }

  /**
   * Get linking metadata for logs
   */
  getLinkingMetadata(): Record<string, any> {
    if (!this.isEnabled || !this.newrelic) return {};
    return this.newrelic.getLinkingMetadata();
  }

  /**
   * Get trace metadata
   */
  getTraceMetadata(): { traceId: string; spanId: string } | null {
    if (!this.isEnabled || !this.newrelic) return null;
    return this.newrelic.getTraceMetadata();
  }

  /**
   * Create distributed trace headers
   */
  insertDistributedTraceHeaders(headers: Record<string, string>): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.distributedTracing.insertDistributedTraceHeaders(headers);
  }

  /**
   * Accept distributed trace headers
   */
  acceptDistributedTraceHeaders(
    transportType: 'HTTP' | 'HTTPS' | 'Kafka' | 'JMS' | 'IronMQ' | 'AMQP' | 'Queue' | 'Other',
    headers: Record<string, string>,
  ): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.distributedTracing.acceptDistributedTraceHeaders(transportType, headers);
  }

  /**
   * Add custom span attributes (for distributed tracing)
   */
  addCustomSpanAttribute(name: string, value: string | number | boolean): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.addCustomSpanAttribute(name, value);
  }

  /**
   * Add multiple custom span attributes
   */
  addCustomSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    if (!this.isEnabled || !this.newrelic) return;
    this.newrelic.addCustomSpanAttributes(attributes);
  }

  /**
   * Check if New Relic is enabled
   */
  isNewRelicEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Shutdown New Relic agent
   */
  async shutdown(): Promise<void> {
    if (!this.isEnabled || !this.newrelic) return;

    return new Promise((resolve) => {
      this.newrelic.shutdown({ collectPendingData: true }, () => {
        this.logger.log('New Relic agent shut down');
        resolve();
      });
    });
  }
}
