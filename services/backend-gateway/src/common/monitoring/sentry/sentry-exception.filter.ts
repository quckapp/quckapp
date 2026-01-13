import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { SentryService } from './sentry.service';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(private readonly sentryService: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Determine status code
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only report server errors (5xx) to Sentry
    if (status >= 500) {
      const error = exception instanceof Error ? exception : new Error(String(exception));

      this.sentryService.captureException(error, {
        user: request.user
          ? {
              id: request.user.userId,
              email: request.user.email,
            }
          : undefined,
        tags: {
          url: request.url,
          method: request.method,
          status_code: status.toString(),
        },
        extra: {
          body: request.body,
          query: request.query,
          params: request.params,
          headers: this.sanitizeHeaders(request.headers),
        },
      });
    }

    // Format error response
    const errorResponse = this.formatErrorResponse(exception, status);

    response.status(status).json(errorResponse);
  }

  private formatErrorResponse(exception: unknown, status: number) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object') {
        return response;
      }
      return {
        statusCode: status,
        message: response,
        error: HttpStatus[status],
      };
    }

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: status,
      message: isProduction ? 'Internal server error' : (exception as Error)?.message,
      error: HttpStatus[status],
      ...(isProduction ? {} : { stack: (exception as Error)?.stack }),
    };
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
