import { useMemo } from 'react';

/**
 * Custom Hook Pattern - Encapsulates viewer data logic
 * Algorithm: Efficient filtering and lookup
 * Data Structure: Uses Set for O(1) duplicate checking
 * Memoization: Only recomputes when dependencies change
 */

export const useStatusViewers = (
  statuses: any[],
  currentStatusId?: string
) => {
  /**
   * Get viewers for a specific status
   * Time Complexity: O(n) where n = number of statuses
   */
  const getViewersForStatus = useMemo(() => {
    if (!currentStatusId) return [];

    const status = statuses.find((s) => s._id === currentStatusId);
    return status?.viewers || [];
  }, [statuses, currentStatusId]);

  /**
   * Get unique viewers across all statuses
   * Algorithm: Set-based deduplication
   * Time Complexity: O(n*m) where n=statuses, m=viewers per status
   * Space Complexity: O(u) where u=unique viewers
   */
  const getAllUniqueViewers = useMemo(() => {
    const viewerMap = new Map<string, any>();

    statuses.forEach((status) => {
      if (status.viewers && Array.isArray(status.viewers)) {
        status.viewers.forEach((viewer: any) => {
          const viewerId =
            viewer.userId?._id ||
            viewer.userId ||
            (typeof viewer === 'string' ? viewer : null);

          if (viewerId && !viewerMap.has(viewerId)) {
            viewerMap.set(viewerId, {
              ...viewer,
              _id: viewerId,
            });
          }
        });
      }
    });

    return Array.from(viewerMap.values());
  }, [statuses]);

  /**
   * Get total viewer count for current status
   * Time Complexity: O(1) - direct array length access
   */
  const currentViewerCount = useMemo(
    () => getViewersForStatus.length,
    [getViewersForStatus]
  );

  /**
   * Get total unique viewer count across all statuses
   * Time Complexity: O(1) - cached from getAllUniqueViewers
   */
  const totalUniqueViewerCount = useMemo(
    () => getAllUniqueViewers.length,
    [getAllUniqueViewers]
  );

  /**
   * Check if a specific user has viewed current status
   * Time Complexity: O(m) where m = viewers for current status
   */
  const hasUserViewed = useMemo(() => {
    return (userId: string) => {
      return getViewersForStatus.some(
        (viewer: any) =>
          viewer.userId?._id === userId ||
          viewer.userId === userId ||
          viewer._id === userId
      );
    };
  }, [getViewersForStatus]);

  /**
   * Get viewer statistics
   * Time Complexity: O(n*m)
   */
  const viewerStats = useMemo(() => {
    const statusViewerCounts = statuses.map((status) => ({
      statusId: status._id,
      count: status.viewers?.length || 0,
    }));

    const totalViews = statusViewerCounts.reduce(
      (sum, stat) => sum + stat.count,
      0
    );
    const avgViewsPerStatus =
      statuses.length > 0 ? totalViews / statuses.length : 0;
    const maxViews = Math.max(...statusViewerCounts.map((s) => s.count), 0);
    const minViews = Math.min(...statusViewerCounts.map((s) => s.count), 0);

    return {
      totalViews,
      avgViewsPerStatus,
      maxViews,
      minViews,
      statusViewerCounts,
    };
  }, [statuses]);

  return {
    // Current status viewers
    currentViewers: getViewersForStatus,
    currentViewerCount,

    // All viewers
    allUniqueViewers: getAllUniqueViewers,
    totalUniqueViewerCount,

    // Statistics
    viewerStats,

    // Utilities
    hasUserViewed,
  };
};
