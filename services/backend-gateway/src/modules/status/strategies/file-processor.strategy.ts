import { Injectable } from '@nestjs/common';
import { UploadService } from '../../upload/upload.service';

/**
 * Strategy Pattern Interface - Defines contract for file processing
 * Open/Closed Principle - Open for extension, closed for modification
 */
export interface IFileProcessorStrategy {
  process(file: Express.Multer.File): Promise<{ type: string; url: string }>;
  canProcess(file: Express.Multer.File): boolean;
}

/**
 * Concrete Strategy for Image Processing
 */
@Injectable()
export class ImageProcessorStrategy implements IFileProcessorStrategy {
  constructor(private uploadService: UploadService) {}

  canProcess(file: Express.Multer.File): boolean {
    return file.mimetype.startsWith('image/');
  }

  async process(file: Express.Multer.File): Promise<{ type: string; url: string }> {
    const relativePath = await this.uploadService.uploadFile(file, 'image');
    const url = this.uploadService.getFileUrl(relativePath);

    return {
      type: 'image',
      url,
    };
  }
}

/**
 * Concrete Strategy for Video Processing
 */
@Injectable()
export class VideoProcessorStrategy implements IFileProcessorStrategy {
  constructor(private uploadService: UploadService) {}

  canProcess(file: Express.Multer.File): boolean {
    return file.mimetype.startsWith('video/');
  }

  async process(file: Express.Multer.File): Promise<{ type: string; url: string }> {
    const relativePath = await this.uploadService.uploadFile(file, 'video');
    const url = this.uploadService.getFileUrl(relativePath);

    return {
      type: 'video',
      url,
    };
  }
}

/**
 * Context class that uses strategies
 * Strategy Pattern - Delegates file processing to appropriate strategy
 */
@Injectable()
export class FileProcessorContext {
  private strategies: IFileProcessorStrategy[];

  constructor(imageProcessor: ImageProcessorStrategy, videoProcessor: VideoProcessorStrategy) {
    this.strategies = [imageProcessor, videoProcessor];
  }

  async processFile(file: Express.Multer.File): Promise<{ type: string; url: string }> {
    const strategy = this.strategies.find((s) => s.canProcess(file));

    if (!strategy) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    return strategy.process(file);
  }

  async processFiles(files: Express.Multer.File[]): Promise<Array<{ type: string; url: string }>> {
    return Promise.all(files.map((file) => this.processFile(file)));
  }
}
