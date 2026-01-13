/**
 * useDebounce Hook - Debounce values
 * Design Principle: DRY (Don't Repeat Yourself)
 * SOLID: Single Responsibility - Only handles debouncing
 * Use Case: Search input, form validation
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to cancel timeout if value changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Example usage:
 * const searchQuery = useDebounce(inputValue, 300);
 * useEffect(() => {
 *   // API call with debounced value
 * }, [searchQuery]);
 */
