import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { LinkPreviewService } from './link-preview.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BatchLinkPreviewDto, ExtractLinksDto, GetLinkPreviewDto } from './dto';

@Controller('link-preview')
@UseGuards(JwtAuthGuard)
export class LinkPreviewController {
  constructor(private linkPreviewService: LinkPreviewService) {}

  @Get()
  async getPreview(@Query() query: GetLinkPreviewDto) {
    return this.linkPreviewService.generatePreview(query.url);
  }

  @Post('batch')
  async getBatchPreviews(@Body() batchDto: BatchLinkPreviewDto) {
    return this.linkPreviewService.generatePreviews(batchDto.urls);
  }

  @Post('extract')
  async extractAndPreview(@Body() extractDto: ExtractLinksDto) {
    const urls = this.linkPreviewService.extractUrls(extractDto.text);
    if (urls.length === 0) {
      return { urls: [], previews: [] };
    }

    const previews = await this.linkPreviewService.generatePreviews(urls);
    return { urls, previews };
  }

  @Get('stats')
  async getCacheStats() {
    return this.linkPreviewService.getCacheStats();
  }
}
