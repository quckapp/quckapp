/**
 * Huddle Query Service
 * SOLID: Single Responsibility - only handles queries
 * Performance: Optimized queries with indexed lookups
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { HuddleRepository } from '../repositories/huddle.repository';
import { Huddle } from '../schemas/huddle.schema';

@Injectable()
export class HuddleQueryService {
  constructor(private readonly repository: HuddleRepository) {}

  /**
   * Find huddle by room ID
   * Time Complexity: O(log n) - indexed lookup
   */
  async findByRoomId(roomId: string): Promise<Huddle> {
    const huddle = await this.repository.findByRoomId(roomId);
    if (!huddle) {
      throw new NotFoundException('Huddle not found');
    }
    return huddle;
  }

  /**
   * Find active huddle for a user
   * Time Complexity: O(log n) - indexed lookup
   */
  async findActiveForUser(userId: string): Promise<Huddle | null> {
    return this.repository.findActiveByUserId(userId);
  }

  /**
   * Find active huddles for a chat
   * Time Complexity: O(log n) - indexed lookup
   */
  async findActiveForChat(chatId: string): Promise<Huddle[]> {
    return this.repository.findActiveByChatId(chatId);
  }

  /**
   * Get huddle history for a user
   * Time Complexity: O(n log n) - sort operation
   */
  async getHistory(userId: string, limit: number = 20): Promise<Huddle[]> {
    return this.repository.getHistory(userId, limit);
  }

  /**
   * Get active huddles count
   * Time Complexity: O(1) - count with index
   */
  async getActiveCount(): Promise<number> {
    return this.repository.getActiveCount();
  }

  /**
   * Get huddle statistics for a user
   * Algorithm: Aggregate calculations
   * Time Complexity: O(n) where n = user's huddles
   */
  async getUserStats(userId: string): Promise<{
    totalHuddles: number;
    totalDuration: number;
    averageDuration: number;
    audioCount: number;
    videoCount: number;
  }> {
    const huddles = await this.repository.getHistory(userId, 1000);

    const stats = {
      totalHuddles: huddles.length,
      totalDuration: 0,
      averageDuration: 0,
      audioCount: 0,
      videoCount: 0,
    };

    huddles.forEach((huddle) => {
      stats.totalDuration += huddle.duration;
      if (huddle.type === 'audio') {
        stats.audioCount++;
      }
      if (huddle.type === 'video') {
        stats.videoCount++;
      }
    });

    stats.averageDuration =
      stats.totalHuddles > 0 ? Math.floor(stats.totalDuration / stats.totalHuddles) : 0;

    return stats;
  }
}
