import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FileDocument = File & Document;

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted',
}

@Schema({ _id: false })
export class FileMetadata {
  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  duration?: number; // seconds for audio/video

  @Prop()
  pages?: number; // for documents

  @Prop()
  encoding?: string;

  @Prop()
  bitrate?: number;

  @Prop()
  sampleRate?: number;

  @Prop()
  channels?: number; // audio channels

  @Prop()
  frameRate?: number;

  @Prop()
  codec?: string;

  @Prop({ type: Object })
  exif?: Record<string, any>;
}

@Schema({ _id: false })
export class FileThumbnail {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  width: number;

  @Prop({ required: true })
  height: number;

  @Prop()
  size?: number;
}

@Schema({ _id: false })
export class FileVariant {
  @Prop({ required: true })
  name: string; // e.g., 'small', 'medium', 'large', 'hd', '4k'

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  size: number;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  mimeType?: string;
}

@Schema({
  timestamps: true,
  collection: 'files',
})
export class File {
  @ApiProperty({ description: 'File ID' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Workspace ID' })
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @ApiProperty({ description: 'Channel ID (if shared in channel)' })
  @Prop({ type: Types.ObjectId, ref: 'Channel', index: true })
  channelId?: Types.ObjectId;

  @ApiProperty({ description: 'Message ID (if attached to message)' })
  @Prop({ type: Types.ObjectId, ref: 'Message', index: true })
  messageId?: Types.ObjectId;

  @ApiProperty({ description: 'Uploader user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uploadedBy: Types.ObjectId;

  @ApiProperty({ description: 'Original filename' })
  @Prop({ required: true, maxlength: 255 })
  filename: string;

  @ApiProperty({ description: 'Original filename without extension' })
  @Prop({ required: true, maxlength: 200 })
  name: string;

  @ApiProperty({ description: 'File extension' })
  @Prop({ maxlength: 20 })
  extension?: string;

  @ApiProperty({ description: 'MIME type' })
  @Prop({ required: true })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @Prop({ required: true })
  size: number;

  @ApiProperty({ enum: FileType })
  @Prop({ enum: FileType, required: true, index: true })
  type: FileType;

  @ApiProperty({ enum: FileStatus })
  @Prop({ enum: FileStatus, default: FileStatus.UPLOADING, index: true })
  status: FileStatus;

  @ApiProperty({ description: 'Storage URL' })
  @Prop({ required: true })
  url: string;

  @ApiProperty({ description: 'Storage key/path' })
  @Prop({ required: true })
  storageKey: string;

  @ApiProperty({ description: 'Storage provider' })
  @Prop({ default: 's3' })
  storageProvider: string;

  @ApiProperty({ description: 'File metadata' })
  @Prop({ type: FileMetadata, default: {} })
  metadata: FileMetadata;

  @ApiProperty({ description: 'Thumbnail' })
  @Prop({ type: FileThumbnail })
  thumbnail?: FileThumbnail;

  @ApiProperty({ description: 'File variants (different sizes/formats)' })
  @Prop({ type: [FileVariant], default: [] })
  variants: FileVariant[];

  @ApiProperty({ description: 'Content hash (SHA256)' })
  @Prop()
  hash?: string;

  @ApiProperty({ description: 'Is file public' })
  @Prop({ default: false })
  isPublic: boolean;

  @ApiProperty({ description: 'Download count' })
  @Prop({ default: 0 })
  downloadCount: number;

  @ApiProperty({ description: 'Tags for organization' })
  @Prop({ type: [String], default: [] })
  tags: string[];

  @ApiProperty({ description: 'File description' })
  @Prop({ maxlength: 500 })
  description?: string;

  @ApiProperty({ description: 'Processing error message' })
  @Prop()
  errorMessage?: string;

  @ApiProperty({ description: 'Expiration date (for temporary files)' })
  @Prop()
  expiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  @ApiProperty({ description: 'Deletion date' })
  @Prop()
  deletedAt?: Date;

  @ApiProperty({ description: 'Deleted by user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;
}

export const FileSchema = SchemaFactory.createForClass(File);

// Indexes
FileSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
FileSchema.index({ workspaceId: 1, channelId: 1, status: 1 });
FileSchema.index({ workspaceId: 1, uploadedBy: 1 });
FileSchema.index({ workspaceId: 1, type: 1 });
FileSchema.index({ filename: 'text', name: 'text', description: 'text' });
FileSchema.index({ hash: 1 }, { sparse: true });
FileSchema.index({ expiresAt: 1 }, { sparse: true, expireAfterSeconds: 0 });
