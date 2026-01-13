import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserSettings, UserSettingsDocument } from './schemas/user-settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  UserProfileClientService,
  SpringUserProfile,
  SpringUserSettings,
} from './user-profile-client.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly useSpringProfiles: boolean;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserSettings.name) private userSettingsModel: Model<UserSettingsDocument>,
    private readonly profileClient: UserProfileClientService,
    private readonly configService: ConfigService,
  ) {
    this.useSpringProfiles = this.configService.get<string>('USE_SPRING_PROFILES', 'false') === 'true';
    if (this.useSpringProfiles) {
      this.logger.log('Spring Profile delegation is ENABLED');
    }
  }

  // ==================== Cache Sync Helpers ====================

  /**
   * Sync a Spring profile to MongoDB cache
   */
  private async syncProfileToCache(profile: SpringUserProfile): Promise<UserDocument> {
    const updateData = {
      phoneNumber: profile.phoneNumber,
      username: profile.username,
      displayName: profile.displayName,
      email: profile.email,
      avatar: profile.avatar,
      bio: profile.bio,
      publicKey: profile.publicKey,
      status: profile.status.toLowerCase(),
      lastSeen: profile.lastSeen ? new Date(profile.lastSeen) : undefined,
      isActive: profile.isActive,
      isVerified: profile.isVerified,
      role: profile.role.toLowerCase(),
    };

    const user = await this.userModel
      .findByIdAndUpdate(profile.externalId, updateData, { new: true, upsert: true })
      .exec();

    return user!;
  }

  /**
   * Sync Spring settings to MongoDB cache
   */
  private async syncSettingsToCache(userId: string, settings: SpringUserSettings): Promise<UserSettingsDocument> {
    const updateData = {
      userId,
      darkMode: settings.darkMode,
      autoDownloadMedia: settings.autoDownloadMedia,
      saveToGallery: settings.saveToGallery,
      pushNotifications: settings.pushNotifications,
      messageNotifications: settings.messageNotifications,
      groupNotifications: settings.groupNotifications,
      callNotifications: settings.callNotifications,
      soundEnabled: settings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled,
      showPreview: settings.showPreview,
      inAppNotifications: settings.inAppNotifications,
      notificationLight: settings.notificationLight,
      readReceipts: settings.readReceipts,
      lastSeenVisible: settings.lastSeenVisible,
      profilePhotoVisibility: settings.profilePhotoVisibility?.toLowerCase(),
      statusVisibility: settings.statusVisibility?.toLowerCase(),
      fingerprintLock: settings.fingerprintLock,
      blockedUsers: settings.blockedUserIds,
    };

    let cached = await this.userSettingsModel.findOne({ userId }).exec();
    if (!cached) {
      cached = new this.userSettingsModel(updateData);
      await cached.save();
    } else {
      Object.assign(cached, updateData);
      await cached.save();
    }

    return cached;
  }

  /**
   * Get FCM tokens for a user (from Spring Boot if enabled)
   */
  async getFcmTokens(userId: string): Promise<string[]> {
    if (this.useSpringProfiles) {
      try {
        return await this.profileClient.getFcmTokens(userId);
      } catch (error) {
        this.logger.warn(`Failed to get FCM tokens from Spring for ${userId}, falling back to MongoDB`, error.message);
      }
    }
    const user = await this.userModel.findById(userId).select('fcmTokens').exec();
    return user?.fcmTokens || [];
  }

  /**
   * Get FCM tokens for multiple users (from Spring Boot if enabled)
   */
  async getFcmTokensBatch(userIds: string[]): Promise<Map<string, string[]>> {
    if (this.useSpringProfiles) {
      try {
        return await this.profileClient.getFcmTokensBatch(userIds);
      } catch (error) {
        this.logger.warn(`Failed to get batch FCM tokens from Spring, falling back to MongoDB`, error.message);
      }
    }
    const users = await this.userModel.find({ _id: { $in: userIds } }).select('_id fcmTokens').exec();
    const result = new Map<string, string[]>();
    for (const user of users) {
      result.set(user._id.toString(), user.fcmTokens || []);
    }
    return result;
  }

  // ==================== CRUD Operations ====================

  async create(userData: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    if (this.useSpringProfiles) {
      try {
        const profile = await this.profileClient.getProfileByPhone(phoneNumber);
        if (profile) {
          return this.syncProfileToCache(profile);
        }
        return null;
      } catch (error) {
        this.logger.warn(`Failed to get profile by phone from Spring, falling back to MongoDB`, error.message);
      }
    }
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    if (this.useSpringProfiles) {
      try {
        const profile = await this.profileClient.getProfileByUsername(username);
        if (profile) {
          return this.syncProfileToCache(profile);
        }
        return null;
      } catch (error) {
        this.logger.warn(`Failed to get profile by username from Spring, falling back to MongoDB`, error.message);
      }
    }
    return this.userModel.findOne({ username }).exec();
  }

  async updateStatus(userId: string, status: string, accessToken?: string): Promise<UserDocument> {
    if (this.useSpringProfiles && accessToken) {
      try {
        await this.profileClient.updateStatus(userId, accessToken, status);
        // Update cache
        return this.userModel
          .findByIdAndUpdate(userId, { status, lastSeen: new Date() }, { new: true })
          .exec() as Promise<UserDocument>;
      } catch (error) {
        this.logger.warn(`Failed to update status in Spring, falling back to MongoDB`, error.message);
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, { status, lastSeen: new Date() }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updates: Partial<User>, accessToken?: string): Promise<UserDocument> {
    if (this.useSpringProfiles && accessToken) {
      try {
        const profile = await this.profileClient.updateProfile(userId, accessToken, {
          username: updates.username,
          displayName: updates.displayName,
          email: updates.email,
          avatar: updates.avatar,
          bio: updates.bio,
          publicKey: updates.publicKey,
        });
        return this.syncProfileToCache(profile);
      } catch (error) {
        this.logger.warn(`Failed to update profile in Spring, falling back to MongoDB`, error.message);
      }
    }

    const user = await this.userModel.findByIdAndUpdate(userId, updates, { new: true }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async addFcmToken(userId: string, token: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        $addToSet: { fcmTokens: token },
      })
      .exec();
  }

  async removeFcmToken(userId: string, token: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        $pull: { fcmTokens: token },
      })
      .exec();
  }

  async searchUsers(query: string, currentUserId: string): Promise<UserDocument[]> {
    if (this.useSpringProfiles) {
      try {
        const result = await this.profileClient.searchUsers(query, currentUserId, 0, 20);
        // Sync results to cache
        const users: UserDocument[] = [];
        for (const summary of result.content) {
          const profile = await this.profileClient.getProfile(summary.id);
          const cached = await this.syncProfileToCache(profile);
          users.push(cached);
        }
        return users;
      } catch (error) {
        this.logger.warn(`Failed to search users from Spring, falling back to MongoDB`, error.message);
      }
    }

    return this.userModel
      .find({
        _id: { $ne: currentUserId },
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { displayName: { $regex: query, $options: 'i' } },
          { phoneNumber: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      })
      .select('-password')
      .limit(20)
      .exec();
  }

  async getUsersByIds(ids: string[]): Promise<UserDocument[]> {
    if (this.useSpringProfiles && ids.length > 0) {
      try {
        const profiles = await this.profileClient.getUsersByExternalIds(ids);
        const users: UserDocument[] = [];
        for (const profile of profiles) {
          const cached = await this.syncProfileToCache(profile);
          users.push(cached);
        }
        return users;
      } catch (error) {
        this.logger.warn(`Failed to get users by IDs from Spring, falling back to MongoDB`, error.message);
      }
    }

    return this.userModel
      .find({ _id: { $in: ids } })
      .select('-password')
      .exec();
  }

  // Settings methods
  async getSettings(userId: string, accessToken?: string): Promise<UserSettingsDocument> {
    if (this.useSpringProfiles && accessToken) {
      try {
        const springSettings = await this.profileClient.getSettings(userId, accessToken);
        return this.syncSettingsToCache(userId, springSettings);
      } catch (error) {
        this.logger.warn(`Failed to get settings from Spring, falling back to MongoDB`, error.message);
      }
    }

    let settings = await this.userSettingsModel.findOne({ userId }).exec();

    if (!settings) {
      // Create default settings if they don't exist
      settings = new this.userSettingsModel({ userId });
      await settings.save();
    }

    return settings;
  }

  async updateSettings(userId: string, updates: UpdateSettingsDto, accessToken?: string): Promise<UserSettingsDocument> {
    if (this.useSpringProfiles && accessToken) {
      try {
        // Transform visibility fields to uppercase for Spring API
        const springUpdates = {
          ...updates,
          profilePhotoVisibility: updates.profilePhotoVisibility?.toUpperCase() as 'EVERYONE' | 'CONTACTS' | 'NOBODY' | undefined,
          statusVisibility: updates.statusVisibility?.toUpperCase() as 'EVERYONE' | 'CONTACTS' | 'NOBODY' | undefined,
        };
        const springSettings = await this.profileClient.updateSettings(userId, accessToken, springUpdates);
        return this.syncSettingsToCache(userId, springSettings);
      } catch (error) {
        this.logger.warn(`Failed to update settings in Spring, falling back to MongoDB`, error.message);
      }
    }

    let settings = await this.userSettingsModel.findOne({ userId }).exec();

    if (!settings) {
      // Create settings if they don't exist
      settings = new this.userSettingsModel({ userId, ...updates });
      await settings.save();
    } else {
      // Update existing settings
      Object.assign(settings, updates);
      await settings.save();
    }

    return settings;
  }

  async blockUser(userId: string, userIdToBlock: string, accessToken?: string): Promise<UserSettingsDocument> {
    if (this.useSpringProfiles && accessToken) {
      try {
        await this.profileClient.blockUser(userId, accessToken, userIdToBlock);
        // Fall through to update local cache
      } catch (error) {
        this.logger.warn(`Failed to block user in Spring, falling back to MongoDB`, error.message);
      }
    }

    let settings = await this.userSettingsModel.findOne({ userId }).exec();

    if (!settings) {
      settings = new this.userSettingsModel({ userId, blockedUsers: [userIdToBlock] });
      await settings.save();
    } else {
      if (!settings.blockedUsers.includes(userIdToBlock as any)) {
        settings.blockedUsers.push(userIdToBlock as any);
        await settings.save();
      }
    }

    return settings;
  }

  async unblockUser(userId: string, userIdToUnblock: string, accessToken?: string): Promise<UserSettingsDocument> {
    if (this.useSpringProfiles && accessToken) {
      try {
        await this.profileClient.unblockUser(userId, accessToken, userIdToUnblock);
        // Fall through to update local cache
      } catch (error) {
        this.logger.warn(`Failed to unblock user in Spring, falling back to MongoDB`, error.message);
      }
    }

    let settings = await this.userSettingsModel.findOne({ userId }).exec();

    if (!settings) {
      settings = new this.userSettingsModel({ userId });
      await settings.save();
      return settings;
    }

    settings.blockedUsers = settings.blockedUsers.filter((id) => id.toString() !== userIdToUnblock);
    await settings.save();

    return settings;
  }

  async getBlockedUsers(userId: string, accessToken?: string): Promise<UserDocument[]> {
    if (this.useSpringProfiles && accessToken) {
      try {
        const blockedSummaries = await this.profileClient.getBlockedUsers(userId, accessToken);
        // Sync blocked users to cache
        const users: UserDocument[] = [];
        for (const summary of blockedSummaries) {
          const profile = await this.profileClient.getProfile(summary.id);
          const cached = await this.syncProfileToCache(profile);
          users.push(cached);
        }
        return users;
      } catch (error) {
        this.logger.warn(`Failed to get blocked users from Spring, falling back to MongoDB`, error.message);
      }
    }

    const settings = await this.userSettingsModel
      .findOne({ userId })
      .populate('blockedUsers', '-password')
      .exec();

    if (!settings || !settings.blockedUsers) {
      return [];
    }

    return settings.blockedUsers as any;
  }

  /**
   * Check if two users have blocked each other
   */
  async areUsersBlocked(userId1: string, userId2: string): Promise<boolean> {
    if (this.useSpringProfiles) {
      try {
        return await this.profileClient.checkBlocked(userId1, userId2);
      } catch (error) {
        this.logger.warn(`Failed to check blocked status from Spring, falling back to MongoDB`, error.message);
      }
    }

    const settings1 = await this.userSettingsModel.findOne({ userId: userId1 }).exec();
    const settings2 = await this.userSettingsModel.findOne({ userId: userId2 }).exec();

    const blocked1 = settings1?.blockedUsers?.some((id) => id.toString() === userId2) || false;
    const blocked2 = settings2?.blockedUsers?.some((id) => id.toString() === userId1) || false;

    return blocked1 || blocked2;
  }

  // Linked Devices methods
  async linkDevice(
    userId: string,
    deviceData: { deviceId: string; deviceName: string; deviceType: string; fcmToken?: string },
    accessToken?: string,
  ): Promise<UserDocument> {
    if (this.useSpringProfiles && accessToken) {
      try {
        await this.profileClient.linkDevice(userId, accessToken, {
          deviceId: deviceData.deviceId,
          deviceName: deviceData.deviceName,
          deviceType: deviceData.deviceType as 'MOBILE' | 'WEB' | 'DESKTOP',
          fcmToken: deviceData.fcmToken,
        });
        // Fall through to update local cache
      } catch (error) {
        this.logger.warn(`Failed to link device in Spring, falling back to MongoDB`, error.message);
      }
    }

    const user = await this.findById(userId);

    // Check if device already exists
    const existingDeviceIndex = user.linkedDevices?.findIndex(
      (d: any) => d.deviceId === deviceData.deviceId,
    );

    if (existingDeviceIndex !== undefined && existingDeviceIndex >= 0) {
      // Update existing device
      user.linkedDevices[existingDeviceIndex] = {
        ...deviceData,
        lastActive: new Date(),
        linkedAt: user.linkedDevices[existingDeviceIndex].linkedAt,
      } as any;
    } else {
      // Add new device
      if (!user.linkedDevices) {
        user.linkedDevices = [];
      }
      user.linkedDevices.push({
        ...deviceData,
        lastActive: new Date(),
        linkedAt: new Date(),
      } as any);
    }

    await user.save();
    return user;
  }

  async getLinkedDevices(userId: string, accessToken?: string): Promise<any[]> {
    if (this.useSpringProfiles && accessToken) {
      try {
        return await this.profileClient.getLinkedDevices(userId, accessToken);
      } catch (error) {
        this.logger.warn(`Failed to get linked devices from Spring, falling back to MongoDB`, error.message);
      }
    }

    const user = await this.findById(userId);
    return user.linkedDevices || [];
  }

  async unlinkDevice(userId: string, deviceId: string, accessToken?: string): Promise<void> {
    if (this.useSpringProfiles && accessToken) {
      try {
        await this.profileClient.unlinkDevice(userId, accessToken, deviceId);
        // Fall through to update local cache
      } catch (error) {
        this.logger.warn(`Failed to unlink device in Spring, falling back to MongoDB`, error.message);
      }
    }

    const user = await this.findById(userId);

    if (user.linkedDevices) {
      user.linkedDevices = user.linkedDevices.filter((d: any) => d.deviceId !== deviceId);
      await user.save();
    }
  }

  async updateDeviceActivity(userId: string, deviceId: string, accessToken?: string): Promise<void> {
    if (this.useSpringProfiles && accessToken) {
      try {
        await this.profileClient.updateDeviceActivity(userId, accessToken, deviceId);
        // Fall through to update local cache
      } catch (error) {
        this.logger.warn(`Failed to update device activity in Spring, falling back to MongoDB`, error.message);
      }
    }

    const user = await this.findById(userId);

    if (user.linkedDevices) {
      const device = user.linkedDevices.find((d: any) => d.deviceId === deviceId);
      if (device) {
        (device as any).lastActive = new Date();
        await user.save();
      }
    }
  }

  async updateDeviceFcmToken(userId: string, deviceId: string, fcmToken: string, accessToken?: string): Promise<void> {
    if (this.useSpringProfiles && accessToken) {
      try {
        await this.profileClient.updateFcmToken(userId, accessToken, deviceId, fcmToken);
        // Fall through to update local cache
      } catch (error) {
        this.logger.warn(`Failed to update FCM token in Spring, falling back to MongoDB`, error.message);
      }
    }

    const user = await this.findById(userId);

    if (user.linkedDevices) {
      const device = user.linkedDevices.find((d: any) => d.deviceId === deviceId);
      if (device) {
        (device as any).fcmToken = fcmToken;
        await user.save();
      }
    }
  }

  // OAuth methods
  async findByOAuthProvider(provider: string, providerId: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        'oauthProviders.provider': provider,
        'oauthProviders.providerId': providerId,
      })
      .exec();
  }

  async createOAuthUser(userData: {
    username: string;
    displayName: string;
    email?: string;
    avatar?: string;
    provider: string;
    providerId: string;
  }): Promise<UserDocument> {
    const user = new this.userModel({
      username: userData.username,
      displayName: userData.displayName,
      email: userData.email,
      avatar: userData.avatar,
      phoneNumber: `oauth_${userData.provider}_${userData.providerId}`, // Placeholder for OAuth users
      password: '', // No password for OAuth users
      oauthProviders: [
        {
          provider: userData.provider,
          providerId: userData.providerId,
          email: userData.email,
          linkedAt: new Date(),
        },
      ],
      isVerified: true, // OAuth users are considered verified
    });

    return user.save();
  }

  async linkOAuthAccount(
    userId: string,
    provider: string,
    providerId: string,
    email?: string,
  ): Promise<UserDocument> {
    const user = await this.findById(userId);

    // Check if this provider is already linked
    const existingProvider = user.oauthProviders?.find((p: any) => p.provider === provider);

    if (existingProvider) {
      // Update existing provider
      existingProvider.providerId = providerId;
      if (email) {
        existingProvider.email = email;
      }
    } else {
      // Add new provider
      if (!user.oauthProviders) {
        user.oauthProviders = [];
      }
      user.oauthProviders.push({
        provider,
        providerId,
        email: email || (null as any),
        linkedAt: new Date(),
      });
    }

    await user.save();
    return user;
  }

  async unlinkOAuthAccount(userId: string, provider: string): Promise<UserDocument> {
    const user = await this.findById(userId);

    if (user.oauthProviders) {
      user.oauthProviders = user.oauthProviders.filter((p: any) => p.provider !== provider);
      await user.save();
    }

    return user;
  }

  async getOAuthProviders(userId: string): Promise<any[]> {
    const user = await this.findById(userId);
    return (
      user.oauthProviders?.map((p: any) => ({
        provider: p.provider,
        email: p.email,
        linkedAt: p.linkedAt,
      })) || []
    );
  }
}
