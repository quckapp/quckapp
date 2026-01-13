/**
 * Status Utility Functions
 * Functional Programming: Pure functions with no side effects
 * Efficient Algorithms: Optimized for performance
 * Single Responsibility: Each function does one thing well
 */

/**
 * Check if a status is expired
 * Algorithm: Simple date comparison
 * Time Complexity: O(1)
 *
 * @param expiresAt - ISO date string or Date object
 * @returns boolean indicating if status has expired
 */
export const isStatusExpired = (expiresAt: string | Date): boolean => {
  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiryDate.getTime() < Date.now();
};

/**
 * Filter active (non-expired) statuses
 * Algorithm: Single-pass filter
 * Time Complexity: O(n) where n = number of statuses
 *
 * @param statuses - Array of status objects
 * @returns Array of active statuses
 */
export const filterActiveStatuses = <T extends { expiresAt: string | Date; isDeleted?: boolean }>(
  statuses: T[]
): T[] => {
  return statuses.filter((status) => {
    return !isStatusExpired(status.expiresAt) && !status.isDeleted;
  });
};

/**
 * Sort statuses by creation date (newest first)
 * Algorithm: Tim Sort (built-in)
 * Time Complexity: O(n log n)
 *
 * @param statuses - Array of status objects
 * @returns Sorted array (does not mutate original)
 */
export const sortStatusesByDate = <T extends { createdAt: string | Date }>(
  statuses: T[]
): T[] => {
  return [...statuses].sort((a, b) => {
    const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
    return dateB.getTime() - dateA.getTime();
  });
};

/**
 * Group statuses by a key
 * Generic groupBy function using Map for O(1) lookups
 * Time Complexity: O(n)
 *
 * @param items - Array of items to group
 * @param keyFn - Function to extract grouping key
 * @returns Map of grouped items
 */
export const groupBy = <T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> => {
  return items.reduce((map, item) => {
    const key = keyFn(item);
    const group = map.get(key) || [];
    group.push(item);
    map.set(key, group);
    return map;
  }, new Map<K, T[]>());
};

/**
 * Get time remaining until expiry
 * Time Complexity: O(1)
 *
 * @param expiresAt - ISO date string or Date object
 * @returns Milliseconds until expiry (negative if expired)
 */
export const getTimeUntilExpiry = (expiresAt: string | Date): number => {
  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiryDate.getTime() - Date.now();
};

/**
 * Format time remaining in human-readable format
 * Time Complexity: O(1)
 *
 * @param expiresAt - ISO date string or Date object
 * @returns String like "5h left", "30m left", "Expired"
 */
export const formatTimeRemaining = (expiresAt: string | Date): string => {
  const ms = getTimeUntilExpiry(expiresAt);

  if (ms <= 0) return 'Expired';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h left`;
  if (minutes > 0) return `${minutes}m left`;
  return 'Less than 1m left';
};

/**
 * Deduplicate array by key
 * Algorithm: Set-based deduplication
 * Time Complexity: O(n)
 *
 * @param items - Array of items
 * @param keyFn - Function to extract unique key
 * @returns Deduplicated array
 */
export const uniqueBy = <T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): T[] => {
  const seen = new Set<K>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * Chunk array into smaller arrays
 * Useful for pagination or batch processing
 * Time Complexity: O(n)
 *
 * @param array - Array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Find index using binary search (for sorted arrays)
 * Time Complexity: O(log n)
 *
 * @param sortedArray - Sorted array
 * @param target - Value to find
 * @param compareFn - Comparison function
 * @returns Index of target or -1 if not found
 */
export const binarySearch = <T>(
  sortedArray: T[],
  target: T,
  compareFn: (a: T, b: T) => number
): number => {
  let left = 0;
  let right = sortedArray.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareFn(sortedArray[mid], target);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1; // Not found
};

/**
 * Memoize a function (cache results)
 * Performance optimization for expensive computations
 *
 * @param fn - Function to memoize
 * @returns Memoized function
 */
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Throttle function execution
 * Prevents function from being called too frequently
 *
 * @param fn - Function to throttle
 * @param delay - Minimum delay between calls in ms
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

/**
 * Debounce function execution
 * Delays function execution until after calls have stopped
 *
 * @param fn - Function to debounce
 * @param delay - Delay in ms
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
