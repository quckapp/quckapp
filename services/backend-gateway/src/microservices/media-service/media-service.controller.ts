import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MEDIA_PATTERNS } from '../../shared/contracts/message-patterns';
import { MediaServiceHandler } from './media-service.handler';
import { UploadMediaDto } from '../../shared/dto';

/**
 * Media Service Controller
 * Handles incoming messages from the message broker
 */
@Controller()
export class MediaServiceController {
  constructor(private handler: MediaServiceHandler) {}

  @MessagePattern(MEDIA_PATTERNS.UPLOAD_MEDIA)
  async uploadMedia(@Payload() dto: UploadMediaDto) {
    return this.handler.uploadMedia(dto);
  }

  @MessagePattern(MEDIA_PATTERNS.GET_MEDIA)
  async getMedia(@Payload() dto: { mediaId: string }) {
    return this.handler.getMedia(dto);
  }

  @MessagePattern(MEDIA_PATTERNS.GET_USER_MEDIA)
  async getUserMedia(
    @Payload() dto: { userId: string; type?: string; limit?: number; offset?: number },
  ) {
    return this.handler.getUserMedia(dto);
  }

  @MessagePattern(MEDIA_PATTERNS.DELETE_MEDIA)
  async deleteMedia(@Payload() dto: { mediaId: string; userId: string }) {
    return this.handler.deleteMedia(dto);
  }

  @MessagePattern(MEDIA_PATTERNS.GET_UPLOAD_URL)
  async getUploadUrl(@Payload() dto: { userId: string; filename: string; contentType: string }) {
    return this.handler.getUploadUrl(dto);
  }

  @MessagePattern(MEDIA_PATTERNS.PROCESS_MEDIA)
  async processMedia(@Payload() dto: { mediaId: string; operations: any[] }) {
    return this.handler.processMedia(dto);
  }

  @MessagePattern(MEDIA_PATTERNS.GENERATE_THUMBNAIL)
  async generateThumbnail(@Payload() dto: { mediaId: string; width?: number; height?: number }) {
    return this.handler.generateThumbnail(dto);
  }

  @MessagePattern(MEDIA_PATTERNS.GET_STORAGE_USAGE)
  async getStorageUsage(@Payload() dto: { userId: string }) {
    return this.handler.getStorageUsage(dto);
  }
}
