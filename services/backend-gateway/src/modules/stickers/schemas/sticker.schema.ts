import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StickerDocument = Sticker & Document;

@Schema({ timestamps: true })
export class Sticker {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  url: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop({ required: true })
  giphyId: string;

  @Prop()
  title?: string;

  @Prop({ default: 'gif', enum: ['gif', 'sticker'] })
  type: string;

  @Prop({ default: 0 })
  useCount: number;

  @Prop()
  lastUsedAt?: Date;
}

export const StickerSchema = SchemaFactory.createForClass(Sticker);

// Indexes
StickerSchema.index({ userId: 1, giphyId: 1 }, { unique: true });
StickerSchema.index({ userId: 1, useCount: -1 });
StickerSchema.index({ userId: 1, lastUsedAt: -1 });
