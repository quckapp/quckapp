import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StatusDocument = Status &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export class StatusViewer {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ default: Date.now })
  viewedAt: Date;
}

export class MediaItem {
  @Prop({ required: true, enum: ['image', 'video'] })
  type: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  thumbnailUrl: string;
}

@Schema({ timestamps: true })
export class Status {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true, enum: ['text', 'image', 'video'] })
  type: string;

  @Prop()
  content: string;

  @Prop()
  mediaUrl: string;

  @Prop()
  thumbnailUrl: string;

  @Prop({ type: [MediaItem], default: [] })
  media: MediaItem[];

  @Prop()
  backgroundColor: string;

  @Prop()
  textColor: string;

  @Prop()
  font: string;

  @Prop({ type: [StatusViewer], default: [] })
  viewers: StatusViewer[];

  @Prop({ default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) })
  expiresAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const StatusSchema = SchemaFactory.createForClass(Status);

StatusSchema.index({ userId: 1, createdAt: -1 });
StatusSchema.index({ expiresAt: 1 });
