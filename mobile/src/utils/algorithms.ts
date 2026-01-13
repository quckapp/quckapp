/**
 * Utility Algorithms for Mobile App
 * Design Principles: DRY (Don't Repeat Yourself), Pure Functions
 * SOLID: Single Responsibility - Each function does one thing
 */

/**
 * Debounce function - Delays execution until after wait time
 * Algorithm: Debouncing with closure
 * Use Case: Search input, scroll events
 * Time Complexity: O(1)
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - Ensures function is called at most once per interval
 * Algorithm: Throttling with timestamp tracking
 * Use Case: Scroll events, button clicks, API calls
 * Time Complexity: O(1)
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: any;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }

    return lastResult;
  };
}

/**
 * Memoization function - Caches function results
 * Algorithm: Memoization with Map
 * Time Complexity: O(1) for cache hits
 * @param func - Function to memoize
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();

  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Binary Search - Find element in sorted array
 * Algorithm: Binary Search
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 * @param arr - Sorted array
 * @param target - Target value
 * @param compareFn - Comparison function
 * @returns Index of element or -1
 */
export function binarySearch<T>(
  arr: T[],
  target: T,
  compareFn: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0),
): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareFn(arr[mid], target);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

/**
 * Merge Sort - Stable sorting algorithm
 * Algorithm: Merge Sort
 * Time Complexity: O(n log n)
 * Space Complexity: O(n)
 * @param arr - Array to sort
 * @param compareFn - Comparison function
 * @returns Sorted array
 */
export function mergeSort<T>(
  arr: T[],
  compareFn: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0),
): T[] {
  if (arr.length <= 1) {
    return arr;
  }

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), compareFn);
  const right = mergeSort(arr.slice(mid), compareFn);

  return merge(left, right, compareFn);
}

function merge<T>(
  left: T[],
  right: T[],
  compareFn: (a: T, b: T) => number,
): T[] {
  const result: T[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (compareFn(left[leftIndex], right[rightIndex]) <= 0) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }

  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

/**
 * LRU Cache - Least Recently Used Cache
 * Data Structure: Map with doubly linked list
 * Time Complexity: O(1) for get and put
 * Use Case: Image caching, API response caching
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  put(key: K, value: V): void {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Remove least recently used if capacity exceeded
    if (this.cache.size > this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Deep clone object - Creates deep copy of object
 * Algorithm: Recursive cloning with Map for circular reference handling
 * Time Complexity: O(n) where n is number of properties
 * @param obj - Object to clone
 * @param hash - WeakMap for circular reference tracking
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T, hash = new WeakMap()): T {
  // Handle primitives
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item, hash)) as any;
  }

  // Handle circular references
  if (hash.has(obj)) {
    return hash.get(obj);
  }

  // Handle Object
  const clonedObj = Object.create(Object.getPrototypeOf(obj));
  hash.set(obj, clonedObj);

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone((obj as any)[key], hash);
    }
  }

  return clonedObj;
}

/**
 * Group by key - Groups array elements by key
 * Algorithm: Single pass grouping with Map
 * Time Complexity: O(n)
 * @param arr - Array to group
 * @param keyFn - Function to extract key
 * @returns Map of grouped elements
 */
export function groupBy<T, K>(
  arr: T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of arr) {
    const key = keyFn(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  return groups;
}

/**
 * Chunk array - Splits array into chunks
 * Algorithm: Array slicing
 * Time Complexity: O(n)
 * @param arr - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }

  return chunks;
}

/**
 * Flatten array - Flattens nested array
 * Algorithm: Recursive flattening
 * Time Complexity: O(n)
 * @param arr - Array to flatten
 * @param depth - Depth to flatten (default: Infinity)
 * @returns Flattened array
 */
export function flatten<T>(arr: any[], depth: number = Infinity): T[] {
  if (depth === 0) {
    return arr;
  }

  return arr.reduce((acc, val) => {
    if (Array.isArray(val)) {
      acc.push(...flatten(val, depth - 1));
    } else {
      acc.push(val);
    }
    return acc;
  }, []);
}

/**
 * Unique array - Removes duplicates from array
 * Algorithm: Set for O(n) time complexity
 * Time Complexity: O(n)
 * @param arr - Array with duplicates
 * @param keyFn - Function to extract unique key
 * @returns Array with unique elements
 */
export function unique<T>(
  arr: T[],
  keyFn?: (item: T) => any,
): T[] {
  if (!keyFn) {
    return Array.from(new Set(arr));
  }

  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
