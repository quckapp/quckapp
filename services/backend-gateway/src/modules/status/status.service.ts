import { Injectable } from '@nestjs/common';
import { Status } from './schemas/status.schema';
import { CreateStatusDto } from './dto/create-status.dto';
import { StatusCreationService } from './services/status-creation.service';
import { StatusQueryService } from './services/status-query.service';
import { StatusViewerService } from './services/status-viewer.service';

/**
 * Facade Pattern - Provides a simplified interface to the complex subsystem
 * Delegates operations to specialized services
 * Single Responsibility Principle - Only coordinates between services
 */
@Injectable()
export class StatusService {
  constructor(
    private readonly creationService: StatusCreationService,
    private readonly queryService: StatusQueryService,
    private readonly viewerService: StatusViewerService,
  ) {}

  /**
   * Create a new status
   * Delegates to StatusCreationService
   */
  async create(
    userId: string,
    createStatusDto: CreateStatusDto,
    files?: Express.Multer.File[],
  ): Promise<Status> {
    return this.creationService.createStatus(userId, createStatusDto, files);
  }

  /**
   * Find all active statuses
   * Delegates to StatusQueryService
   */
  async findAllActive(): Promise<Status[]> {
    return this.queryService.findAllActive();
  }

  /**
   * Find statuses by user ID
   * Delegates to StatusQueryService
   */
  async findByUserId(userId: string): Promise<Status[]> {
    return this.queryService.findByUserId(userId);
  }

  /**
   * Find a single status by ID
   * Delegates to StatusQueryService
   */
  async findOne(id: string): Promise<Status> {
    return this.queryService.findOne(id);
  }

  /**
   * Mark status as viewed by a user
   * Delegates to StatusViewerService
   */
  async markAsViewed(statusId: string, userId: string): Promise<Status> {
    return this.viewerService.markAsViewed(statusId, userId);
  }

  /**
   * Soft delete a status
   * Delegates to StatusViewerService
   */
  async delete(id: string, userId: string): Promise<void> {
    return this.viewerService.deleteStatus(id, userId);
  }

  /**
   * Delete expired statuses
   * Delegates to StatusViewerService
   */
  async deleteExpired(): Promise<void> {
    return this.viewerService.deleteExpiredStatuses();
  }
}
