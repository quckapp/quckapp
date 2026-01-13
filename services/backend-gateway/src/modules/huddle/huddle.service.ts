/**
 * Huddle Service - Facade Pattern
 * SOLID: Single Responsibility - delegates to specialized services
 * Dependency Inversion: Depends on service abstractions
 * Open/Closed: Open for extension through service injection
 */

import { Injectable } from '@nestjs/common';
import { HuddleCreationService } from './services/huddle-creation.service';
import { HuddleParticipantService } from './services/huddle-participant.service';
import { HuddleQueryService } from './services/huddle-query.service';
import { HuddleRepository } from './repositories/huddle.repository';
import { CreateHuddleDto, JoinHuddleDto, UpdateParticipantDto } from './dto/create-huddle.dto';
import { Huddle } from './schemas/huddle.schema';

@Injectable()
export class HuddleService {
  constructor(
    private readonly creationService: HuddleCreationService,
    private readonly participantService: HuddleParticipantService,
    private readonly queryService: HuddleQueryService,
    private readonly repository: HuddleRepository,
  ) {}

  // ========== Creation Operations ==========

  /**
   * Create a new huddle
   * Delegates to: HuddleCreationService
   */
  async createHuddle(userId: string, dto: CreateHuddleDto): Promise<Huddle> {
    return this.creationService.createHuddle(userId, dto);
  }

  // ========== Participant Operations ==========

  /**
   * Join an existing huddle
   * Delegates to: HuddleParticipantService
   */
  async joinHuddle(userId: string, dto: JoinHuddleDto): Promise<Huddle> {
    return this.participantService.joinHuddle(userId, dto);
  }

  /**
   * Leave a huddle
   * Delegates to: HuddleParticipantService
   */
  async leaveHuddle(userId: string, roomId: string): Promise<Huddle> {
    return this.participantService.leaveHuddle(userId, roomId);
  }

  /**
   * Update participant settings
   * Delegates to: HuddleParticipantService
   */
  async updateParticipant(
    userId: string,
    roomId: string,
    dto: UpdateParticipantDto,
  ): Promise<Huddle> {
    return this.participantService.updateParticipant(userId, roomId, dto);
  }

  /**
   * Get active participants
   * Delegates to: HuddleParticipantService
   */
  async getActiveParticipants(roomId: string): Promise<any[]> {
    return this.participantService.getActiveParticipants(roomId);
  }

  // ========== Query Operations ==========

  /**
   * Find huddle by room ID
   * Delegates to: HuddleQueryService
   */
  async findByRoomId(roomId: string): Promise<Huddle> {
    return this.queryService.findByRoomId(roomId);
  }

  /**
   * Find active huddle for user
   * Delegates to: HuddleQueryService
   */
  async findActiveForUser(userId: string): Promise<Huddle | null> {
    return this.queryService.findActiveForUser(userId);
  }

  /**
   * Find active huddles for chat
   * Delegates to: HuddleQueryService
   */
  async findActiveForChat(chatId: string): Promise<Huddle[]> {
    return this.queryService.findActiveForChat(chatId);
  }

  /**
   * Get huddle history
   * Delegates to: HuddleQueryService
   */
  async getHistory(userId: string, limit?: number): Promise<Huddle[]> {
    return this.queryService.getHistory(userId, limit);
  }

  /**
   * Get active huddles count
   * Delegates to: HuddleQueryService
   */
  async getActiveCount(): Promise<number> {
    return this.queryService.getActiveCount();
  }

  /**
   * Get user stats
   * Delegates to: HuddleQueryService
   */
  async getUserStats(userId: string): Promise<any> {
    return this.queryService.getUserStats(userId);
  }

  // ========== Administrative Operations ==========

  /**
   * End a huddle (administrative)
   * Delegates to: Repository
   */
  async endHuddle(roomId: string): Promise<Huddle> {
    return this.repository.endHuddle(roomId);
  }

  /**
   * Cleanup old huddles
   * Delegates to: Repository
   */
  async cleanupOldHuddles(daysOld?: number): Promise<number> {
    return this.repository.deleteOldHuddles(daysOld);
  }

  /**
   * Force leave all huddles for a user (cleanup stuck sessions)
   * Useful for clearing stuck huddles
   */
  async forceLeaveAllHuddles(userId: string): Promise<{ count: number }> {
    return this.repository.forceLeaveAllHuddles(userId);
  }

  /**
   * Invite users to join a huddle
   * Delegates to: HuddleParticipantService
   */
  async inviteToHuddle(inviterId: string, roomId: string, userIds: string[]): Promise<{ invited: string[]; huddle: Huddle }> {
    return this.participantService.inviteToHuddle(inviterId, roomId, userIds);
  }
}
