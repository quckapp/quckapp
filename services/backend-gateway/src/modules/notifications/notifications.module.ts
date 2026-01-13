import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QueuedNotificationsService } from './queued-notifications.service';

@Module({
  providers: [NotificationsService, QueuedNotificationsService],
  exports: [NotificationsService, QueuedNotificationsService],
})
export class NotificationsModule {}
