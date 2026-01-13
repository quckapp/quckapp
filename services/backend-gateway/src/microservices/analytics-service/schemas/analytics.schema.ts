import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({ timestamps: true, collection: 'analytics_events' })
export class AnalyticsEvent {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({
    required: true,
    enum: [
      'app_open',
      'app_close',
      'message_sent',
      'message_received',
      'message_read',
      'call_started',
      'call_ended',
      'call_missed',
      'media_uploaded',
      'media_viewed',
      'contact_added',
      'contact_blocked',
      'group_created',
      'group_joined',
      'group_left',
      'notification_received',
      'notification_clicked',
      'screen_view',
      'feature_used',
      'error_occurred',
      'search_performed',
      'setting_changed',
    ],
    index: true,
  })
  eventType: string;

  @Prop({ required: true, index: true })
  eventName: string;

  @Prop({ type: Object, default: {} })
  properties: Record<string, any>;

  @Prop({ default: null })
  sessionId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', index: true })
  conversationId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  messageId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Call' })
  callId?: string;

  @Prop({
    type: {
      platform: String,
      osVersion: String,
      appVersion: String,
      deviceModel: String,
      deviceId: String,
      screenResolution: String,
      locale: String,
      timezone: String,
    },
    default: {},
  })
  deviceInfo: {
    platform?: string;
    osVersion?: string;
    appVersion?: string;
    deviceModel?: string;
    deviceId?: string;
    screenResolution?: string;
    locale?: string;
    timezone?: string;
  };

  @Prop({
    type: {
      ip: String,
      country: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
    default: {},
  })
  location: {
    ip?: string;
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @Prop({ default: null })
  referrer: string;

  @Prop({ default: null })
  campaignId: string;

  @Prop({ default: Date.now, index: true })
  timestamp: Date;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// Indexes
AnalyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ sessionId: 1, timestamp: 1 });
AnalyticsEventSchema.index({ timestamp: -1 }); // For time-based queries

// User Session Schema
export type UserSessionDocument = UserSession & Document;

@Schema({ timestamps: true, collection: 'user_sessions' })
export class UserSession {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  startedAt: Date;

  @Prop({ default: null })
  endedAt: Date;

  @Prop({ default: 0 })
  duration: number; // in seconds

  @Prop({ default: 0 })
  eventCount: number;

  @Prop({ default: 0 })
  messagesSent: number;

  @Prop({ default: 0 })
  messagesReceived: number;

  @Prop({ default: 0 })
  callsMade: number;

  @Prop({ default: 0 })
  callDuration: number; // total call duration in seconds

  @Prop({ default: 0 })
  mediaUploaded: number;

  @Prop({ type: [String], default: [] })
  screensViewed: string[];

  @Prop({ type: [String], default: [] })
  featuresUsed: string[];

  @Prop({
    type: {
      platform: String,
      osVersion: String,
      appVersion: String,
      deviceModel: String,
      deviceId: String,
    },
    default: {},
  })
  deviceInfo: {
    platform?: string;
    osVersion?: string;
    appVersion?: string;
    deviceModel?: string;
    deviceId?: string;
  };

  @Prop({ default: null })
  location: string;

  @Prop({ default: false })
  isActive: boolean;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Indexes
UserSessionSchema.index({ userId: 1, startedAt: -1 });
UserSessionSchema.index({ startedAt: -1 });
UserSessionSchema.index({ isActive: 1 });

// User Metrics Schema (aggregated daily/weekly/monthly stats)
export type UserMetricsDocument = UserMetrics & Document;

@Schema({ timestamps: true, collection: 'user_metrics' })
export class UserMetrics {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly'], index: true })
  period: string;

  @Prop({ required: true, index: true })
  periodStart: Date;

  @Prop({ required: true, index: true })
  periodEnd: Date;

  @Prop({ default: 0 })
  totalSessions: number;

  @Prop({ default: 0 })
  totalSessionDuration: number; // in seconds

  @Prop({ default: 0 })
  avgSessionDuration: number; // in seconds

  @Prop({ default: 0 })
  messagesSent: number;

  @Prop({ default: 0 })
  messagesReceived: number;

  @Prop({ default: 0 })
  callsMade: number;

  @Prop({ default: 0 })
  callsReceived: number;

  @Prop({ default: 0 })
  callDuration: number; // total in seconds

  @Prop({ default: 0 })
  mediaUploaded: number;

  @Prop({ default: 0 })
  mediaViewed: number;

  @Prop({ default: 0 })
  contactsAdded: number;

  @Prop({ default: 0 })
  groupsJoined: number;

  @Prop({ default: 0 })
  groupsCreated: number;

  @Prop({ default: 0 })
  notificationsReceived: number;

  @Prop({ default: 0 })
  notificationsClicked: number;

  @Prop({ default: 0 })
  searchCount: number;

  @Prop({ type: Object, default: {} })
  featureUsage: Record<string, number>;

  @Prop({ type: Object, default: {} })
  screenViews: Record<string, number>;

  @Prop({ default: null })
  lastActiveAt: Date;

  @Prop({ default: 0 })
  daysActive: number;
}

export const UserMetricsSchema = SchemaFactory.createForClass(UserMetrics);

// Compound indexes
UserMetricsSchema.index({ userId: 1, period: 1, periodStart: -1 }, { unique: true });
UserMetricsSchema.index({ period: 1, periodStart: -1 });

// App Metrics Schema (system-wide aggregated stats)
export type AppMetricsDocument = AppMetrics & Document;

@Schema({ timestamps: true, collection: 'app_metrics' })
export class AppMetrics {
  @Prop({ required: true, enum: ['hourly', 'daily', 'weekly', 'monthly'], index: true })
  period: string;

  @Prop({ required: true, index: true })
  periodStart: Date;

  @Prop({ required: true, index: true })
  periodEnd: Date;

  @Prop({ default: 0 })
  activeUsers: number;

  @Prop({ default: 0 })
  newUsers: number;

  @Prop({ default: 0 })
  totalSessions: number;

  @Prop({ default: 0 })
  avgSessionDuration: number;

  @Prop({ default: 0 })
  totalMessages: number;

  @Prop({ default: 0 })
  totalCalls: number;

  @Prop({ default: 0 })
  totalCallDuration: number;

  @Prop({ default: 0 })
  totalMediaUploads: number;

  @Prop({ default: 0 })
  totalStorageUsed: number; // in bytes

  @Prop({ default: 0 })
  groupsCreated: number;

  @Prop({ default: 0 })
  notificationsSent: number;

  @Prop({ default: 0 })
  errorCount: number;

  @Prop({ type: Object, default: {} })
  platformBreakdown: Record<string, number>;

  @Prop({ type: Object, default: {} })
  versionBreakdown: Record<string, number>;

  @Prop({ type: Object, default: {} })
  countryBreakdown: Record<string, number>;

  @Prop({ type: Object, default: {} })
  featureUsage: Record<string, number>;

  @Prop({ type: Object, default: {} })
  errorBreakdown: Record<string, number>;
}

export const AppMetricsSchema = SchemaFactory.createForClass(AppMetrics);

// Compound indexes
AppMetricsSchema.index({ period: 1, periodStart: -1 }, { unique: true });

// Retention Cohort Schema
export type RetentionCohortDocument = RetentionCohort & Document;

@Schema({ timestamps: true, collection: 'retention_cohorts' })
export class RetentionCohort {
  @Prop({ required: true, index: true })
  cohortDate: Date; // First day of the cohort (signup date)

  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly'], index: true })
  period: string;

  @Prop({ default: 0 })
  cohortSize: number; // Number of users in this cohort

  @Prop({ type: [Number], default: [] })
  retention: number[]; // Retention percentages for each period (day 0, day 1, day 2, etc.)

  @Prop({ type: [Number], default: [] })
  activeUsers: number[]; // Absolute number of active users for each period
}

export const RetentionCohortSchema = SchemaFactory.createForClass(RetentionCohort);

// Compound indexes
RetentionCohortSchema.index({ cohortDate: 1, period: 1 }, { unique: true });
