import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Conversation', index: true })
  conversationId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  senderId: string;

  @Prop({
    required: true,
    enum: [
      'text',
      'image',
      'video',
      'audio',
      'file',
      'call',
      'huddle',
      'system',
      'location',
      'contact',
      'poll',
      'sticker',
    ],
    default: 'text',
  })
  type: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ default: null })
  encryptedContent: string;

  @Prop({
    type: [
      {
        type: { type: String, enum: ['image', 'video', 'audio', 'file', 'document'] },
        url: { type: String, required: true },
        thumbnailUrl: { type: String, default: null },
        fileName: { type: String },
        fileSize: { type: Number },
        mimeType: { type: String },
        duration: { type: Number }, // For audio/video
        width: { type: Number }, // For images/videos
        height: { type: Number },
        _id: false,
      },
    ],
    default: [],
  })
  attachments: {
    type: string;
    url: string;
    thumbnailUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    width?: number;
    height?: number;
  }[];

  @Prop({
    type: [
      {
        emoji: { type: String, required: true },
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    default: [],
  })
  reactions: {
    emoji: string;
    userId: string;
    createdAt: Date;
  }[];

  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
        readAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    default: [],
  })
  readReceipts: {
    userId: string;
    readAt: Date;
  }[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
  replyTo: string;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;

  @Prop({ default: false })
  isForwarded: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
  forwardedFrom: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: null, index: true })
  expiresAt: Date;

  @Prop({ default: false })
  isExpired: boolean;

  @Prop({ type: [String], default: [] })
  mentions: string[];

  @Prop({
    default: 'sent',
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
  })
  status: string;

  @Prop({ type: [String], default: [] })
  deliveredTo: string[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ content: 'text' }); // Full-text search
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for disappearing messages
MessageSchema.index({ 'reactions.userId': 1 });
MessageSchema.index({ 'readReceipts.userId': 1 });
