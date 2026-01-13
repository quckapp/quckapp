import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type WorkspaceMemberDocument = WorkspaceMember & Document;

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  DEACTIVATED = 'deactivated',
}

@Schema({ _id: false })
export class MemberPreferences {
  @Prop({ default: true })
  notifications: boolean;

  @Prop({ default: true })
  emailDigest: boolean;

  @Prop({ enum: ['all', 'mentions', 'none'], default: 'all' })
  messageNotifications: string;

  @Prop({ default: true })
  soundEnabled: boolean;

  @Prop({ default: 'default' })
  theme: string;

  @Prop({ type: [Types.ObjectId], default: [] })
  mutedChannels: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], default: [] })
  starredChannels: Types.ObjectId[];
}

@Schema({
  timestamps: true,
  collection: 'workspace_members',
})
export class WorkspaceMember {
  @ApiProperty({ description: 'Membership ID' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Workspace ID' })
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @ApiProperty({ description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @ApiProperty({ enum: WorkspaceRole })
  @Prop({ enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  role: WorkspaceRole;

  @ApiProperty({ enum: MemberStatus })
  @Prop({ enum: MemberStatus, default: MemberStatus.ACTIVE, index: true })
  status: MemberStatus;

  @ApiProperty({ description: 'Display name in workspace' })
  @Prop({ trim: true, maxlength: 80 })
  displayName?: string;

  @ApiProperty({ description: 'Title/Position' })
  @Prop({ trim: true, maxlength: 100 })
  title?: string;

  @ApiProperty({ description: 'Member preferences' })
  @Prop({ type: MemberPreferences, default: () => ({}) })
  preferences: MemberPreferences;

  @ApiProperty({ description: 'Invited by user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy?: Types.ObjectId;

  @ApiProperty({ description: 'Join date' })
  @Prop()
  joinedAt?: Date;

  @ApiProperty({ description: 'Last active date' })
  @Prop()
  lastActiveAt?: Date;

  @ApiProperty({ description: 'Deactivation date' })
  @Prop()
  deactivatedAt?: Date;

  @ApiProperty({ description: 'Deactivation reason' })
  @Prop()
  deactivationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkspaceMemberSchema = SchemaFactory.createForClass(WorkspaceMember);

// Compound unique index for workspace + user
WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
WorkspaceMemberSchema.index({ workspaceId: 1, role: 1 });
WorkspaceMemberSchema.index({ workspaceId: 1, status: 1 });
WorkspaceMemberSchema.index({ userId: 1, status: 1 });
