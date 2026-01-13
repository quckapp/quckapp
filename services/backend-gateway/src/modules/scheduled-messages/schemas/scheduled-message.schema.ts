import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ScheduledMessageDocument = ScheduledMessage &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({ timestamps: true })
export class ScheduledMessage {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId: string;

  @Prop({ required: true, enum: ['text', 'image', 'video', 'audio', 'file'] })
  type: string;

  @Prop()
  content: string;

  @Prop({ type: [Object], default: [] })
  attachments: any[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  replyTo: string;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ default: 'pending', enum: ['pending', 'sent', 'cancelled', 'failed'] })
  status: string;

  @Prop()
  sentAt: Date;

  @Prop()
  sentMessageId: string;

  @Prop()
  failureReason: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const ScheduledMessageSchema = SchemaFactory.createForClass(ScheduledMessage);

ScheduledMessageSchema.index({ scheduledAt: 1, status: 1 });
ScheduledMessageSchema.index({ senderId: 1 });
ScheduledMessageSchema.index({ conversationId: 1 });
