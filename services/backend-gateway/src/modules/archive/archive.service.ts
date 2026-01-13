import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/logger/logger.service';
const archiver = require('archiver');
import * as fs from 'fs';
import * as path from 'path';
import { Readable, PassThrough } from 'stream';

export interface FileEntry {
  name: string;
  content: string | Buffer;
}

export interface FilePathEntry {
  name: string;
  path: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
}

export interface ArchiveOptions {
  format?: 'zip' | 'tar';
  compressionLevel?: number; // 0-9, default 6
  comment?: string;
}

export interface ArchiveResult {
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  size?: number;
  error?: string;
}

/**
 * ArchiveService - Service for creating ZIP and TAR archives
 * Uses archiver package for efficient compression
 */
@Injectable()
export class ArchiveService {
  private uploadDir: string;
  private tempDir: string;
  private maxArchiveSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.uploadDir =
      this.configService.get('UPLOAD_DIRECTORY') || './uploads';
    this.tempDir =
      this.configService.get('TEMP_ARCHIVE_DIRECTORY') || './temp/archives';
    this.maxArchiveSize = parseInt(
      this.configService.get('MAX_ARCHIVE_SIZE') || '104857600', // 100MB default
      10,
    );
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const archiveDir = path.join(this.uploadDir, 'archives');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Create a ZIP archive from file entries (content as strings/buffers)
   */
  async createArchiveFromContent(
    files: FileEntry[],
    options: ArchiveOptions = {},
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver(options.format || 'zip', {
        zlib: { level: options.compressionLevel ?? 6 },
        comment: options.comment,
      });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      archive.on('warning', (err: any) => {
        if (err.code === 'ENOENT') {
          this.logger.warn(`Archive warning: ${err.message}`, 'ArchiveService');
        } else {
          reject(err);
        }
      });

      for (const file of files) {
        const content =
          typeof file.content === 'string'
            ? Buffer.from(file.content, 'utf-8')
            : file.content;
        archive.append(content, { name: file.name });
      }

      archive.finalize();
    });
  }

  /**
   * Create a ZIP archive from file paths
   */
  async createArchiveFromPaths(
    files: FilePathEntry[],
    options: ArchiveOptions = {},
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver(options.format || 'zip', {
        zlib: { level: options.compressionLevel ?? 6 },
        comment: options.comment,
      });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      archive.on('warning', (err: any) => {
        if (err.code === 'ENOENT') {
          this.logger.warn(`Archive warning: ${err.message}`, 'ArchiveService');
        } else {
          reject(err);
        }
      });

      for (const file of files) {
        if (fs.existsSync(file.path)) {
          archive.file(file.path, { name: file.name });
        } else {
          this.logger.warn(`File not found: ${file.path}`, 'ArchiveService');
        }
      }

      archive.finalize();
    });
  }

  /**
   * Create a ZIP archive from directories
   */
  async createArchiveFromDirectories(
    directories: DirectoryEntry[],
    options: ArchiveOptions = {},
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver(options.format || 'zip', {
        zlib: { level: options.compressionLevel ?? 6 },
        comment: options.comment,
      });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      archive.on('warning', (err: any) => {
        if (err.code === 'ENOENT') {
          this.logger.warn(`Archive warning: ${err.message}`, 'ArchiveService');
        } else {
          reject(err);
        }
      });

      for (const dir of directories) {
        if (fs.existsSync(dir.path)) {
          archive.directory(dir.path, dir.name);
        } else {
          this.logger.warn(`Directory not found: ${dir.path}`, 'ArchiveService');
        }
      }

      archive.finalize();
    });
  }

  /**
   * Create a ZIP archive and save to disk
   */
  async createArchiveFile(
    filename: string,
    files: FileEntry[] | FilePathEntry[],
    options: ArchiveOptions = {},
  ): Promise<ArchiveResult> {
    try {
      let buffer: Buffer;

      // Check if it's FileEntry[] or FilePathEntry[]
      if (files.length > 0 && 'content' in files[0]) {
        buffer = await this.createArchiveFromContent(
          files as FileEntry[],
          options,
        );
      } else {
        buffer = await this.createArchiveFromPaths(
          files as FilePathEntry[],
          options,
        );
      }

      if (buffer.length > this.maxArchiveSize) {
        return {
          success: false,
          error: `Archive size (${buffer.length} bytes) exceeds maximum allowed (${this.maxArchiveSize} bytes)`,
        };
      }

      const filePath = path.join(this.uploadDir, 'archives', filename);
      await fs.promises.writeFile(filePath, buffer);

      this.logger.log(
        `Archive created: ${filePath} (${buffer.length} bytes)`,
        'ArchiveService',
      );

      return {
        success: true,
        filePath,
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error('Failed to create archive', error, 'ArchiveService');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a streaming archive (for large files)
   */
  createArchiveStream(
    files: FileEntry[] | FilePathEntry[],
    options: ArchiveOptions = {},
  ): PassThrough {
    const passThrough = new PassThrough();
    const archive = archiver(options.format || 'zip', {
      zlib: { level: options.compressionLevel ?? 6 },
      comment: options.comment,
    });

    archive.pipe(passThrough);

    archive.on('error', (err: any) => {
      this.logger.error('Archive stream error', err, 'ArchiveService');
      passThrough.destroy(err);
    });

    archive.on('warning', (err: any) => {
      if (err.code !== 'ENOENT') {
        this.logger.warn(`Archive warning: ${err.message}`, 'ArchiveService');
      }
    });

    // Add files
    if (files.length > 0) {
      if ('content' in files[0]) {
        for (const file of files as FileEntry[]) {
          const content =
            typeof file.content === 'string'
              ? Buffer.from(file.content, 'utf-8')
              : file.content;
          archive.append(content, { name: file.name });
        }
      } else {
        for (const file of files as FilePathEntry[]) {
          if (fs.existsSync(file.path)) {
            archive.file(file.path, { name: file.name });
          }
        }
      }
    }

    archive.finalize();

    return passThrough;
  }

  /**
   * Create a data export archive (JSON data + attachments)
   */
  async createDataExportArchive(
    data: Record<string, any>,
    attachments: FilePathEntry[] = [],
    options: ArchiveOptions = {},
  ): Promise<Buffer> {
    const files: FileEntry[] = [
      {
        name: 'data.json',
        content: JSON.stringify(data, null, 2),
      },
      {
        name: 'metadata.json',
        content: JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            fileCount: attachments.length + 1,
          },
          null,
          2,
        ),
      },
    ];

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver(options.format || 'zip', {
        zlib: { level: options.compressionLevel ?? 6 },
        comment: options.comment || 'QuickChat Data Export',
      });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add data files
      for (const file of files) {
        archive.append(Buffer.from(file.content as string, 'utf-8'), {
          name: file.name,
        });
      }

      // Add attachments in 'attachments' folder
      for (const attachment of attachments) {
        if (fs.existsSync(attachment.path)) {
          archive.file(attachment.path, {
            name: `attachments/${attachment.name}`,
          });
        }
      }

      archive.finalize();
    });
  }

  /**
   * Create a chat backup archive
   */
  async createChatBackupArchive(
    conversationData: any,
    messages: any[],
    mediaFiles: FilePathEntry[] = [],
  ): Promise<Buffer> {
    const files: FileEntry[] = [
      {
        name: 'conversation.json',
        content: JSON.stringify(conversationData, null, 2),
      },
      {
        name: 'messages.json',
        content: JSON.stringify(messages, null, 2),
      },
      {
        name: 'backup-info.json',
        content: JSON.stringify(
          {
            backupDate: new Date().toISOString(),
            messageCount: messages.length,
            mediaCount: mediaFiles.length,
            version: '1.0',
          },
          null,
          2,
        ),
      },
    ];

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', {
        zlib: { level: 6 },
        comment: 'QuickChat Conversation Backup',
      });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add JSON files
      for (const file of files) {
        archive.append(Buffer.from(file.content as string, 'utf-8'), {
          name: file.name,
        });
      }

      // Add media files
      for (const media of mediaFiles) {
        if (fs.existsSync(media.path)) {
          archive.file(media.path, { name: `media/${media.name}` });
        }
      }

      archive.finalize();
    });
  }

  /**
   * Clean up old temporary archives
   */
  async cleanupTempArchives(maxAgeHours: number = 24): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    try {
      const files = await fs.promises.readdir(this.tempDir);

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.promises.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.promises.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(
          `Cleaned up ${cleanedCount} temporary archive(s)`,
          'ArchiveService',
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to cleanup temp archives',
        error,
        'ArchiveService',
      );
    }

    return cleanedCount;
  }
}
