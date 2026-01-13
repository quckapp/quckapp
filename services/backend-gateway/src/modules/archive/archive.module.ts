import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../../common/logger/logger.module';
import { ArchiveService } from './archive.service';
import { ArchiveController } from './archive.controller';

/**
 * ArchiveModule - Module for creating ZIP archives
 * Supports creating ZIP files from multiple sources (files, buffers, directories)
 */
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [ArchiveController],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}
