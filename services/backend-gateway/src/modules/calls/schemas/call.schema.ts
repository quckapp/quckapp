import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CallDocument = Call &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export class CallParticipant {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop()
  leftAt: Date;

  @Prop({ default: false })
  isInitiator: boolean;
}

@Schema({ timestamps: true })
export class Call {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation' })
  conversationId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  initiatorId: string;

  @Prop({ required: true, enum: ['audio', 'video'] })
  type: string;

  @Prop({ required: true, enum: ['ongoing', 'completed', 'missed', 'rejected', 'failed'] })
  status: string;

  @Prop({ type: [CallParticipant], default: [] })
  participants: CallParticipant[];

  @Prop()
  startedAt: Date;

  @Prop()
  endedAt: Date;

  @Prop({ default: 0 })
  duration: number; // in seconds

  @Prop({ default: false })
  isGroupCall: boolean;
}

export const CallSchema = SchemaFactory.createForClass(Call);

CallSchema.index({ conversationId: 1, createdAt: -1 });
CallSchema.index({ initiatorId: 1, createdAt: -1 });
CallSchema.index({ 'participants.userId': 1 });
