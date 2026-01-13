import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Call, CallDocument, CallSignal, CallSignalDocument } from './schemas/call.schema';
import { SERVICES } from '../../shared/constants/services';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../shared/utils/service-response.util';
import {
  IPaginatedResponse,
  IServiceResponse,
} from '../../shared/interfaces/microservice.interface';

interface CallParticipantDto {
  userId: string;
  joinedAt?: Date;
  leftAt?: Date;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  status: string;
}

interface CallDto {
  id: string;
  conversationId?: string;
  initiatorId: string;
  type: string;
  status: string;
  participants: CallParticipantDto[];
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration: number;
  endReason?: string;
  isGroupCall: boolean;
  iceServers?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface InitiateCallDto {
  callerId: string;
  calleeIds: string[];
  type: string;
  conversationId?: string;
}

/**
 * Calls Service Handler
 * Business logic for call operations with MongoDB
 */
@Injectable()
export class CallsServiceHandler {
  private readonly logger = new Logger(CallsServiceHandler.name);

  constructor(
    @InjectModel(Call.name) private callModel: Model<CallDocument>,
    @InjectModel(CallSignal.name) private callSignalModel: Model<CallSignalDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(SERVICES.USERS_SERVICE) private usersClient: ClientProxy,
    @Inject(SERVICES.NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy,
    private configService: ConfigService,
  ) {}

  private toCallDto(doc: CallDocument): CallDto {
    return {
      id: doc._id.toString(),
      conversationId: doc.conversationId?.toString(),
      initiatorId: doc.initiatorId.toString(),
      type: doc.type,
      status: doc.status,
      participants: doc.participants.map((p) => ({
        userId: p.userId.toString(),
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        isMuted: p.isMuted,
        isVideoOff: p.isVideoOff,
        isScreenSharing: p.isScreenSharing,
        status: p.status,
      })),
      startedAt: doc.startedAt,
      answeredAt: doc.answeredAt,
      endedAt: doc.endedAt,
      duration: doc.duration,
      endReason: doc.endReason,
      isGroupCall: doc.type === 'group_audio' || doc.type === 'group_video',
      iceServers: doc.iceServers,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }

  private getIceServers(): any {
    const stunServers = this.configService.get('STUN_SERVERS')?.split(',') || [
      'stun:stun.l.google.com:19302',
    ];
    const turnUrl = this.configService.get('TURN_SERVER_URL');

    const iceServers: any = { stun: stunServers };

    if (turnUrl) {
      iceServers.turn = [
        {
          url: turnUrl,
          username: this.configService.get('TURN_USERNAME'),
          credential: this.configService.get('TURN_CREDENTIAL'),
        },
      ];
    }

    return iceServers;
  }

  async initiateCall(dto: InitiateCallDto): Promise<IServiceResponse<CallDto>> {
    try {
      // Check if caller is already in an active call
      const existingCall = await this.callModel.findOne({
        'participants.userId': new Types.ObjectId(dto.callerId),
        status: { $in: ['initiating', 'ringing', 'connecting', 'active'] },
      });

      if (existingCall) {
        return errorResponse(
          ERROR_CODES.ALREADY_EXISTS,
          'You are already in a call',
          SERVICES.CALLS_SERVICE,
        );
      }

      const callType =
        dto.calleeIds.length > 1
          ? dto.type === 'video'
            ? 'group_video'
            : 'group_audio'
          : dto.type;

      const participants = [
        {
          userId: new Types.ObjectId(dto.callerId),
          joinedAt: new Date(),
          status: 'connected',
          isMuted: false,
          isVideoOff: dto.type === 'audio',
          isScreenSharing: false,
        },
        ...dto.calleeIds.map((id) => ({
          userId: new Types.ObjectId(id),
          status: 'ringing',
          isMuted: false,
          isVideoOff: dto.type === 'audio',
          isScreenSharing: false,
        })),
      ];

      const call = new this.callModel({
        conversationId: dto.conversationId ? new Types.ObjectId(dto.conversationId) : null,
        initiatorId: new Types.ObjectId(dto.callerId),
        type: callType,
        status: 'ringing',
        participants,
        startedAt: new Date(),
        iceServers: this.getIceServers(),
      });

      const saved = await call.save();

      // Cache active call for quick lookup
      await this.cacheManager.set(`active_call:${dto.callerId}`, saved._id.toString(), 3600000);

      this.logger.log(`Call initiated: ${saved._id} by ${dto.callerId}`);

      return successResponse(this.toCallDto(saved), SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to initiate call: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async answerCall(dto: { callId: string; userId: string }): Promise<IServiceResponse<CallDto>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      if (call.status !== 'ringing') {
        return errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Call is not ringing',
          SERVICES.CALLS_SERVICE,
        );
      }

      const participant = call.participants.find((p) => p.userId.toString() === dto.userId);
      if (!participant) {
        return errorResponse(
          ERROR_CODES.FORBIDDEN,
          'You are not a participant of this call',
          SERVICES.CALLS_SERVICE,
        );
      }

      // Update participant status
      participant.status = 'connected';
      participant.joinedAt = new Date();

      // Update call status
      call.status = 'active';
      call.answeredAt = new Date();

      const updated = await call.save();

      // Cache active call
      await this.cacheManager.set(`active_call:${dto.userId}`, call._id.toString(), 3600000);

      return successResponse(this.toCallDto(updated), SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to answer call: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async rejectCall(dto: {
    callId: string;
    userId: string;
    reason?: string;
  }): Promise<IServiceResponse<{ rejected: boolean }>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      const participant = call.participants.find((p) => p.userId.toString() === dto.userId);
      if (participant) {
        participant.status = 'declined';
        participant.leftAt = new Date();
      }

      // Check if all callees have declined
      const pendingParticipants = call.participants.filter(
        (p) => p.userId.toString() !== call.initiatorId.toString() && p.status === 'ringing',
      );

      if (pendingParticipants.length === 0) {
        call.status = 'declined';
        call.endedAt = new Date();
        call.endReason = dto.reason || 'declined';
      }

      await call.save();

      return successResponse({ rejected: true }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to reject call: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async endCall(dto: { callId: string; userId: string }): Promise<IServiceResponse<CallDto>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      const now = new Date();
      call.status = 'ended';
      call.endedAt = now;
      call.endReason = 'completed';

      if (call.answeredAt) {
        call.duration = Math.floor((now.getTime() - call.answeredAt.getTime()) / 1000);
      }

      // Mark all participants as left
      for (const participant of call.participants) {
        if (!participant.leftAt) {
          participant.leftAt = now;
          participant.status = 'left';
        }
        // Clear active call cache
        await this.cacheManager.del(`active_call:${participant.userId}`);
      }

      const updated = await call.save();

      return successResponse(this.toCallDto(updated), SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to end call: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async joinCall(dto: { callId: string; userId: string }): Promise<IServiceResponse<CallDto>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      if (!call.type.startsWith('group')) {
        return errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Cannot join a direct call',
          SERVICES.CALLS_SERVICE,
        );
      }

      const existingParticipant = call.participants.find((p) => p.userId.toString() === dto.userId);
      if (existingParticipant && !existingParticipant.leftAt) {
        return errorResponse(
          ERROR_CODES.ALREADY_EXISTS,
          'Already in this call',
          SERVICES.CALLS_SERVICE,
        );
      }

      if (existingParticipant) {
        // Rejoin
        existingParticipant.joinedAt = new Date();
        existingParticipant.leftAt = undefined as any;
        existingParticipant.status = 'connected';
      } else {
        call.participants.push({
          userId: dto.userId as any,
          joinedAt: new Date(),
          status: 'connected',
          isMuted: false,
          isVideoOff: call.type === 'group_audio',
          isScreenSharing: false,
          leftAt: null as any,
          deviceInfo: {},
        });
      }

      const updated = await call.save();

      await this.cacheManager.set(`active_call:${dto.userId}`, call._id.toString(), 3600000);

      return successResponse(this.toCallDto(updated), SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to join call: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async leaveCall(dto: {
    callId: string;
    userId: string;
  }): Promise<IServiceResponse<{ left: boolean }>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      const participant = call.participants.find((p) => p.userId.toString() === dto.userId);
      if (participant) {
        participant.leftAt = new Date();
        participant.status = 'left';
      }

      await this.cacheManager.del(`active_call:${dto.userId}`);

      // Check if call should end
      const activeParticipants = call.participants.filter((p) => !p.leftAt);
      if (activeParticipants.length <= 1) {
        call.status = 'ended';
        call.endedAt = new Date();
        call.endReason = 'all_left';

        if (call.answeredAt) {
          call.duration = Math.floor((new Date().getTime() - call.answeredAt.getTime()) / 1000);
        }

        // Clear remaining participant's cache
        for (const p of activeParticipants) {
          await this.cacheManager.del(`active_call:${p.userId}`);
        }
      }

      await call.save();

      return successResponse({ left: true }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to leave call: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async toggleAudio(dto: {
    callId: string;
    userId: string;
    enabled: boolean;
  }): Promise<IServiceResponse<{ audioEnabled: boolean }>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      const participant = call.participants.find((p) => p.userId.toString() === dto.userId);
      if (participant) {
        participant.isMuted = !dto.enabled;
      }

      await call.save();

      return successResponse({ audioEnabled: dto.enabled }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to toggle audio: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async toggleVideo(dto: {
    callId: string;
    userId: string;
    enabled: boolean;
  }): Promise<IServiceResponse<{ videoEnabled: boolean }>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      const participant = call.participants.find((p) => p.userId.toString() === dto.userId);
      if (participant) {
        participant.isVideoOff = !dto.enabled;
      }

      await call.save();

      return successResponse({ videoEnabled: dto.enabled }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to toggle video: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async startScreenShare(dto: {
    callId: string;
    userId: string;
  }): Promise<IServiceResponse<{ screenSharing: boolean }>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      const participant = call.participants.find((p) => p.userId.toString() === dto.userId);
      if (participant) {
        participant.isScreenSharing = true;
      }

      await call.save();

      return successResponse({ screenSharing: true }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to start screen share: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async stopScreenShare(dto: {
    callId: string;
    userId: string;
  }): Promise<IServiceResponse<{ screenSharing: boolean }>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      const participant = call.participants.find((p) => p.userId.toString() === dto.userId);
      if (participant) {
        participant.isScreenSharing = false;
      }

      await call.save();

      return successResponse({ screenSharing: false }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to stop screen share: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  // WebRTC Signaling
  async sendOffer(dto: {
    callId: string;
    fromUserId: string;
    toUserId: string;
    payload: any;
  }): Promise<IServiceResponse<{ sent: boolean }>> {
    try {
      const signal = new this.callSignalModel({
        callId: new Types.ObjectId(dto.callId),
        fromUserId: new Types.ObjectId(dto.fromUserId),
        toUserId: new Types.ObjectId(dto.toUserId),
        type: 'offer',
        payload: dto.payload,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });

      await signal.save();

      this.logger.debug(`SDP Offer saved: ${dto.callId}`);

      return successResponse({ sent: true }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to send offer: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async sendAnswer(dto: {
    callId: string;
    fromUserId: string;
    toUserId: string;
    payload: any;
  }): Promise<IServiceResponse<{ sent: boolean }>> {
    try {
      const signal = new this.callSignalModel({
        callId: new Types.ObjectId(dto.callId),
        fromUserId: new Types.ObjectId(dto.fromUserId),
        toUserId: new Types.ObjectId(dto.toUserId),
        type: 'answer',
        payload: dto.payload,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await signal.save();

      this.logger.debug(`SDP Answer saved: ${dto.callId}`);

      return successResponse({ sent: true }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to send answer: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async sendIceCandidate(dto: {
    callId: string;
    fromUserId: string;
    toUserId: string;
    payload: any;
  }): Promise<IServiceResponse<{ sent: boolean }>> {
    try {
      const signal = new this.callSignalModel({
        callId: new Types.ObjectId(dto.callId),
        fromUserId: new Types.ObjectId(dto.fromUserId),
        toUserId: new Types.ObjectId(dto.toUserId),
        type: 'ice-candidate',
        payload: dto.payload,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await signal.save();

      return successResponse({ sent: true }, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to send ICE candidate: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async getPendingSignals(dto: {
    callId: string;
    userId: string;
  }): Promise<IServiceResponse<any[]>> {
    try {
      const signals = await this.callSignalModel
        .find({
          callId: new Types.ObjectId(dto.callId),
          toUserId: new Types.ObjectId(dto.userId),
          isProcessed: false,
        })
        .sort({ createdAt: 1 });

      // Mark as processed
      await this.callSignalModel.updateMany(
        { _id: { $in: signals.map((s) => s._id) } },
        { $set: { isProcessed: true, processedAt: new Date() } },
      );

      return successResponse(
        signals.map((s) => ({
          type: s.type,
          fromUserId: s.fromUserId.toString(),
          payload: s.payload,
        })),
        SERVICES.CALLS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get pending signals: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async getCall(dto: { callId: string; userId: string }): Promise<IServiceResponse<CallDto>> {
    try {
      const call = await this.callModel.findById(dto.callId);

      if (!call) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Call not found', SERVICES.CALLS_SERVICE);
      }

      return successResponse(this.toCallDto(call), SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get call: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async getActiveCall(dto: { userId: string }): Promise<IServiceResponse<CallDto | null>> {
    try {
      // Check cache first
      const cachedCallId = await this.cacheManager.get<string>(`active_call:${dto.userId}`);
      if (cachedCallId) {
        const call = await this.callModel.findById(cachedCallId);
        if (call && ['initiating', 'ringing', 'connecting', 'active'].includes(call.status)) {
          return successResponse(this.toCallDto(call), SERVICES.CALLS_SERVICE);
        }
      }

      // Fallback to DB query
      const call = await this.callModel.findOne({
        'participants.userId': new Types.ObjectId(dto.userId),
        status: { $in: ['initiating', 'ringing', 'connecting', 'active'] },
      });

      if (call) {
        return successResponse(this.toCallDto(call), SERVICES.CALLS_SERVICE);
      }

      return successResponse(null, SERVICES.CALLS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get active call: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async getCallHistory(dto: {
    userId: string;
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
  }): Promise<IServiceResponse<IPaginatedResponse<CallDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;

      const query: any = {
        'participants.userId': new Types.ObjectId(dto.userId),
      };

      if (dto.type) {
        query.type = dto.type;
      }

      if (dto.status) {
        query.status = dto.status;
      }

      const [calls, total] = await Promise.all([
        this.callModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
        this.callModel.countDocuments(query),
      ]);

      return successResponse(
        {
          items: calls.map((c) => this.toCallDto(c)),
          total,
          limit,
          offset,
          hasMore: offset + calls.length < total,
        },
        SERVICES.CALLS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get call history: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }

  async getMissedCalls(dto: {
    userId: string;
    limit?: number;
  }): Promise<IServiceResponse<CallDto[]>> {
    try {
      const limit = dto.limit || 20;

      const calls = await this.callModel
        .find({
          'participants.userId': new Types.ObjectId(dto.userId),
          'participants.status': 'missed',
          status: { $in: ['missed', 'ended'] },
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();

      return successResponse(
        calls.map((c) => this.toCallDto(c)),
        SERVICES.CALLS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get missed calls: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.CALLS_SERVICE);
    }
  }
}
