import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TwoFactorSecretDocument = TwoFactorSecret & Document;

@Schema({ timestamps: true, collection: 'two_factor_secrets' })
export class TwoFactorSecret {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ required: true })
  secret: string; // Encrypted TOTP secret

  @Prop({ default: 'totp', enum: ['totp', 'sms', 'email'] })
  method: string;

  @Prop({ default: false })
  isEnabled: boolean;

  @Prop({ type: [String], default: [] })
  backupCodes: string[]; // Encrypted backup codes

  @Prop()
  lastUsedAt?: Date;

  @Prop()
  enabledAt?: Date;

  @Prop()
  recoveryEmail?: string;

  @Prop()
  recoveryPhone?: string;
}

export const TwoFactorSecretSchema = SchemaFactory.createForClass(TwoFactorSecret);

// Indexes
TwoFactorSecretSchema.index({ userId: 1 });
TwoFactorSecretSchema.index({ isEnabled: 1 });
