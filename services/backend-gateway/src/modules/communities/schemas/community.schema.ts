import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CommunityDocument = Community & Document;

export class CommunityMember {
  userId: string;
  role: string; // 'admin' | 'member'
  joinedAt: Date;
}

@Schema({ timestamps: true })
export class Community {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  avatar: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;

  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    default: [],
  })
  members: CommunityMember[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Conversation' }], default: [] })
  groups: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation' })
  announcementGroupId: string;

  @Prop({ default: false })
  isActive: boolean;
}

export const CommunitySchema = SchemaFactory.createForClass(Community);

CommunitySchema.index({ 'members.userId': 1 });
CommunitySchema.index({ createdBy: 1 });
CommunitySchema.index({ name: 1 });
