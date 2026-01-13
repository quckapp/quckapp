import { Request } from 'express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

/**
 * File Upload Configuration
 *
 * Provides multer configurations for different upload scenarios:
 * - Local disk storage
 * - Memory storage (for S3 uploads)
 * - Type-specific configurations
 */

/**
 * Allowed MIME types by category
 */
export const ALLOWED_MIME_TYPES = {
  IMAGE: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ],
  VIDEO: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ],
  AUDIO: [
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/aac',
    'audio/flac',
  ],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
  ],
  ARCHIVE: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
  ],
};

/**
 * File size limits by category (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
  ARCHIVE: 50 * 1024 * 1024, // 50MB
  AVATAR: 5 * 1024 * 1024, // 5MB
  MESSAGE_ATTACHMENT: 25 * 1024 * 1024, // 25MB
  DEFAULT: 10 * 1024 * 1024, // 10MB
};

/**
 * Upload destinations
 */
export const UPLOAD_DESTINATIONS = {
  AVATARS: 'avatars',
  MESSAGES: 'messages',
  MEDIA: 'media',
  DOCUMENTS: 'documents',
  TEMP: 'temp',
};

/**
 * Upload configuration options
 */
export interface UploadConfigOptions {
  /** Destination folder */
  destination?: string;
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
  /** Max file size in bytes */
  maxFileSize?: number;
  /** Max number of files */
  maxFiles?: number;
  /** Use memory storage instead of disk */
  useMemoryStorage?: boolean;
  /** Custom filename generator */
  filenameGenerator?: (
    req: Request,
    file: Express.Multer.File,
  ) => string;
  /** File filter function */
  fileFilter?: (
    req: Request,
    file: Express.Multer.File,
  ) => boolean | string;
}

/**
 * Generate unique filename
 */
export function generateFilename(
  originalName: string,
  prefix?: string,
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const ext = extname(originalName).toLowerCase();
  const safeName = originalName
    .replace(ext, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .substring(0, 50);

  return prefix
    ? `${prefix}-${timestamp}-${random}-${safeName}${ext}`
    : `${timestamp}-${random}-${safeName}${ext}`;
}

/**
 * Ensure upload directory exists
 */
export function ensureUploadDir(uploadPath: string): void {
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }
}

/**
 * Get MIME type category
 */
export function getMimeTypeCategory(
  mimeType: string,
): keyof typeof ALLOWED_MIME_TYPES | null {
  for (const [category, types] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (types.includes(mimeType)) {
      return category as keyof typeof ALLOWED_MIME_TYPES;
    }
  }
  return null;
}

/**
 * Validate file MIME type
 */
export function validateMimeType(
  mimeType: string,
  allowedTypes: string[],
): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Create multer file filter
 */
export function createFileFilter(
  allowedMimeTypes: string[],
  customFilter?: (req: Request, file: Express.Multer.File) => boolean | string,
): MulterOptions['fileFilter'] {
  return (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    // Check custom filter first
    if (customFilter) {
      const result = customFilter(req, file);
      if (typeof result === 'string') {
        return callback(new BadRequestException(result), false);
      }
      if (!result) {
        return callback(
          new BadRequestException('File rejected by custom filter'),
          false,
        );
      }
    }

    // Check MIME type
    if (!validateMimeType(file.mimetype, allowedMimeTypes)) {
      return callback(
        new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        ),
        false,
      );
    }

    callback(null, true);
  };
}

/**
 * Create disk storage configuration
 */
export function createDiskStorage(
  destination: string,
  filenameGenerator?: (req: Request, file: Express.Multer.File) => string,
): ReturnType<typeof diskStorage> {
  const uploadPath = join(process.cwd(), 'uploads', destination);
  ensureUploadDir(uploadPath);

  return diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const filename = filenameGenerator
        ? filenameGenerator(req, file)
        : generateFilename(file.originalname);
      cb(null, filename);
    },
  });
}

/**
 * Create multer configuration
 */
export function createMulterConfig(options: UploadConfigOptions): MulterOptions {
  const {
    destination = 'uploads',
    allowedMimeTypes = [
      ...ALLOWED_MIME_TYPES.IMAGE,
      ...ALLOWED_MIME_TYPES.DOCUMENT,
    ],
    maxFileSize = FILE_SIZE_LIMITS.DEFAULT,
    useMemoryStorage = false,
    filenameGenerator,
    fileFilter,
  } = options;

  return {
    storage: useMemoryStorage
      ? memoryStorage()
      : createDiskStorage(destination, filenameGenerator),
    fileFilter: createFileFilter(allowedMimeTypes, fileFilter),
    limits: {
      fileSize: maxFileSize,
      files: options.maxFiles || 10,
    },
  };
}

/**
 * Pre-configured multer options for common use cases
 */
export const MULTER_CONFIGS = {
  /**
   * Avatar upload configuration
   */
  AVATAR: createMulterConfig({
    destination: UPLOAD_DESTINATIONS.AVATARS,
    allowedMimeTypes: ALLOWED_MIME_TYPES.IMAGE,
    maxFileSize: FILE_SIZE_LIMITS.AVATAR,
    maxFiles: 1,
  }),

  /**
   * Avatar upload for S3 (memory storage)
   */
  AVATAR_S3: createMulterConfig({
    allowedMimeTypes: ALLOWED_MIME_TYPES.IMAGE,
    maxFileSize: FILE_SIZE_LIMITS.AVATAR,
    maxFiles: 1,
    useMemoryStorage: true,
  }),

  /**
   * Message attachment configuration
   */
  MESSAGE_ATTACHMENT: createMulterConfig({
    destination: UPLOAD_DESTINATIONS.MESSAGES,
    allowedMimeTypes: [
      ...ALLOWED_MIME_TYPES.IMAGE,
      ...ALLOWED_MIME_TYPES.VIDEO,
      ...ALLOWED_MIME_TYPES.AUDIO,
      ...ALLOWED_MIME_TYPES.DOCUMENT,
    ],
    maxFileSize: FILE_SIZE_LIMITS.MESSAGE_ATTACHMENT,
    maxFiles: 10,
  }),

  /**
   * Message attachment for S3 (memory storage)
   */
  MESSAGE_ATTACHMENT_S3: createMulterConfig({
    allowedMimeTypes: [
      ...ALLOWED_MIME_TYPES.IMAGE,
      ...ALLOWED_MIME_TYPES.VIDEO,
      ...ALLOWED_MIME_TYPES.AUDIO,
      ...ALLOWED_MIME_TYPES.DOCUMENT,
    ],
    maxFileSize: FILE_SIZE_LIMITS.MESSAGE_ATTACHMENT,
    maxFiles: 10,
    useMemoryStorage: true,
  }),

  /**
   * Image only configuration
   */
  IMAGE: createMulterConfig({
    destination: UPLOAD_DESTINATIONS.MEDIA,
    allowedMimeTypes: ALLOWED_MIME_TYPES.IMAGE,
    maxFileSize: FILE_SIZE_LIMITS.IMAGE,
    maxFiles: 20,
  }),

  /**
   * Image only for S3 (memory storage)
   */
  IMAGE_S3: createMulterConfig({
    allowedMimeTypes: ALLOWED_MIME_TYPES.IMAGE,
    maxFileSize: FILE_SIZE_LIMITS.IMAGE,
    maxFiles: 20,
    useMemoryStorage: true,
  }),

  /**
   * Video configuration
   */
  VIDEO: createMulterConfig({
    destination: UPLOAD_DESTINATIONS.MEDIA,
    allowedMimeTypes: ALLOWED_MIME_TYPES.VIDEO,
    maxFileSize: FILE_SIZE_LIMITS.VIDEO,
    maxFiles: 5,
  }),

  /**
   * Video for S3 (memory storage)
   */
  VIDEO_S3: createMulterConfig({
    allowedMimeTypes: ALLOWED_MIME_TYPES.VIDEO,
    maxFileSize: FILE_SIZE_LIMITS.VIDEO,
    maxFiles: 5,
    useMemoryStorage: true,
  }),

  /**
   * Document configuration
   */
  DOCUMENT: createMulterConfig({
    destination: UPLOAD_DESTINATIONS.DOCUMENTS,
    allowedMimeTypes: ALLOWED_MIME_TYPES.DOCUMENT,
    maxFileSize: FILE_SIZE_LIMITS.DOCUMENT,
    maxFiles: 10,
  }),

  /**
   * Document for S3 (memory storage)
   */
  DOCUMENT_S3: createMulterConfig({
    allowedMimeTypes: ALLOWED_MIME_TYPES.DOCUMENT,
    maxFileSize: FILE_SIZE_LIMITS.DOCUMENT,
    maxFiles: 10,
    useMemoryStorage: true,
  }),

  /**
   * Generic file upload for S3
   */
  GENERIC_S3: createMulterConfig({
    allowedMimeTypes: [
      ...ALLOWED_MIME_TYPES.IMAGE,
      ...ALLOWED_MIME_TYPES.VIDEO,
      ...ALLOWED_MIME_TYPES.AUDIO,
      ...ALLOWED_MIME_TYPES.DOCUMENT,
      ...ALLOWED_MIME_TYPES.ARCHIVE,
    ],
    maxFileSize: FILE_SIZE_LIMITS.VIDEO, // Use largest limit
    maxFiles: 10,
    useMemoryStorage: true,
  }),
};

/**
 * File info interface for uploaded files
 */
export interface UploadedFileInfo {
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path?: string;
  url?: string;
  key?: string;
  bucket?: string;
}

/**
 * Convert multer file to file info
 */
export function toFileInfo(
  file: Express.Multer.File,
  baseUrl?: string,
): UploadedFileInfo {
  return {
    originalName: file.originalname,
    filename: file.filename || file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    url: file.path && baseUrl
      ? `${baseUrl}/uploads/${file.filename}`
      : undefined,
  };
}

/**
 * Get content disposition for download
 */
export function getContentDisposition(
  filename: string,
  inline: boolean = false,
): string {
  const safeFilename = filename.replace(/[^\w\s.-]/g, '_');
  const utf8Filename = encodeURIComponent(filename);
  const disposition = inline ? 'inline' : 'attachment';

  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${utf8Filename}`;
}
