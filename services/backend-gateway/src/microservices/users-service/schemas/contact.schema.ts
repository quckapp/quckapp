import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true, collection: 'contacts' })
export class Contact {
  @Prop({ required: true, index: true })
  userId: string; // Owner of the contact list

  @Prop({ required: true })
  contactUserId: string; // The contact user

  @Prop({ required: true })
  phoneNumber: string; // Phone number as saved in owner's device

  @Prop({ default: null })
  displayName: string; // Name as saved in owner's contacts

  @Prop({ default: false })
  isFavorite: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ default: null })
  nickname: string; // Custom nickname set by owner

  @Prop({ default: null })
  notes: string; // Personal notes about contact

  @Prop({ default: Date.now })
  addedAt: Date;

  @Prop({ default: null })
  lastInteractionAt: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Compound indexes
ContactSchema.index({ userId: 1, contactUserId: 1 }, { unique: true });
ContactSchema.index({ userId: 1, phoneNumber: 1 });
ContactSchema.index({ userId: 1, isFavorite: 1 });
ContactSchema.index({ userId: 1, displayName: 'text' });
