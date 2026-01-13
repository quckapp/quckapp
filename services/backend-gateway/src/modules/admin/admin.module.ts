import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Report, ReportSchema } from './schemas/report.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { SystemMetrics, SystemMetricsSchema } from './schemas/system-metrics.schema';
import { AdminBroadcast, AdminBroadcastSchema } from './schemas/admin-broadcast.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: SystemMetrics.name, schema: SystemMetricsSchema },
      { name: AdminBroadcast.name, schema: AdminBroadcastSchema },
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
