import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PollDocument = Poll &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export class PollOption {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  voters: string[];

  @Prop({ default: 0 })
  voteCount: number;
}

@Schema({ timestamps: true })
export class Poll {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  creatorId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  messageId: string;

  @Prop({ required: true })
  question: string;

  @Prop({ type: [Object], required: true })
  options: PollOption[];

  @Prop({ default: false })
  allowMultipleAnswers: boolean;

  @Prop({ default: true })
  isAnonymous: boolean;

  @Prop()
  expiresAt: Date;

  @Prop({ default: false })
  isClosed: boolean;

  @Prop()
  closedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  closedBy: string;

  @Prop({ default: 0 })
  totalVotes: number;
}

export const PollSchema = SchemaFactory.createForClass(Poll);

PollSchema.index({ conversationId: 1 });
PollSchema.index({ creatorId: 1 });
PollSchema.index({ expiresAt: 1 });
