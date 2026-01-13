import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type WorkspaceDocument = Workspace & Document;

export enum WorkspacePlan {
  FREE = 'free',
  PRO = 'pro',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export enum WorkspaceStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Schema({ _id: false })
export class WorkspaceSettings {
  @Prop({ default: true })
  allowGuestAccess: boolean;

  @Prop({ default: true })
  allowPublicChannels: boolean;

  @Prop({ default: true })
  allowDirectMessages: boolean;

  @Prop({ default: true })
  allowFileUploads: boolean;

  @Prop({ default: 100 }) // MB
  maxFileSize: number;

  @Prop({ default: true })
  allowExternalIntegrations: boolean;

  @Prop({ default: 30 }) // days
  messageRetentionDays: number;

  @Prop({ default: true })
  allowCustomEmoji: boolean;

  @Prop({ default: true })
  allowThreads: boolean;

  @Prop({ default: true })
  allowReactions: boolean;

  @Prop({ type: [String], default: [] })
  allowedEmailDomains: string[];

  @Prop({ default: false })
  requireTwoFactor: boolean;

  @Prop({ default: false })
  ssoEnabled: boolean;

  @Prop({ type: Object, default: {} })
  ssoConfig: Record<string, any>;
}

@Schema({ _id: false })
export class WorkspaceBranding {
  @Prop()
  logoUrl?: string;

  @Prop()
  iconUrl?: string;

  @Prop()
  primaryColor?: string;

  @Prop()
  secondaryColor?: string;

  @Prop()
  customCss?: string;
}

@Schema({ _id: false })
export class WorkspaceLimits {
  @Prop({ default: -1 }) // -1 = unlimited
  maxMembers: number;

  @Prop({ default: -1 })
  maxChannels: number;

  @Prop({ default: -1 }) // GB
  maxStorageGb: number;

  @Prop({ default: -1 })
  maxIntegrations: number;

  @Prop({ default: -1 })
  maxGuestsPerChannel: number;
}

@Schema({ _id: false })
export class WorkspaceUsage {
  @Prop({ default: 0 })
  memberCount: number;

  @Prop({ default: 0 })
  channelCount: number;

  @Prop({ default: 0 })
  messageCount: number;

  @Prop({ default: 0 })
  storageUsedBytes: number;

  @Prop({ default: 0 })
  fileCount: number;

  @Prop()
  lastActivityAt?: Date;
}

@Schema({
  timestamps: true,
  collection: 'workspaces',
})
export class Workspace {
  @ApiProperty({ description: 'Workspace ID' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Workspace name' })
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @ApiProperty({ description: 'Workspace description' })
  @Prop({ maxlength: 500 })
  description?: string;

  @ApiProperty({ description: 'Owner user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @ApiProperty({ enum: WorkspacePlan })
  @Prop({ enum: WorkspacePlan, default: WorkspacePlan.FREE })
  plan: WorkspacePlan;

  @ApiProperty({ enum: WorkspaceStatus })
  @Prop({ enum: WorkspaceStatus, default: WorkspaceStatus.ACTIVE, index: true })
  status: WorkspaceStatus;

  @ApiProperty({ description: 'Workspace settings' })
  @Prop({ type: WorkspaceSettings, default: () => ({}) })
  settings: WorkspaceSettings;

  @ApiProperty({ description: 'Workspace branding' })
  @Prop({ type: WorkspaceBranding, default: () => ({}) })
  branding: WorkspaceBranding;

  @ApiProperty({ description: 'Workspace limits' })
  @Prop({ type: WorkspaceLimits, default: () => ({}) })
  limits: WorkspaceLimits;

  @ApiProperty({ description: 'Workspace usage stats' })
  @Prop({ type: WorkspaceUsage, default: () => ({}) })
  usage: WorkspaceUsage;

  @ApiProperty({ description: 'Invite code for joining' })
  @Prop({ unique: true, sparse: true })
  inviteCode?: string;

  @ApiProperty({ description: 'Custom domain' })
  @Prop({ unique: true, sparse: true })
  customDomain?: string;

  @ApiProperty({ description: 'Timezone' })
  @Prop({ default: 'UTC' })
  timezone: string;

  @ApiProperty({ description: 'Default language' })
  @Prop({ default: 'en' })
  defaultLanguage: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Deletion date' })
  @Prop()
  deletedAt?: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);

// Indexes
WorkspaceSchema.index({ name: 'text', description: 'text' });
WorkspaceSchema.index({ ownerId: 1, status: 1 });
WorkspaceSchema.index({ slug: 1 }, { unique: true });
WorkspaceSchema.index({ inviteCode: 1 }, { sparse: true });
WorkspaceSchema.index({ createdAt: -1 });
