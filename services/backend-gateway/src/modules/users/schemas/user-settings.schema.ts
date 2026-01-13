import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserSettingsDocument = UserSettings & Document;

@Schema({ timestamps: true })
export class UserSettings {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  // Appearance Settings
  @Prop({ default: false })
  darkMode: boolean;

  // Media & Storage Settings
  @Prop({ default: true })
  autoDownloadMedia: boolean;

  @Prop({ default: false })
  saveToGallery: boolean;

  // Notification Settings
  @Prop({ default: true })
  pushNotifications: boolean;

  @Prop({ default: true })
  messageNotifications: boolean;

  @Prop({ default: true })
  groupNotifications: boolean;

  @Prop({ default: true })
  callNotifications: boolean;

  @Prop({ default: true })
  soundEnabled: boolean;

  @Prop({ default: true })
  vibrationEnabled: boolean;

  @Prop({ default: true })
  showPreview: boolean;

  @Prop({ default: true })
  inAppNotifications: boolean;

  @Prop({ default: true })
  notificationLight: boolean;

  // Privacy Settings
  @Prop({ default: true })
  readReceipts: boolean;

  @Prop({ default: true })
  lastSeen: boolean;

  @Prop({ default: 'everyone' })
  profilePhotoVisibility: string; // everyone, contacts, nobody

  @Prop({ default: 'everyone' })
  statusVisibility: string; // everyone, contacts, nobody

  // Security Settings
  @Prop({ default: false })
  twoFactorAuth: boolean;

  @Prop()
  twoFactorSecret: string;

  @Prop({ type: [String], default: [] })
  twoFactorBackupCodes: string[];

  @Prop()
  twoFactorEnabledAt: Date;

  @Prop({ default: false })
  fingerprintLock: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  blockedUsers: Types.ObjectId[];
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
