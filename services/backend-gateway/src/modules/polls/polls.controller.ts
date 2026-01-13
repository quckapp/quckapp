import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PollsService } from './polls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePollDto, VotePollDto } from './dto';

interface AuthRequest extends Request {
  user: { userId: string; phoneNumber: string };
}

@Controller('polls')
@UseGuards(JwtAuthGuard)
export class PollsController {
  constructor(private pollsService: PollsService) {}

  @Post()
  async createPoll(@Request() req: AuthRequest, @Body() createDto: CreatePollDto) {
    return this.pollsService.createPoll(
      req.user.userId,
      createDto.conversationId,
      createDto.question,
      createDto.options,
      {
        allowMultipleAnswers: createDto.allowMultipleAnswers,
        isAnonymous: createDto.isAnonymous,
        expiresInHours: createDto.expiresInHours,
      },
    );
  }

  @Get(':id')
  async getPoll(@Param('id') id: string) {
    return this.pollsService.findById(id);
  }

  @Get(':id/results')
  async getPollResults(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.pollsService.getPollResults(id, req.user.userId);
  }

  @Get('conversation/:conversationId')
  async getConversationPolls(
    @Param('conversationId') conversationId: string,
    @Request() req: AuthRequest,
  ) {
    return this.pollsService.getConversationPolls(conversationId, req.user.userId);
  }

  @Post(':id/vote')
  async vote(@Param('id') id: string, @Request() req: AuthRequest, @Body() voteDto: VotePollDto) {
    return this.pollsService.vote(id, req.user.userId, voteDto.optionIds);
  }

  @Delete(':id/vote')
  async removeVote(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.pollsService.removeVote(id, req.user.userId);
  }

  @Put(':id/close')
  async closePoll(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.pollsService.closePoll(id, req.user.userId);
  }

  @Delete(':id')
  async deletePoll(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.pollsService.deletePoll(id, req.user.userId);
    return { success: true };
  }
}
