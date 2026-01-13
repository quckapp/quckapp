import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventService } from './event.service';
import { UserEventListener } from './listeners/user.listener';
import { MessageEventListener } from './listeners/message.listener';
import { NotificationEventListener } from './listeners/notification.listener';
import { AnalyticsEventListener } from './listeners/analytics.listener';
import { SystemEventListener } from './listeners/system.listener';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcard listeners
      wildcard: true,
      // Use delimiter for namespaced events (e.g., 'user.created')
      delimiter: '.',
      // Set max listeners to avoid memory leak warnings
      maxListeners: 20,
      // Enable verbose memory leak warnings
      verboseMemoryLeak: true,
      // Ignore errors from listeners to prevent cascading failures
      ignoreErrors: false,
    }),
  ],
  providers: [
    EventService,
    UserEventListener,
    MessageEventListener,
    NotificationEventListener,
    AnalyticsEventListener,
    SystemEventListener,
  ],
  exports: [EventService],
})
export class EventsModule {}
