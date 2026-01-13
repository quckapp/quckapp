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
import { CallsService } from './calls.service';
import { CreateCallDto } from './dto/create-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebrtcGateway } from '../../gateways/webrtc.gateway';
import { UsersService } from '../users/users.service';

interface AuthenticatedRequest {
  user: { _id: string; userId?: string };
}

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly webrtcGateway: WebrtcGateway,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() createCallDto: CreateCallDto) {
    return this.callsService.create(req.user._id, createCallDto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.callsService.findAll(req.user._id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.callsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCallDto: UpdateCallDto) {
    return this.callsService.update(id, updateCallDto);
  }

  @Put(':id/join')
  joinCall(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.callsService.joinCall(id, req.user._id);
  }

  @Put(':id/leave')
  leaveCall(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.callsService.leaveCall(id, req.user._id);
  }

  @Delete('history')
  deleteHistory(@Request() req: AuthenticatedRequest) {
    return this.callsService.deleteCallHistory(req.user._id);
  }

  @Post(':id/invite')
  async inviteToCall(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { userIds: string[] },
  ) {
    const userId = req.user._id;
    const result = await this.callsService.inviteToCall(id, userId, body.userIds);

    // Get inviter info for socket notification
    if (result.invited.length > 0) {
      const inviter = await this.usersService.findById(userId);

      // Send socket notifications to invited users
      this.webrtcGateway.sendCallInvitation(
        result.invited,
        {
          id: userId,
          displayName: inviter.displayName,
          avatar: inviter.avatar,
        },
        {
          callId: id,
          callType: result.call.type as 'audio' | 'video',
          conversationId: result.call.conversationId?.toString() || '',
        },
      );
    }

    return {
      success: true,
      invited: result.invited,
      message: `Invited ${result.invited.length} user(s) to the call`,
    };
  }
}
