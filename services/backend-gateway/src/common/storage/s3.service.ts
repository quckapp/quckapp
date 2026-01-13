import {
  Injectable,
  OnModuleInit,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  S3ClientConfig,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

/**
 * S3 Module Options
 */
export interface S3ModuleOptions {
  /** AWS Region */
  region?: string;
  /** S3 Bucket name */
  bucket?: string;
  /** Access Key ID (optional if using IAM roles) */
  accessKeyId?: string;
  /** Secret Access Key (optional if using IAM roles) */
  secretAccessKey?: string;
  /** Custom S3 endpoint (for MinIO, LocalStack, etc.) */
  endpoint?: string;
  /** Force path style (required for MinIO) */
  forcePathStyle?: boolean;
  /** Default ACL for uploaded objects */
  defaultAcl?: ObjectCannedACL;
  /** Default cache control header */
  defaultCacheControl?: string;
  /** Enable server-side encryption */
  enableEncryption?: boolean;
  /** Encryption algorithm */
  encryptionAlgorithm?: 'AES256' | 'aws:kms';
  /** KMS Key ID (if using KMS encryption) */
  kmsKeyId?: string;
}

export const S3_MODULE_OPTIONS = 'S3_MODULE_OPTIONS';

/**
 * Upload options
 */
export interface UploadOptions {
  /** Content type */
  contentType?: string;
  /** ACL */
  acl?: ObjectCannedACL;
  /** Cache control */
  cacheControl?: string;
  /** Content disposition */
  contentDisposition?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Tags */
  tags?: Record<string, string>;
  /** Storage class */
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'INTELLIGENT_TIERING' | 'GLACIER' | 'DEEP_ARCHIVE';
}

/**
 * Presigned URL options
 */
export interface PresignedUrlOptions {
  /** URL expiration in seconds (default: 3600) */
  expiresIn?: number;
  /** Content type (for upload URLs) */
  contentType?: string;
  /** Response content disposition */
  responseContentDisposition?: string;
  /** Response content type */
  responseContentType?: string;
}

/**
 * Upload result
 */
export interface UploadResult {
  /** Object key */
  key: string;
  /** Bucket name */
  bucket: string;
  /** Public URL (if applicable) */
  url: string;
  /** ETag */
  etag?: string;
  /** Version ID */
  versionId?: string;
  /** Content type */
  contentType?: string;
  /** File size */
  size?: number;
}

/**
 * Object metadata
 */
export interface ObjectMetadata {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  storageClass?: string;
}

/**
 * S3 Storage Service
 *
 * Features:
 * - File upload (single and multipart)
 * - File download with streaming
 * - Presigned URLs for secure access
 * - File deletion (single and bulk)
 * - File copying and moving
 * - Metadata management
 * - Support for S3-compatible services (MinIO, LocalStack)
 */
@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client;
  private bucket: string;
  private readonly defaultAcl: ObjectCannedACL;
  private readonly defaultCacheControl: string;
  private readonly enableEncryption: boolean;
  private readonly encryptionAlgorithm: string;
  private readonly kmsKeyId?: string;
  private readonly endpoint?: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(S3_MODULE_OPTIONS)
    private readonly options?: S3ModuleOptions,
  ) {
    this.bucket =
      this.options?.bucket ||
      this.configService.get<string>('AWS_S3_BUCKET') ||
      'quckchat-uploads';

    this.defaultAcl = this.options?.defaultAcl || 'private';
    this.defaultCacheControl =
      this.options?.defaultCacheControl || 'max-age=31536000';
    this.enableEncryption = this.options?.enableEncryption ?? true;
    this.encryptionAlgorithm = this.options?.encryptionAlgorithm || 'AES256';
    this.kmsKeyId = this.options?.kmsKeyId;
    this.endpoint = this.options?.endpoint || this.configService.get<string>('AWS_S3_ENDPOINT');
  }

  async onModuleInit() {
    const region =
      this.options?.region ||
      this.configService.get<string>('AWS_REGION') ||
      'us-east-1';

    const config: S3ClientConfig = {
      region,
    };

    // Custom endpoint for S3-compatible services
    if (this.endpoint) {
      config.endpoint = this.endpoint;
      config.forcePathStyle = this.options?.forcePathStyle ?? true;
    }

    // Explicit credentials (optional - prefer IAM roles in production)
    const accessKeyId =
      this.options?.accessKeyId ||
      this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey =
      this.options?.secretAccessKey ||
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (accessKeyId && secretAccessKey) {
      config.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.client = new S3Client(config);
    this.logger.log(`S3 service initialized for bucket: ${this.bucket}`);
  }

  /**
   * Upload a file to S3
   */
  async upload(
    key: string,
    body: Buffer | Readable | string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const contentType = options?.contentType || 'application/octet-stream';

    const params: any = {
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: options?.cacheControl || this.defaultCacheControl,
    };

    // Only set ACL if explicitly provided (bucket policy handles public access)
    if (options?.acl) {
      params.ACL = options.acl;
    }

    // Add encryption
    if (this.enableEncryption) {
      params.ServerSideEncryption = this.encryptionAlgorithm;
      if (this.encryptionAlgorithm === 'aws:kms' && this.kmsKeyId) {
        params.SSEKMSKeyId = this.kmsKeyId;
      }
    }

    // Add optional parameters
    if (options?.contentDisposition) {
      params.ContentDisposition = options.contentDisposition;
    }
    if (options?.metadata) {
      params.Metadata = options.metadata;
    }
    if (options?.storageClass) {
      params.StorageClass = options.storageClass;
    }
    if (options?.tags) {
      params.Tagging = Object.entries(options.tags)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    }

    try {
      const command = new PutObjectCommand(params);
      const result = await this.client.send(command);

      const size = Buffer.isBuffer(body) ? body.length : undefined;

      this.logger.debug(`Uploaded file: ${key}`);

      return {
        key,
        bucket: this.bucket,
        url: this.getPublicUrl(key),
        etag: result.ETag?.replace(/"/g, ''),
        versionId: result.VersionId,
        contentType,
        size,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload a large file using multipart upload
   */
  async uploadLarge(
    key: string,
    body: Readable | Buffer,
    options?: UploadOptions & { partSize?: number },
  ): Promise<UploadResult> {
    const contentType = options?.contentType || 'application/octet-stream';

    const params: any = {
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: options?.acl || this.defaultAcl,
    };

    if (this.enableEncryption) {
      params.ServerSideEncryption = this.encryptionAlgorithm;
    }

    if (options?.metadata) {
      params.Metadata = options.metadata;
    }

    try {
      const upload = new Upload({
        client: this.client,
        params,
        partSize: options?.partSize || 5 * 1024 * 1024, // 5MB parts
        queueSize: 4, // Concurrent uploads
      });

      upload.on('httpUploadProgress', (progress) => {
        this.logger.debug(
          `Upload progress for ${key}: ${progress.loaded}/${progress.total}`,
        );
      });

      const result = await upload.done();

      this.logger.debug(`Uploaded large file: ${key}`);

      return {
        key,
        bucket: this.bucket,
        url: this.getPublicUrl(key),
        etag: result.ETag?.replace(/"/g, ''),
        versionId: result.VersionId,
        contentType,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload large file ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download a file from S3
   */
  async download(key: string): Promise<{
    body: Readable;
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
  }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const result = await this.client.send(command);

      return {
        body: result.Body as Readable,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        metadata: result.Metadata,
      };
    } catch (error: any) {
      this.logger.error(`Failed to download ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download file as buffer
   */
  async downloadAsBuffer(key: string): Promise<Buffer> {
    const { body } = await this.download(key);
    const chunks: Buffer[] = [];

    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      this.logger.debug(`Deleted file: ${key}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteMany(keys: string[]): Promise<{ deleted: string[]; errors: string[] }> {
    if (keys.length === 0) {
      return { deleted: [], errors: [] };
    }

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
          Quiet: false,
        },
      });

      const result = await this.client.send(command);

      const deleted = result.Deleted?.map((d) => d.Key!) || [];
      const errors = result.Errors?.map((e) => e.Key!) || [];

      this.logger.debug(`Deleted ${deleted.length} files, ${errors.length} errors`);

      return { deleted, errors };
    } catch (error: any) {
      this.logger.error(`Failed to delete multiple files: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const result = await this.client.send(command);

      return {
        key,
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
        etag: result.ETag?.replace(/"/g, ''),
        contentType: result.ContentType,
        metadata: result.Metadata,
        storageClass: result.StorageClass,
      };
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  /**
   * List files with a prefix
   */
  async list(
    prefix: string,
    options?: { maxKeys?: number; continuationToken?: string },
  ): Promise<{
    objects: ObjectMetadata[];
    nextToken?: string;
    isTruncated: boolean;
  }> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: options?.maxKeys || 1000,
        ContinuationToken: options?.continuationToken,
      });

      const result = await this.client.send(command);

      const objects: ObjectMetadata[] = (result.Contents || []).map((obj) => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag?.replace(/"/g, ''),
        storageClass: obj.StorageClass,
      }));

      return {
        objects,
        nextToken: result.NextContinuationToken,
        isTruncated: result.IsTruncated || false,
      };
    } catch (error: any) {
      this.logger.error(`Failed to list files with prefix ${prefix}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Copy a file within S3
   */
  async copy(
    sourceKey: string,
    destinationKey: string,
    options?: { sourceBucket?: string },
  ): Promise<UploadResult> {
    try {
      const sourceBucket = options?.sourceBucket || this.bucket;

      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `${sourceBucket}/${sourceKey}`,
        ACL: this.defaultAcl,
      });

      const result = await this.client.send(command);

      return {
        key: destinationKey,
        bucket: this.bucket,
        url: this.getPublicUrl(destinationKey),
        etag: result.CopyObjectResult?.ETag?.replace(/"/g, ''),
        versionId: result.VersionId,
      };
    } catch (error: any) {
      this.logger.error(`Failed to copy ${sourceKey} to ${destinationKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Move a file within S3 (copy + delete)
   */
  async move(
    sourceKey: string,
    destinationKey: string,
    options?: { sourceBucket?: string },
  ): Promise<UploadResult> {
    const result = await this.copy(sourceKey, destinationKey, options);
    await this.delete(sourceKey);
    return result;
  }

  /**
   * Generate a presigned URL for downloading
   */
  async getDownloadUrl(
    key: string,
    options?: PresignedUrlOptions,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: options?.responseContentDisposition,
      ResponseContentType: options?.responseContentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: options?.expiresIn || 3600,
    });
  }

  /**
   * Generate a presigned URL for uploading
   */
  async getUploadUrl(
    key: string,
    options?: PresignedUrlOptions,
  ): Promise<string> {
    const params: any = {
      Bucket: this.bucket,
      Key: key,
    };

    if (options?.contentType) {
      params.ContentType = options.contentType;
    }

    const command = new PutObjectCommand(params);

    return getSignedUrl(this.client, command, {
      expiresIn: options?.expiresIn || 3600,
    });
  }

  /**
   * Get the public URL for an object
   */
  getPublicUrl(key: string): string {
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  /**
   * Get the S3 client for advanced operations
   */
  getClient(): S3Client {
    return this.client;
  }

  /**
   * Get the bucket name
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * Generate a unique key for a file
   */
  generateKey(
    prefix: string,
    filename: string,
    options?: { preserveExtension?: boolean; timestamp?: boolean },
  ): string {
    const ext = filename.includes('.')
      ? filename.substring(filename.lastIndexOf('.'))
      : '';
    const timestamp = options?.timestamp !== false ? Date.now() : '';
    const random = Math.random().toString(36).substring(2, 8);

    if (options?.preserveExtension !== false) {
      return `${prefix}/${timestamp}-${random}${ext}`;
    }
    return `${prefix}/${timestamp}-${random}`;
  }
}
