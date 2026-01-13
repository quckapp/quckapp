import { Controller, Get, Post, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BackupService } from './backup.service';

@ApiTags('Backup')
@Controller('backup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get backup service status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status returned' })
  getStatus() {
    return {
      success: true,
      data: this.backupService.getStatus(),
    };
  }

  @Post('run')
  @ApiOperation({ summary: 'Run full backup now' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Backup started' })
  async runBackup() {
    const result = await this.backupService.runFullBackup();
    return {
      success: result.success,
      data: result,
    };
  }

  @Get('list')
  @ApiOperation({ summary: 'List all backups' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Backups listed' })
  async listBackups() {
    const backups = await this.backupService.listBackups();
    return {
      success: true,
      data: backups,
    };
  }

  @Get(':backupId')
  @ApiOperation({ summary: 'Get backup details' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Backup details returned' })
  async getBackupDetails(@Param('backupId') backupId: string) {
    const details = await this.backupService.getBackupDetails(backupId);
    if (!details) {
      return {
        success: false,
        message: 'Backup not found',
      };
    }
    return {
      success: true,
      data: details,
    };
  }

  @Post('messages')
  @ApiOperation({ summary: 'Backup messages only' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Messages backed up' })
  async backupMessages() {
    const backupId = `messages_${Date.now()}`;
    const result = await this.backupService.backupMessages(backupId);
    return {
      success: true,
      data: {
        backupId,
        ...result,
      },
    };
  }

  @Post('profiles')
  @ApiOperation({ summary: 'Backup profile photos only' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profiles backed up' })
  async backupProfiles() {
    const backupId = `profiles_${Date.now()}`;
    const result = await this.backupService.backupProfilePhotos(backupId);
    return {
      success: true,
      data: {
        backupId,
        ...result,
      },
    };
  }

  @Post('media')
  @ApiOperation({ summary: 'Backup all media files' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Media backed up' })
  async backupMedia() {
    const backupId = `media_${Date.now()}`;
    const result = await this.backupService.backupMediaFiles(backupId);
    return {
      success: true,
      data: {
        backupId,
        ...result,
      },
    };
  }
}
