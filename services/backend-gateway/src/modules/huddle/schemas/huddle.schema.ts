/**
 * Huddle Schema - MongoDB Document Structure
 * Implements: Schema Pattern, Type Safety
 * SOLID: Single Responsibility - defines data structure only
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HuddleDocument = Huddle & Document;

export enum HuddleType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum HuddleStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

export interface HuddleParticipant {
  userId: Types.ObjectId | string;
  joinedAt: Date;
  leftAt?: Date;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isMuted: boolean;
}

@Schema({ timestamps: true })
export class Huddle {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  initiatorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Chat' })
  chatId?: Types.ObjectId;

  @Prop({ type: String, enum: HuddleType, required: true })
  type: HuddleType;

  @Prop({ type: String, enum: HuddleStatus, default: HuddleStatus.ACTIVE })
  status: HuddleStatus;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date, default: Date.now },
        leftAt: Date,
        isAudioEnabled: { type: Boolean, default: true },
        isVideoEnabled: { type: Boolean, default: false },
        isMuted: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  participants: HuddleParticipant[];

  @Prop()
  startedAt: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ type: Number, default: 0 })
  duration: number; // in seconds

  @Prop({ type: String })
  roomId: string; // Unique room identifier for WebRTC

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const HuddleSchema = SchemaFactory.createForClass(Huddle);

/**
 * Indexes for performance optimization
 * Algorithm: B-tree indexing for O(log n) lookups
 */
HuddleSchema.index({ roomId: 1 }, { unique: true });
HuddleSchema.index({ initiatorId: 1, status: 1 });
HuddleSchema.index({ chatId: 1, status: 1 });
HuddleSchema.index({ 'participants.userId': 1 });
HuddleSchema.index({ createdAt: -1 });
