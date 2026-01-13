/**
 * Service Response Utility
 * Helper functions for creating standardized service responses
 */

import {
  IResponseMetadata,
  IServiceError,
  IServiceResponse,
} from '../interfaces/microservice.interface';
import { ServiceName } from '../constants/services';

/**
 * Create a successful service response
 */
export function successResponse<T>(
  data: T,
  service: ServiceName | string,
  requestId?: string,
): IServiceResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date(),
      service,
      requestId,
    },
  };
}

/**
 * Create an error service response
 */
export function errorResponse(
  code: string,
  message: string,
  service: ServiceName | string,
  details?: any,
): IServiceResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date(),
      service,
    },
  };
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  service: ServiceName | string,
): IServiceResponse<{
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data: {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    metadata: {
      timestamp: new Date(),
      service,
    },
  };
}

/**
 * Standard error codes
 */
export const ERROR_CODES = {
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',

  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_RATE_LIMITED: 'OTP_RATE_LIMITED',
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
  TWO_FACTOR_INVALID: 'TWO_FACTOR_INVALID',

  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_BANNED: 'USER_BANNED',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  PHONE_TAKEN: 'PHONE_TAKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',

  // Conversation errors
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  NOT_PARTICIPANT: 'NOT_PARTICIPANT',
  NOT_ADMIN: 'NOT_ADMIN',

  // Message errors
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  CANNOT_EDIT: 'CANNOT_EDIT',
  CANNOT_DELETE: 'CANNOT_DELETE',

  // Call errors
  CALL_NOT_FOUND: 'CALL_NOT_FOUND',
  CALL_ENDED: 'CALL_ENDED',
  CALL_BUSY: 'CALL_BUSY',

  // Media errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
