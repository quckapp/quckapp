import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

export interface ValidationErrorResponse {
  success: false;
  statusCode: 400;
  error: 'Validation Error';
  message: string;
  errors: ValidationFieldError[];
  path: string;
  timestamp: string;
}

export interface ValidationFieldError {
  field: string;
  value: any;
  constraints: string[];
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const exceptionResponse = exception.getResponse() as any;

    // Check if this is a validation error from class-validator
    if (this.isValidationError(exceptionResponse)) {
      const validationErrors = this.formatValidationErrors(exceptionResponse.message);

      const errorResponse: ValidationErrorResponse = {
        success: false,
        statusCode: 400,
        error: 'Validation Error',
        message: 'Request validation failed',
        errors: validationErrors,
        path: request.url,
        timestamp: new Date().toISOString(),
      };

      this.logger.warn(
        `Validation failed for ${request.method} ${request.url}: ${JSON.stringify(validationErrors)}`,
      );

      return response.status(400).json(errorResponse);
    }

    // For non-validation BadRequest errors, pass through to default handling
    const errorResponse = {
      success: false,
      statusCode: 400,
      error: 'Bad Request',
      message: exceptionResponse.message || exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(400).json(errorResponse);
  }

  private isValidationError(response: any): boolean {
    return (
      response &&
      Array.isArray(response.message) &&
      response.message.length > 0 &&
      typeof response.message[0] === 'string'
    );
  }

  private formatValidationErrors(messages: string[]): ValidationFieldError[] {
    const errorMap = new Map<string, ValidationFieldError>();

    for (const message of messages) {
      // Try to extract field name from common validation message patterns
      const fieldMatch = message.match(/^(\w+)\s/);
      const field = fieldMatch ? fieldMatch[1] : 'unknown';

      if (errorMap.has(field)) {
        errorMap.get(field)!.constraints.push(message);
      } else {
        errorMap.set(field, {
          field,
          value: undefined,
          constraints: [message],
        });
      }
    }

    return Array.from(errorMap.values());
  }
}
