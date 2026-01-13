import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MessageDocument = Message &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export class MessageReaction {
  @Prop({ required: true })
  emoji: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export class MessageAttachment {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  thumbnailUrl: string;

  @Prop()
  fileName: string;

  @Prop()
  fileSize: number;

  @Prop()
  mimeType: string;

  @Prop()
  duration: number;

  @Prop()
  width: number;

  @Prop()
  height: number;
}

export class MessageReadReceipt {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ default: Date.now })
  readAt: Date;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId: string;

  @Prop({
    required: true,
    enum: ['text', 'image', 'video', 'audio', 'file', 'call', 'huddle', 'system'],
  })
  type: string;

  @Prop()
  content: string;

  @Prop()
  encryptedContent: string;

  @Prop({ type: [MessageAttachment], default: [] })
  attachments: MessageAttachment[];

  @Prop({ type: [MessageReaction], default: [] })
  reactions: MessageReaction[];

  @Prop({ type: [MessageReadReceipt], default: [] })
  readReceipts: MessageReadReceipt[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  replyTo: string;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;

  @Prop({ default: false })
  isForwarded: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  forwardedFrom: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  // Disappearing messages
  @Prop()
  expiresAt: Date;

  @Prop({ default: false })
  isExpired: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ content: 'text' }, { default_language: 'english', weights: { content: 10 } });
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion
