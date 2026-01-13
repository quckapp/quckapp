import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

// Custom log levels with priorities
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    debug: 5,
    verbose: 6,
    silly: 7,
  },
  colors: {
    fatal: 'magenta',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'cyan',
    debug: 'blue',
    verbose: 'gray',
    silly: 'grey',
  },
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Log metadata interface
export interface LogMetadata {
  context?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  error?: Error;
  stack?: string;
  [key: string]: any;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;
  private static instance: LoggerService;

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const logDir = process.env.LOG_DIRECTORY || 'logs';

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, context, requestId, ...meta }) => {
        const ctx = context || this.context || 'Application';
        const reqId = requestId ? `[${requestId}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${reqId} [${ctx}] ${level}: ${message}${metaStr}`;
      }),
    );

    // JSON format for production (better for log aggregation tools)
    const jsonFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: isDevelopment ? consoleFormat : jsonFormat,
        level: isDevelopment ? 'debug' : 'info',
      }),
    ];

    // File transports for production
    if (!isDevelopment) {
      // Combined log (all levels)
      transports.push(
        new DailyRotateFile({
          dirname: path.join(logDir, 'combined'),
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '30d',
          format: jsonFormat,
          zippedArchive: true,
        }),
      );

      // Error log (error and fatal only)
      transports.push(
        new DailyRotateFile({
          dirname: path.join(logDir, 'error'),
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '50m',
          maxFiles: '90d', // Keep error logs longer
          format: jsonFormat,
          zippedArchive: true,
        }),
      );

      // HTTP access log
      transports.push(
        new DailyRotateFile({
          dirname: path.join(logDir, 'access'),
          filename: 'access-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'http',
          maxSize: '100m',
          maxFiles: '14d',
          format: jsonFormat,
          zippedArchive: true,
        }),
      );

      // Audit log for security events
      transports.push(
        new DailyRotateFile({
          dirname: path.join(logDir, 'audit'),
          filename: 'audit-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'info',
          maxSize: '50m',
          maxFiles: '365d', // Keep audit logs for 1 year
          format: jsonFormat,
          zippedArchive: true,
        }),
      );
    }

    this.logger = winston.createLogger({
      levels: customLevels.levels,
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      defaultMeta: {
        service: process.env.SERVICE_NAME || 'quckchat-backend',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
      },
      transports,
      exitOnError: false,
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({
        filename: path.join(logDir, 'exceptions.log'),
        format: jsonFormat,
      }),
    );

    LoggerService.instance = this;
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  // Standard NestJS logger methods
  log(message: string, context?: string | LogMetadata) {
    const meta = typeof context === 'string' ? { context } : context;
    this.logger.info(message, { context: this.context, ...meta });
  }

  error(message: string, trace?: string | LogMetadata, context?: string) {
    const meta =
      typeof trace === 'string'
        ? { stack: trace, context: context || this.context }
        : { context: this.context, ...trace };
    this.logger.error(message, meta);
  }

  warn(message: string, context?: string | LogMetadata) {
    const meta = typeof context === 'string' ? { context } : context;
    this.logger.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, context?: string | LogMetadata) {
    const meta = typeof context === 'string' ? { context } : context;
    this.logger.debug(message, { context: this.context, ...meta });
  }

  verbose(message: string, context?: string | LogMetadata) {
    const meta = typeof context === 'string' ? { context } : context;
    this.logger.verbose(message, { context: this.context, ...meta });
  }

  // Extended logging methods
  fatal(message: string, meta?: LogMetadata) {
    this.logger.log('fatal', message, { context: this.context, ...meta });
  }

  http(message: string, meta?: LogMetadata) {
    this.logger.http(message, { context: this.context, ...meta });
  }

  silly(message: string, meta?: LogMetadata) {
    this.logger.silly(message, { context: this.context, ...meta });
  }

  // HTTP request logging
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
    const level = meta.statusCode >= 500 ? 'error' : meta.statusCode >= 400 ? 'warn' : 'http';
    this.logger.log(level, `${meta.method} ${meta.url} ${meta.statusCode} - ${meta.duration}ms`, {
      context: 'HTTP',
      type: 'request',
      ...meta,
    });
  }

  // Security audit logging
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
    this.logger.info(`AUDIT: ${action}`, {
      context: 'Audit',
      type: 'audit',
      action,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, meta?: LogMetadata) {
    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
    this.logger.log(level, `Performance: ${operation} took ${duration}ms`, {
      context: 'Performance',
      type: 'performance',
      operation,
      duration,
      ...meta,
    });
  }

  // Database query logging
  logQuery(query: string, duration: number, meta?: { collection?: string; operation?: string }) {
    const level = duration > 1000 ? 'warn' : 'debug';
    this.logger.log(level, `DB Query: ${query.substring(0, 100)}...`, {
      context: 'Database',
      type: 'query',
      duration,
      ...meta,
    });
  }

  // WebSocket event logging
  logWebSocket(event: string, meta?: { userId?: string; room?: string; data?: any }) {
    this.logger.debug(`WebSocket: ${event}`, {
      context: 'WebSocket',
      type: 'websocket',
      event,
      ...meta,
    });
  }

  // External service call logging
  logExternalCall(
    service: string,
    endpoint: string,
    duration: number,
    success: boolean,
    meta?: any,
  ) {
    const level = !success ? 'error' : duration > 3000 ? 'warn' : 'debug';
    this.logger.log(
      level,
      `External: ${service} ${endpoint} - ${success ? 'success' : 'failed'} (${duration}ms)`,
      {
        context: 'External',
        type: 'external',
        service,
        endpoint,
        duration,
        success,
        ...meta,
      },
    );
  }

  // Create a child logger with preset context
  child(context: string): LoggerService {
    const childLogger = new LoggerService();
    childLogger.setContext(context);
    return childLogger;
  }

  // Get the underlying Winston logger (for advanced use)
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}
