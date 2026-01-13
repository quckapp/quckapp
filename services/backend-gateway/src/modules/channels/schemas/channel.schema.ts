import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ChannelDocument = Channel & Document;

export enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
  GROUP = 'group',
}

export enum ChannelStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Schema({ _id: false })
export class ChannelSettings {
  @Prop({ default: true })
  allowThreads: boolean;

  @Prop({ default: true })
  allowReactions: boolean;

  @Prop({ default: true })
  allowFileUploads: boolean;

  @Prop({ default: true })
  allowLinks: boolean;

  @Prop({ default: true })
  showJoinLeaveMessages: boolean;

  @Prop({ default: false })
  isReadOnly: boolean;

  @Prop({ type: [String], default: [] })
  allowedMentions: string[]; // ['everyone', 'channel', 'here']

  @Prop({ default: -1 }) // -1 = inherit from workspace
  messageRetentionDays: number;

  @Prop({ default: false })
  isAnnouncement: boolean;

  @Prop({ type: [Types.ObjectId], default: [] })
  pinnedMessageIds: Types.ObjectId[];
}

@Schema({ _id: false })
export class ChannelStats {
  @Prop({ default: 0 })
  memberCount: number;

  @Prop({ default: 0 })
  messageCount: number;

  @Prop({ default: 0 })
  fileCount: number;

  @Prop()
  lastMessageAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastMessageBy?: Types.ObjectId;
}

@Schema({
  timestamps: true,
  collection: 'channels',
})
export class Channel {
  @ApiProperty({ description: 'Channel ID' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Workspace ID' })
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @ApiProperty({ description: 'Channel name' })
  @Prop({ required: true, trim: true, maxlength: 80 })
  name: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @Prop({ required: true, trim: true, lowercase: true })
  slug: string;

  @ApiProperty({ description: 'Channel description' })
  @Prop({ maxlength: 250 })
  description?: string;

  @ApiProperty({ description: 'Channel topic' })
  @Prop({ maxlength: 250 })
  topic?: string;

  @ApiProperty({ enum: ChannelType })
  @Prop({ enum: ChannelType, default: ChannelType.PUBLIC, index: true })
  type: ChannelType;

  @ApiProperty({ enum: ChannelStatus })
  @Prop({ enum: ChannelStatus, default: ChannelStatus.ACTIVE, index: true })
  status: ChannelStatus;

  @ApiProperty({ description: 'Creator user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: 'Channel settings' })
  @Prop({ type: ChannelSettings, default: () => ({}) })
  settings: ChannelSettings;

  @ApiProperty({ description: 'Channel statistics' })
  @Prop({ type: ChannelStats, default: () => ({}) })
  stats: ChannelStats;

  @ApiProperty({ description: 'Is default channel (general)' })
  @Prop({ default: false })
  isDefault: boolean;

  @ApiProperty({ description: 'Channel icon emoji' })
  @Prop()
  icon?: string;

  @ApiProperty({ description: 'Custom channel color' })
  @Prop()
  color?: string;

  @ApiProperty({ description: 'Sort order' })
  @Prop({ default: 0 })
  sortOrder: number;

  @ApiProperty({ description: 'Parent channel ID (for nested channels)' })
  @Prop({ type: Types.ObjectId, ref: 'Channel' })
  parentId?: Types.ObjectId;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Archive date' })
  @Prop()
  archivedAt?: Date;

  @ApiProperty({ description: 'Archived by user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);

// Indexes
ChannelSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
ChannelSchema.index({ workspaceId: 1, type: 1, status: 1 });
ChannelSchema.index({ workspaceId: 1, status: 1, sortOrder: 1 });
ChannelSchema.index({ name: 'text', description: 'text', topic: 'text' });
ChannelSchema.index({ 'stats.lastMessageAt': -1 });
