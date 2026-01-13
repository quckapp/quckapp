import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '../../common/http/http.service';

/**
 * Client service for communicating with Spring Boot User Profile service
 */
@Injectable()
export class UserProfileClientService {
  private readonly logger = new Logger(UserProfileClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly enabled: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('SPRING_AUTH_SERVICE_URL', 'http://localhost:8081/api/auth') + '/v1/users';
    this.apiKey = this.configService.get<string>('SPRING_AUTH_API_KEY', '');
    this.timeout = this.configService.get<number>('SPRING_AUTH_TIMEOUT', 10000);
    this.enabled = this.configService.get<string>('USE_SPRING_PROFILES', 'false') === 'true';
  }

  // ==================== Profile Operations ====================

  async getProfile(userId: string): Promise<SpringUserProfile> {
    return this.request<SpringUserProfile>('GET', `/${userId}`);
  }

  async getProfileByExternalId(externalId: string): Promise<SpringUserProfile> {
    return this.request<SpringUserProfile>('GET', `/by-external-id/${externalId}`);
  }

  async updateProfile(userId: string, accessToken: string, updates: UpdateProfileDto): Promise<SpringUserProfile> {
    return this.request<SpringUserProfile>('PUT', '/me', updates, { userId, accessToken });
  }

  async getProfileByPhone(phoneNumber: string): Promise<SpringUserProfile | null> {
    try {
      return await this.request<SpringUserProfile>('GET', `/by-phone/${encodeURIComponent(phoneNumber)}`);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async getProfileByUsername(username: string): Promise<SpringUserProfile | null> {
    try {
      return await this.request<SpringUserProfile>('GET', `/by-username/${username}`);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async getUsersByIds(ids: string[]): Promise<SpringUserProfile[]> {
    if (!ids || ids.length === 0) return [];
    const params = ids.map(id => `ids=${id}`).join('&');
    return this.request<SpringUserProfile[]>('GET', `/batch?${params}`);
  }

  async getUsersByExternalIds(externalIds: string[]): Promise<SpringUserProfile[]> {
    if (!externalIds || externalIds.length === 0) return [];
    const params = externalIds.map(id => `externalIds=${id}`).join('&');
    return this.request<SpringUserProfile[]>('GET', `/batch/external?${params}`);
  }

  async searchUsers(query: string, excludeUserId?: string, page = 0, size = 20): Promise<SpringPagedResult<SpringUserProfileSummary>> {
    let url = `/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`;
    if (excludeUserId) {
      url += `&excludeUserId=${excludeUserId}`;
    }
    return this.request<SpringPagedResult<SpringUserProfileSummary>>('GET', url);
  }

  // ==================== Status Operations ====================

  async updateStatus(userId: string, accessToken: string, status: string): Promise<void> {
    await this.request<void>('PUT', '/me/status', { status: status.toUpperCase() }, { userId, accessToken });
  }

  // ==================== Settings Operations ====================

  async getSettings(userId: string, accessToken: string): Promise<SpringUserSettings> {
    return this.request<SpringUserSettings>('GET', '/me/settings', undefined, { userId, accessToken });
  }

  async updateSettings(userId: string, accessToken: string, updates: UpdateSettingsDto): Promise<SpringUserSettings> {
    return this.request<SpringUserSettings>('PUT', '/me/settings', updates, { userId, accessToken });
  }

  // ==================== Block Operations ====================

  async blockUser(userId: string, accessToken: string, userToBlock: string): Promise<void> {
    await this.request<void>('POST', '/me/blocked-users', { userId: userToBlock }, { userId, accessToken });
  }

  async unblockUser(userId: string, accessToken: string, userToUnblock: string): Promise<void> {
    await this.request<void>('DELETE', `/me/blocked-users/${userToUnblock}`, undefined, { userId, accessToken });
  }

  async getBlockedUsers(userId: string, accessToken: string): Promise<SpringUserProfileSummary[]> {
    return this.request<SpringUserProfileSummary[]>('GET', '/me/blocked-users', undefined, { userId, accessToken });
  }

  async checkBlocked(userId1: string, userId2: string): Promise<boolean> {
    return this.request<boolean>('GET', `/internal/check-blocked?userId1=${userId1}&userId2=${userId2}`);
  }

  // ==================== Device Operations ====================

  async linkDevice(userId: string, accessToken: string, device: LinkDeviceDto): Promise<SpringLinkedDevice> {
    return this.request<SpringLinkedDevice>('POST', '/me/devices', device, { userId, accessToken });
  }

  async getLinkedDevices(userId: string, accessToken: string): Promise<SpringLinkedDevice[]> {
    return this.request<SpringLinkedDevice[]>('GET', '/me/devices', undefined, { userId, accessToken });
  }

  async unlinkDevice(userId: string, accessToken: string, deviceId: string): Promise<void> {
    await this.request<void>('DELETE', `/me/devices/${deviceId}`, undefined, { userId, accessToken });
  }

  async updateDeviceActivity(userId: string, accessToken: string, deviceId: string): Promise<void> {
    await this.request<void>('PUT', `/me/devices/${deviceId}/activity`, undefined, { userId, accessToken });
  }

  async updateFcmToken(userId: string, accessToken: string, deviceId: string, fcmToken: string): Promise<void> {
    await this.request<void>('PUT', `/me/devices/${deviceId}/fcm-token`, { fcmToken }, { userId, accessToken });
  }

  // ==================== FCM Token Operations (Internal) ====================

  async getFcmTokens(userId: string): Promise<string[]> {
    const response = await this.request<{ userId: string; fcmTokens: string[] }>('GET', `/internal/fcm-tokens/${userId}`);
    return response.fcmTokens || [];
  }

  async getFcmTokensBatch(userIds: string[]): Promise<Map<string, string[]>> {
    if (!userIds || userIds.length === 0) return new Map();
    const response = await this.request<Record<string, string[]>>('POST', '/internal/fcm-tokens/batch', { userIds });
    return new Map(Object.entries(response));
  }

  // ==================== Admin Operations ====================

  async banUser(adminUserId: string, accessToken: string, userId: string, reason: string): Promise<void> {
    await this.request<void>('POST', '/admin/ban', { userId, reason }, { userId: adminUserId, accessToken });
  }

  async unbanUser(userId: string): Promise<void> {
    await this.request<void>('POST', `/admin/unban/${userId}`);
  }

  async updateRole(userId: string, role: string): Promise<void> {
    await this.request<void>('POST', '/admin/role', { userId, role: role.toUpperCase() });
  }

  async getStatistics(): Promise<SpringUserStatistics> {
    return this.request<SpringUserStatistics>('GET', '/admin/statistics');
  }

  // ==================== Health Check ====================

  async healthCheck(): Promise<boolean> {
    try {
      await this.httpService.get(`${this.baseUrl.replace('/v1/users', '')}/actuator/health`, {
        timeout: 5000,
      });
      return true;
    } catch (error) {
      this.logger.warn('Spring User Profile service health check failed', error.message);
      return false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ==================== Helper Methods ====================

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
    auth?: { userId?: string; accessToken?: string },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };

    if (auth?.userId) {
      headers['X-User-ID'] = auth.userId;
    }
    if (auth?.accessToken) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }

    try {
      let response: any;

      switch (method) {
        case 'GET':
          response = await this.httpService.get(url, { headers, timeout: this.timeout });
          break;
        case 'POST':
          response = await this.httpService.post(url, data, { headers, timeout: this.timeout });
          break;
        case 'PUT':
          response = await this.httpService.put(url, data, { headers, timeout: this.timeout });
          break;
        case 'DELETE':
          response = await this.httpService.delete(url, { headers, timeout: this.timeout });
          break;
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Spring Profile API error: ${method} ${path}`, error.message);

      if (error.response) {
        throw new HttpException(
          error.response.data?.message || 'Spring Profile API error',
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Spring Profile service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

// ==================== Type Definitions ====================

export interface SpringUserProfile {
  id: string;
  externalId: string;
  phoneNumber: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  bio?: string;
  publicKey?: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY';
  lastSeen?: string;
  isActive: boolean;
  isVerified: boolean;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: string[];
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpringUserProfileSummary {
  id: string;
  externalId: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY';
  lastSeen?: string;
  isVerified: boolean;
}

export interface SpringUserSettings {
  userId: string;
  darkMode: boolean;
  autoDownloadMedia: boolean;
  saveToGallery: boolean;
  pushNotifications: boolean;
  messageNotifications: boolean;
  groupNotifications: boolean;
  callNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showPreview: boolean;
  inAppNotifications: boolean;
  notificationLight: boolean;
  readReceipts: boolean;
  lastSeenVisible: boolean;
  profilePhotoVisibility: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  statusVisibility: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  fingerprintLock: boolean;
  blockedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SpringLinkedDevice {
  id: string;
  deviceId: string;
  deviceName?: string;
  deviceType: 'MOBILE' | 'WEB' | 'DESKTOP';
  hasFcmToken: boolean;
  lastActive?: string;
  linkedAt: string;
}

export interface SpringPagedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface SpringUserStatistics {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  bannedUsers: number;
  usersByRole: Record<string, number>;
}

export interface UpdateProfileDto {
  username?: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  publicKey?: string;
}

export interface UpdateSettingsDto {
  darkMode?: boolean;
  autoDownloadMedia?: boolean;
  saveToGallery?: boolean;
  pushNotifications?: boolean;
  messageNotifications?: boolean;
  groupNotifications?: boolean;
  callNotifications?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  showPreview?: boolean;
  inAppNotifications?: boolean;
  notificationLight?: boolean;
  readReceipts?: boolean;
  lastSeenVisible?: boolean;
  profilePhotoVisibility?: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  statusVisibility?: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  fingerprintLock?: boolean;
}

export interface LinkDeviceDto {
  deviceId: string;
  deviceName?: string;
  deviceType?: 'MOBILE' | 'WEB' | 'DESKTOP';
  fcmToken?: string;
}
