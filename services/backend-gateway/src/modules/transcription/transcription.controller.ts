import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BatchTranscribeDto, SearchTranscriptionsDto } from './dto';

@Controller('transcription')
@UseGuards(JwtAuthGuard)
export class TranscriptionController {
  constructor(private transcriptionService: TranscriptionService) {}

  @Post('message/:messageId')
  async transcribeMessage(@Param('messageId') messageId: string) {
    return this.transcriptionService.transcribeMessage(messageId);
  }

  @Get('message/:messageId')
  async getTranscription(@Param('messageId') messageId: string) {
    const result = await this.transcriptionService.getTranscription(messageId);
    if (!result) {
      return { transcription: null, message: 'No transcription available' };
    }
    return result;
  }

  @Post('batch')
  async batchTranscribe(@Body() batchDto: BatchTranscribeDto) {
    return this.transcriptionService.batchTranscribe(batchDto.messageIds);
  }

  @Get('search')
  async searchTranscriptions(@Query() searchDto: SearchTranscriptionsDto) {
    const messages = await this.transcriptionService.searchTranscriptions(
      searchDto.conversationId,
      searchDto.query,
      searchDto.limit || 20,
    );

    return {
      results: messages,
      count: messages.length,
    };
  }
}
