import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ChannelMemberDocument = ChannelMember & Document;

export enum ChannelMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Schema({ _id: false })
export class ChannelMemberPreferences {
  @Prop({ default: true })
  notifications: boolean;

  @Prop({ enum: ['all', 'mentions', 'none'], default: 'all' })
  notificationLevel: string;

  @Prop({ default: false })
  muted: boolean;

  @Prop()
  mutedUntil?: Date;

  @Prop({ default: false })
  starred: boolean;
}

@Schema({ _id: false })
export class ReadState {
  @Prop({ type: Types.ObjectId })
  lastReadMessageId?: Types.ObjectId;

  @Prop()
  lastReadAt?: Date;

  @Prop({ default: 0 })
  unreadCount: number;

  @Prop({ default: 0 })
  mentionCount: number;
}

@Schema({
  timestamps: true,
  collection: 'channel_members',
})
export class ChannelMember {
  @ApiProperty({ description: 'Membership ID' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Channel ID' })
  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;

  @ApiProperty({ description: 'Workspace ID' })
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @ApiProperty({ description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @ApiProperty({ enum: ChannelMemberRole })
  @Prop({ enum: ChannelMemberRole, default: ChannelMemberRole.MEMBER })
  role: ChannelMemberRole;

  @ApiProperty({ description: 'Member preferences' })
  @Prop({ type: ChannelMemberPreferences, default: () => ({}) })
  preferences: ChannelMemberPreferences;

  @ApiProperty({ description: 'Read state' })
  @Prop({ type: ReadState, default: () => ({}) })
  readState: ReadState;

  @ApiProperty({ description: 'Join date' })
  @Prop({ default: Date.now })
  joinedAt: Date;

  @ApiProperty({ description: 'Added by user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  addedBy?: Types.ObjectId;

  @ApiProperty({ description: 'Last active in channel' })
  @Prop()
  lastActiveAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ChannelMemberSchema = SchemaFactory.createForClass(ChannelMember);

// Indexes
ChannelMemberSchema.index({ channelId: 1, userId: 1 }, { unique: true });
ChannelMemberSchema.index({ workspaceId: 1, userId: 1 });
ChannelMemberSchema.index({ userId: 1, 'preferences.starred': 1 });
ChannelMemberSchema.index({ channelId: 1, 'readState.unreadCount': 1 });
