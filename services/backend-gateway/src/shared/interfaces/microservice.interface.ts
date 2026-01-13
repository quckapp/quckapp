/**
 * Shared Microservice Interfaces
 * These interfaces ensure consistency across all microservices
 */

import { ServiceName } from '../constants/services';

/**
 * Standard service response wrapper
 */
export interface IServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IServiceError;
  metadata?: IResponseMetadata;
}

/**
 * Service error structure
 */
export interface IServiceError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

/**
 * Response metadata
 */
export interface IResponseMetadata {
  timestamp: Date;
  requestId?: string;
  service: ServiceName | string;
  duration?: number;
  version?: string;
}

/**
 * Pagination request
 */
export interface IPaginationRequest {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination response
 */
export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  limit: number;
  offset?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  hasMore?: boolean;
}

/**
 * Base entity with common fields
 */
export interface IBaseEntity {
  _id?: string;
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User reference (for cross-service communication)
 */
export interface IUserReference {
  userId: string;
  displayName?: string;
  avatar?: string;
  phoneNumber?: string;
}

/**
 * Event payload for inter-service events
 */
export interface IServiceEvent<T = any> {
  eventType: string;
  payload: T;
  source: ServiceName | string;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Health check response
 */
export interface IHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  uptime: number;
  timestamp: Date;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
  }[];
}

/**
 * Service configuration
 */
export interface IServiceConfig {
  name: ServiceName;
  version: string;
  tcpPort: number;
  httpPort?: number;
  mongoUri?: string;
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
  };
}

/**
 * Request context passed between services
 */
export interface IRequestContext {
  userId?: string;
  requestId: string;
  correlationId?: string;
  clientIp?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Bulk operation result
 */
export interface IBulkOperationResult {
  successful: number;
  failed: number;
  errors: { id: string; error: string }[];
}
