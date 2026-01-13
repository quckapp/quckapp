import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Attach request ID to request object for use in other parts of the app
    (request as any).requestId = requestId;

    // Set request ID header
    response.setHeader('X-Request-Id', requestId);

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = (request as any).user?.userId;
    const clientIp = (request as any).clientIp || ip;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;
        const contentLength = response.get('content-length');

        this.logger.logRequest({
          method,
          url,
          statusCode,
          duration,
          ip: clientIp,
          userAgent,
          userId,
          requestId,
          contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.logger.logRequest({
          method,
          url,
          statusCode,
          duration,
          ip: clientIp,
          userAgent,
          userId,
          requestId,
        });

        this.logger.error(`Request failed: ${error.message}`, {
          requestId,
          method,
          url,
          statusCode,
          stack: error.stack,
          userId,
          ip: clientIp,
        });

        throw error;
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Performance Interceptor
 * Logs slow requests and adds timing headers
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly slowThreshold: number;

  constructor(
    private logger: LoggerService,
    slowThresholdMs: number = 1000,
  ) {
    this.slowThreshold = slowThresholdMs;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        // Add server timing header
        response.setHeader('Server-Timing', `total;dur=${duration}`);
        response.setHeader('X-Response-Time', `${duration}ms`);

        // Log slow requests
        if (duration > this.slowThreshold) {
          this.logger.warn(`Slow request detected: ${request.method} ${request.url}`, {
            context: 'Performance',
            duration,
            threshold: this.slowThreshold,
            method: request.method,
            url: request.url,
            requestId: (request as any).requestId,
          });
        }
      }),
    );
  }
}

/**
 * User Activity Interceptor
 * Logs user activities for analytics
 */
@Injectable()
export class UserActivityInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as any).user?.userId;

    if (!userId) {
      return next.handle();
    }

    const action = this.getActionFromRequest(request);

    return next.handle().pipe(
      tap(() => {
        this.logger.debug(`User activity: ${action}`, {
          context: 'UserActivity',
          type: 'activity',
          userId,
          action,
          method: request.method,
          url: request.url,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }

  private getActionFromRequest(request: Request): string {
    const { method, url } = request;
    const path = url.split('?')[0];

    // Map common routes to readable actions
    if (path.includes('/messages')) {
      if (method === 'POST') {
        return 'sent_message';
      }
      if (method === 'DELETE') {
        return 'deleted_message';
      }
      if (method === 'GET') {
        return 'viewed_messages';
      }
    }

    if (path.includes('/conversations')) {
      if (method === 'POST') {
        return 'created_conversation';
      }
      if (method === 'GET') {
        return 'viewed_conversations';
      }
    }

    if (path.includes('/auth')) {
      if (path.includes('login')) {
        return 'login';
      }
      if (path.includes('logout')) {
        return 'logout';
      }
      if (path.includes('register')) {
        return 'register';
      }
    }

    if (path.includes('/users')) {
      if (method === 'PUT' || method === 'PATCH') {
        return 'updated_profile';
      }
      if (method === 'GET') {
        return 'viewed_profile';
      }
    }

    return `${method.toLowerCase()}_${path.replace(/\//g, '_').substring(1)}`;
  }
}
