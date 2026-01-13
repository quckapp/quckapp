import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { File, FileDocument, FileType, FileStatus } from './schemas/file.schema';
import {
  CreateFileDto,
  UploadUrlRequestDto,
  CompleteUploadDto,
  UpdateFileDto,
  FileQueryDto,
} from './dto';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class FilesService {
  private s3Client: S3Client;
  private bucket: string;
  private cdnUrl: string;

  constructor(
    @InjectModel(File.name)
    private fileModel: Model<FileDocument>,
    private configService: ConfigService,
    private workspacesService: WorkspacesService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      endpoint: this.configService.get('S3_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
    this.bucket = this.configService.get('S3_BUCKET', 'quickchat-files');
    this.cdnUrl = this.configService.get('CDN_URL', '');
  }

  async requestUploadUrl(
    workspaceId: string,
    dto: UploadUrlRequestDto,
    userId: string,
  ): Promise<{ uploadUrl: string; fileId: string; file: File }> {
    // Verify workspace membership
    const membership = await this.workspacesService.getMember(workspaceId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    // Validate file size
    const maxSize = this.configService.get('MAX_FILE_SIZE', 100 * 1024 * 1024); // 100MB default
    if (dto.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)`);
    }

    // Determine file type from MIME
    const fileType = this.getFileType(dto.mimeType);
    const ext = path.extname(dto.filename).toLowerCase();
    const name = path.basename(dto.filename, ext);

    // Generate storage key
    const fileId = new Types.ObjectId();
    const storageKey = this.generateStorageKey(workspaceId, fileId.toString(), dto.filename);

    // Create file record
    const file = new this.fileModel({
      _id: fileId,
      workspaceId: new Types.ObjectId(workspaceId),
      channelId: dto.channelId ? new Types.ObjectId(dto.channelId) : undefined,
      uploadedBy: new Types.ObjectId(userId),
      filename: dto.filename,
      name,
      extension: ext.replace('.', ''),
      mimeType: dto.mimeType,
      size: dto.size,
      type: fileType,
      status: FileStatus.UPLOADING,
      storageKey,
      url: this.getFileUrl(storageKey),
    });

    await file.save();

    // Generate presigned upload URL
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: dto.mimeType,
      ContentLength: dto.size,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return {
      uploadUrl,
      fileId: fileId.toString(),
      file,
    };
  }

  async completeUpload(
    workspaceId: string,
    dto: CompleteUploadDto,
    userId: string,
  ): Promise<File> {
    const file = await this.fileModel.findOne({
      _id: new Types.ObjectId(dto.fileId),
      workspaceId: new Types.ObjectId(workspaceId),
      uploadedBy: new Types.ObjectId(userId),
      status: FileStatus.UPLOADING,
    });

    if (!file) {
      throw new NotFoundException('File not found or upload already completed');
    }

    file.status = FileStatus.PROCESSING;
    if (dto.hash) {
      file.hash = dto.hash;
    }

    await file.save();

    // TODO: Trigger async processing for thumbnails, variants, etc.
    // For now, mark as ready
    file.status = FileStatus.READY;
    await file.save();

    // Update workspace storage usage
    await this.workspacesService.updateUsage(workspaceId, {
      storageUsedBytes: file.size,
      fileCount: 1,
    });

    return file;
  }

  async findAll(
    workspaceId: string,
    userId: string,
    query: FileQueryDto,
  ): Promise<{ files: File[]; total: number; page: number; limit: number }> {
    const membership = await this.workspacesService.getMember(workspaceId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const filter: any = {
      workspaceId: new Types.ObjectId(workspaceId),
      status: FileStatus.READY,
    };

    if (query.type) filter.type = query.type;
    if (query.channelId) filter.channelId = new Types.ObjectId(query.channelId);
    if (query.uploadedBy) filter.uploadedBy = new Types.ObjectId(query.uploadedBy);
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      this.fileModel
        .find(filter)
        .populate('uploadedBy', 'displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.fileModel.countDocuments(filter),
    ]);

    return { files, total, page, limit };
  }

  async findOne(fileId: string, userId?: string): Promise<File> {
    const file = await this.fileModel.findById(fileId);
    if (!file || file.status === FileStatus.DELETED) {
      throw new NotFoundException('File not found');
    }

    // Check access if not public
    if (!file.isPublic && userId) {
      const membership = await this.workspacesService.getMember(
        file.workspaceId.toString(),
        userId,
      );
      if (!membership) {
        throw new ForbiddenException('You do not have access to this file');
      }
    }

    return file;
  }

  async update(fileId: string, dto: UpdateFileDto, userId: string): Promise<File> {
    const file = await this.findOne(fileId, userId);

    // Only uploader or admins can update
    if (file.uploadedBy.toString() !== userId) {
      const membership = await this.workspacesService.getMember(
        file.workspaceId.toString(),
        userId,
      );
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new ForbiddenException('You do not have permission to update this file');
      }
    }

    if (dto.name !== undefined) file.name = dto.name;
    if (dto.description !== undefined) file.description = dto.description;
    if (dto.tags !== undefined) file.tags = dto.tags;
    if (dto.isPublic !== undefined) file.isPublic = dto.isPublic;

    return file.save();
  }

  async delete(fileId: string, userId: string): Promise<void> {
    const file = await this.findOne(fileId, userId);

    // Only uploader or admins can delete
    if (file.uploadedBy.toString() !== userId) {
      const membership = await this.workspacesService.getMember(
        file.workspaceId.toString(),
        userId,
      );
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new ForbiddenException('You do not have permission to delete this file');
      }
    }

    // Soft delete
    file.status = FileStatus.DELETED;
    file.deletedAt = new Date();
    file.deletedBy = new Types.ObjectId(userId);
    await file.save();

    // Update workspace storage usage
    await this.workspacesService.updateUsage(file.workspaceId.toString(), {
      storageUsedBytes: -file.size,
      fileCount: -1,
    });

    // TODO: Schedule actual S3 deletion after retention period
  }

  async getDownloadUrl(fileId: string, userId: string): Promise<string> {
    const file = await this.findOne(fileId, userId);

    // Increment download count
    await this.fileModel.updateOne(
      { _id: file._id },
      { $inc: { downloadCount: 1 } },
    );

    // Generate presigned download URL
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: file.storageKey,
      ResponseContentDisposition: `attachment; filename="${file.filename}"`,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async getFilesByChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
    options?: { type?: FileType; limit?: number; offset?: number },
  ): Promise<{ files: File[]; total: number }> {
    const membership = await this.workspacesService.getMember(workspaceId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const filter: any = {
      workspaceId: new Types.ObjectId(workspaceId),
      channelId: new Types.ObjectId(channelId),
      status: FileStatus.READY,
    };

    if (options?.type) filter.type = options.type;

    const [files, total] = await Promise.all([
      this.fileModel
        .find(filter)
        .populate('uploadedBy', 'displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(options?.offset || 0)
        .limit(options?.limit || 20),
      this.fileModel.countDocuments(filter),
    ]);

    return { files, total };
  }

  async getStorageStats(workspaceId: string, userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<FileType, { count: number; size: number }>;
  }> {
    const membership = await this.workspacesService.getMember(workspaceId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const stats = await this.fileModel.aggregate([
      {
        $match: {
          workspaceId: new Types.ObjectId(workspaceId),
          status: FileStatus.READY,
        },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          size: { $sum: '$size' },
        },
      },
    ]);

    const byType: Record<string, { count: number; size: number }> = {};
    let totalFiles = 0;
    let totalSize = 0;

    for (const stat of stats) {
      byType[stat._id] = { count: stat.count, size: stat.size };
      totalFiles += stat.count;
      totalSize += stat.size;
    }

    return { totalFiles, totalSize, byType: byType as any };
  }

  // Utility methods
  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation') ||
      mimeType.includes('text/')
    ) {
      return FileType.DOCUMENT;
    }
    if (
      mimeType.includes('zip') ||
      mimeType.includes('tar') ||
      mimeType.includes('rar') ||
      mimeType.includes('7z')
    ) {
      return FileType.ARCHIVE;
    }
    return FileType.OTHER;
  }

  private generateStorageKey(workspaceId: string, fileId: string, filename: string): string {
    const ext = path.extname(filename);
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `workspaces/${workspaceId}/files/${year}/${month}/${fileId}${ext}`;
  }

  private getFileUrl(storageKey: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${storageKey}`;
    }
    const endpoint = this.configService.get('S3_ENDPOINT', '');
    return `${endpoint}/${this.bucket}/${storageKey}`;
  }
}
