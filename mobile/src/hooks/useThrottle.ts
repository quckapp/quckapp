/**
 * useThrottle Hook - Throttle function calls
 * Design Principle: DRY (Don't Repeat Yourself)
 * Algorithm: Throttling with timestamp tracking
 * Use Case: Scroll events, button clicks
 */

import { useRef, useCallback } from 'react';

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000,
): T {
  const lastRun = useRef<number>(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, delay],
  ) as T;
}

/**
 * Example usage:
 * const handleScroll = useThrottle((event) => {
 *   // Handle scroll event
 * }, 200);
 */
