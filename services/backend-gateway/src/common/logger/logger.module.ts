import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { AuditService } from './audit.service';
import { PerformanceService } from './performance.service';

@Global()
@Module({
  providers: [LoggerService, AuditService, PerformanceService],
  exports: [LoggerService, AuditService, PerformanceService],
})
export class LoggerModule {}
