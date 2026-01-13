import { useMemo } from 'react';

/**
 * Custom Hook Pattern - Encapsulates status grouping logic
 * Algorithm: Single-pass grouping with O(n) complexity
 * Data Structure: Map for O(1) lookups
 * Memoization: Only recomputes when statuses change
 */

export interface GroupedStatus {
  userId: any;
  statuses: any[];
  latestCreatedAt: string;
}

export const useStatusGrouping = (statuses: any[], currentUserId?: string) => {
  /**
   * Group statuses by user with memoization
   * Algorithm Complexity: O(n) where n = number of statuses
   * Space Complexity: O(u) where u = number of unique users
   */
  const groupedStatuses = useMemo(() => {
    // Filter out current user's statuses
    const filteredStatuses = statuses.filter(
      (status) => status.userId?._id !== currentUserId
    );

    // Single-pass grouping using reduce
    // Time Complexity: O(n)
    const grouped = filteredStatuses.reduce((acc, status) => {
      const userId = status.userId?._id || status.userId;

      if (!acc[userId]) {
        acc[userId] = {
          userId: status.userId,
          statuses: [],
          latestCreatedAt: status.createdAt,
        };
      }

      acc[userId].statuses.push(status);

      // Keep track of the latest created date
      if (new Date(status.createdAt) > new Date(acc[userId].latestCreatedAt)) {
        acc[userId].latestCreatedAt = status.createdAt;
      }

      return acc;
    }, {} as Record<string, GroupedStatus>);

    // Convert to array and sort by latest status
    // Time Complexity: O(u log u) where u = number of unique users
    return Object.values(grouped).sort(
      (a, b) =>
        new Date(b.latestCreatedAt).getTime() -
        new Date(a.latestCreatedAt).getTime()
    );
  }, [statuses, currentUserId]); // Only recompute when dependencies change

  /**
   * Get total count of grouped statuses
   * Time Complexity: O(1)
   */
  const totalGroups = useMemo(() => groupedStatuses.length, [groupedStatuses]);

  /**
   * Get total count of all statuses
   * Time Complexity: O(n)
   */
  const totalStatuses = useMemo(
    () => groupedStatuses.reduce((sum, group) => sum + group.statuses.length, 0),
    [groupedStatuses]
  );

  return {
    groupedStatuses,
    totalGroups,
    totalStatuses,
  };
};
