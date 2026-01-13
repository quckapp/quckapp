import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StarredMessageDocument = StarredMessage & Document;

@Schema({ timestamps: true })
export class StarredMessage {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', required: true })
  messageId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: string;

  @Prop({ default: Date.now })
  starredAt: Date;
}

export const StarredMessageSchema = SchemaFactory.createForClass(StarredMessage);

StarredMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });
StarredMessageSchema.index({ userId: 1, starredAt: -1 });
StarredMessageSchema.index({ conversationId: 1 });
