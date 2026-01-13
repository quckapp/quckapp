import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemMetricsDocument = SystemMetrics & Document;

@Schema({ timestamps: true })
export class SystemMetrics {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ default: 0 })
  activeUsers: number;

  @Prop({ default: 0 })
  messagesPerMinute: number;

  @Prop({ default: 0 })
  cpuUsage: number;

  @Prop({ default: 0 })
  memoryUsage: number;

  @Prop({ default: 0 })
  diskUsage: number;

  @Prop({ default: 0 })
  activeConnections: number;

  @Prop({ type: Object, default: {} })
  apiLatency: Record<string, number>;

  @Prop({ type: Object, default: {} })
  errorRates: Record<string, number>;

  createdAt: Date;
}

export const SystemMetricsSchema = SchemaFactory.createForClass(SystemMetrics);

SystemMetricsSchema.index({ timestamp: -1 });
// TTL index to auto-delete old metrics after 30 days
SystemMetricsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
