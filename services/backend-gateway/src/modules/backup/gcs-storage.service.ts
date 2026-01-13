import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket } from '@google-cloud/storage';
import { Readable } from 'stream';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

@Injectable()
export class GcsStorageService {
  private readonly logger = new Logger(GcsStorageService.name);
  private storage: Storage | null = null;
  private bucket: Bucket | null = null;
  private readonly bucketName: string;
  private readonly projectId: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || '';
    this.projectId = this.configService.get<string>('GCS_PROJECT_ID') || '';
    const keyFilePath = this.configService.get<string>('GCS_KEY_FILE_PATH');
    const credentialsJson = this.configService.get<string>('GCS_CREDENTIALS_JSON');
    const accessKey = this.configService.get<string>('GCS_ACCESS_KEY');
    const secretKey = this.configService.get<string>('GCS_SECRET_KEY');

    if (this.bucketName && this.projectId) {
      try {
        let storageConfig: any = { projectId: this.projectId };

        // Priority: 1. Key file path, 2. JSON credentials, 3. HMAC keys
        if (keyFilePath) {
          storageConfig.keyFilename = keyFilePath;
          this.logger.log('Using service account key file');
        } else if (credentialsJson) {
          storageConfig.credentials = JSON.parse(credentialsJson);
          this.logger.log('Using JSON credentials');
        } else if (accessKey && secretKey) {
          // For HMAC keys, we use interoperability mode
          storageConfig = {
            projectId: this.projectId,
            credentials: {
              client_email: accessKey,
              private_key: secretKey,
            },
          };
          this.logger.log('Using HMAC access keys');
        }

        this.storage = new Storage(storageConfig);
        this.bucket = this.storage.bucket(this.bucketName);
        this.isConfigured = true;
        this.logger.log(`GCS Storage initialized: gs://${this.bucketName}`);
      } catch (error) {
        this.logger.error('Failed to initialize GCS Storage:', error);
        this.isConfigured = false;
      }
    } else {
      this.logger.warn('GCS Storage not configured - missing project ID or bucket name');
      this.isConfigured = false;
    }
  }

  /**
   * Check if GCS is configured
   */
  isAvailable(): boolean {
    return this.isConfigured && this.bucket !== null;
  }

  /**
   * Upload file to GCS
   */
  async uploadFile(
    buffer: Buffer,
    destinationPath: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'GCS not configured' };
    }

    try {
      const file = this.bucket!.file(destinationPath);

      await file.save(buffer, {
        contentType,
        metadata: {
          cacheControl: 'public, max-age=31536000',
          ...metadata,
        },
        resumable: false,
      });

      // Make file public (optional - remove if bucket is private)
      try {
        await file.makePublic();
      } catch {
        // Ignore if public access is not allowed
      }

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destinationPath}`;

      this.logger.log(`Uploaded to GCS: ${destinationPath}`);

      return {
        success: true,
        url: publicUrl,
        path: destinationPath,
      };
    } catch (error) {
      this.logger.error(`Failed to upload to GCS: ${destinationPath}`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Upload stream to GCS
   */
  async uploadStream(
    stream: Readable,
    destinationPath: string,
    contentType: string,
  ): Promise<UploadResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'GCS not configured' };
    }

    try {
      const file = this.bucket!.file(destinationPath);
      const writeStream = file.createWriteStream({
        contentType,
        resumable: false,
      });

      return new Promise((resolve) => {
        stream
          .pipe(writeStream)
          .on('finish', () => {
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destinationPath}`;
            this.logger.log(`Stream uploaded to GCS: ${destinationPath}`);
            resolve({ success: true, url: publicUrl, path: destinationPath });
          })
          .on('error', (error) => {
            this.logger.error(`Failed to upload stream to GCS`, error);
            resolve({ success: false, error: error.message });
          });
      });
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Download file from GCS
   */
  async downloadFile(filePath: string): Promise<Buffer | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const file = this.bucket!.file(filePath);
      const [contents] = await file.download();
      return contents;
    } catch (error) {
      this.logger.error(`Failed to download from GCS: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Delete file from GCS
   */
  async deleteFile(filePath: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const file = this.bucket!.file(filePath);
      await file.delete();
      this.logger.log(`Deleted from GCS: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete from GCS: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const file = this.bucket!.file(filePath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(prefix: string): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const [files] = await this.bucket!.getFiles({ prefix });
      return files.map((file) => file.name);
    } catch (error) {
      this.logger.error(`Failed to list files in GCS: ${prefix}`, error);
      return [];
    }
  }

  /**
   * Generate signed URL for temporary access
   */
  async getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const file = this.bucket!.file(filePath);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      });
      return url;
    } catch (error) {
      this.logger.error(`Failed to get signed URL for: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Copy file within GCS
   */
  async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const sourceFile = this.bucket!.file(sourcePath);
      const destFile = this.bucket!.file(destinationPath);
      await sourceFile.copy(destFile);
      this.logger.log(`Copied in GCS: ${sourcePath} -> ${destinationPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to copy in GCS`, error);
      return false;
    }
  }

  /**
   * Get bucket info
   */
  async getBucketInfo(): Promise<{ name: string; location?: string } | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const [metadata] = await this.bucket!.getMetadata();
      return {
        name: this.bucketName,
        location: metadata.location,
      };
    } catch (error) {
      this.logger.error('Failed to get bucket info', error);
      return null;
    }
  }
}
