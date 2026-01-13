import { Injectable, OnModuleInit, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Datadog configuration options
 */
export interface DatadogModuleOptions {
  /** Enable Datadog (default: based on DD_TRACE_ENABLED env) */
  enabled?: boolean;
  /** Service name */
  service?: string;
  /** Environment (dev, staging, prod) */
  env?: string;
  /** Application version */
  version?: string;
  /** Datadog agent host */
  agentHost?: string;
  /** Datadog agent port */
  agentPort?: number;
  /** Enable runtime metrics */
  runtimeMetrics?: boolean;
  /** Enable log injection */
  logInjection?: boolean;
  /** Enable profiling */
  profiling?: boolean;
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Tags to add to all traces */
  tags?: Record<string, string>;
  /** Plugins to enable/disable */
  plugins?: {
    http?: boolean;
    express?: boolean;
    mongodb?: boolean;
    redis?: boolean;
    ioredis?: boolean;
    pg?: boolean;
    mysql?: boolean;
    graphql?: boolean;
    grpc?: boolean;
    kafkajs?: boolean;
    amqplib?: boolean;
  };
}

export const DATADOG_MODULE_OPTIONS = 'DATADOG_MODULE_OPTIONS';

/**
 * Custom span tags
 */
export interface SpanTags {
  [key: string]: string | number | boolean;
}

/**
 * DatadogService - Datadog APM integration
 *
 * Features:
 * - Automatic tracing for HTTP, database, and messaging
 * - Custom span creation and tagging
 * - Runtime metrics collection
 * - Log injection for trace correlation
 * - Profiling support
 * - Error tracking
 *
 * IMPORTANT: dd-trace must be imported and initialized BEFORE any other modules.
 * Add to the very top of your main.ts:
 *
 * ```typescript
 * import './common/monitoring/datadog/datadog.init';
 * ```
 */
@Injectable()
export class DatadogService implements OnModuleInit {
  private readonly logger = new Logger(DatadogService.name);
  private tracer: any;
  private isEnabled = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(DATADOG_MODULE_OPTIONS)
    private readonly options?: DatadogModuleOptions,
  ) {}

  async onModuleInit() {
    this.isEnabled =
      this.options?.enabled ??
      this.configService.get<string>('DD_TRACE_ENABLED') === 'true';

    if (!this.isEnabled) {
      this.logger.log('Datadog tracing is disabled');
      return;
    }

    try {
      // Import dd-trace dynamically (it should already be initialized)
      const ddTrace = await import('dd-trace');
      this.tracer = ddTrace.default;
      this.logger.log('Datadog APM service initialized');
    } catch (error: any) {
      this.logger.warn(`Datadog initialization skipped: ${error.message}`);
    }
  }

  /**
   * Create a custom span
   */
  startSpan(
    operationName: string,
    options?: {
      service?: string;
      resource?: string;
      type?: string;
      tags?: SpanTags;
      childOf?: any;
    },
  ): any {
    if (!this.isEnabled || !this.tracer) {
      return null;
    }

    return this.tracer.startSpan(operationName, {
      childOf: options?.childOf || this.tracer.scope().active(),
      tags: {
        'service.name': options?.service,
        'resource.name': options?.resource,
        'span.type': options?.type,
        ...options?.tags,
      },
    });
  }

  /**
   * Finish a span
   */
  finishSpan(span: any): void {
    if (span) {
      span.finish();
    }
  }

  /**
   * Add tags to current span
   */
  addTags(tags: SpanTags): void {
    if (!this.isEnabled || !this.tracer) return;

    const span = this.tracer.scope().active();
    if (span) {
      for (const [key, value] of Object.entries(tags)) {
        span.setTag(key, value);
      }
    }
  }

  /**
   * Set error on current span
   */
  setError(error: Error): void {
    if (!this.isEnabled || !this.tracer) return;

    const span = this.tracer.scope().active();
    if (span) {
      span.setTag('error', true);
      span.setTag('error.type', error.name);
      span.setTag('error.msg', error.message);
      span.setTag('error.stack', error.stack);
    }
  }

  /**
   * Wrap a function with tracing
   */
  trace<T>(
    operationName: string,
    fn: (span: any) => Promise<T> | T,
    options?: {
      service?: string;
      resource?: string;
      type?: string;
      tags?: SpanTags;
    },
  ): Promise<T> {
    if (!this.isEnabled || !this.tracer) {
      return Promise.resolve(fn(null));
    }

    return this.tracer.trace(operationName, {
      service: options?.service,
      resource: options?.resource,
      type: options?.type,
      tags: options?.tags,
    }, fn);
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string | null {
    if (!this.isEnabled || !this.tracer) return null;

    const span = this.tracer.scope().active();
    if (span) {
      const context = span.context();
      return context.toTraceId();
    }
    return null;
  }

  /**
   * Get current span ID
   */
  getSpanId(): string | null {
    if (!this.isEnabled || !this.tracer) return null;

    const span = this.tracer.scope().active();
    if (span) {
      const context = span.context();
      return context.toSpanId();
    }
    return null;
  }

  /**
   * Inject trace context into carrier (for distributed tracing)
   */
  inject(carrier: Record<string, string>): void {
    if (!this.isEnabled || !this.tracer) return;

    const span = this.tracer.scope().active();
    if (span) {
      this.tracer.inject(span, 'http_headers', carrier);
    }
  }

  /**
   * Extract trace context from carrier
   */
  extract(carrier: Record<string, string>): any {
    if (!this.isEnabled || !this.tracer) return null;

    return this.tracer.extract('http_headers', carrier);
  }

  /**
   * Create a metric
   */
  incrementMetric(name: string, value: number = 1, tags?: SpanTags): void {
    if (!this.isEnabled || !this.tracer) return;

    const metrics = this.tracer.dogstatsd;
    if (metrics) {
      metrics.increment(name, value, tags);
    }
  }

  /**
   * Record a gauge metric
   */
  gaugeMetric(name: string, value: number, tags?: SpanTags): void {
    if (!this.isEnabled || !this.tracer) return;

    const metrics = this.tracer.dogstatsd;
    if (metrics) {
      metrics.gauge(name, value, tags);
    }
  }

  /**
   * Record a histogram metric
   */
  histogramMetric(name: string, value: number, tags?: SpanTags): void {
    if (!this.isEnabled || !this.tracer) return;

    const metrics = this.tracer.dogstatsd;
    if (metrics) {
      metrics.histogram(name, value, tags);
    }
  }

  /**
   * Check if Datadog is enabled
   */
  isDatadogEnabled(): boolean {
    return this.isEnabled;
  }
}
