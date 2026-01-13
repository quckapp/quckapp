import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BroadcastListDocument = BroadcastList & Document;

@Schema({ timestamps: true })
export class BroadcastList {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  recipients: string[];

  @Prop({ default: null })
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  lastMessage: string;

  @Prop({ default: Date.now })
  lastMessageAt: Date;
}

export const BroadcastListSchema = SchemaFactory.createForClass(BroadcastList);

BroadcastListSchema.index({ createdBy: 1 });
BroadcastListSchema.index({ lastMessageAt: -1 });
