import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { LoggerService } from '../../logger/logger.service';
import { QUEUE_NAMES } from '../bullmq.module';
import { MediaJobData } from '../services/queue.service';

/**
 * MediaProcessor - BullMQ worker for processing media jobs
 * Design Pattern: Worker Pattern
 * Handles image/video compression, thumbnail generation, and format conversion
 */
@Processor(QUEUE_NAMES.MEDIA, {
  concurrency: 3, // Lower concurrency due to resource-intensive operations
})
@Injectable()
export class MediaProcessor extends WorkerHost {
  constructor(private readonly logger: LoggerService) {
    super();
  }

  /**
   * Process media job
   */
  async process(job: Job<MediaJobData>): Promise<any> {
    this.logger.log(`Processing media job ${job.id} (type: ${job.data.type})`, 'MediaProcessor');

    const { type, fileId, filePath, options } = job.data;

    try {
      await job.updateProgress(10);

      switch (type) {
        case 'compress':
          return await this.processCompression(job);
        case 'thumbnail':
          return await this.processThumbnail(job);
        case 'convert':
          return await this.processConversion(job);
        case 'cleanup':
          return await this.processCleanup(job);
        default:
          throw new Error(`Unknown media job type: ${type}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process media job ${job.id}`, error.message, 'MediaProcessor');
      throw error;
    }
  }

  /**
   * Compress image or video
   */
  private async processCompression(job: Job<MediaJobData>): Promise<any> {
    await job.updateProgress(20);

    const { fileId, filePath, options } = job.data;
    const quality = options?.quality || 80;

    this.logger.log(`Compressing file ${fileId} with quality ${quality}`, 'MediaProcessor');

    // In production, this would use sharp for images or ffmpeg for videos
    await job.updateProgress(60);

    // Simulate compression time
    await job.updateProgress(90);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'compress',
      fileId,
      originalPath: filePath,
      compressedPath: filePath.replace(/\.(\w+)$/, '_compressed.$1'),
      quality,
    };
  }

  /**
   * Generate thumbnail for image or video
   */
  private async processThumbnail(job: Job<MediaJobData>): Promise<any> {
    await job.updateProgress(20);

    const { fileId, filePath, options } = job.data;
    const width = options?.width || 200;
    const height = options?.height || 200;

    this.logger.log(
      `Generating thumbnail for file ${fileId} (${width}x${height})`,
      'MediaProcessor',
    );

    // In production, this would use sharp or ffmpeg
    await job.updateProgress(60);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'thumbnail',
      fileId,
      originalPath: filePath,
      thumbnailPath: filePath.replace(/\.(\w+)$/, '_thumb.$1'),
      dimensions: { width, height },
    };
  }

  /**
   * Convert media to different format
   */
  private async processConversion(job: Job<MediaJobData>): Promise<any> {
    await job.updateProgress(20);

    const { fileId, filePath, options } = job.data;
    const targetFormat = options?.format || 'webp';

    this.logger.log(`Converting file ${fileId} to ${targetFormat}`, 'MediaProcessor');

    await job.updateProgress(50);

    // In production, this would use appropriate conversion libraries
    await job.updateProgress(80);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'convert',
      fileId,
      originalPath: filePath,
      convertedPath: filePath.replace(/\.\w+$/, `.${targetFormat}`),
      format: targetFormat,
    };
  }

  /**
   * Clean up temporary media files
   */
  private async processCleanup(job: Job<MediaJobData>): Promise<any> {
    await job.updateProgress(20);

    const { fileId, filePath } = job.data;

    this.logger.log(`Cleaning up file ${fileId}`, 'MediaProcessor');

    // In production, this would delete temporary files
    await job.updateProgress(80);

    await job.updateProgress(100);
    return {
      success: true,
      type: 'cleanup',
      fileId,
      cleaned: true,
    };
  }
}
