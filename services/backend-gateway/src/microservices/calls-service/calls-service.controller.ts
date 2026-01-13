import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CALLS_PATTERNS } from '../../shared/contracts/message-patterns';
import { CallsServiceHandler } from './calls-service.handler';
import { InitiateCallDto } from '../../shared/dto';
import {
  IPaginatedResponse,
  IServiceResponse,
} from '../../shared/interfaces/microservice.interface';

/**
 * Calls Service Controller
 * Handles incoming messages from the message broker
 */
@Controller()
export class CallsServiceController {
  constructor(private handler: CallsServiceHandler) {}

  @MessagePattern(CALLS_PATTERNS.INITIATE_CALL)
  async initiateCall(@Payload() dto: InitiateCallDto) {
    return this.handler.initiateCall(dto);
  }

  @MessagePattern(CALLS_PATTERNS.ANSWER_CALL)
  async answerCall(@Payload() dto: { callId: string; userId: string }) {
    return this.handler.answerCall(dto);
  }

  @MessagePattern(CALLS_PATTERNS.REJECT_CALL)
  async rejectCall(@Payload() dto: { callId: string; userId: string; reason?: string }) {
    return this.handler.rejectCall(dto);
  }

  @MessagePattern(CALLS_PATTERNS.END_CALL)
  async endCall(@Payload() dto: { callId: string; userId: string }) {
    return this.handler.endCall(dto);
  }

  @MessagePattern(CALLS_PATTERNS.JOIN_CALL)
  async joinCall(@Payload() dto: { callId: string; userId: string }) {
    return this.handler.joinCall(dto);
  }

  @MessagePattern(CALLS_PATTERNS.LEAVE_CALL)
  async leaveCall(@Payload() dto: { callId: string; userId: string }) {
    return this.handler.leaveCall(dto);
  }

  @MessagePattern(CALLS_PATTERNS.TOGGLE_AUDIO)
  async toggleAudio(@Payload() dto: { callId: string; userId: string; enabled: boolean }) {
    return this.handler.toggleAudio(dto);
  }

  @MessagePattern(CALLS_PATTERNS.TOGGLE_VIDEO)
  async toggleVideo(@Payload() dto: { callId: string; userId: string; enabled: boolean }) {
    return this.handler.toggleVideo(dto);
  }

  @MessagePattern(CALLS_PATTERNS.START_SCREEN_SHARE)
  async startScreenShare(@Payload() dto: { callId: string; userId: string }) {
    return this.handler.startScreenShare(dto);
  }

  @MessagePattern(CALLS_PATTERNS.STOP_SCREEN_SHARE)
  async stopScreenShare(@Payload() dto: { callId: string; userId: string }) {
    return this.handler.stopScreenShare(dto);
  }

  @MessagePattern(CALLS_PATTERNS.SEND_OFFER)
  async sendOffer(
    @Payload() dto: { callId: string; fromUserId: string; toUserId: string; payload: any },
  ) {
    return this.handler.sendOffer(dto);
  }

  @MessagePattern(CALLS_PATTERNS.SEND_ANSWER)
  async sendAnswer(
    @Payload() dto: { callId: string; fromUserId: string; toUserId: string; payload: any },
  ) {
    return this.handler.sendAnswer(dto);
  }

  @MessagePattern(CALLS_PATTERNS.SEND_ICE_CANDIDATE)
  async sendIceCandidate(
    @Payload() dto: { callId: string; fromUserId: string; toUserId: string; payload: any },
  ) {
    return this.handler.sendIceCandidate(dto);
  }

  @MessagePattern(CALLS_PATTERNS.GET_CALL)
  async getCall(@Payload() dto: { callId: string; userId: string }) {
    return this.handler.getCall(dto);
  }

  @MessagePattern(CALLS_PATTERNS.GET_CALL_HISTORY)
  async getCallHistory(
    @Payload()
    dto: {
      userId: string;
      limit?: number;
      offset?: number;
      type?: string;
      status?: string;
    },
  ) {
    return this.handler.getCallHistory(dto);
  }
}
