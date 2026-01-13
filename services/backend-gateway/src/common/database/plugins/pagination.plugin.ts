import { Schema, Document, Model } from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Type definitions for mongoose-paginate-v2
 */
export interface PaginateResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  page?: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage?: number | null;
  prevPage?: number | null;
  pagingCounter: number;
  meta?: any;
}

export interface PaginateModel<T> extends Model<T> {
  paginate(
    query?: Record<string, any>,
    options?: MongoosePaginateOptions,
    callback?: (err: any, result: PaginateResult<T>) => void,
  ): Promise<PaginateResult<T>>;
}

/**
 * Pagination Plugin Configuration
 *
 * This plugin provides robust and efficient pagination logic directly into
 * Mongoose queries, essential for handling large datasets in enterprise UIs.
 *
 * Usage:
 * ```typescript
 * // In your schema
 * schema.plugin(mongoosePaginate);
 *
 * // In your service
 * const result = await Model.paginate(
 *   { status: 'active' },
 *   { page: 1, limit: 20, sort: { createdAt: -1 } }
 * );
 * ```
 */

/**
 * Extended paginate options with common defaults
 * Note: Named MongoosePaginateOptions to avoid conflict with base repository
 */
export interface MongoosePaginateOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Sort order (e.g., { createdAt: -1 }) */
  sort?: Record<string, 1 | -1 | 'asc' | 'desc'>;
  /** Fields to select */
  select?: string | Record<string, 1 | 0>;
  /** Population options */
  populate?: string | string[] | Record<string, any> | Array<Record<string, any>>;
  /** Enable lean queries for better performance */
  lean?: boolean;
  /** Custom labels for pagination result */
  customLabels?: PaginationLabels;
  /** Collation for string comparison */
  collation?: Record<string, any>;
  /** Allow disk use for large sorts */
  allowDiskUse?: boolean;
}

/**
 * Custom labels for pagination result
 */
export interface PaginationLabels {
  docs?: string;
  totalDocs?: string;
  limit?: string;
  page?: string;
  totalPages?: string;
  hasNextPage?: string;
  hasPrevPage?: string;
  nextPage?: string;
  prevPage?: string;
  pagingCounter?: string;
}

/**
 * Pagination result interface from mongoose-paginate-v2
 * Note: Named MongoosePaginatedResult to avoid conflict with base repository
 */
export interface MongoosePaginatedResult<T> {
  /** Array of documents */
  docs: T[];
  /** Total number of documents matching the query */
  totalDocs: number;
  /** Number of items per page */
  limit: number;
  /** Current page number */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPrevPage: boolean;
  /** Next page number (null if no next page) */
  nextPage: number | null;
  /** Previous page number (null if no previous page) */
  prevPage: number | null;
  /** The starting index of the first document on the current page */
  pagingCounter: number;
}

/**
 * API-friendly pagination response
 */
export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Default pagination options
 */
export const DEFAULT_PAGINATION_OPTIONS: MongoosePaginateOptions = {
  page: 1,
  limit: 20,
  lean: true,
  allowDiskUse: true,
  customLabels: {
    docs: 'docs',
    totalDocs: 'totalDocs',
    limit: 'limit',
    page: 'page',
    totalPages: 'totalPages',
    hasNextPage: 'hasNextPage',
    hasPrevPage: 'hasPrevPage',
    nextPage: 'nextPage',
    prevPage: 'prevPage',
    pagingCounter: 'pagingCounter',
  },
};

/**
 * Apply the pagination plugin to a schema
 */
export function applyPaginationPlugin(schema: Schema): void {
  schema.plugin(mongoosePaginate);
}

/**
 * Create pagination options from query parameters
 *
 * @param query - Query parameters from the request
 * @param defaults - Default options to merge
 */
export function createPaginationOptions(
  query: {
    page?: string | number;
    limit?: string | number;
    sort?: string;
    sortOrder?: 'asc' | 'desc';
    select?: string;
  },
  defaults?: Partial<MongoosePaginateOptions>,
): MongoosePaginateOptions {
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20), 10)));

  let sort: Record<string, 1 | -1> | undefined;
  if (query.sort) {
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    sort = { [query.sort]: sortOrder };
  }

  return {
    ...DEFAULT_PAGINATION_OPTIONS,
    ...defaults,
    page,
    limit,
    sort: sort || defaults?.sort,
    select: query.select || defaults?.select,
  };
}

/**
 * Transform mongoose-paginate-v2 result to API-friendly format
 */
export function transformPaginationResult<T>(
  result: PaginateResult<T>,
): PaginationResponse<T> {
  return {
    data: result.docs,
    pagination: {
      currentPage: result.page || 1,
      totalPages: result.totalPages,
      totalItems: result.totalDocs,
      itemsPerPage: result.limit,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    },
  };
}

/**
 * Pagination query DTO for use with NestJS validation
 */
export class PaginationQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
  select?: string;
  search?: string;
}

/**
 * Create a validated pagination query from request
 */
export function validatePaginationQuery(query: Record<string, any>): PaginationQueryDto {
  return {
    page: query.page ? Math.max(1, parseInt(query.page, 10)) : 1,
    limit: query.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 20,
    sort: query.sort || 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
    select: query.select,
    search: query.search,
  };
}

/**
 * Cursor-based pagination options (alternative to offset pagination)
 */
export interface CursorPaginationOptions {
  /** Number of items per page */
  limit?: number;
  /** Cursor for the next page (typically last item's _id or timestamp) */
  after?: string;
  /** Cursor for the previous page */
  before?: string;
  /** Sort field */
  sortField?: string;
  /** Sort direction */
  sortDirection?: 1 | -1;
}

/**
 * Cursor-based pagination result
 */
export interface CursorPaginatedResult<T> {
  docs: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

/**
 * Build cursor-based pagination query
 *
 * @param options - Cursor pagination options
 * @param sortField - Field to sort by (default: _id)
 */
export function buildCursorQuery(
  options: CursorPaginationOptions,
  sortField: string = '_id',
): { query: Record<string, any>; sort: Record<string, 1 | -1> } {
  const direction = options.sortDirection || -1;
  const query: Record<string, any> = {};
  const sort: Record<string, 1 | -1> = { [sortField]: direction };

  if (options.after) {
    query[sortField] = direction === -1 ? { $lt: options.after } : { $gt: options.after };
  } else if (options.before) {
    query[sortField] = direction === -1 ? { $gt: options.before } : { $lt: options.before };
  }

  return { query, sort };
}

/**
 * Pagination presets for common use cases
 */
export const PAGINATION_PRESETS = {
  /** Small pages for mobile/lightweight views */
  SMALL: { limit: 10, lean: true },
  /** Medium pages for standard list views */
  MEDIUM: { limit: 20, lean: true },
  /** Large pages for admin/export views */
  LARGE: { limit: 50, lean: true },
  /** Extra large for bulk operations */
  XLARGE: { limit: 100, lean: true, allowDiskUse: true },
};

/**
 * Type helper for paginated model (use the PaginateModel interface exported above)
 */
export type PaginatedModelType<T extends Document> = Model<T> & PaginateModel<T>;
