import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Media, MediaDocument, StorageUsage, StorageUsageDocument } from './schemas/media.schema';
import { SERVICES } from '../../shared/constants/services';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../shared/utils/service-response.util';
import {
  IPaginatedResponse,
  IServiceResponse,
} from '../../shared/interfaces/microservice.interface';
import * as path from 'path';
import * as crypto from 'crypto';

interface MediaDto {
  id: string;
  userId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  dimensions?: {
    width?: number;
    height?: number;
    duration?: number;
  };
  status: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UploadMediaDto {
  userId: string;
  filename: string;
  originalName?: string;
  mimeType: string;
  type: string;
  size: number;
  conversationId?: string;
  messageId?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Media Service Handler
 * Business logic for media operations with MongoDB
 */
@Injectable()
export class MediaServiceHandler {
  private readonly logger = new Logger(MediaServiceHandler.name);
  private readonly uploadPath: string;
  private readonly baseUrl: string;

  constructor(
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    @InjectModel(StorageUsage.name) private storageUsageModel: Model<StorageUsageDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.uploadPath = this.configService.get('UPLOAD_PATH') || '/uploads';
    this.baseUrl = this.configService.get('MEDIA_BASE_URL') || 'http://localhost:3000/media';
  }

  private toMediaDto(doc: MediaDocument): MediaDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      filename: doc.filename,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      type: doc.type,
      size: doc.size,
      url: doc.url || `${this.baseUrl}/${doc.filename}`,
      thumbnailUrl: doc.thumbnailUrl,
      dimensions: doc.dimensions,
      status: doc.status,
      isPublic: doc.isPublic,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }

  private getMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    if (mimeType.startsWith('audio/')) {
      return 'audio';
    }
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      return 'document';
    }
    return 'other';
  }

  private generateFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const hash = crypto.randomBytes(16).toString('hex');
    return `${Date.now()}_${hash}${ext}`;
  }

  async uploadMedia(dto: UploadMediaDto): Promise<IServiceResponse<MediaDto>> {
    try {
      const filename = this.generateFilename(dto.filename);
      const mediaType = dto.type || this.getMediaType(dto.mimeType);
      const storagePath = `${this.uploadPath}/${dto.userId}/${mediaType}/${filename}`;

      const media = new this.mediaModel({
        userId: new Types.ObjectId(dto.userId),
        filename,
        originalFilename: dto.originalName || dto.filename,
        mimeType: dto.mimeType,
        type: mediaType,
        size: dto.size,
        path: storagePath,
        url: `${this.baseUrl}/${dto.userId}/${mediaType}/${filename}`,
        conversationId: dto.conversationId ? new Types.ObjectId(dto.conversationId) : null,
        messageId: dto.messageId ? new Types.ObjectId(dto.messageId) : null,
        dimensions: {
          width: dto.width,
          height: dto.height,
          duration: dto.duration,
        },
        status: 'pending',
        storageProvider: 'local',
        metadata: dto.metadata || {},
      });

      const saved = await media.save();

      // Update storage usage
      await this.updateStorageUsage(dto.userId, dto.size, mediaType);

      // Queue for processing (thumbnails, transcoding, etc.)
      this.processMediaAsync(saved._id.toString(), mediaType);

      this.logger.log(`Media uploaded: ${saved._id} (${mediaType})`);

      return successResponse(this.toMediaDto(saved), SERVICES.MEDIA_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to upload media: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  async getMedia(dto: { mediaId: string }): Promise<IServiceResponse<MediaDto>> {
    try {
      const cached = await this.cacheManager.get<MediaDto>(`media:${dto.mediaId}`);
      if (cached) {
        return successResponse(cached, SERVICES.MEDIA_SERVICE);
      }

      const media = await this.mediaModel.findById(dto.mediaId);

      if (!media || media.isDeleted) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Media not found', SERVICES.MEDIA_SERVICE);
      }

      const mediaDto = this.toMediaDto(media);
      await this.cacheManager.set(`media:${dto.mediaId}`, mediaDto, 300000);

      return successResponse(mediaDto, SERVICES.MEDIA_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get media: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  async getUserMedia(dto: {
    userId: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<IServiceResponse<IPaginatedResponse<MediaDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;

      const query: any = {
        userId: new Types.ObjectId(dto.userId),
        isDeleted: { $ne: true },
      };

      if (dto.type) {
        query.type = dto.type;
      }

      const [media, total] = await Promise.all([
        this.mediaModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
        this.mediaModel.countDocuments(query),
      ]);

      return successResponse(
        {
          items: media.map((m) => this.toMediaDto(m)),
          total,
          limit,
          offset,
          hasMore: offset + media.length < total,
        },
        SERVICES.MEDIA_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get user media: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  async getConversationMedia(dto: {
    conversationId: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<IServiceResponse<IPaginatedResponse<MediaDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;

      const query: any = {
        conversationId: new Types.ObjectId(dto.conversationId),
        isDeleted: { $ne: true },
      };

      if (dto.type) {
        query.type = dto.type;
      }

      const [media, total] = await Promise.all([
        this.mediaModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
        this.mediaModel.countDocuments(query),
      ]);

      return successResponse(
        {
          items: media.map((m) => this.toMediaDto(m)),
          total,
          limit,
          offset,
          hasMore: offset + media.length < total,
        },
        SERVICES.MEDIA_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get conversation media: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  async deleteMedia(dto: {
    mediaId: string;
    userId: string;
  }): Promise<IServiceResponse<{ deleted: boolean }>> {
    try {
      const media = await this.mediaModel.findById(dto.mediaId);

      if (!media) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Media not found', SERVICES.MEDIA_SERVICE);
      }

      if (media.userId.toString() !== dto.userId) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'You can only delete your own media',
          SERVICES.MEDIA_SERVICE,
        );
      }

      // Soft delete
      media.isDeleted = true;
      media.deletedAt = new Date();
      await media.save();

      // Update storage usage
      await this.updateStorageUsage(dto.userId, -media.size, media.type);

      await this.cacheManager.del(`media:${dto.mediaId}`);

      // In production, also delete from actual storage (S3, etc.)

      return successResponse({ deleted: true }, SERVICES.MEDIA_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to delete media: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  async getUploadUrl(dto: {
    userId: string;
    filename: string;
    contentType: string;
  }): Promise<IServiceResponse<any>> {
    try {
      const filename = this.generateFilename(dto.filename);
      const mediaType = this.getMediaType(dto.contentType);
      const uploadId = crypto.randomBytes(16).toString('hex');

      // In production, generate presigned URL for S3/GCS
      const uploadUrl = `${this.baseUrl}/upload/${uploadId}`;

      return successResponse(
        {
          uploadId,
          uploadUrl,
          filename,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
          fields: {
            key: `${dto.userId}/${mediaType}/${filename}`,
            'Content-Type': dto.contentType,
          },
        },
        SERVICES.MEDIA_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get upload URL: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  async processMedia(dto: {
    mediaId: string;
    operations: any[];
  }): Promise<IServiceResponse<MediaDto>> {
    try {
      const media = await this.mediaModel.findById(dto.mediaId);

      if (!media) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Media not found', SERVICES.MEDIA_SERVICE);
      }

      // Process operations
      media.status = 'processing';
      await media.save();

      for (const operation of dto.operations) {
        this.logger.debug(`Processing ${dto.mediaId}: ${operation.type}`);
        // In production, apply actual operations (resize, crop, compress, transcode)
      }

      media.status = 'ready';
      const updated = await media.save();

      await this.cacheManager.del(`media:${dto.mediaId}`);

      return successResponse(this.toMediaDto(updated), SERVICES.MEDIA_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to process media: ${error.message}`, error.stack);

      // Update status to failed
      await this.mediaModel.findByIdAndUpdate(dto.mediaId, {
        status: 'failed',
        processingError: error.message,
      });

      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  async generateThumbnail(dto: {
    mediaId: string;
    width?: number;
    height?: number;
  }): Promise<IServiceResponse<MediaDto>> {
    try {
      const media = await this.mediaModel.findById(dto.mediaId);

      if (!media) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Media not found', SERVICES.MEDIA_SERVICE);
      }

      const width = dto.width || 150;
      const height = dto.height || 150;

      // In production, generate actual thumbnail
      const thumbnailFilename = `thumb_${width}x${height}_${media.filename}`;
      const thumbnailPath = `${this.uploadPath}/${media.userId}/thumbnails/${thumbnailFilename}`;

      media.thumbnailPath = thumbnailPath;
      media.thumbnailUrl = `${this.baseUrl}/${media.userId}/thumbnails/${thumbnailFilename}`;

      const updated = await media.save();

      await this.cacheManager.del(`media:${dto.mediaId}`);

      return successResponse(this.toMediaDto(updated), SERVICES.MEDIA_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to generate thumbnail: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  async getStorageUsage(dto: { userId: string }): Promise<IServiceResponse<any>> {
    try {
      let usage: any = await this.storageUsageModel.findOne({
        userId: new Types.ObjectId(dto.userId),
      });

      if (!usage) {
        // Calculate from scratch
        usage = await this.calculateStorageUsage(dto.userId);
      }

      // At this point usage is guaranteed to exist due to upsert in calculateStorageUsage
      const storageData = usage;

      return successResponse(
        {
          totalBytes: storageData.totalBytes,
          imageBytes: storageData.imageBytes,
          videoBytes: storageData.videoBytes,
          audioBytes: storageData.audioBytes,
          documentBytes: storageData.documentBytes,
          otherBytes: storageData.otherBytes,
          fileCount: storageData.fileCount,
          quotaBytes: storageData.quotaBytes,
          usedPercent: Math.round((storageData.totalBytes / storageData.quotaBytes) * 100),
          availableBytes: storageData.quotaBytes - storageData.totalBytes,
        },
        SERVICES.MEDIA_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get storage usage: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.MEDIA_SERVICE);
    }
  }

  private async updateStorageUsage(
    userId: string,
    sizeChange: number,
    type: string,
  ): Promise<void> {
    try {
      const typeField = `${type}Bytes`;

      await this.storageUsageModel.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $inc: {
            totalBytes: sizeChange,
            [typeField]: sizeChange,
            fileCount: sizeChange > 0 ? 1 : -1,
          },
          $set: { lastCalculatedAt: new Date() },
        },
        { upsert: true },
      );
    } catch (error: any) {
      this.logger.error(`Failed to update storage usage: ${error.message}`, error.stack);
    }
  }

  private async calculateStorageUsage(userId: string): Promise<StorageUsageDocument> {
    const pipeline = [
      { $match: { userId: new Types.ObjectId(userId), isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$type',
          totalSize: { $sum: '$size' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.mediaModel.aggregate(pipeline);

    let totalBytes = 0;
    const byType: Record<string, number> = {};

    for (const result of results) {
      totalBytes += result.totalSize;
      byType[`${result._id}Bytes`] = result.totalSize;
    }

    const usage = await this.storageUsageModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          totalBytes,
          imageBytes: byType.imageBytes || 0,
          videoBytes: byType.videoBytes || 0,
          audioBytes: byType.audioBytes || 0,
          documentBytes: byType.documentBytes || 0,
          otherBytes: byType.otherBytes || 0,
          fileCount: results.reduce((sum, r) => sum + r.count, 0),
          lastCalculatedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return usage!;
  }

  private async processMediaAsync(mediaId: string, type: string): Promise<void> {
    // Simulate async processing
    setTimeout(async () => {
      try {
        const media = await this.mediaModel.findById(mediaId);
        if (!media) {
          return;
        }

        media.status = 'processing';
        await media.save();

        // Generate thumbnail for images and videos
        if (type === 'image' || type === 'video') {
          await this.generateThumbnail({ mediaId, width: 150, height: 150 });
        }

        media.status = 'ready';
        await media.save();

        this.logger.log(`Media processed: ${mediaId}`);
      } catch (error: any) {
        this.logger.error(`Async processing failed for ${mediaId}: ${error.message}`);
        await this.mediaModel.findByIdAndUpdate(mediaId, {
          status: 'failed',
          processingError: error.message,
        });
      }
    }, 1000);
  }
}
