import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserSettings, UserSettingsDocument } from './schemas/user-settings.schema';
import { Contact, ContactDocument } from './schemas/contact.schema';
import { IServiceResponse } from '../../shared/interfaces/microservice.interface';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../shared/utils/service-response.util';
import { SERVICES } from '../../shared/constants/services';

/**
 * Users Service Handler
 * Business logic for all user operations with MongoDB persistence
 */
@Injectable()
export class UsersServiceHandler {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserSettings.name) private settingsModel: Model<UserSettingsDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ============================================
  // User CRUD Operations
  // ============================================

  async createUser(dto: {
    phoneNumber: string;
    username?: string;
    displayName?: string;
    email?: string;
    password?: string;
    avatar?: string;
    isVerified?: boolean;
    oauthProviders?: any[];
  }): Promise<IServiceResponse<UserDocument>> {
    try {
      // Check if phone number exists
      const existingPhone = await this.userModel.findOne({ phoneNumber: dto.phoneNumber });
      if (existingPhone) {
        return errorResponse(
          ERROR_CODES.PHONE_TAKEN,
          'Phone number already registered',
          SERVICES.USERS_SERVICE,
        );
      }

      // Generate username if not provided
      const username = dto.username || `user${Date.now()}`;

      // Check if username exists
      const existingUsername = await this.userModel.findOne({ username });
      if (existingUsername) {
        return errorResponse(
          ERROR_CODES.USERNAME_TAKEN,
          'Username already taken',
          SERVICES.USERS_SERVICE,
        );
      }

      // Check email if provided
      if (dto.email) {
        const existingEmail = await this.userModel.findOne({ email: dto.email });
        if (existingEmail) {
          return errorResponse(
            ERROR_CODES.EMAIL_TAKEN,
            'Email already registered',
            SERVICES.USERS_SERVICE,
          );
        }
      }

      // Hash password if provided
      let hashedPassword = '';
      if (dto.password) {
        hashedPassword = await bcrypt.hash(dto.password, 10);
      }

      const user = new this.userModel({
        phoneNumber: dto.phoneNumber,
        username,
        displayName: dto.displayName || dto.phoneNumber,
        email: dto.email,
        password: hashedPassword,
        avatar: dto.avatar,
        isVerified: dto.isVerified || false,
        oauthProviders: dto.oauthProviders || [],
      });

      await user.save();

      // Create default settings
      const settings = new this.settingsModel({ userId: user._id.toString() });
      await settings.save();

      // Clear cache
      await this.clearUserCache(dto.phoneNumber);

      return successResponse(this.sanitizeUser(user), SERVICES.USERS_SERVICE);
    } catch (error: any) {
      console.error('Create user error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to create user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getUserById(dto: { userId: string }): Promise<IServiceResponse<UserDocument>> {
    try {
      // Check cache first
      const cacheKey = `user:${dto.userId}`;
      const cached = await this.cacheManager.get<UserDocument>(cacheKey);
      if (cached) {
        return successResponse(cached, SERVICES.USERS_SERVICE);
      }

      const user = await this.userModel.findById(dto.userId);
      if (!user) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      // Cache user
      await this.cacheManager.set(cacheKey, this.sanitizeUser(user), 300000);

      return successResponse(this.sanitizeUser(user), SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getUserByPhone(dto: { phoneNumber: string }): Promise<IServiceResponse<UserDocument>> {
    try {
      const cacheKey = `user:phone:${dto.phoneNumber}`;
      const cached = await this.cacheManager.get<UserDocument>(cacheKey);
      if (cached) {
        return successResponse(cached, SERVICES.USERS_SERVICE);
      }

      const user = await this.userModel.findOne({ phoneNumber: dto.phoneNumber });
      if (!user) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      await this.cacheManager.set(cacheKey, this.sanitizeUser(user), 300000);

      return successResponse(this.sanitizeUser(user), SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getUser(dto: {
    userId?: string;
    phoneNumber?: string;
    email?: string;
    oauthProvider?: string;
    oauthProviderId?: string;
  }): Promise<IServiceResponse<UserDocument>> {
    try {
      let user: UserDocument | null = null;

      if (dto.userId) {
        user = await this.userModel.findById(dto.userId);
      } else if (dto.phoneNumber) {
        user = await this.userModel.findOne({ phoneNumber: dto.phoneNumber });
      } else if (dto.email) {
        user = await this.userModel.findOne({ email: dto.email });
      } else if (dto.oauthProvider && dto.oauthProviderId) {
        user = await this.userModel.findOne({
          'oauthProviders.provider': dto.oauthProvider,
          'oauthProviders.providerId': dto.oauthProviderId,
        });
      }

      if (!user) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      return successResponse(this.sanitizeUser(user), SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async updateUser(dto: {
    userId: string;
    displayName?: string;
    bio?: string;
    avatar?: string;
    statusMessage?: string;
    email?: string;
    username?: string;
    oauthProvider?: any;
    unlinkOAuthProvider?: string;
  }): Promise<IServiceResponse<UserDocument>> {
    try {
      const user = await this.userModel.findById(dto.userId);
      if (!user) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      // Check username uniqueness
      if (dto.username && dto.username !== user.username) {
        const existing = await this.userModel.findOne({ username: dto.username });
        if (existing) {
          return errorResponse(
            ERROR_CODES.USERNAME_TAKEN,
            'Username already taken',
            SERVICES.USERS_SERVICE,
          );
        }
        user.username = dto.username;
      }

      // Check email uniqueness
      if (dto.email && dto.email !== user.email) {
        const existing = await this.userModel.findOne({ email: dto.email });
        if (existing) {
          return errorResponse(
            ERROR_CODES.EMAIL_TAKEN,
            'Email already registered',
            SERVICES.USERS_SERVICE,
          );
        }
        user.email = dto.email;
      }

      // Update fields
      if (dto.displayName !== undefined) {
        user.displayName = dto.displayName;
      }
      if (dto.bio !== undefined) {
        user.bio = dto.bio;
      }
      if (dto.avatar !== undefined) {
        user.avatar = dto.avatar;
      }
      if (dto.statusMessage !== undefined) {
        user.statusMessage = dto.statusMessage;
      }

      // Handle OAuth provider linking
      if (dto.oauthProvider) {
        const existingIdx = user.oauthProviders.findIndex(
          (p) => p.provider === dto.oauthProvider.provider,
        );
        if (existingIdx >= 0) {
          user.oauthProviders[existingIdx] = {
            ...dto.oauthProvider,
            linkedAt: new Date(),
          };
        } else {
          user.oauthProviders.push({
            ...dto.oauthProvider,
            linkedAt: new Date(),
          });
        }
      }

      // Handle OAuth provider unlinking
      if (dto.unlinkOAuthProvider) {
        user.oauthProviders = user.oauthProviders.filter(
          (p) => p.provider !== dto.unlinkOAuthProvider,
        );
      }

      await user.save();
      await this.clearUserCache(user.phoneNumber, user._id.toString());

      return successResponse(this.sanitizeUser(user), SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to update user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async deleteUser(dto: { userId: string }): Promise<IServiceResponse> {
    try {
      const user = await this.userModel.findById(dto.userId);
      if (!user) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      // Soft delete - mark as inactive
      user.isActive = false;
      await user.save();

      // Delete settings and contacts
      await this.settingsModel.deleteOne({ userId: dto.userId });
      await this.contactModel.deleteMany({ userId: dto.userId });
      await this.contactModel.deleteMany({ contactUserId: dto.userId });

      await this.clearUserCache(user.phoneNumber, dto.userId);

      return successResponse({ deleted: true }, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to delete user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // Search & Discovery
  // ============================================

  async searchUsers(dto: {
    query: string;
    currentUserId?: string;
    limit?: number;
    offset?: number;
  }): Promise<IServiceResponse> {
    try {
      const limit = Math.min(dto.limit || 20, 50);
      const offset = dto.offset || 0;

      const searchQuery: any = {
        isActive: true,
        $or: [
          { username: { $regex: dto.query, $options: 'i' } },
          { displayName: { $regex: dto.query, $options: 'i' } },
          { phoneNumber: { $regex: dto.query } },
        ],
      };

      if (dto.currentUserId) {
        searchQuery._id = { $ne: dto.currentUserId };
      }

      const [users, total] = await Promise.all([
        this.userModel.find(searchQuery).select('-password').skip(offset).limit(limit).exec(),
        this.userModel.countDocuments(searchQuery),
      ]);

      return successResponse(
        {
          items: users,
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        SERVICES.USERS_SERVICE,
      );
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Search failed',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getUsersByIds(dto: { userIds: string[] }): Promise<IServiceResponse<UserDocument[]>> {
    try {
      const users = await this.userModel
        .find({ _id: { $in: dto.userIds } })
        .select('-password')
        .exec();

      return successResponse(users, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get users',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // Presence & Status
  // ============================================

  async updateStatus(dto: { userId: string; status: string }): Promise<IServiceResponse> {
    try {
      const result = await this.userModel.findByIdAndUpdate(
        dto.userId,
        {
          status: dto.status,
          lastSeen: dto.status === 'offline' ? new Date() : undefined,
        },
        { new: true },
      );

      if (!result) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      await this.clearUserCache(result.phoneNumber, dto.userId);

      return successResponse(
        { status: result.status, lastSeen: result.lastSeen },
        SERVICES.USERS_SERVICE,
      );
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to update status',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getPresence(dto: { userId: string }): Promise<IServiceResponse> {
    try {
      const user = await this.userModel.findById(dto.userId).select('status lastSeen');
      if (!user) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      return successResponse(
        {
          userId: dto.userId,
          isOnline: user.status === 'online',
          status: user.status,
          lastSeen: user.lastSeen,
        },
        SERVICES.USERS_SERVICE,
      );
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get presence',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getPresenceBulk(dto: { userIds: string[] }): Promise<IServiceResponse> {
    try {
      const users = await this.userModel
        .find({ _id: { $in: dto.userIds } })
        .select('_id status lastSeen')
        .exec();

      const presence = users.map((u) => ({
        userId: u._id.toString(),
        isOnline: u.status === 'online',
        status: u.status,
        lastSeen: u.lastSeen,
      }));

      return successResponse(presence, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get presence',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // Settings Management
  // ============================================

  async getSettings(dto: { userId: string }): Promise<IServiceResponse> {
    try {
      let settings = await this.settingsModel.findOne({ userId: dto.userId });

      if (!settings) {
        settings = new this.settingsModel({ userId: dto.userId });
        await settings.save();
      }

      return successResponse(settings, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get settings',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async updateSettings(dto: { userId: string; settings: any }): Promise<IServiceResponse> {
    try {
      const settings = await this.settingsModel.findOneAndUpdate(
        { userId: dto.userId },
        { $set: dto.settings },
        { new: true, upsert: true },
      );

      return successResponse(settings, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to update settings',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // Blocking
  // ============================================

  async blockUser(dto: { userId: string; blockedUserId: string }): Promise<IServiceResponse> {
    try {
      await this.settingsModel.findOneAndUpdate(
        { userId: dto.userId },
        { $addToSet: { blockedUsers: dto.blockedUserId } },
        { upsert: true },
      );

      return successResponse({ blocked: true }, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to block user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async unblockUser(dto: { userId: string; blockedUserId: string }): Promise<IServiceResponse> {
    try {
      await this.settingsModel.findOneAndUpdate(
        { userId: dto.userId },
        { $pull: { blockedUsers: dto.blockedUserId } },
      );

      return successResponse({ unblocked: true }, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to unblock user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getBlockedUsers(dto: { userId: string }): Promise<IServiceResponse> {
    try {
      const settings = await this.settingsModel
        .findOne({ userId: dto.userId })
        .populate('blockedUsers', '-password');

      return successResponse(settings?.blockedUsers || [], SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get blocked users',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async isBlocked(dto: {
    userId: string;
    targetUserId: string;
  }): Promise<IServiceResponse<boolean>> {
    try {
      const settings = await this.settingsModel.findOne({
        userId: dto.userId,
        blockedUsers: dto.targetUserId,
      });

      return successResponse(!!settings, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to check block status',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // Contacts
  // ============================================

  async syncContacts(dto: {
    userId: string;
    contacts: { phoneNumber: string; displayName?: string }[];
  }): Promise<IServiceResponse> {
    try {
      const phoneNumbers = dto.contacts.map((c) => c.phoneNumber);

      // Find registered users
      const registeredUsers = await this.userModel.find({
        phoneNumber: { $in: phoneNumbers },
        _id: { $ne: dto.userId },
        isActive: true,
      });

      // Create contact records
      const operations = registeredUsers.map((user) => {
        const contactInfo = dto.contacts.find((c) => c.phoneNumber === user.phoneNumber);
        return {
          updateOne: {
            filter: { userId: dto.userId, contactUserId: user._id.toString() },
            update: {
              $set: {
                phoneNumber: user.phoneNumber,
                displayName: contactInfo?.displayName || user.displayName,
                addedAt: new Date(),
              },
            },
            upsert: true,
          },
        };
      });

      if (operations.length > 0) {
        await this.contactModel.bulkWrite(operations);
      }

      return successResponse(
        {
          synced: registeredUsers.length,
          contacts: registeredUsers.map((u) => ({
            userId: u._id.toString(),
            phoneNumber: u.phoneNumber,
            displayName: u.displayName,
            avatar: u.avatar,
          })),
        },
        SERVICES.USERS_SERVICE,
      );
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to sync contacts',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getContacts(dto: { userId: string }): Promise<IServiceResponse> {
    try {
      const contacts = await this.contactModel
        .find({ userId: dto.userId, isBlocked: false })
        .exec();

      const userIds = contacts.map((c) => c.contactUserId);
      const users = await this.userModel
        .find({ _id: { $in: userIds } })
        .select('-password')
        .exec();

      const contactsWithInfo = contacts.map((contact) => {
        const user = users.find((u) => u._id.toString() === contact.contactUserId);
        return {
          ...contact.toObject(),
          user: user ? this.sanitizeUser(user) : null,
        };
      });

      return successResponse(contactsWithInfo, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get contacts',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // Verification
  // ============================================

  async verifyUser(dto: { userId: string }): Promise<IServiceResponse> {
    try {
      const user = await this.userModel.findByIdAndUpdate(
        dto.userId,
        { isVerified: true },
        { new: true },
      );

      if (!user) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      return successResponse(this.sanitizeUser(user), SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to verify user',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // FCM Token Management
  // ============================================

  async addFcmToken(dto: { userId: string; token: string }): Promise<IServiceResponse> {
    try {
      await this.userModel.findByIdAndUpdate(dto.userId, {
        $addToSet: { fcmTokens: dto.token },
      });

      return successResponse({ added: true }, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to add FCM token',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async removeFcmToken(dto: { userId: string; token: string }): Promise<IServiceResponse> {
    try {
      await this.userModel.findByIdAndUpdate(dto.userId, {
        $pull: { fcmTokens: dto.token },
      });

      return successResponse({ removed: true }, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to remove FCM token',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getFcmTokens(dto: { userId: string }): Promise<IServiceResponse<string[]>> {
    try {
      const user = await this.userModel.findById(dto.userId).select('fcmTokens');
      return successResponse(user?.fcmTokens || [], SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get FCM tokens',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // Device Linking
  // ============================================

  async linkDevice(dto: {
    userId: string;
    deviceId: string;
    deviceName: string;
    deviceType: string;
    platform?: string;
    fcmToken?: string;
  }): Promise<IServiceResponse> {
    try {
      const user = await this.userModel.findById(dto.userId);
      if (!user) {
        return errorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found', SERVICES.USERS_SERVICE);
      }

      const existingIdx = user.linkedDevices.findIndex((d) => d.deviceId === dto.deviceId);

      const deviceData = {
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        deviceType: dto.deviceType,
        platform: dto.platform || 'android',
        fcmToken: dto.fcmToken || null,
        lastActive: new Date(),
        linkedAt: existingIdx >= 0 ? user.linkedDevices[existingIdx].linkedAt : new Date(),
      };

      if (existingIdx >= 0) {
        user.linkedDevices[existingIdx] = deviceData as any;
      } else {
        user.linkedDevices.push(deviceData as any);
      }

      await user.save();

      return successResponse({ linked: true, device: deviceData }, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to link device',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async unlinkDevice(dto: { userId: string; deviceId: string }): Promise<IServiceResponse> {
    try {
      await this.userModel.findByIdAndUpdate(dto.userId, {
        $pull: { linkedDevices: { deviceId: dto.deviceId } },
      });

      return successResponse({ unlinked: true }, SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to unlink device',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  async getLinkedDevices(dto: { userId: string }): Promise<IServiceResponse> {
    try {
      const user = await this.userModel.findById(dto.userId).select('linkedDevices');
      return successResponse(user?.linkedDevices || [], SERVICES.USERS_SERVICE);
    } catch (error: any) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || 'Failed to get linked devices',
        SERVICES.USERS_SERVICE,
      );
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private sanitizeUser(user: UserDocument): any {
    const obj = user.toObject ? user.toObject() : user;
    const { password, ...sanitized } = obj;
    return sanitized;
  }

  private async clearUserCache(phoneNumber?: string, userId?: string): Promise<void> {
    if (phoneNumber) {
      await this.cacheManager.del(`user:phone:${phoneNumber}`);
    }
    if (userId) {
      await this.cacheManager.del(`user:${userId}`);
    }
  }
}
