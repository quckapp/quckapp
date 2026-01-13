/**
 * Huddle Repository - Repository Pattern Implementation
 * SOLID: Single Responsibility - only handles data access
 * Algorithm: Optimized database queries with indexing
 * Performance: O(log n) lookups via B-tree indexes
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Huddle, HuddleDocument, HuddleParticipant, HuddleStatus } from '../schemas/huddle.schema';

@Injectable()
export class HuddleRepository {
  constructor(@InjectModel(Huddle.name) private huddleModel: Model<HuddleDocument>) {}

  /**
   * Create a new huddle
   * Time Complexity: O(1)
   */
  async create(huddleData: Partial<Huddle>): Promise<Huddle> {
    const huddle = new this.huddleModel(huddleData);
    return huddle.save();
  }

  /**
   * Find huddle by ID
   * Time Complexity: O(log n) - indexed lookup
   */
  async findById(id: string): Promise<Huddle | null> {
    return this.huddleModel
      .findById(id)
      .populate('initiatorId', 'displayName phoneNumber avatar')
      .populate('participants.userId', 'displayName phoneNumber avatar')
      .exec();
  }

  /**
   * Find huddle by room ID
   * Time Complexity: O(log n) - indexed lookup
   */
  async findByRoomId(roomId: string): Promise<Huddle | null> {
    return this.huddleModel
      .findOne({ roomId })
      .populate('initiatorId', 'displayName phoneNumber avatar')
      .populate('participants.userId', 'displayName phoneNumber avatar')
      .exec();
  }

  /**
   * Find active huddle for a user
   * Time Complexity: O(log n) - compound index
   */
  async findActiveByUserId(userId: string): Promise<Huddle | null> {
    return this.huddleModel
      .findOne({
        status: HuddleStatus.ACTIVE,
        $or: [
          { initiatorId: userId },
          { 'participants.userId': userId, 'participants.leftAt': null },
        ],
      })
      .populate('initiatorId', 'displayName phoneNumber avatar')
      .populate('participants.userId', 'displayName phoneNumber avatar')
      .exec();
  }

  /**
   * Find active huddles for a chat
   * Time Complexity: O(log n) - compound index
   */
  async findActiveByChatId(chatId: string): Promise<Huddle[]> {
    return this.huddleModel
      .find({ chatId, status: HuddleStatus.ACTIVE })
      .populate('initiatorId', 'displayName phoneNumber avatar')
      .populate('participants.userId', 'displayName phoneNumber avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Add participant to huddle
   * Time Complexity: O(1) - array push operation
   */
  async addParticipant(roomId: string, participant: HuddleParticipant): Promise<Huddle> {
    const huddle = await this.huddleModel.findOneAndUpdate(
      { roomId },
      { $push: { participants: participant } },
      { new: true },
    );

    if (!huddle) {
      throw new NotFoundException('Huddle not found');
    }

    return huddle;
  }

  /**
   * Update participant status
   * Time Complexity: O(n) - array element update where n = participants
   */
  async updateParticipant(
    roomId: string,
    userId: string,
    updates: Partial<HuddleParticipant>,
  ): Promise<Huddle> {
    const updateFields: any = {};

    if (updates.isAudioEnabled !== undefined) {
      updateFields['participants.$.isAudioEnabled'] = updates.isAudioEnabled;
    }
    if (updates.isVideoEnabled !== undefined) {
      updateFields['participants.$.isVideoEnabled'] = updates.isVideoEnabled;
    }
    if (updates.isMuted !== undefined) {
      updateFields['participants.$.isMuted'] = updates.isMuted;
    }
    if (updates.leftAt !== undefined) {
      updateFields['participants.$.leftAt'] = updates.leftAt;
    }

    const huddle = await this.huddleModel.findOneAndUpdate(
      { roomId, 'participants.userId': userId },
      { $set: updateFields },
      { new: true },
    );

    if (!huddle) {
      throw new NotFoundException('Huddle or participant not found');
    }

    return huddle;
  }

  /**
   * Remove participant from huddle (mark as left)
   * Time Complexity: O(n) - array element update
   */
  async removeParticipant(roomId: string, userId: string): Promise<Huddle> {
    return this.updateParticipant(roomId, userId, { leftAt: new Date() });
  }

  /**
   * End huddle
   * Time Complexity: O(1)
   */
  async endHuddle(roomId: string): Promise<Huddle> {
    const huddle = await this.huddleModel.findOneAndUpdate(
      { roomId },
      {
        $set: {
          status: HuddleStatus.ENDED,
          endedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!huddle) {
      throw new NotFoundException('Huddle not found');
    }

    // Calculate duration
    const duration = huddle.endedAt
      ? Math.floor((huddle.endedAt.getTime() - huddle.startedAt.getTime()) / 1000)
      : 0;

    huddle.duration = duration;
    await huddle.save();

    return huddle;
  }

  /**
   * Get huddle history for a user
   * Time Complexity: O(n log n) - sort operation
   */
  async getHistory(userId: string, limit: number = 20): Promise<Huddle[]> {
    return this.huddleModel
      .find({
        $or: [{ initiatorId: userId }, { 'participants.userId': userId }],
      })
      .populate('initiatorId', 'displayName phoneNumber avatar')
      .populate('participants.userId', 'displayName phoneNumber avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get active huddles count
   * Time Complexity: O(1) - count operation with index
   */
  async getActiveCount(): Promise<number> {
    return this.huddleModel.countDocuments({ status: HuddleStatus.ACTIVE }).exec();
  }

  /**
   * Delete old ended huddles (cleanup)
   * Time Complexity: O(n) where n = huddles to delete
   */
  async deleteOldHuddles(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.huddleModel.deleteMany({
      status: HuddleStatus.ENDED,
      endedAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  }

  /**
   * Force leave all active huddles for a user (cleanup stuck sessions)
   * Ends any huddle the user initiated or marks them as left
   * Time Complexity: O(n) where n = user's active huddles
   */
  async forceLeaveAllHuddles(userId: string): Promise<{ count: number }> {
    // First, end any huddles where user is the initiator
    const initiatedHuddles = await this.huddleModel.updateMany(
      {
        status: HuddleStatus.ACTIVE,
        initiatorId: userId,
      },
      {
        $set: {
          status: HuddleStatus.ENDED,
          endedAt: new Date(),
        },
      },
    );

    // Second, mark user as left in any huddles they joined
    const joinedHuddles = await this.huddleModel.updateMany(
      {
        status: HuddleStatus.ACTIVE,
        'participants.userId': userId,
        'participants.leftAt': null,
      },
      {
        $set: {
          'participants.$.leftAt': new Date(),
        },
      },
    );

    return {
      count: initiatedHuddles.modifiedCount + joinedHuddles.modifiedCount,
    };
  }
}
