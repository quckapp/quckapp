import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Call, CallDocument } from './schemas/call.schema';
import { CreateCallDto } from './dto/create-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class CallsService {
  constructor(
    @InjectModel(Call.name) private callModel: Model<CallDocument>,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
  ) {}

  /**
   * Check if a string is a valid MongoDB ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
  }

  async create(userId: string, createCallDto: CreateCallDto): Promise<Call> {
    const participants = [];

    // Add initiator as first participant
    participants.push({
      userId,
      joinedAt: new Date(),
      isInitiator: true,
    });

    // Add other participants if provided
    if (createCallDto.participantIds) {
      createCallDto.participantIds.forEach((participantId) => {
        if (participantId !== userId) {
          participants.push({
            userId: participantId,
            isInitiator: false,
          });
        }
      });
    }

    const call = new this.callModel({
      ...createCallDto,
      initiatorId: userId,
      participants,
      status: 'ongoing',
      startedAt: new Date(),
    });

    return call.save();
  }

  async findAll(userId: string): Promise<Call[]> {
    // Convert userId to ObjectId for proper matching
    const userObjectId = new Types.ObjectId(userId);

    return this.callModel
      .find({
        $or: [
          { initiatorId: userObjectId },
          { 'participants.userId': userObjectId },
        ],
      })
      .populate('initiatorId', 'displayName phoneNumber avatar')
      .populate('participants.userId', 'displayName phoneNumber avatar')
      .populate('conversationId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Call> {
    const call = await this.callModel
      .findById(id)
      .populate('initiatorId', 'displayName phoneNumber avatar')
      .populate('participants.userId', 'displayName phoneNumber avatar')
      .populate('conversationId')
      .exec();

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return call;
  }

  async update(id: string, updateCallDto: UpdateCallDto): Promise<Call | null> {
    // Validate that the ID is a valid MongoDB ObjectId
    if (!this.isValidObjectId(id)) {
      // If it's a client-side callId (e.g., call_1765323231643_xxx), skip the update
      // This prevents CastError when client accidentally sends wrong ID format
      console.warn(`CallsService.update: Invalid ObjectId format received: ${id}. Skipping update.`);
      return null;
    }

    const call = await this.callModel.findById(id);

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (updateCallDto.status) {
      call.status = updateCallDto.status;

      if (
        updateCallDto.status === 'completed' ||
        updateCallDto.status === 'failed' ||
        updateCallDto.status === 'missed' ||
        updateCallDto.status === 'rejected'
      ) {
        call.endedAt = new Date();

        if (call.startedAt) {
          call.duration = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
        }

        // Create call end message
        await this.createCallEndMessage(call);
      }
    }

    if (updateCallDto.duration !== undefined) {
      call.duration = updateCallDto.duration;
    }

    return call.save();
  }

  /**
   * Create a system message when call ends
   */
  private async createCallEndMessage(call: CallDocument): Promise<void> {
    try {
      if (!call.conversationId) return;

      const callType = call.type === 'video' ? 'Video' : 'Voice';
      let content = '';

      switch (call.status) {
        case 'completed':
          const durationMinutes = Math.floor(call.duration / 60);
          const durationSeconds = call.duration % 60;
          const durationText =
            durationMinutes > 0 ? `${durationMinutes}m ${durationSeconds}s` : `${durationSeconds}s`;
          content = `${callType} call • ${durationText}`;
          break;
        case 'missed':
          content = `Missed ${callType.toLowerCase()} call`;
          break;
        case 'rejected':
          content = `${callType} call declined`;
          break;
        case 'failed':
          content = `${callType} call failed`;
          break;
        default:
          content = `${callType} call ended`;
      }

      await this.messagesService.createMessage(
        call.conversationId.toString(),
        call.initiatorId.toString(),
        'call',
        content,
        [],
        undefined,
        {
          callId: (call as any)._id,
          type: call.type,
          status: call.status,
          duration: call.duration,
        },
      );
    } catch (error) {
      console.error('Failed to create call end message:', error);
    }
  }

  async joinCall(callId: string, userId: string): Promise<Call | null> {
    // Validate that the ID is a valid MongoDB ObjectId
    if (!this.isValidObjectId(callId)) {
      console.warn(`CallsService.joinCall: Invalid ObjectId format received: ${callId}. Skipping.`);
      return null;
    }

    const call = await this.callModel.findById(callId);

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const existingParticipant = call.participants.find((p) => p.userId.toString() === userId);

    if (existingParticipant && !existingParticipant.joinedAt) {
      existingParticipant.joinedAt = new Date();
    }

    return call.save();
  }

  async leaveCall(callId: string, userId: string): Promise<Call | null> {
    // Validate that the ID is a valid MongoDB ObjectId
    if (!this.isValidObjectId(callId)) {
      console.warn(`CallsService.leaveCall: Invalid ObjectId format received: ${callId}. Skipping.`);
      return null;
    }

    const call = await this.callModel.findById(callId);

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const participant = call.participants.find((p) => p.userId.toString() === userId);

    if (participant) {
      participant.leftAt = new Date();
    }

    return call.save();
  }

  async deleteCallHistory(userId: string): Promise<void> {
    await this.callModel.deleteMany({
      $or: [{ initiatorId: userId }, { 'participants.userId': userId }],
    });
  }

  /**
   * Invite users to an active call
   */
  async inviteToCall(
    callId: string,
    inviterId: string,
    userIds: string[],
  ): Promise<{ call: Call; invited: string[] }> {
    const call = await this.callModel.findById(callId);

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Filter out users who are already in the call
    const existingParticipantIds = call.participants.map((p) => p.userId.toString());
    const newUserIds = userIds.filter((id) => !existingParticipantIds.includes(id));

    // Add new participants to the call
    for (const userId of newUserIds) {
      call.participants.push({
        userId: userId as any,
        joinedAt: new Date(),
        isInitiator: false,
      } as any);
    }

    await call.save();

    // Return populated call
    const populatedCall = await this.callModel
      .findById(callId)
      .populate('initiatorId', 'displayName phoneNumber avatar')
      .populate('participants.userId', 'displayName phoneNumber avatar')
      .populate('conversationId')
      .exec();

    if (!populatedCall) {
      throw new NotFoundException('Call not found after update');
    }

    return {
      call: populatedCall,
      invited: newUserIds,
    };
  }
}
