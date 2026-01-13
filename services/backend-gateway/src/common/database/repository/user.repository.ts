import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository';
import { User, UserDocument } from '../../../modules/users/schemas/user.schema';

/**
 * User Repository Interface
 * Extends base repository with user-specific operations
 */
export interface IUserRepository {
  findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null>;
  findByEmail(email: string): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
  findByOAuthProvider(provider: string, providerId: string): Promise<UserDocument | null>;
  searchUsers(
    query: string,
    excludeUserId?: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<UserDocument>>;
  updateStatus(userId: string, status: string): Promise<UserDocument | null>;
  updateLastSeen(userId: string): Promise<UserDocument | null>;
  addFcmToken(userId: string, token: string): Promise<UserDocument | null>;
  removeFcmToken(userId: string, token: string): Promise<UserDocument | null>;
  banUser(
    userId: string,
    reason: string,
    bannedBy: string,
  ): Promise<UserDocument | null>;
  unbanUser(userId: string): Promise<UserDocument | null>;
  getOnlineUsers(userIds?: string[]): Promise<UserDocument[]>;
  getAdmins(): Promise<UserDocument[]>;
}

/**
 * User Repository Implementation
 * Provides data access layer for User entity
 */
@Injectable()
export class UserRepository extends BaseRepository<UserDocument> implements IUserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    return this.findOne({ phoneNumber });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.findOne({ username: username.toLowerCase() });
  }

  /**
   * Find user by OAuth provider
   */
  async findByOAuthProvider(
    provider: string,
    providerId: string,
  ): Promise<UserDocument | null> {
    return this.findOne({
      'oauthProviders.provider': provider,
      'oauthProviders.providerId': providerId,
    });
  }

  /**
   * Search users by query (name, username, phone)
   */
  async searchUsers(
    query: string,
    excludeUserId?: string,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<UserDocument>> {
    const searchRegex = new RegExp(query, 'i');

    const filter: FilterQuery<UserDocument> = {
      isActive: true,
      isBanned: false,
      $or: [
        { displayName: searchRegex },
        { username: searchRegex },
        { phoneNumber: searchRegex },
      ],
    };

    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }

    return this.findWithPagination(filter, {
      ...options,
      select: options.select || '-password -fcmTokens -linkedDevices',
    });
  }

  /**
   * Update user online status
   */
  async updateStatus(
    userId: string,
    status: string,
  ): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $set: {
        status,
        lastSeen: new Date(),
      },
    });
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $set: { lastSeen: new Date() },
    });
  }

  /**
   * Add FCM token for push notifications
   */
  async addFcmToken(
    userId: string,
    token: string,
  ): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $addToSet: { fcmTokens: token },
    });
  }

  /**
   * Remove FCM token
   */
  async removeFcmToken(
    userId: string,
    token: string,
  ): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $pull: { fcmTokens: token },
    });
  }

  /**
   * Ban a user
   */
  async banUser(
    userId: string,
    reason: string,
    bannedBy: string,
  ): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $set: {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
        bannedBy,
      },
    });
  }

  /**
   * Unban a user
   */
  async unbanUser(userId: string): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $set: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
        bannedBy: null,
      },
    });
  }

  /**
   * Get online users
   */
  async getOnlineUsers(userIds?: string[]): Promise<UserDocument[]> {
    const filter: FilterQuery<UserDocument> = {
      status: 'online',
      isActive: true,
    };

    if (userIds && userIds.length > 0) {
      filter._id = { $in: userIds };
    }

    return this.findAll(filter, {
      projection: '-password -fcmTokens',
    });
  }

  /**
   * Get all admin users
   */
  async getAdmins(): Promise<UserDocument[]> {
    return this.findAll(
      {
        role: { $in: ['admin', 'super_admin', 'moderator'] },
        isActive: true,
      },
      {
        projection: '-password -fcmTokens',
        sort: { role: -1, createdAt: 1 },
      },
    );
  }

  /**
   * Link OAuth provider to user
   */
  async linkOAuthProvider(
    userId: string,
    provider: string,
    providerId: string,
    email?: string,
  ): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $push: {
        oauthProviders: {
          provider,
          providerId,
          email,
          linkedAt: new Date(),
        },
      },
    });
  }

  /**
   * Unlink OAuth provider from user
   */
  async unlinkOAuthProvider(
    userId: string,
    provider: string,
  ): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $pull: {
        oauthProviders: { provider },
      },
    });
  }

  /**
   * Add linked device
   */
  async addLinkedDevice(
    userId: string,
    device: {
      deviceId: string;
      deviceName: string;
      deviceType: string;
      fcmToken?: string;
    },
  ): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $push: {
        linkedDevices: {
          ...device,
          lastActive: new Date(),
          linkedAt: new Date(),
        },
      },
    });
  }

  /**
   * Remove linked device
   */
  async removeLinkedDevice(
    userId: string,
    deviceId: string,
  ): Promise<UserDocument | null> {
    return this.updateById(userId, {
      $pull: {
        linkedDevices: { deviceId },
      },
    });
  }

  /**
   * Update device activity
   */
  async updateDeviceActivity(
    userId: string,
    deviceId: string,
  ): Promise<UserDocument | null> {
    return this.updateOne(
      {
        _id: userId,
        'linkedDevices.deviceId': deviceId,
      },
      {
        $set: {
          'linkedDevices.$.lastActive': new Date(),
        },
      },
    );
  }

  /**
   * Get users statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    banned: number;
    online: number;
    byRole: Record<string, number>;
  }> {
    interface StatsResult {
      total: Array<{ count: number }>;
      active: Array<{ count: number }>;
      banned: Array<{ count: number }>;
      online: Array<{ count: number }>;
      byRole: Array<{ _id: string; count: number }>;
    }

    const [stats] = await this.aggregate<StatsResult>([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { isActive: true } }, { $count: 'count' }],
          banned: [{ $match: { isBanned: true } }, { $count: 'count' }],
          online: [{ $match: { status: 'online' } }, { $count: 'count' }],
          byRole: [
            { $group: { _id: '$role', count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const byRole: Record<string, number> = {};
    stats.byRole.forEach((item: { _id: string; count: number }) => {
      byRole[item._id] = item.count;
    });

    return {
      total: stats.total[0]?.count || 0,
      active: stats.active[0]?.count || 0,
      banned: stats.banned[0]?.count || 0,
      online: stats.online[0]?.count || 0,
      byRole,
    };
  }
}
