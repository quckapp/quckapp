import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { SERVICES } from '../../../shared/constants/services';
import { CALLS_PATTERNS } from '../../../shared/contracts/message-patterns';
import {
  CallDto,
  InitiateCallDto,
  PaginatedResponseDto,
  ServiceResponseDto,
  SignalingDto,
} from '../../../shared/dto';

/**
 * Calls Gateway Controller
 * Routes call requests to Calls Microservice
 */
@Controller('calls')
export class CallsGatewayController {
  constructor(@Inject(SERVICES.CALLS_SERVICE) private callsClient: ClientProxy) {}

  /**
   * Initiate a call
   */
  @Post()
  async initiateCall(
    @Req() req: any,
    @Body() dto: Omit<InitiateCallDto, 'callerId'>,
  ): Promise<ServiceResponseDto<CallDto>> {
    return this.sendToService(CALLS_PATTERNS.INITIATE_CALL, {
      ...dto,
      callerId: req.user?.userId,
    });
  }

  /**
   * Answer a call
   */
  @Post(':id/answer')
  async answerCall(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto<CallDto>> {
    return this.sendToService(CALLS_PATTERNS.ANSWER_CALL, {
      callId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Reject a call
   */
  @Post(':id/reject')
  async rejectCall(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { reason?: string },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.REJECT_CALL, {
      callId: id,
      userId: req.user?.userId,
      reason: dto.reason,
    });
  }

  /**
   * End a call
   */
  @Post(':id/end')
  async endCall(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto<CallDto>> {
    return this.sendToService(CALLS_PATTERNS.END_CALL, {
      callId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Join a call (for group calls)
   */
  @Post(':id/join')
  async joinCall(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.JOIN_CALL, {
      callId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Leave a call (for group calls)
   */
  @Post(':id/leave')
  async leaveCall(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.LEAVE_CALL, {
      callId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Toggle audio
   */
  @Post(':id/audio')
  async toggleAudio(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { enabled: boolean },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.TOGGLE_AUDIO, {
      callId: id,
      userId: req.user?.userId,
      enabled: dto.enabled,
    });
  }

  /**
   * Toggle video
   */
  @Post(':id/video')
  async toggleVideo(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { enabled: boolean },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.TOGGLE_VIDEO, {
      callId: id,
      userId: req.user?.userId,
      enabled: dto.enabled,
    });
  }

  /**
   * Start screen sharing
   */
  @Post(':id/screenshare/start')
  async startScreenShare(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.START_SCREEN_SHARE, {
      callId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Stop screen sharing
   */
  @Post(':id/screenshare/stop')
  async stopScreenShare(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.STOP_SCREEN_SHARE, {
      callId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Send WebRTC offer
   */
  @Post(':id/signaling/offer')
  async sendOffer(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { toUserId: string; payload: any },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.SEND_OFFER, {
      callId: id,
      fromUserId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Send WebRTC answer
   */
  @Post(':id/signaling/answer')
  async sendAnswer(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { toUserId: string; payload: any },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.SEND_ANSWER, {
      callId: id,
      fromUserId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Send ICE candidate
   */
  @Post(':id/signaling/ice')
  async sendIceCandidate(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { toUserId: string; payload: any },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(CALLS_PATTERNS.SEND_ICE_CANDIDATE, {
      callId: id,
      fromUserId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Get call by ID
   */
  @Get(':id')
  async getCall(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto<CallDto>> {
    return this.sendToService(CALLS_PATTERNS.GET_CALL, {
      callId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Get call history
   */
  @Get()
  async getCallHistory(
    @Req() req: any,
    @Query() query: { limit?: number; offset?: number; type?: string; status?: string },
  ): Promise<ServiceResponseDto<PaginatedResponseDto<CallDto>>> {
    return this.sendToService(CALLS_PATTERNS.GET_CALL_HISTORY, {
      userId: req.user?.userId,
      ...query,
    });
  }

  private async sendToService<T>(pattern: string, data: any): Promise<ServiceResponseDto<T>> {
    try {
      const result = await firstValueFrom(
        this.callsClient.send<ServiceResponseDto<T>>(pattern, data).pipe(
          timeout(5000),
          catchError((err) => {
            throw new HttpException(
              {
                success: false,
                error: {
                  code: 'SERVICE_ERROR',
                  message: err.message || 'Calls service error',
                },
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: 'Failed to communicate with calls service',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
