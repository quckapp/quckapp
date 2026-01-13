import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({
    required: true,
    enum: ['message', 'call', 'group', 'system', 'mention', 'reaction', 'friend_request', 'status'],
    index: true,
  })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ default: null })
  readAt: Date;

  @Prop({ default: false })
  isSent: boolean;

  @Prop({ default: null })
  sentAt: Date;

  @Prop({ default: null })
  imageUrl: string;

  @Prop({ default: null })
  actionUrl: string;

  @Prop({
    enum: ['high', 'normal', 'low'],
    default: 'normal',
  })
  priority: string;

  @Prop({ default: null })
  expiresAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Push Token Schema
@Schema({ timestamps: true, collection: 'push_tokens' })
export class PushToken {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({
    required: true,
    enum: ['fcm', 'apns', 'expo', 'web'],
    default: 'fcm',
  })
  platform: string;

  @Prop({ default: null })
  deviceId: string;

  @Prop({ default: null })
  deviceName: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  lastUsedAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export type PushTokenDocument = PushToken & Document;
export const PushTokenSchema = SchemaFactory.createForClass(PushToken);

PushTokenSchema.index({ userId: 1, platform: 1 });
PushTokenSchema.index({ token: 1 }, { unique: true });

// Notification Preferences Schema
@Schema({ timestamps: true, collection: 'notification_preferences' })
export class NotificationPreferences {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    unique: true,
    index: true,
  })
  userId: string;

  @Prop({ default: true })
  pushEnabled: boolean;

  @Prop({ default: true })
  emailEnabled: boolean;

  @Prop({ default: true })
  smsEnabled: boolean;

  @Prop({ default: true })
  messageNotifications: boolean;

  @Prop({ default: true })
  callNotifications: boolean;

  @Prop({ default: true })
  groupNotifications: boolean;

  @Prop({ default: true })
  mentionNotifications: boolean;

  @Prop({ default: true })
  reactionNotifications: boolean;

  @Prop({ default: true })
  statusNotifications: boolean;

  @Prop({ default: false })
  doNotDisturb: boolean;

  @Prop({ default: null })
  doNotDisturbUntil: Date;

  @Prop({ default: '09:00' })
  quietHoursStart: string;

  @Prop({ default: '21:00' })
  quietHoursEnd: string;

  @Prop({ default: false })
  quietHoursEnabled: boolean;

  @Prop({ type: Object, default: {} })
  customSettings: Record<string, any>;
}

export type NotificationPreferencesDocument = NotificationPreferences & Document;
export const NotificationPreferencesSchema = SchemaFactory.createForClass(NotificationPreferences);
