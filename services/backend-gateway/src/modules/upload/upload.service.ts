import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../../common/storage/s3.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private uploadDirectory: string;
  private storageMode: 'local' | 's3';
  private baseUrl: string;

  constructor(
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {
    this.uploadDirectory = this.configService.get('UPLOAD_DIRECTORY') || './uploads';
    this.storageMode = this.configService.get('STORAGE_MODE') || 'local';
    this.baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3000';

    this.logger.log(`Upload service initialized with storage mode: ${this.storageMode}`);

    if (this.storageMode === 'local') {
      this.ensureUploadDirectoryExists();
    }
  }

  private ensureUploadDirectoryExists() {
    const directories = ['images', 'videos', 'audio', 'files'];

    if (!fs.existsSync(this.uploadDirectory)) {
      fs.mkdirSync(this.uploadDirectory, { recursive: true });
    }

    directories.forEach((dir) => {
      const dirPath = path.join(this.uploadDirectory, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  async uploadFile(file: Express.Multer.File, type: string): Promise<string> {
    if (this.storageMode === 's3') {
      return this.uploadToS3(file, type);
    }
    return this.uploadToLocal(file, type);
  }

  private async uploadToS3(file: Express.Multer.File, type: string): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const subdirectory = this.getSubdirectory(type);
    const key = `${subdirectory}/${uuidv4()}${fileExtension}`;

    try {
      const result = await this.s3Service.upload(key, file.buffer, {
        contentType: file.mimetype,
      });

      this.logger.debug(`Uploaded file to S3: ${result.url}`);
      return result.url;
    } catch (error: any) {
      this.logger.error(`Failed to upload to S3: ${error.message}`);
      throw error;
    }
  }

  private async uploadToLocal(file: Express.Multer.File, type: string): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const subdirectory = this.getSubdirectory(type);
    const filePath = path.join(this.uploadDirectory, subdirectory, fileName);

    fs.writeFileSync(filePath, file.buffer);

    return `/${subdirectory}/${fileName}`;
  }

  async uploadMultipleFiles(files: Express.Multer.File[], type: string): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, type)));
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (this.storageMode === 's3') {
      // Extract key from S3 URL
      const bucket = this.configService.get('AWS_S3_BUCKET');
      const s3UrlPattern = new RegExp(`https://${bucket}\\.s3\\.amazonaws\\.com/(.+)`);
      const match = fileUrl.match(s3UrlPattern);

      if (match) {
        const key = match[1];
        await this.s3Service.delete(key);
        this.logger.debug(`Deleted file from S3: ${key}`);
      }
      return;
    }

    // Local file deletion
    const filePath = path.join(this.uploadDirectory, fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private getSubdirectory(type: string): string {
    const typeMap: Record<string, string> = {
      image: 'images',
      video: 'videos',
      audio: 'audio',
      file: 'files',
    };

    return typeMap[type] || 'files';
  }

  getFileUrl(fileUrlOrPath: string): string {
    // If it's already a full URL (S3), return as is
    if (fileUrlOrPath.startsWith('http://') || fileUrlOrPath.startsWith('https://')) {
      return fileUrlOrPath;
    }

    // Local file path - prepend base URL
    return `${this.baseUrl}/uploads${fileUrlOrPath}`;
  }
}
