import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import { LogMetadata } from './logger.service';

/**
 * Pino Logger Configuration
 *
 * High-performance JSON logger using Pino.
 * Pino is significantly faster than Winston for high-throughput applications.
 *
 * Features:
 * - Extremely fast logging (10x faster than Winston)
 * - Low overhead JSON serialization
 * - Child loggers for context isolation
 * - Redaction of sensitive fields
 * - Pretty printing in development (via pino-pretty)
 */

/**
 * Pino logger configuration options
 */
export interface PinoLoggerOptions {
  /** Service name for log identification */
  serviceName?: string;
  /** Log level */
  level?: string;
  /** Enable pretty printing (development) */
  prettyPrint?: boolean;
  /** Fields to redact from logs */
  redactFields?: string[];
  /** Custom serializers */
  serializers?: Record<string, (value: any) => any>;
  /** Enable request ID tracking */
  enableRequestId?: boolean;
}

/**
 * Default fields to redact from logs
 */
const DEFAULT_REDACT_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
  'apiKey',
  'privateKey',
  'creditCard',
  'ssn',
  '*.password',
  '*.token',
  '*.secret',
  'headers.authorization',
  'headers.cookie',
  'body.password',
  'body.token',
];

/**
 * Custom serializers for common objects
 */
const defaultSerializers = {
  err: pino.stdSerializers.err,
  req: (req: any) => ({
    method: req.method,
    url: req.url,
    headers: {
      host: req.headers?.host,
      'user-agent': req.headers?.['user-agent'],
      'content-type': req.headers?.['content-type'],
      'content-length': req.headers?.['content-length'],
    },
    remoteAddress: req.socket?.remoteAddress,
    remotePort: req.socket?.remotePort,
  }),
  res: (res: any) => ({
    statusCode: res.statusCode,
    headers: {
      'content-type': res.getHeader?.('content-type'),
      'content-length': res.getHeader?.('content-length'),
    },
  }),
};

/**
 * Build Pino logger options
 */
export function buildPinoOptions(options: PinoLoggerOptions = {}): LoggerOptions {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const {
    serviceName = process.env.SERVICE_NAME || 'quckchat-backend',
    level = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    prettyPrint = isDevelopment,
    redactFields = DEFAULT_REDACT_FIELDS,
    serializers = {},
  } = options;

  const pinoOptions: LoggerOptions = {
    name: serviceName,
    level,
    serializers: {
      ...defaultSerializers,
      ...serializers,
    },
    redact: {
      paths: redactFields,
      censor: '[REDACTED]',
    },
    base: {
      service: serviceName,
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
      }),
    },
  };

  // Add pretty printing transport for development
  if (prettyPrint) {
    pinoOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{context} - {msg}',
        errorLikeObjectKeys: ['err', 'error'],
      },
    };
  }

  return pinoOptions;
}

@Injectable()
export class PinoLoggerService implements NestLoggerService {
  private logger: PinoLogger;
  private context?: string;
  private static instance: PinoLoggerService;

  constructor(options?: PinoLoggerOptions) {
    this.logger = pino(buildPinoOptions(options));
    PinoLoggerService.instance = this;
  }

  static getInstance(): PinoLoggerService {
    if (!PinoLoggerService.instance) {
      PinoLoggerService.instance = new PinoLoggerService();
    }
    return PinoLoggerService.instance;
  }

  /**
   * Set logging context
   */
  setContext(context: string): this {
    this.context = context;
    return this;
  }

  /**
   * Create a child logger with preset context
   */
  child(context: string, bindings?: Record<string, any>): PinoLoggerService {
    const childService = Object.create(this);
    childService.logger = this.logger.child({ context, ...bindings });
    childService.context = context;
    return childService;
  }

  // Standard NestJS logger methods
  log(message: string, context?: string | LogMetadata) {
    const meta = this.buildMeta(context);
    this.logger.info(meta, message);
  }

  error(message: string, trace?: string | LogMetadata, context?: string) {
    const meta =
      typeof trace === 'string'
        ? { stack: trace, context: context || this.context }
        : { context: this.context, ...trace };
    this.logger.error(meta, message);
  }

  warn(message: string, context?: string | LogMetadata) {
    const meta = this.buildMeta(context);
    this.logger.warn(meta, message);
  }

  debug(message: string, context?: string | LogMetadata) {
    const meta = this.buildMeta(context);
    this.logger.debug(meta, message);
  }

  verbose(message: string, context?: string | LogMetadata) {
    const meta = this.buildMeta(context);
    this.logger.trace(meta, message);
  }

  // Extended logging methods
  fatal(message: string, meta?: LogMetadata) {
    this.logger.fatal({ context: this.context, ...meta }, message);
  }

  trace(message: string, meta?: LogMetadata) {
    this.logger.trace({ context: this.context, ...meta }, message);
  }

  /**
   * Log HTTP request
   */
  logRequest(meta: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
    requestId?: string;
    contentLength?: number;
  }) {
    const logFn =
      meta.statusCode >= 500
        ? this.logger.error
        : meta.statusCode >= 400
          ? this.logger.warn
          : this.logger.info;

    logFn.call(
      this.logger,
      {
        context: 'HTTP',
        type: 'request',
        ...meta,
      },
      `${meta.method} ${meta.url} ${meta.statusCode} - ${meta.duration}ms`,
    );
  }

  /**
   * Log security audit event
   */
  audit(
    action: string,
    meta: {
      userId?: string;
      ip?: string;
      resource?: string;
      details?: any;
      success: boolean;
    },
  ) {
    this.logger.info(
      {
        context: 'Audit',
        type: 'audit',
        action,
        ...meta,
      },
      `AUDIT: ${action}`,
    );
  }

  /**
   * Log performance metric
   */
  logPerformance(operation: string, duration: number, meta?: LogMetadata) {
    const logFn =
      duration > 5000
        ? this.logger.warn
        : duration > 1000
          ? this.logger.info
          : this.logger.debug;

    logFn.call(
      this.logger,
      {
        context: 'Performance',
        type: 'performance',
        operation,
        duration,
        ...meta,
      },
      `Performance: ${operation} took ${duration}ms`,
    );
  }

  /**
   * Log database query
   */
  logQuery(query: string, duration: number, meta?: { collection?: string; operation?: string }) {
    const logFn = duration > 1000 ? this.logger.warn : this.logger.debug;
    logFn.call(
      this.logger,
      {
        context: 'Database',
        type: 'query',
        duration,
        ...meta,
      },
      `DB Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`,
    );
  }

  /**
   * Log WebSocket event
   */
  logWebSocket(event: string, meta?: { userId?: string; room?: string; data?: any }) {
    this.logger.debug(
      {
        context: 'WebSocket',
        type: 'websocket',
        event,
        ...meta,
      },
      `WebSocket: ${event}`,
    );
  }

  /**
   * Log external service call
   */
  logExternalCall(
    service: string,
    endpoint: string,
    duration: number,
    success: boolean,
    meta?: any,
  ) {
    const logFn = !success
      ? this.logger.error
      : duration > 3000
        ? this.logger.warn
        : this.logger.debug;

    logFn.call(
      this.logger,
      {
        context: 'External',
        type: 'external',
        service,
        endpoint,
        duration,
        success,
        ...meta,
      },
      `External: ${service} ${endpoint} - ${success ? 'success' : 'failed'} (${duration}ms)`,
    );
  }

  /**
   * Start a timer for measuring duration
   */
  startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => Number(process.hrtime.bigint() - start) / 1_000_000;
  }

  /**
   * Get the underlying Pino logger
   */
  getPinoLogger(): PinoLogger {
    return this.logger;
  }

  /**
   * Flush any buffered logs (useful before shutdown)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.flush();
      resolve();
    });
  }

  private buildMeta(context?: string | LogMetadata): Record<string, any> {
    if (typeof context === 'string') {
      return { context };
    }
    return { context: this.context, ...context };
  }
}

/**
 * Create a pre-configured Pino logger instance
 */
export function createPinoLogger(options?: PinoLoggerOptions): PinoLoggerService {
  return new PinoLoggerService(options);
}

/**
 * Pino HTTP logger middleware options
 */
export const pinoHttpOptions = {
  logger: pino(buildPinoOptions()),
  autoLogging: {
    ignore: (req: any) => {
      // Skip health check endpoints
      return req.url === '/health' || req.url === '/api/v1/health';
    },
  },
  customProps: (req: any) => ({
    context: 'HTTP',
    requestId: req.id || req.headers['x-request-id'],
    userId: req.user?.id,
  }),
  customLogLevel: (req: any, res: any, err: any) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req: any, res: any) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req: any, res: any, err: any) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err?.message || 'Error'}`;
  },
};
