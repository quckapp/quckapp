import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusRepository } from '../repositories/status.repository';
import { StatusFactory } from '../factories/status.factory';
import { FileProcessorContext } from '../strategies/file-processor.strategy';
import { CreateStatusDto } from '../dto/create-status.dto';
import { Status } from '../schemas/status.schema';

/**
 * Single Responsibility Principle - Only handles status creation logic
 * Dependency Inversion Principle - Depends on abstractions (repository, factory, strategies)
 */
@Injectable()
export class StatusCreationService {
  constructor(
    private readonly repository: StatusRepository,
    private readonly factory: StatusFactory,
    private readonly fileProcessor: FileProcessorContext,
  ) {}

  /**
   * Creates a new status with media files
   * Uses dependency injection for flexibility and testability
   */
  async createStatus(
    userId: string,
    dto: CreateStatusDto,
    files?: Express.Multer.File[],
  ): Promise<Status> {
    // Process files using Strategy pattern
    const processedFiles = files?.length ? await this.fileProcessor.processFiles(files) : [];

    // Create media items using Factory pattern
    const mediaItems = this.factory.createMediaItems(processedFiles);

    // Create status data using Factory pattern
    const statusData = this.factory.createStatusData(userId, dto, mediaItems);

    // Save using Repository pattern
    const savedStatus = await this.repository.create(statusData);

    // Fetch with populated data
    const populatedStatus = await this.repository.findById((savedStatus as any)._id.toString());

    if (!populatedStatus) {
      throw new NotFoundException('Status not found after creation');
    }

    return populatedStatus;
  }
}
