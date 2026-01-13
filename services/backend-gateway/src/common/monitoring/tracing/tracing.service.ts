import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { context, Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

@Injectable()
export class TracingService {
  private tracer;
  private isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = !!this.configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT');
    this.tracer = trace.getTracer('quickchat-backend');
  }

  /**
   * Start a new span for tracing
   */
  startSpan(name: string, options?: { kind?: SpanKind; attributes?: Record<string, any> }): Span {
    return this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
    });
  }

  /**
   * Run a function within a traced span
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: { kind?: SpanKind; attributes?: Record<string, any> },
  ): Promise<T> {
    if (!this.isEnabled) {
      return fn({} as Span);
    }

    const span = this.startSpan(name, options);

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add an event to the current span
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    if (!this.isEnabled) {
      return;
    }

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  /**
   * Set attributes on the current span
   */
  setSpanAttributes(attributes: Record<string, any>): void {
    if (!this.isEnabled) {
      return;
    }

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  /**
   * Set status on the current span
   */
  setSpanStatus(code: SpanStatusCode, message?: string): void {
    if (!this.isEnabled) {
      return;
    }

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setStatus({ code, message });
    }
  }

  /**
   * Record an exception on the current span
   */
  recordException(error: Error): void {
    if (!this.isEnabled) {
      return;
    }

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.recordException(error);
      currentSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  /**
   * Get the current trace ID
   */
  getTraceId(): string | undefined {
    if (!this.isEnabled) {
      return undefined;
    }

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      return currentSpan.spanContext().traceId;
    }
    return undefined;
  }

  /**
   * Get the current span ID
   */
  getSpanId(): string | undefined {
    if (!this.isEnabled) {
      return undefined;
    }

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      return currentSpan.spanContext().spanId;
    }
    return undefined;
  }

  /**
   * Check if tracing is enabled
   */
  isTracingEnabled(): boolean {
    return this.isEnabled;
  }
}
