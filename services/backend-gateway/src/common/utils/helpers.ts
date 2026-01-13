import {
  camelCase,
  capitalize,
  chunk,
  cloneDeep,
  compact,
  debounce,
  delay,
  difference,
  escape,
  flatten,
  flattenDeep,
  get,
  groupBy,
  has,
  intersection,
  isArray,
  isEmpty,
  isEqual,
  isFunction,
  isNil,
  isNumber,
  isObject,
  isString,
  kebabCase,
  keyBy,
  memoize,
  merge,
  omit,
  once,
  pick,
  random,
  range,
  sample,
  sampleSize,
  set,
  shuffle,
  snakeCase,
  sortBy,
  template,
  throttle,
  times,
  truncate,
  unescape,
  union,
  uniqBy,
  upperFirst,
} from 'lodash';

// Re-export lodash utilities
export {
  pick,
  omit,
  get,
  set,
  has,
  merge,
  cloneDeep,
  debounce,
  throttle,
  groupBy,
  keyBy,
  sortBy,
  uniqBy,
  chunk,
  flatten,
  flattenDeep,
  intersection,
  difference,
  union,
  compact,
  isEmpty,
  isEqual,
  isNil,
  isString,
  isNumber,
  isArray,
  isObject,
  isFunction,
  camelCase,
  snakeCase,
  kebabCase,
  upperFirst,
  capitalize,
  truncate,
  escape,
  unescape,
  template,
  random,
  sample,
  sampleSize,
  shuffle,
  range,
  times,
  memoize,
  once,
  delay,
};

/**
 * Custom utility functions built on top of lodash
 */

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Safely stringify JSON with fallback
 */
export function safeJsonStringify(obj: any, fallback: string = '{}'): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
}

/**
 * Pick only defined (non-null, non-undefined) properties
 */
export function pickDefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!isNil(value)) {
      (result as any)[key] = value;
    }
  }
  return result;
}

/**
 * Deep merge objects with array concatenation
 */
export function deepMerge<T extends object>(...objects: Partial<T>[]): T {
  return merge({}, ...objects) as T;
}

/**
 * Create a lookup map from array
 */
export function toLookup<T>(array: T[], key: keyof T): Map<any, T> {
  return new Map(array.map((item) => [item[key], item]));
}

/**
 * Paginate array
 */
export function paginate<T>(
  array: T[],
  page: number,
  pageSize: number,
): {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const total = array.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = array.slice(start, start + pageSize);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Group array by multiple keys
 */
export function groupByMultiple<T>(array: T[], keys: (keyof T)[]): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const key = keys.map((k) => String(item[k])).join(':');
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Transform object keys using a function
 */
export function transformKeys<T extends object>(
  obj: T,
  transformer: (key: string) => string,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = transformer(key);
    result[newKey] =
      isObject(value) && !isArray(value) ? transformKeys(value as object, transformer) : value;
  }
  return result;
}

/**
 * Convert object keys to camelCase recursively
 */
export function toCamelCase<T extends object>(obj: T): Record<string, any> {
  return transformKeys(obj, camelCase);
}

/**
 * Convert object keys to snake_case recursively
 */
export function toSnakeCase<T extends object>(obj: T): Record<string, any> {
  return transformKeys(obj, snakeCase);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    maxDelay?: number;
    backoff?: number;
    onRetry?: (error: any, attempt: number) => void;
  } = {},
): Promise<T> {
  const {
    retries = 3,
    delay: initialDelay = 1000,
    maxDelay = 30000,
    backoff = 2,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        const delayMs = Math.min(initialDelay * Math.pow(backoff, attempt), maxDelay);
        onRetry?.(error, attempt + 1);
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Create a timeout promise
 */
export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Run promises with concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const chunks = chunk(items, limit);

  for (const itemChunk of chunks) {
    const chunkResults = await Promise.all(
      itemChunk.map((item, i) => fn(item, results.length + i)),
    );
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Generate a random string
 */
export function randomString(length: number = 16, charset?: string): string {
  const chars = charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return times(length, () => chars[random(0, chars.length - 1)]).join('');
}

/**
 * Generate a random alphanumeric ID
 */
export function generateId(prefix?: string): string {
  const id = `${Date.now().toString(36)}${randomString(8).toLowerCase()}`;
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format milliseconds to human readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3600000) {
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Mask sensitive data
 */
export function maskString(str: string, visibleStart: number = 2, visibleEnd: number = 2): string {
  if (!str || str.length <= visibleStart + visibleEnd) {
    return str;
  }
  const start = str.substring(0, visibleStart);
  const end = str.substring(str.length - visibleEnd);
  const masked = '*'.repeat(Math.max(str.length - visibleStart - visibleEnd, 3));
  return `${start}${masked}${end}`;
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email;
  }
  const [local, domain] = email.split('@');
  return `${maskString(local, 1, 1)}@${domain}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return phone;
  }
  return maskString(phone.replace(/\D/g, ''), 3, 2);
}

/**
 * Sanitize string for safe output
 */
export function sanitizeString(str: string): string {
  return escape(str.trim());
}

/**
 * Extract initials from name
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) {
    return '';
  }
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, maxLength);
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number, decimals: number = 1): number {
  if (total === 0) {
    return 0;
  }
  return parseFloat(((value / total) * 100).toFixed(decimals));
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Check if value is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Check if value is a valid email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Check if value is a valid phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s-()]/g, ''));
}

/**
 * Check if value is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize search query
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Hash a string (simple non-cryptographic)
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Convert array to object by key
 */
export function arrayToObject<T>(array: T[], key: keyof T): Record<string, T> {
  return array.reduce(
    (acc, item) => {
      acc[String(item[key])] = item;
      return acc;
    },
    {} as Record<string, T>,
  );
}

/**
 * Remove duplicates from array by key
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  return uniqBy(array, key);
}

/**
 * Sort array by multiple keys
 */
export function sortByMultiple<T>(array: T[], keys: (keyof T | ((item: T) => any))[]): T[] {
  return sortBy(array, keys as any);
}

/**
 * Filter array by search term across multiple fields
 */
export function searchInArray<T>(array: T[], searchTerm: string, fields: (keyof T)[]): T[] {
  const normalizedSearch = normalizeSearchQuery(searchTerm);
  if (!normalizedSearch) {
    return array;
  }

  return array.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (isString(value)) {
        return normalizeSearchQuery(value).includes(normalizedSearch);
      }
      return false;
    }),
  );
}
