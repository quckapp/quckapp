import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { SchedulerController } from './scheduler.controller';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [ScheduleModule.forRoot(), CacheModule.forRoot()],
  controllers: [SchedulerController],
  providers: [TasksService],
  exports: [TasksService],
})
export class SchedulerModule {}
