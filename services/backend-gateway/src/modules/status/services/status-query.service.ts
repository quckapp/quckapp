import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusRepository } from '../repositories/status.repository';
import { Status } from '../schemas/status.schema';

/**
 * Single Responsibility Principle - Only handles querying statuses
 * Uses efficient data structures for lookups
 */
@Injectable()
export class StatusQueryService {
  constructor(private readonly repository: StatusRepository) {}

  /**
   * Get all active statuses
   * Algorithm: Filter by expiry date and deleted flag
   */
  async findAllActive(): Promise<Status[]> {
    return this.repository.findAllActive();
  }

  /**
   * Get statuses by user ID
   * Algorithm: Filter by userId and active status
   */
  async findByUserId(userId: string): Promise<Status[]> {
    return this.repository.findByUserId(userId);
  }

  /**
   * Get single status by ID
   */
  async findOne(id: string): Promise<Status> {
    const status = await this.repository.findById(id);

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    return status;
  }

  /**
   * Group statuses by user
   * Data Structure: Map<userId, Status[]> for O(1) lookups
   * Algorithm: Single-pass grouping for O(n) complexity
   */
  groupStatusesByUser(statuses: Status[]): Map<string, Status[]> {
    const grouped = new Map<string, Status[]>();

    for (const status of statuses) {
      const userId = status.userId.toString();

      if (!grouped.has(userId)) {
        grouped.set(userId, []);
      }

      grouped.get(userId)!.push(status);
    }

    return grouped;
  }

  /**
   * Get unique viewers across multiple statuses
   * Data Structure: Set for O(1) duplicate checking
   * Algorithm: Flatten and deduplicate in O(n*m) where n=statuses, m=avg viewers
   */
  getUniqueViewers(statuses: Status[]): any[] {
    const viewerMap = new Map<string, any>();

    for (const status of statuses) {
      if (status.viewers) {
        for (const viewer of status.viewers) {
          const viewerId = viewer.userId?.toString() || viewer.userId;
          if (!viewerMap.has(viewerId)) {
            viewerMap.set(viewerId, viewer);
          }
        }
      }
    }

    return Array.from(viewerMap.values());
  }
}
