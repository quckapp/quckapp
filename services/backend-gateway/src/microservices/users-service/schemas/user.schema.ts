import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true })
  phoneNumber: string;

  @Prop({ default: null, sparse: true })
  email: string;

  @Prop({ default: '' })
  password: string;

  @Prop({ required: true, unique: true, index: true })
  username: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ default: null })
  bio: string;

  @Prop({ default: 'offline', enum: ['online', 'offline', 'away', 'busy'] })
  status: string;

  @Prop({ default: null })
  statusMessage: string;

  @Prop({ default: Date.now })
  lastSeen: Date;

  @Prop({ type: [String], default: [] })
  fcmTokens: string[];

  @Prop({
    type: [
      {
        deviceId: { type: String, required: true },
        deviceName: { type: String, required: true },
        deviceType: {
          type: String,
          enum: ['mobile', 'web', 'desktop'],
          default: 'mobile',
        },
        platform: { type: String, enum: ['ios', 'android', 'web'] },
        lastActive: { type: Date, default: Date.now },
        fcmToken: { type: String, default: null },
        linkedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    default: [],
  })
  linkedDevices: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
    platform: string;
    lastActive: Date;
    fcmToken: string;
    linkedAt: Date;
  }[];

  @Prop({ default: null })
  publicKey: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 'user', enum: ['user', 'moderator', 'admin', 'super_admin'] })
  role: string;

  @Prop({
    type: [String],
    enum: [
      'manage_users',
      'manage_reports',
      'manage_communities',
      'view_analytics',
      'manage_settings',
      'view_audit_logs',
      'manage_moderators',
      'ban_users',
      'delete_content',
    ],
    default: [],
  })
  permissions: string[];

  @Prop({ default: false })
  isBanned: boolean;

  @Prop({ default: null })
  banReason: string;

  @Prop({ default: null })
  bannedAt: Date;

  @Prop({ default: null })
  bannedBy: string;

  @Prop({
    type: [
      {
        provider: {
          type: String,
          enum: ['google', 'facebook', 'apple'],
          required: true,
        },
        providerId: { type: String, required: true },
        email: { type: String, default: null },
        linkedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    default: [],
  })
  oauthProviders: {
    provider: string;
    providerId: string;
    email: string;
    linkedAt: Date;
  }[];

  @Prop({ default: false })
  isPremium: boolean;

  @Prop({ default: null })
  premiumExpiresAt: Date;

  @Prop({ default: null })
  profileCompletedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for efficient queries
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ 'oauthProviders.provider': 1, 'oauthProviders.providerId': 1 });
UserSchema.index({ status: 1, lastSeen: -1 });
UserSchema.index({ displayName: 'text', username: 'text' }); // Text search
