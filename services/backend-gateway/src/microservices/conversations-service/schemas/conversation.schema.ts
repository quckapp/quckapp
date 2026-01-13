import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ _id: false })
class Participant {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: string;

  @Prop({ enum: ['admin', 'member'], default: 'member' })
  role: string;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ default: false })
  isMuted: boolean;

  @Prop({ default: null })
  mutedUntil: Date;

  @Prop({ default: null })
  lastReadAt: Date;

  @Prop({ default: null, type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  lastReadMessageId: string;
}

@Schema({ _id: false })
class ConversationSettings {
  @Prop({ default: false })
  muteNotifications: boolean;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: 0 })
  disappearingMessagesTime: number; // in seconds, 0 = disabled

  @Prop({ default: true })
  allowReactions: boolean;

  @Prop({ default: true })
  allowReplies: boolean;
}

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({
    required: true,
    enum: ['direct', 'group', 'channel', 'broadcast'],
    default: 'direct',
    index: true,
  })
  type: string;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: null })
  avatarUrl: string;

  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        isMuted: { type: Boolean, default: false },
        mutedUntil: { type: Date, default: null },
        lastReadAt: { type: Date, default: null },
        lastReadMessageId: { type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null },
      },
    ],
    required: true,
  })
  participants: Participant[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  admins: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: string;

  @Prop({
    type: {
      muteNotifications: { type: Boolean, default: false },
      isArchived: { type: Boolean, default: false },
      isPinned: { type: Boolean, default: false },
      disappearingMessagesTime: { type: Number, default: 0 },
      allowReactions: { type: Boolean, default: true },
      allowReplies: { type: Boolean, default: true },
    },
    default: {},
  })
  settings: ConversationSettings;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Message' }], default: [] })
  pinnedMessages: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
  lastMessageId: string;

  @Prop({ default: null })
  lastMessageAt: Date;

  @Prop({ default: '' })
  lastMessagePreview: string;

  @Prop({ default: 0 })
  messageCount: number;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Compound indexes for efficient queries
ConversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });
ConversationSchema.index({ 'participants.userId': 1, type: 1 });
ConversationSchema.index({ type: 1, createdAt: -1 });
ConversationSchema.index({ createdBy: 1 });

// For finding direct conversations between two users
ConversationSchema.index({ type: 1, 'participants.userId': 1 }, { sparse: true });

// Full-text search on name and description
ConversationSchema.index({ name: 'text', description: 'text' });
