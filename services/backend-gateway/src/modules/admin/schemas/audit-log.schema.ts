import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  admin: Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      'user_ban',
      'user_unban',
      'role_change',
      'report_resolve',
      'report_dismiss',
      'settings_update',
      'user_verify',
      'user_delete',
      'message_delete',
      'conversation_delete',
      'community_action',
      'login',
      'logout',
    ],
  })
  action: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  targetUser: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  details: Record<string, any>;

  @Prop({ default: null })
  ipAddress: string;

  @Prop({ default: null })
  userAgent: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ admin: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ targetUser: 1 });
AuditLogSchema.index({ createdAt: -1 });
