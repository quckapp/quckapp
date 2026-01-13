/**
 * useInfiniteScroll Hook - Infinite scrolling with pagination
 * Algorithm: Pagination with threshold detection
 * Design Pattern: Observer pattern for scroll events
 * Use Case: Message list, user list
 */

import { useState, useCallback } from 'react';

interface InfiniteScrollState<T> {
  data: T[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: Error | null;
}

export function useInfiniteScroll<T>(
  fetchFunction: (page: number, pageSize: number) => Promise<T[]>,
  pageSize: number = 20,
): InfiniteScrollState<T> & {
  loadMore: () => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<InfiniteScrollState<T>>({
    data: [],
    page: 0,
    hasMore: true,
    loading: false,
    error: null,
  });

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) {
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const nextPage = state.page + 1;
      const newData = await fetchFunction(nextPage, pageSize);

      setState(prev => ({
        ...prev,
        data: [...prev.data, ...newData],
        page: nextPage,
        hasMore: newData.length === pageSize,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, [fetchFunction, pageSize, state.page, state.hasMore, state.loading]);

  const reset = useCallback(() => {
    setState({
      data: [],
      page: 0,
      hasMore: true,
      loading: false,
      error: null,
    });
  }, []);

  return { ...state, loadMore, reset };
}

/**
 * Example usage:
 * const { data, loading, loadMore, hasMore } = useInfiniteScroll(
 *   (page, pageSize) => api.get(`/messages?page=${page}&limit=${pageSize}`),
 *   20
 * );
 */
