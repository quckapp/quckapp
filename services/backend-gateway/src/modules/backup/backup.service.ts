import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GcsStorageService } from './gcs-storage.service';
import * as https from 'https';
import * as http from 'http';

interface BackupResult {
  success: boolean;
  backupId: string;
  timestamp: Date;
  stats: {
    messages: number;
    users: number;
    conversations: number;
    mediaFiles: number;
  };
  error?: string;
}

interface MediaBackupResult {
  success: boolean;
  totalFiles: number;
  backedUp: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3BaseUrl: string;
  private readonly backupEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly gcsStorage: GcsStorageService,
    @InjectModel('Message') private messageModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Conversation') private conversationModel: Model<any>,
  ) {
    this.s3BaseUrl = `https://${this.configService.get('AWS_S3_BUCKET')}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com`;
    this.backupEnabled = this.configService.get('BACKUP_ENABLED') === 'true';
  }

  /**
   * Run full backup - messages, users, conversations, and media
   */
  async runFullBackup(): Promise<BackupResult> {
    const backupId = `backup_${Date.now()}`;
    const timestamp = new Date();

    this.logger.log(`Starting full backup: ${backupId}`);

    try {
      // Backup database collections
      const [messagesResult, usersResult, conversationsResult] = await Promise.all([
        this.backupMessages(backupId),
        this.backupUsers(backupId),
        this.backupConversations(backupId),
      ]);

      // Backup media files from S3 to GCS
      const mediaResult = await this.backupMediaFiles(backupId);

      const stats = {
        messages: messagesResult.count,
        users: usersResult.count,
        conversations: conversationsResult.count,
        mediaFiles: mediaResult.backedUp,
      };

      // Save backup metadata
      await this.saveBackupMetadata(backupId, timestamp, stats);

      this.logger.log(`Full backup completed: ${backupId}`, stats);

      return {
        success: true,
        backupId,
        timestamp,
        stats,
      };
    } catch (error) {
      this.logger.error(`Backup failed: ${backupId}`, error);
      return {
        success: false,
        backupId,
        timestamp,
        stats: { messages: 0, users: 0, conversations: 0, mediaFiles: 0 },
        error: (error as Error).message,
      };
    }
  }

  /**
   * Backup all messages to GCS
   */
  async backupMessages(backupId: string): Promise<{ count: number }> {
    this.logger.log('Backing up messages...');

    const messages = await this.messageModel.find({}).lean();
    const jsonData = JSON.stringify(messages, null, 2);
    const buffer = Buffer.from(jsonData, 'utf-8');

    const result = await this.gcsStorage.uploadFile(
      buffer,
      `backups/${backupId}/data/messages.json`,
      'application/json',
      { backupId, type: 'messages', count: String(messages.length) },
    );

    if (!result.success) {
      throw new Error(`Failed to backup messages: ${result.error}`);
    }

    this.logger.log(`Backed up ${messages.length} messages`);
    return { count: messages.length };
  }

  /**
   * Backup all users to GCS
   */
  async backupUsers(backupId: string): Promise<{ count: number }> {
    this.logger.log('Backing up users...');

    // Exclude sensitive fields
    const users = await this.userModel
      .find({})
      .select('-password -refreshTokens -twoFactorSecret')
      .lean();

    const jsonData = JSON.stringify(users, null, 2);
    const buffer = Buffer.from(jsonData, 'utf-8');

    const result = await this.gcsStorage.uploadFile(
      buffer,
      `backups/${backupId}/data/users.json`,
      'application/json',
      { backupId, type: 'users', count: String(users.length) },
    );

    if (!result.success) {
      throw new Error(`Failed to backup users: ${result.error}`);
    }

    this.logger.log(`Backed up ${users.length} users`);
    return { count: users.length };
  }

  /**
   * Backup all conversations to GCS
   */
  async backupConversations(backupId: string): Promise<{ count: number }> {
    this.logger.log('Backing up conversations...');

    const conversations = await this.conversationModel.find({}).lean();
    const jsonData = JSON.stringify(conversations, null, 2);
    const buffer = Buffer.from(jsonData, 'utf-8');

    const result = await this.gcsStorage.uploadFile(
      buffer,
      `backups/${backupId}/data/conversations.json`,
      'application/json',
      { backupId, type: 'conversations', count: String(conversations.length) },
    );

    if (!result.success) {
      throw new Error(`Failed to backup conversations: ${result.error}`);
    }

    this.logger.log(`Backed up ${conversations.length} conversations`);
    return { count: conversations.length };
  }

  /**
   * Backup media files from S3 to GCS
   */
  async backupMediaFiles(backupId: string): Promise<MediaBackupResult> {
    this.logger.log('Backing up media files from S3 to GCS...');

    const errors: string[] = [];
    let backedUp = 0;
    let failed = 0;

    // Get all messages with attachments
    const messagesWithMedia = await this.messageModel
      .find({ 'attachments.0': { $exists: true } })
      .select('attachments')
      .lean();

    // Get all user profile photos
    const usersWithPhotos = await this.userModel
      .find({ profilePhoto: { $exists: true, $ne: null } })
      .select('profilePhoto')
      .lean();

    // Collect all media URLs
    const mediaUrls: { url: string; type: string; id: string }[] = [];

    // From messages
    for (const msg of messagesWithMedia) {
      for (const attachment of msg.attachments || []) {
        if (attachment.url) {
          mediaUrls.push({
            url: attachment.url,
            type: attachment.type || 'file',
            id: attachment._id?.toString() || `msg_${msg._id}`,
          });
        }
        if (attachment.thumbnailUrl) {
          mediaUrls.push({
            url: attachment.thumbnailUrl,
            type: 'thumbnail',
            id: `thumb_${attachment._id?.toString() || msg._id}`,
          });
        }
      }
    }

    // From user profiles
    for (const user of usersWithPhotos) {
      if (user.profilePhoto) {
        mediaUrls.push({
          url: user.profilePhoto,
          type: 'profile',
          id: `profile_${user._id}`,
        });
      }
    }

    this.logger.log(`Found ${mediaUrls.length} media files to backup`);

    // Backup each file
    for (const media of mediaUrls) {
      try {
        const fileBuffer = await this.downloadFromUrl(media.url);
        if (fileBuffer) {
          const fileName = this.extractFileName(media.url);
          const gcsPath = `backups/${backupId}/media/${media.type}/${fileName}`;
          const contentType = this.getContentType(fileName);

          const result = await this.gcsStorage.uploadFile(fileBuffer, gcsPath, contentType);

          if (result.success) {
            backedUp++;
          } else {
            failed++;
            errors.push(`Failed to upload ${fileName}: ${result.error}`);
          }
        } else {
          failed++;
          errors.push(`Failed to download: ${media.url}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Error processing ${media.url}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Media backup complete: ${backedUp} succeeded, ${failed} failed`);

    return {
      success: failed === 0,
      totalFiles: mediaUrls.length,
      backedUp,
      failed,
      errors: errors.slice(0, 10), // Limit error messages
    };
  }

  /**
   * Backup user profile photos
   */
  async backupProfilePhotos(backupId: string): Promise<MediaBackupResult> {
    this.logger.log('Backing up profile photos...');

    const users = await this.userModel
      .find({ profilePhoto: { $exists: true, $ne: null } })
      .select('_id profilePhoto displayName')
      .lean();

    let backedUp = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const fileBuffer = await this.downloadFromUrl(user.profilePhoto);
        if (fileBuffer) {
          const ext = this.getExtension(user.profilePhoto);
          const gcsPath = `backups/${backupId}/profiles/${user._id}${ext}`;

          const result = await this.gcsStorage.uploadFile(
            fileBuffer,
            gcsPath,
            this.getContentType(user.profilePhoto),
          );

          if (result.success) {
            backedUp++;
          } else {
            failed++;
          }
        }
      } catch (error) {
        failed++;
        errors.push(`User ${user._id}: ${(error as Error).message}`);
      }
    }

    return {
      success: failed === 0,
      totalFiles: users.length,
      backedUp,
      failed,
      errors,
    };
  }

  /**
   * Save backup metadata
   */
  private async saveBackupMetadata(backupId: string, timestamp: Date, stats: any): Promise<void> {
    const metadata = {
      backupId,
      timestamp: timestamp.toISOString(),
      stats,
      version: '1.0',
      source: 'quickchat-backend',
    };

    const buffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8');

    await this.gcsStorage.uploadFile(
      buffer,
      `backups/${backupId}/metadata.json`,
      'application/json',
    );
  }

  /**
   * Download file from URL
   */
  private downloadFromUrl(url: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol
        .get(url, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            // Follow redirect
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              this.downloadFromUrl(redirectUrl).then(resolve);
              return;
            }
          }

          if (response.statusCode !== 200) {
            resolve(null);
            return;
          }

          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', () => resolve(null));
        })
        .on('error', () => resolve(null));
    });
  }

  /**
   * Extract filename from URL
   */
  private extractFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1] || `file_${Date.now()}`;
    } catch {
      return `file_${Date.now()}`;
    }
  }

  /**
   * Get file extension
   */
  private getExtension(url: string): string {
    const fileName = this.extractFileName(url);
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.substring(dotIndex) : '';
  }

  /**
   * Get content type from filename
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<{ backupId: string; timestamp: string }[]> {
    const files = await this.gcsStorage.listFiles('backups/');
    const backupIds = new Set<string>();

    for (const file of files) {
      const match = file.match(/backups\/(backup_\d+)\//);
      if (match) {
        backupIds.add(match[1]);
      }
    }

    const backups: { backupId: string; timestamp: string }[] = [];
    for (const id of backupIds) {
      const timestamp = id.replace('backup_', '');
      backups.push({
        backupId: id,
        timestamp: new Date(parseInt(timestamp)).toISOString(),
      });
    }

    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Get backup details
   */
  async getBackupDetails(backupId: string): Promise<any> {
    const metadataBuffer = await this.gcsStorage.downloadFile(`backups/${backupId}/metadata.json`);

    if (!metadataBuffer) {
      return null;
    }

    return JSON.parse(metadataBuffer.toString('utf-8'));
  }

  /**
   * Scheduled daily backup (runs at 2 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledBackup(): Promise<void> {
    if (!this.backupEnabled) {
      this.logger.log('Scheduled backup skipped (disabled)');
      return;
    }

    if (!this.gcsStorage.isAvailable()) {
      this.logger.warn('Scheduled backup skipped (GCS not configured)');
      return;
    }

    this.logger.log('Starting scheduled daily backup...');
    await this.runFullBackup();
  }

  /**
   * Check backup service status
   */
  getStatus(): {
    enabled: boolean;
    gcsConfigured: boolean;
    s3BaseUrl: string;
  } {
    return {
      enabled: this.backupEnabled,
      gcsConfigured: this.gcsStorage.isAvailable(),
      s3BaseUrl: this.s3BaseUrl,
    };
  }
}
