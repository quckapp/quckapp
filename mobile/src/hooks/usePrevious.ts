/**
 * usePrevious Hook - Get previous value
 * Design Principle: KISS (Keep It Simple, Stupid)
 * Use Case: Compare current and previous values
 */

import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Example usage:
 * const previousCount = usePrevious(count);
 * if (previousCount !== count) {
 *   // Value changed
 * }
 */
