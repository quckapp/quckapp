import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserSettingsDocument = UserSettings & Document;

@Schema({ timestamps: true, collection: 'user_settings' })
export class UserSettings {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  // Privacy Settings
  @Prop({
    type: Object,
    default: {
      lastSeen: 'everyone',
      profilePhoto: 'everyone',
      about: 'everyone',
      groups: 'everyone',
      calls: 'everyone',
      readReceipts: true,
    },
  })
  privacy: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    about: 'everyone' | 'contacts' | 'nobody';
    groups: 'everyone' | 'contacts' | 'nobody';
    calls: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
  };

  // Notification Settings
  @Prop({
    type: Object,
    default: {
      messages: true,
      groups: true,
      calls: true,
      preview: true,
      sound: 'default',
      vibrate: true,
      inAppNotifications: true,
      emailNotifications: false,
    },
  })
  notifications: {
    messages: boolean;
    groups: boolean;
    calls: boolean;
    preview: boolean;
    sound: string;
    vibrate: boolean;
    inAppNotifications: boolean;
    emailNotifications: boolean;
  };

  // Appearance Settings
  @Prop({ default: 'system', enum: ['light', 'dark', 'system'] })
  theme: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ default: 'medium', enum: ['small', 'medium', 'large'] })
  fontSize: string;

  // Chat Settings
  @Prop({ default: true })
  enterToSend: boolean;

  @Prop({ default: true })
  mediaAutoDownload: boolean;

  @Prop({ default: true })
  linkPreview: boolean;

  // Blocked Users
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  blockedUsers: string[];

  // Muted Conversations
  @Prop({
    type: [
      {
        conversationId: { type: String, required: true },
        mutedUntil: { type: Date, default: null }, // null = forever
        _id: false,
      },
    ],
    default: [],
  })
  mutedConversations: {
    conversationId: string;
    mutedUntil: Date | null;
  }[];

  // Archived Conversations
  @Prop({ type: [String], default: [] })
  archivedConversations: string[];

  // Pinned Conversations
  @Prop({ type: [String], default: [] })
  pinnedConversations: string[];

  // Security Settings
  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop({ default: false })
  biometricEnabled: boolean;

  @Prop({ default: null })
  securityPin: string;

  // Data & Storage
  @Prop({
    type: Object,
    default: {
      autoDownloadPhotos: 'wifi',
      autoDownloadVideos: 'wifi',
      autoDownloadDocuments: 'wifi',
      saveToGallery: true,
    },
  })
  dataUsage: {
    autoDownloadPhotos: 'always' | 'wifi' | 'never';
    autoDownloadVideos: 'always' | 'wifi' | 'never';
    autoDownloadDocuments: 'always' | 'wifi' | 'never';
    saveToGallery: boolean;
  };
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);

// Indexes
UserSettingsSchema.index({ userId: 1 });
UserSettingsSchema.index({ blockedUsers: 1 });
