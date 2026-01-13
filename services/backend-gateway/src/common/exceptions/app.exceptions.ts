import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly errorCode?: string,
  ) {
    super(
      {
        message,
        error: errorCode || 'Application Error',
        statusCode,
      },
      statusCode,
    );
  }
}

// Authentication & Authorization Exceptions
export class InvalidCredentialsException extends AppException {
  constructor(message: string = 'Invalid credentials provided') {
    super(message, HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }
}

export class TokenExpiredException extends AppException {
  constructor(message: string = 'Token has expired') {
    super(message, HttpStatus.UNAUTHORIZED, 'TOKEN_EXPIRED');
  }
}

export class InvalidTokenException extends AppException {
  constructor(message: string = 'Invalid token') {
    super(message, HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN');
  }
}

export class InsufficientPermissionsException extends AppException {
  constructor(message: string = 'Insufficient permissions') {
    super(message, HttpStatus.FORBIDDEN, 'INSUFFICIENT_PERMISSIONS');
  }
}

export class TwoFactorRequiredException extends AppException {
  constructor(message: string = 'Two-factor authentication required') {
    super(message, HttpStatus.UNAUTHORIZED, 'TWO_FACTOR_REQUIRED');
  }
}

// Resource Exceptions
export class ResourceNotFoundException extends AppException {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, HttpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND');
  }
}

export class ResourceAlreadyExistsException extends AppException {
  constructor(resource: string, field?: string) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(message, HttpStatus.CONFLICT, 'RESOURCE_EXISTS');
  }
}

// User Exceptions
export class UserNotFoundException extends ResourceNotFoundException {
  constructor(id?: string) {
    super('User', id);
  }
}

export class UserBannedException extends AppException {
  constructor(message: string = 'Your account has been banned') {
    super(message, HttpStatus.FORBIDDEN, 'USER_BANNED');
  }
}

export class UserDeactivatedException extends AppException {
  constructor(message: string = 'Your account has been deactivated') {
    super(message, HttpStatus.FORBIDDEN, 'USER_DEACTIVATED');
  }
}

// Conversation Exceptions
export class ConversationNotFoundException extends ResourceNotFoundException {
  constructor(id?: string) {
    super('Conversation', id);
  }
}

export class NotConversationParticipantException extends AppException {
  constructor(message: string = 'You are not a participant of this conversation') {
    super(message, HttpStatus.FORBIDDEN, 'NOT_PARTICIPANT');
  }
}

export class NotConversationAdminException extends AppException {
  constructor(message: string = 'Only admins can perform this action') {
    super(message, HttpStatus.FORBIDDEN, 'NOT_ADMIN');
  }
}

// Message Exceptions
export class MessageNotFoundException extends ResourceNotFoundException {
  constructor(id?: string) {
    super('Message', id);
  }
}

export class MessageNotEditableException extends AppException {
  constructor(message: string = 'This message cannot be edited') {
    super(message, HttpStatus.FORBIDDEN, 'MESSAGE_NOT_EDITABLE');
  }
}

export class MessageNotDeletableException extends AppException {
  constructor(message: string = 'This message cannot be deleted') {
    super(message, HttpStatus.FORBIDDEN, 'MESSAGE_NOT_DELETABLE');
  }
}

// Rate Limiting Exceptions
export class RateLimitExceededException extends AppException {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED');
  }
}

// File Upload Exceptions
export class FileTooLargeException extends AppException {
  constructor(maxSize: string = '10MB') {
    super(
      `File size exceeds maximum allowed size of ${maxSize}`,
      HttpStatus.BAD_REQUEST,
      'FILE_TOO_LARGE',
    );
  }
}

export class InvalidFileTypeException extends AppException {
  constructor(allowedTypes: string[] = []) {
    const message = allowedTypes.length
      ? `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      : 'Invalid file type';
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_FILE_TYPE');
  }
}

// Poll Exceptions
export class PollNotFoundException extends ResourceNotFoundException {
  constructor(id?: string) {
    super('Poll', id);
  }
}

export class PollClosedException extends AppException {
  constructor(message: string = 'This poll is closed') {
    super(message, HttpStatus.FORBIDDEN, 'POLL_CLOSED');
  }
}

export class PollExpiredException extends AppException {
  constructor(message: string = 'This poll has expired') {
    super(message, HttpStatus.FORBIDDEN, 'POLL_EXPIRED');
  }
}

// Scheduled Message Exceptions
export class ScheduledMessageNotFoundException extends ResourceNotFoundException {
  constructor(id?: string) {
    super('Scheduled message', id);
  }
}

export class InvalidScheduleTimeException extends AppException {
  constructor(message: string = 'Scheduled time must be in the future') {
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_SCHEDULE_TIME');
  }
}

// WebSocket Exceptions
export class WebSocketException extends AppException {
  constructor(message: string, errorCode: string = 'WEBSOCKET_ERROR') {
    super(message, HttpStatus.BAD_REQUEST, errorCode);
  }
}

export class WebSocketAuthenticationException extends WebSocketException {
  constructor(message: string = 'WebSocket authentication failed') {
    super(message, 'WEBSOCKET_AUTH_FAILED');
  }
}
