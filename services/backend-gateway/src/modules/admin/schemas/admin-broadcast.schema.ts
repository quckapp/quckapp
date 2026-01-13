import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdminBroadcastDocument = AdminBroadcast & Document;

@Schema({ timestamps: true })
export class AdminBroadcast {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    type: String,
    enum: ['all', 'active', 'new', 'custom'],
    default: 'all',
  })
  targetAudience: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  customUserIds?: Types.ObjectId[];

  @Prop()
  targetCount?: number;

  @Prop({
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'failed'],
    default: 'draft',
  })
  status: string;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  sentAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: {
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  })
  stats?: {
    delivered: number;
    read: number;
    failed: number;
  };

  @Prop()
  failureReason?: string;
}

export const AdminBroadcastSchema = SchemaFactory.createForClass(AdminBroadcast);

AdminBroadcastSchema.index({ status: 1 });
AdminBroadcastSchema.index({ createdBy: 1 });
AdminBroadcastSchema.index({ scheduledAt: 1 });
AdminBroadcastSchema.index({ createdAt: -1 });
