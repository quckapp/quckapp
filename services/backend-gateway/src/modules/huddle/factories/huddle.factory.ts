/**
 * Huddle Factory - Factory Pattern Implementation
 * SOLID: Single Responsibility - only creates huddle objects
 * Encapsulation: Hides complex object creation logic
 */

import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { HuddleParticipant, HuddleStatus, HuddleType } from '../schemas/huddle.schema';
import { CreateHuddleDto } from '../dto/create-huddle.dto';

@Injectable()
export class HuddleFactory {
  /**
   * Create huddle data object
   * Algorithm: Object construction with default values
   * Time Complexity: O(1)
   */
  createHuddleData(
    initiatorId: string,
    dto: CreateHuddleDto,
  ): {
    initiatorId: string;
    chatId?: string;
    type: HuddleType;
    status: HuddleStatus;
    participants: HuddleParticipant[];
    startedAt: Date;
    roomId: string;
  } {
    const roomId = this.generateRoomId();

    // Create initiator as first participant
    const initiatorParticipant = this.createParticipant(
      initiatorId,
      dto.isAudioEnabled ?? true,
      dto.isVideoEnabled ?? dto.type === HuddleType.VIDEO,
    );

    return {
      initiatorId,
      chatId: dto.chatId,
      type: dto.type,
      status: HuddleStatus.ACTIVE,
      participants: [initiatorParticipant],
      startedAt: new Date(),
      roomId,
    };
  }

  /**
   * Create participant object
   * Time Complexity: O(1)
   */
  createParticipant(
    userId: string,
    isAudioEnabled: boolean = true,
    isVideoEnabled: boolean = false,
  ): HuddleParticipant {
    return {
      userId: userId as any,
      joinedAt: new Date(),
      isAudioEnabled,
      isVideoEnabled,
      isMuted: false,
    };
  }

  /**
   * Generate unique room ID
   * Algorithm: UUID v4 generation
   * Time Complexity: O(1)
   * Format: huddle-{uuid}
   */
  generateRoomId(): string {
    return `huddle-${uuidv4()}`;
  }

  /**
   * Create WebRTC offer data
   * Time Complexity: O(1)
   */
  createOfferData(from: string, to: string, offer: any) {
    return {
      from,
      to,
      offer,
      timestamp: new Date(),
    };
  }

  /**
   * Create WebRTC answer data
   * Time Complexity: O(1)
   */
  createAnswerData(from: string, to: string, answer: any) {
    return {
      from,
      to,
      answer,
      timestamp: new Date(),
    };
  }

  /**
   * Create ICE candidate data
   * Time Complexity: O(1)
   */
  createIceCandidateData(from: string, to: string, candidate: any) {
    return {
      from,
      to,
      candidate,
      timestamp: new Date(),
    };
  }
}
