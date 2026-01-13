import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedBy: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['user', 'message', 'conversation', 'community'],
  })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  targetUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  targetMessageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', default: null })
  targetConversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Community', default: null })
  targetCommunityId: Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'inappropriate_content',
      'violence',
      'fake_account',
      'impersonation',
      'scam',
      'other',
    ],
  })
  reason: string;

  @Prop({ default: '' })
  description: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId;

  @Prop({ default: null })
  reviewedAt: Date;

  @Prop({ default: '' })
  resolution: string;

  @Prop({ default: '' })
  actionTaken: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ type: 1 });
ReportSchema.index({ reportedBy: 1 });
ReportSchema.index({ targetUserId: 1 });
