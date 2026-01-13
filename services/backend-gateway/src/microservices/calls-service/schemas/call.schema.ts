import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CallDocument = Call & Document;

@Schema({ _id: false })
class CallParticipant {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: string;

  @Prop({ default: null })
  joinedAt: Date;

  @Prop({ default: null })
  leftAt: Date;

  @Prop({ default: false })
  isMuted: boolean;

  @Prop({ default: false })
  isVideoOff: boolean;

  @Prop({ default: false })
  isScreenSharing: boolean;

  @Prop({
    enum: ['ringing', 'connected', 'declined', 'missed', 'left'],
    default: 'ringing',
  })
  status: string;

  @Prop({ type: Object, default: {} })
  deviceInfo: Record<string, any>;
}

@Schema({ timestamps: true, collection: 'calls' })
export class Call {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', index: true })
  conversationId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  initiatorId: string;

  @Prop({
    required: true,
    enum: ['audio', 'video', 'group_audio', 'group_video'],
    default: 'audio',
  })
  type: string;

  @Prop({
    required: true,
    enum: [
      'initiating',
      'ringing',
      'connecting',
      'active',
      'ended',
      'failed',
      'missed',
      'declined',
      'busy',
    ],
    default: 'initiating',
    index: true,
  })
  status: string;

  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
        joinedAt: { type: Date, default: null },
        leftAt: { type: Date, default: null },
        isMuted: { type: Boolean, default: false },
        isVideoOff: { type: Boolean, default: false },
        isScreenSharing: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ['ringing', 'connected', 'declined', 'missed', 'left'],
          default: 'ringing',
        },
        deviceInfo: { type: Object, default: {} },
      },
    ],
    default: [],
  })
  participants: CallParticipant[];

  @Prop({ default: null })
  startedAt: Date;

  @Prop({ default: null })
  answeredAt: Date;

  @Prop({ default: null })
  endedAt: Date;

  @Prop({ default: 0 })
  duration: number; // in seconds

  @Prop({
    enum: ['completed', 'missed', 'declined', 'failed', 'no_answer', 'busy', 'cancelled'],
    default: null,
  })
  endReason: string;

  @Prop({ type: Object, default: {} })
  quality: {
    averageBitrate?: number;
    packetLoss?: number;
    jitter?: number;
    roundTripTime?: number;
  };

  @Prop({ default: null })
  recordingUrl: string;

  @Prop({ default: false })
  isRecorded: boolean;

  @Prop({ type: Object, default: {} })
  iceServers: {
    stun?: string[];
    turn?: { url: string; username?: string; credential?: string }[];
  };

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const CallSchema = SchemaFactory.createForClass(Call);

// Indexes for efficient queries
CallSchema.index({ initiatorId: 1, createdAt: -1 });
CallSchema.index({ 'participants.userId': 1, createdAt: -1 });
CallSchema.index({ status: 1, createdAt: -1 });
CallSchema.index({ conversationId: 1, createdAt: -1 });

// Compound index for call history queries
CallSchema.index({ 'participants.userId': 1, status: 1, createdAt: -1 });

// WebRTC Signaling Schema - for temporary signaling data
@Schema({ timestamps: true, collection: 'call_signals' })
export class CallSignal {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Call', index: true })
  callId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  fromUserId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  toUserId: string;

  @Prop({
    required: true,
    enum: ['offer', 'answer', 'ice-candidate', 'renegotiate'],
  })
  type: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ default: false })
  isProcessed: boolean;

  @Prop({ default: null })
  processedAt: Date;

  @Prop({ default: null, index: true })
  expiresAt: Date;
}

export type CallSignalDocument = CallSignal & Document;
export const CallSignalSchema = SchemaFactory.createForClass(CallSignal);

// TTL index for auto-cleanup of old signals (expire after 5 minutes)
CallSignalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
CallSignalSchema.index({ callId: 1, type: 1, isProcessed: 1 });
