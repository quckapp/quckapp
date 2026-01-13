import { useState, useMemo, useCallback } from 'react';

/**
 * Custom Hook Pattern - Encapsulates media navigation logic
 * Algorithm: Flattening with O(n*m) complexity where n=statuses, m=avg media per status
 * Data Structure: Flattened array for O(1) index-based access
 * Single Responsibility: Only handles media navigation
 */

export interface MediaItem {
  type: string;
  url: string;
  statusId: string;
  caption?: string;
  createdAt: string;
  userId: any;
}

export const useStatusMediaNavigation = (statuses: any[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * Flatten all media items from all statuses
   * Algorithm Complexity: O(n*m) where n=statuses, m=media per status
   * Memoization: Only recomputes when statuses change
   */
  const allMediaItems = useMemo<MediaItem[]>(() => {
    return statuses.flatMap((status) => {
      // Extract media items or fallback to mediaUrl
      const items =
        status?.media?.length > 0
          ? status.media
          : status?.mediaUrl
          ? [{ type: status.type, url: status.mediaUrl }]
          : [];

      // Map each media item with additional metadata
      return items.map((item: any) => ({
        ...item,
        statusId: status._id,
        caption: status.content,
        createdAt: status.createdAt,
        userId: status.userId || status.user,
      }));
    });
  }, [statuses]);

  /**
   * Get current media item
   * Time Complexity: O(1)
   */
  const currentMedia = useMemo<MediaItem | null>(
    () => allMediaItems[currentIndex] || null,
    [allMediaItems, currentIndex]
  );

  /**
   * Navigate to next media item
   * Time Complexity: O(1)
   */
  const handleNext = useCallback(() => {
    if (currentIndex < allMediaItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, allMediaItems.length]);

  /**
   * Navigate to previous media item
   * Time Complexity: O(1)
   */
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  /**
   * Jump to specific index
   * Time Complexity: O(1)
   */
  const jumpToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < allMediaItems.length) {
        setCurrentIndex(index);
      }
    },
    [allMediaItems.length]
  );

  /**
   * Check if at start
   * Time Complexity: O(1)
   */
  const isAtStart = useMemo(() => currentIndex === 0, [currentIndex]);

  /**
   * Check if at end
   * Time Complexity: O(1)
   */
  const isAtEnd = useMemo(
    () => currentIndex === allMediaItems.length - 1,
    [currentIndex, allMediaItems.length]
  );

  /**
   * Get progress percentage
   * Time Complexity: O(1)
   */
  const progressPercentage = useMemo(
    () => ((currentIndex + 1) / allMediaItems.length) * 100,
    [currentIndex, allMediaItems.length]
  );

  return {
    // Data
    allMediaItems,
    currentMedia,
    currentIndex,
    totalItems: allMediaItems.length,

    // Navigation
    handleNext,
    handlePrevious,
    jumpToIndex,
    setCurrentIndex, // Direct index setter for external control

    // State
    isAtStart,
    isAtEnd,
    progressPercentage,
  };
};
