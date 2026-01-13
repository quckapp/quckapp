import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true, collection: 'media' })
export class Media {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({ required: true, index: true })
  filename: string;

  @Prop({ required: true })
  originalFilename: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({
    required: true,
    enum: ['image', 'video', 'audio', 'document', 'other'],
    index: true,
  })
  type: string;

  @Prop({ required: true })
  size: number; // in bytes

  @Prop({ required: true })
  path: string; // storage path (local or cloud)

  @Prop({ default: null })
  url: string;

  @Prop({ default: null })
  thumbnailPath: string;

  @Prop({ default: null })
  thumbnailUrl: string;

  @Prop({
    type: {
      width: Number,
      height: Number,
      duration: Number, // for video/audio in seconds
      bitrate: Number,
      codec: String,
    },
    default: {},
  })
  dimensions: {
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    codec?: string;
  };

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', index: true })
  conversationId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  messageId: string;

  @Prop({
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
    index: true,
  })
  status: string;

  @Prop({ default: null })
  processingError: string;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ default: null })
  expiresAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;

  @Prop({
    enum: ['local', 's3', 'gcs', 'azure'],
    default: 'local',
  })
  storageProvider: string;

  @Prop({ default: null })
  storageBucket: string;

  @Prop({ default: null })
  storageKey: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

// Indexes
MediaSchema.index({ userId: 1, createdAt: -1 });
MediaSchema.index({ conversationId: 1, type: 1 });
MediaSchema.index({ messageId: 1 });
MediaSchema.index({ status: 1, createdAt: -1 });
MediaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Storage Usage Schema
@Schema({ timestamps: true, collection: 'storage_usage' })
export class StorageUsage {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    unique: true,
    index: true,
  })
  userId: string;

  @Prop({ default: 0 })
  totalBytes: number;

  @Prop({ default: 0 })
  imageBytes: number;

  @Prop({ default: 0 })
  videoBytes: number;

  @Prop({ default: 0 })
  audioBytes: number;

  @Prop({ default: 0 })
  documentBytes: number;

  @Prop({ default: 0 })
  otherBytes: number;

  @Prop({ default: 0 })
  fileCount: number;

  @Prop({ default: 5368709120 }) // 5GB default quota
  quotaBytes: number;

  @Prop({ default: null })
  lastCalculatedAt: Date;
}

export type StorageUsageDocument = StorageUsage & Document;
export const StorageUsageSchema = SchemaFactory.createForClass(StorageUsage);
