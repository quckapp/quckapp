import { Module } from '@nestjs/common';
import { LinkPreviewService } from './link-preview.service';
import { LinkPreviewController } from './link-preview.controller';

@Module({
  controllers: [LinkPreviewController],
  providers: [LinkPreviewService],
  exports: [LinkPreviewService],
})
export class LinkPreviewModule {}
