import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export class ConversationParticipant {
  userId: string;
  joinedAt: Date;
  lastReadMessageId: string;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, enum: ['single', 'group'] })
  type: string;

  @Prop()
  name: string;

  @Prop()
  avatar: string;

  @Prop()
  description: string;

  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
        joinedAt: { type: Date, default: Date.now },
        lastReadMessageId: { type: String, default: null },
        unreadCount: { type: Number, default: 0 },
        isMuted: { type: Boolean, default: false },
        isPinned: { type: Boolean, default: false },
        _id: false,
      },
    ],
    default: [],
  })
  participants: ConversationParticipant[];

  @Prop({ type: [String], default: [] })
  admins: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  lastMessage: string;

  @Prop({ default: Date.now })
  lastMessageAt: Date;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: false })
  isLocked: boolean;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Message' }], default: [] })
  pinnedMessages: string[];

  @Prop()
  pinnedMessagesUpdatedAt: Date;

  // Disappearing messages settings (in seconds, 0 = disabled)
  // Common values: 86400 (24h), 604800 (7d), 2592000 (30d)
  @Prop({ default: 0 })
  disappearingMessagesTimer: number;

  @Prop()
  disappearingMessagesUpdatedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  disappearingMessagesUpdatedBy: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ type: 1 });
