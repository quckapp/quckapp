import { Global, Module } from '@nestjs/common';
import { NotificationQueueService } from './notification-queue.service';
import { LoggerModule } from '../logger/logger.module';

/**
 * QueueModule - Global module for queue services
 * Design Pattern: Singleton (Global module)
 * SOLID: Dependency Inversion - Depends on LoggerService abstraction
 */
@Global()
@Module({
  imports: [LoggerModule],
  providers: [NotificationQueueService],
  exports: [NotificationQueueService],
})
export class QueueModule {}
