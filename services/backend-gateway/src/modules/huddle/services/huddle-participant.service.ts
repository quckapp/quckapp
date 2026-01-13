/**
 * Huddle Participant Service
 * SOLID: Single Responsibility - only handles participant management
 * Dependency Inversion: Depends on abstractions
 */

import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HuddleRepository } from '../repositories/huddle.repository';
import { HuddleFactory } from '../factories/huddle.factory';
import { JoinHuddleDto, UpdateParticipantDto } from '../dto/create-huddle.dto';
import { Huddle, HuddleDocument, HuddleStatus } from '../schemas/huddle.schema';
import { MessagesService } from '../../messages/messages.service';

@Injectable()
export class HuddleParticipantService {
  constructor(
    private readonly repository: HuddleRepository,
    private readonly factory: HuddleFactory,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Join an existing huddle
   * Algorithm: Validate state, then add participant
   * Time Complexity: O(log n) + O(1)
   */
  async joinHuddle(userId: string, dto: JoinHuddleDto): Promise<Huddle> {
    // Check if user already in an active huddle
    const existingHuddle = await this.repository.findActiveByUserId(userId);
    if (existingHuddle && existingHuddle.roomId !== dto.roomId) {
      throw new ConflictException('User is already in another active huddle');
    }

    // Find the huddle to join
    const huddle = await this.repository.findByRoomId(dto.roomId);
    if (!huddle) {
      throw new NotFoundException('Huddle not found');
    }

    if (huddle.status !== HuddleStatus.ACTIVE) {
      throw new BadRequestException('Huddle has ended');
    }

    // Check if already a participant
    const isAlreadyParticipant = huddle.participants.some(
      (p) => p.userId.toString() === userId && !p.leftAt,
    );

    if (isAlreadyParticipant) {
      return huddle; // Already in the huddle
    }

    // Create participant
    const participant = this.factory.createParticipant(
      userId,
      dto.isAudioEnabled ?? true,
      dto.isVideoEnabled ?? false,
    );

    // Add participant
    return this.repository.addParticipant(dto.roomId, participant);
  }

  /**
   * Leave a huddle
   * Algorithm: Mark participant as left, check if huddle should end
   * Time Complexity: O(n) where n = participants
   */
  async leaveHuddle(userId: string, roomId: string): Promise<Huddle> {
    const huddle = await this.repository.findByRoomId(roomId);
    if (!huddle) {
      throw new NotFoundException('Huddle not found');
    }

    // Remove participant (mark as left)
    const updatedHuddle = await this.repository.removeParticipant(roomId, userId);

    // Check if all participants have left
    const activeParticipants = updatedHuddle.participants.filter((p) => !p.leftAt);

    // If no active participants, end the huddle and create system message
    if (activeParticipants.length === 0) {
      const endedHuddle = await this.repository.endHuddle(roomId);

      // Create system message if huddle is associated with a chat
      if (endedHuddle.chatId) {
        await this.createHuddleEndMessage(endedHuddle as HuddleDocument);
      }

      return endedHuddle;
    }

    return updatedHuddle;
  }

  /**
   * Create a system message when huddle ends
   * Private helper method
   */
  private async createHuddleEndMessage(huddle: HuddleDocument): Promise<void> {
    try {
      const participantCount = huddle.participants.length;
      const duration = huddle.duration || 0;
      const durationMinutes = Math.floor(duration / 60);
      const durationSeconds = duration % 60;

      let durationText = '';
      if (durationMinutes > 0) {
        durationText = `${durationMinutes}m ${durationSeconds}s`;
      } else {
        durationText = `${durationSeconds}s`;
      }

      const huddleType = huddle.type === 'video' ? 'Video' : 'Audio';
      const content = `${huddleType} Huddle ended • ${participantCount} participant${participantCount !== 1 ? 's' : ''} • ${durationText}`;

      await this.messagesService.createMessage(
        huddle.chatId?.toString() || '',
        huddle.initiatorId?.toString() || '',
        'huddle',
        content,
        [],
        undefined,
        {
          huddleId: (huddle as any)._id,
          huddleRoomId: huddle.roomId,
          participantCount,
          duration,
          type: huddle.type,
          participants: huddle.participants.map((p) => ({
            userId: p.userId,
            joinedAt: p.joinedAt,
            leftAt: p.leftAt,
          })),
        },
      );
    } catch (error) {
      console.error('Failed to create huddle end message:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Update participant settings (audio/video/mute)
   * Time Complexity: O(n) where n = participants
   */
  async updateParticipant(
    userId: string,
    roomId: string,
    dto: UpdateParticipantDto,
  ): Promise<Huddle> {
    const huddle = await this.repository.findByRoomId(roomId);
    if (!huddle) {
      throw new NotFoundException('Huddle not found');
    }

    if (huddle.status !== HuddleStatus.ACTIVE) {
      throw new BadRequestException('Huddle has ended');
    }

    return this.repository.updateParticipant(roomId, userId, dto);
  }

  /**
   * Get active participants for a huddle
   * Algorithm: Filter participants who haven't left
   * Time Complexity: O(n) where n = participants
   */
  async getActiveParticipants(roomId: string): Promise<any[]> {
    const huddle = await this.repository.findByRoomId(roomId);
    if (!huddle) {
      throw new NotFoundException('Huddle not found');
    }

    return huddle.participants.filter((p) => !p.leftAt);
  }

  /**
   * Invite users to join a huddle
   * Algorithm: Validate huddle, filter valid users, emit socket events
   * Time Complexity: O(n) where n = invited users
   */
  async inviteToHuddle(
    inviterId: string,
    roomId: string,
    userIds: string[],
  ): Promise<{ invited: string[]; huddle: Huddle }> {
    const huddle = await this.repository.findByRoomId(roomId);
    if (!huddle) {
      throw new NotFoundException('Huddle not found');
    }

    if (huddle.status !== HuddleStatus.ACTIVE) {
      throw new BadRequestException('Huddle has ended');
    }

    // Verify inviter is a participant
    const isParticipant = huddle.participants.some(
      (p) => p.userId.toString() === inviterId && !p.leftAt,
    );
    if (!isParticipant) {
      throw new BadRequestException('Only active participants can invite others');
    }

    // Filter out users already in the huddle
    const existingParticipantIds = new Set(
      huddle.participants
        .filter((p) => !p.leftAt)
        .map((p) => p.userId.toString()),
    );

    const newInvitees = userIds.filter((id) => !existingParticipantIds.has(id));

    // Return result with invited users (socket notification will be handled by gateway)
    return {
      invited: newInvitees,
      huddle,
    };
  }
}
