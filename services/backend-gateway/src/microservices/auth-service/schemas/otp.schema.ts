import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpRecordDocument = OtpRecord & Document;

@Schema({ timestamps: true, collection: 'otp_records' })
export class OtpRecord {
  @Prop({ required: true, index: true })
  phoneNumber: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: 'sms', enum: ['sms', 'whatsapp', 'email'] })
  channel: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 3 })
  maxAttempts: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const OtpRecordSchema = SchemaFactory.createForClass(OtpRecord);

// Indexes
OtpRecordSchema.index({ phoneNumber: 1, isVerified: 1 });
OtpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto delete expired OTPs
OtpRecordSchema.index({ createdAt: 1 });
