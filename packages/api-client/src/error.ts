import type { components } from './generated/schema';

type ApiError = components['schemas']['Error'];

/**
 * Custom error class for QuikApp API errors
 */
export class QuikAppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: ApiError['error']['details'];
  public readonly requestId?: string;
  public readonly documentation?: string;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: ApiError['error']['details'],
    requestId?: string,
    documentation?: string
  ) {
    super(message);
    this.name = 'QuikAppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
    this.documentation = documentation;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QuikAppError);
    }
  }

  /**
   * Create a QuikAppError from an API error response
   */
  static fromResponse(response: ApiError, status: number): QuikAppError {
    return new QuikAppError(
      response.error.message,
      response.error.code,
      status,
      response.error.details,
      response.error.requestId,
      response.error.documentation
    );
  }

  /**
   * Check if this is a specific error code
   */
  is(code: string): boolean {
    return this.code === code;
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if this is an authentication error
   */
  isUnauthorized(): boolean {
    return this.code === 'UNAUTHORIZED' || this.status === 401;
  }

  /**
   * Check if this is a forbidden error
   */
  isForbidden(): boolean {
    return this.code === 'FORBIDDEN' || this.status === 403;
  }

  /**
   * Check if this is a not found error
   */
  isNotFound(): boolean {
    return this.code === 'NOT_FOUND' || this.status === 404;
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimited(): boolean {
    return this.code === 'RATE_LIMITED' || this.status === 429;
  }

  /**
   * Get validation errors for a specific field
   */
  getFieldErrors(field: string): string[] {
    if (!this.details) return [];
    return this.details
      .filter((d) => d.field === field)
      .map((d) => d.message)
      .filter((m): m is string => m !== undefined);
  }

  /**
   * Get all field errors as a map
   */
  getFieldErrorsMap(): Record<string, string[]> {
    if (!this.details) return {};
    return this.details.reduce(
      (acc, detail) => {
        if (detail.field && detail.message) {
          acc[detail.field] = acc[detail.field] || [];
          acc[detail.field].push(detail.message);
        }
        return acc;
      },
      {} as Record<string, string[]>
    );
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      requestId: this.requestId,
      documentation: this.documentation,
    };
  }
}

/**
 * Type guard to check if an error is a QuikAppError
 */
export function isQuikAppError(error: unknown): error is QuikAppError {
  return error instanceof QuikAppError;
}

/**
 * Error codes
 */
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
