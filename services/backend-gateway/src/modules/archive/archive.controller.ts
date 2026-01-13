import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  ArchiveService,
  FileEntry,
  FilePathEntry,
  ArchiveOptions,
} from './archive.service';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * ArchiveController - REST API for creating ZIP archives
 */
@ApiTags('Archive')
@ApiBearerAuth('JWT-auth')
@Controller('archive')
// @UseGuards(JwtAuthGuard) // Uncomment when guards are set up
export class ArchiveController {
  constructor(
    private readonly archiveService: ArchiveService,
    private readonly logger: LoggerService,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a ZIP archive from content' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Filename in archive' },
              content: { type: 'string', description: 'File content (text)' },
            },
          },
        },
        options: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['zip', 'tar'] },
            compressionLevel: { type: 'number', minimum: 0, maximum: 9 },
            comment: { type: 'string' },
          },
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({ status: 200, description: 'Archive created successfully' })
  async createArchive(
    @Body() body: { files: FileEntry[]; options?: ArchiveOptions },
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.archiveService.createArchiveFromContent(
        body.files,
        body.options,
      );

      const format = body.options?.format || 'zip';
      const filename = `archive-${Date.now()}.${format}`;
      const contentType =
        format === 'zip' ? 'application/zip' : 'application/x-tar';

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      this.logger.error('Failed to create archive', error, 'ArchiveController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create archive',
      });
    }
  }

  @Post('data-export')
  @ApiOperation({ summary: 'Create a data export archive (JSON + attachments)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Data to export as JSON',
        },
        attachmentPaths: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              path: { type: 'string' },
            },
          },
          description: 'File paths to include as attachments',
        },
      },
      required: ['data'],
    },
  })
  @ApiResponse({ status: 200, description: 'Data export archive created' })
  async createDataExport(
    @Body()
    body: {
      data: Record<string, any>;
      attachmentPaths?: FilePathEntry[];
    },
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.archiveService.createDataExportArchive(
        body.data,
        body.attachmentPaths || [],
      );

      const filename = `data-export-${Date.now()}.zip`;

      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      this.logger.error(
        'Failed to create data export',
        error,
        'ArchiveController',
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create data export',
      });
    }
  }

  @Post('chat-backup')
  @ApiOperation({ summary: 'Create a chat backup archive' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationData: {
          type: 'object',
          description: 'Conversation metadata',
        },
        messages: {
          type: 'array',
          items: { type: 'object' },
          description: 'Messages array',
        },
        mediaFiles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              path: { type: 'string' },
            },
          },
          description: 'Media file paths to include',
        },
      },
      required: ['conversationData', 'messages'],
    },
  })
  @ApiResponse({ status: 200, description: 'Chat backup archive created' })
  async createChatBackup(
    @Body()
    body: {
      conversationData: any;
      messages: any[];
      mediaFiles?: FilePathEntry[];
    },
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.archiveService.createChatBackupArchive(
        body.conversationData,
        body.messages,
        body.mediaFiles || [],
      );

      const filename = `chat-backup-${Date.now()}.zip`;

      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      this.logger.error(
        'Failed to create chat backup',
        error,
        'ArchiveController',
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create chat backup',
      });
    }
  }

  @Post('stream')
  @ApiOperation({ summary: 'Create a streaming archive (for large files)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              content: { type: 'string' },
            },
          },
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({ status: 200, description: 'Streaming archive' })
  async createStreamingArchive(
    @Body() body: { files: FileEntry[]; options?: ArchiveOptions },
    @Res() res: Response,
  ) {
    try {
      const format = body.options?.format || 'zip';
      const filename = `archive-${Date.now()}.${format}`;
      const contentType =
        format === 'zip' ? 'application/zip' : 'application/x-tar';

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Transfer-Encoding': 'chunked',
      });

      const stream = this.archiveService.createArchiveStream(
        body.files,
        body.options,
      );

      stream.pipe(res);
    } catch (error) {
      this.logger.error(
        'Failed to create streaming archive',
        error,
        'ArchiveController',
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create streaming archive',
      });
    }
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old temporary archives' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        maxAgeHours: {
          type: 'number',
          default: 24,
          description: 'Max age in hours for temp files',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupTempArchives(
    @Body() body: { maxAgeHours?: number },
    @Res() res: Response,
  ) {
    try {
      const cleanedCount = await this.archiveService.cleanupTempArchives(
        body.maxAgeHours || 24,
      );

      res.status(HttpStatus.OK).json({
        success: true,
        message: `Cleaned up ${cleanedCount} temporary archive(s)`,
        cleanedCount,
      });
    } catch (error) {
      this.logger.error(
        'Failed to cleanup temp archives',
        error,
        'ArchiveController',
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to cleanup temp archives',
      });
    }
  }
}
