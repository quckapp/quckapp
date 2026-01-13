import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { Status, StatusSchema } from './schemas/status.schema';
import { UploadModule } from '../upload/upload.module';
import { StatusRepository } from './repositories/status.repository';
import { StatusFactory } from './factories/status.factory';
import {
  FileProcessorContext,
  ImageProcessorStrategy,
  VideoProcessorStrategy,
} from './strategies/file-processor.strategy';
import { StatusCreationService } from './services/status-creation.service';
import { StatusQueryService } from './services/status-query.service';
import { StatusViewerService } from './services/status-viewer.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Status.name, schema: StatusSchema }]), UploadModule],
  controllers: [StatusController],
  providers: [
    StatusService,
    StatusRepository,
    StatusFactory,
    ImageProcessorStrategy,
    VideoProcessorStrategy,
    FileProcessorContext,
    StatusCreationService,
    StatusQueryService,
    StatusViewerService,
  ],
  exports: [StatusService],
})
export class StatusModule {}
