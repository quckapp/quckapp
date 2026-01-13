import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusRepository } from '../repositories/status.repository';
import { StatusFactory } from '../factories/status.factory';
import { Status } from '../schemas/status.schema';

/**
 * Single Responsibility Principle - Only handles viewing and deletion operations
 */
@Injectable()
export class StatusViewerService {
  constructor(
    private readonly repository: StatusRepository,
    private readonly factory: StatusFactory,
  ) {}

  /**
   * Mark status as viewed by a user
   * Algorithm: Check if already viewed (O(n)), then add if not
   */
  async markAsViewed(statusId: string, userId: string): Promise<Status> {
    const hasViewed = await this.repository.hasViewed(statusId, userId);

    if (!hasViewed) {
      const viewerData = this.factory.createViewerData(userId);
      return this.repository.addViewer(statusId, viewerData);
    }

    const status = await this.repository.findById(statusId);
    if (!status) {
      throw new NotFoundException('Status not found');
    }

    return status;
  }

  /**
   * Soft delete a status
   * Soft delete pattern - marks as deleted instead of removing from database
   */
  async deleteStatus(id: string, userId: string): Promise<void> {
    const status = await this.repository.findById(id);

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    // Authorization check
    if (status.userId.toString() !== userId) {
      throw new NotFoundException('Status not found'); // Don't reveal existence
    }

    await this.repository.softDelete(id);
  }

  /**
   * Clean up expired statuses
   * Can be run as a cron job
   */
  async deleteExpiredStatuses(): Promise<void> {
    await this.repository.deleteExpired();
  }
}
