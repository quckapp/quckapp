import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ type: Object })
  deviceInfo: {
    deviceId?: string;
    deviceType: string;
    deviceName?: string;
    os?: string;
    osVersion?: string;
    appVersion?: string;
    pushToken?: string;
    userAgent?: string;
  };

  @Prop()
  ipAddress: string;

  @Prop()
  location?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastActiveAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedReason?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Indexes for efficient queries
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ sessionId: 1 });
SessionSchema.index({ refreshToken: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
SessionSchema.index({ 'deviceInfo.deviceId': 1 });
