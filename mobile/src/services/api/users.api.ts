/**
 * Users API Service
 * Handles all user-related API calls
 */

import api from '../api';

// Types
export interface User {
  _id: string;
  phoneNumber: string;
  name: string;
  avatar?: string;
  status?: string;
  lastSeen?: string;
  isOnline?: boolean;
  isVerified?: boolean;
}

export interface UserProfile extends User {
  email?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
  bio?: string;
  status?: string;
}

export interface UserSettings {
  notifications: {
    messages: boolean;
    calls: boolean;
    groups: boolean;
    sounds: boolean;
    vibration: boolean;
  };
  privacy: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    about: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface BlockUserRequest {
  userId: string;
}

export interface LinkedDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  lastActive: string;
  isActive: boolean;
}

export interface LinkDeviceRequest {
  deviceName: string;
  deviceType: string;
  platform: string;
  fcmToken?: string;
}

// Users API Service
const usersApi = {
  // Profile
  getProfile: () =>
    api.get<UserProfile>('/users/me'),

  updateProfile: (data: UpdateProfileRequest) =>
    api.put<UserProfile>('/users/me', data),

  getUserById: (userId: string) =>
    api.get<User>(`/users/${userId}`),

  searchUsers: (query: string, page: number = 1, limit: number = 20) =>
    api.get<User[]>('/users/search', {
      params: { q: query, page, limit },
    }),

  // Status
  updateStatus: (status: string) =>
    api.put('/users/me/status', { status }),

  // FCM Token
  updateFcmToken: (fcmToken: string, action: 'add' | 'remove' = 'add') =>
    api.put('/users/me/fcm-token', { fcmToken, action }),

  // Settings
  getSettings: () =>
    api.get<UserSettings>('/users/me/settings'),

  updateSettings: (settings: Partial<UserSettings>) =>
    api.put<UserSettings>('/users/me/settings', settings),

  // Blocked Users
  blockUser: (data: BlockUserRequest) =>
    api.post('/users/me/blocked-users', data),

  getBlockedUsers: () =>
    api.get<User[]>('/users/me/blocked-users'),

  unblockUser: (userId: string) =>
    api.delete(`/users/me/blocked-users/${userId}`),

  // Linked Devices
  linkDevice: (data: LinkDeviceRequest) =>
    api.post<LinkedDevice>('/users/me/linked-devices', data),

  getLinkedDevices: () =>
    api.get<LinkedDevice[]>('/users/me/linked-devices'),

  unlinkDevice: (deviceId: string) =>
    api.delete(`/users/me/linked-devices/${deviceId}`),

  updateDeviceActivity: (deviceId: string) =>
    api.put(`/users/me/linked-devices/${deviceId}/active`),
};

export default usersApi;
