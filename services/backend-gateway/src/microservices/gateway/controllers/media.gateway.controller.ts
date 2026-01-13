import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { SERVICES } from '../../../shared/constants/services';
import { MEDIA_PATTERNS } from '../../../shared/contracts/message-patterns';
import { LinkPreviewDto, MediaFileDto, ServiceResponseDto } from '../../../shared/dto';

/**
 * Media Gateway Controller
 * Routes media requests to Media Microservice
 */
@Controller('media')
export class MediaGatewayController {
  constructor(@Inject(SERVICES.MEDIA_SERVICE) private mediaClient: ClientProxy) {}

  /**
   * Upload a file
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { purpose: string },
  ): Promise<ServiceResponseDto<MediaFileDto>> {
    if (!file) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.sendToService(MEDIA_PATTERNS.UPLOAD_FILE, {
      userId: req.user?.userId,
      file: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      purpose: dto.purpose || 'message',
    });
  }

  /**
   * Upload avatar
   */
  @Post('upload/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ServiceResponseDto<MediaFileDto>> {
    if (!file) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.sendToService(MEDIA_PATTERNS.UPLOAD_AVATAR, {
      userId: req.user?.userId,
      file: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });
  }

  /**
   * Upload status media
   */
  @Post('upload/status')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStatus(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ServiceResponseDto<MediaFileDto>> {
    if (!file) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.sendToService(MEDIA_PATTERNS.UPLOAD_STATUS, {
      userId: req.user?.userId,
      file: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });
  }

  /**
   * Get file metadata
   */
  @Get(':id')
  async getFile(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<MediaFileDto>> {
    return this.sendToService(MEDIA_PATTERNS.GET_FILE, {
      fileId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Get file URL
   */
  @Get(':id/url')
  async getFileUrl(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<{ url: string }>> {
    return this.sendToService(MEDIA_PATTERNS.GET_FILE_URL, {
      fileId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Get download URL (signed, time-limited)
   */
  @Get(':id/download')
  async getDownloadUrl(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<{ url: string; expiresAt: Date }>> {
    return this.sendToService(MEDIA_PATTERNS.GET_DOWNLOAD_URL, {
      fileId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Delete file
   */
  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(MEDIA_PATTERNS.DELETE_FILE, {
      fileId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Get link preview
   */
  @Post('link-preview')
  async getLinkPreview(@Body() dto: { url: string }): Promise<ServiceResponseDto<LinkPreviewDto>> {
    return this.sendToService(MEDIA_PATTERNS.GET_LINK_PREVIEW, {
      url: dto.url,
    });
  }

  /**
   * Transcribe audio file
   */
  @Post(':id/transcribe')
  async transcribeAudio(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<{ transcription: string }>> {
    return this.sendToService(MEDIA_PATTERNS.TRANSCRIBE_AUDIO, {
      fileId: id,
      userId: req.user?.userId,
    });
  }

  private async sendToService<T>(pattern: string, data: any): Promise<ServiceResponseDto<T>> {
    try {
      const result = await firstValueFrom(
        this.mediaClient.send<ServiceResponseDto<T>>(pattern, data).pipe(
          timeout(30000), // Longer timeout for file uploads
          catchError((err) => {
            throw new HttpException(
              {
                success: false,
                error: {
                  code: 'SERVICE_ERROR',
                  message: err.message || 'Media service error',
                },
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: 'Failed to communicate with media service',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
