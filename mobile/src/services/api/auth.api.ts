/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import api from '../api';

// Types
export interface SendOtpRequest {
  phoneNumber: string;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
}

export interface CompleteProfileRequest {
  phoneNumber: string;
  name: string;
  avatar?: string;
}

export interface RegisterRequest {
  phoneNumber: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordSetRequest {
  password: string;
}

export interface ForgotPasswordRequest {
  phoneNumber: string;
}

export interface ResetPasswordRequest {
  phoneNumber: string;
  token: string;
  newPassword: string;
}

export interface OAuthMobileRequest {
  provider: 'google' | 'facebook' | 'apple';
  accessToken: string;
  idToken?: string;
}

export interface Session {
  id: string;
  deviceName: string;
  deviceType: string;
  lastActive: string;
  location?: string;
  current: boolean;
}

// Auth API Service
const authApi = {
  // OTP Authentication
  sendOtp: (data: SendOtpRequest) =>
    api.post('/auth/send-otp', data),

  verifyOtp: (data: VerifyOtpRequest) =>
    api.post('/auth/verify-otp', data),

  completeProfile: (data: CompleteProfileRequest) =>
    api.post('/auth/complete-profile', data),

  // Standard Authentication
  register: (data: RegisterRequest) =>
    api.post('/auth/register', data),

  login: (data: LoginRequest) =>
    api.post('/auth/login', data),

  refreshToken: (data: RefreshTokenRequest) =>
    api.post('/auth/refresh', data),

  logout: () =>
    api.post('/auth/logout'),

  logoutAll: () =>
    api.post('/auth/logout-all'),

  // Two-Factor Authentication
  setupTwoFactor: () =>
    api.post<TwoFactorSetupResponse>('/auth/2fa/setup'),

  enableTwoFactor: (data: TwoFactorVerifyRequest) =>
    api.post('/auth/2fa/enable', data),

  disableTwoFactor: (data: TwoFactorVerifyRequest) =>
    api.post('/auth/2fa/disable', data),

  verifyTwoFactor: (data: TwoFactorVerifyRequest) =>
    api.post('/auth/2fa/verify', data),

  regenerateBackupCodes: (data: TwoFactorVerifyRequest) =>
    api.post('/auth/2fa/backup-codes/regenerate', data),

  // OAuth
  oauthMobile: (data: OAuthMobileRequest) =>
    api.post('/auth/oauth/mobile', data),

  getLinkedAccounts: () =>
    api.get('/auth/oauth/linked-accounts'),

  linkAccount: (provider: string, data: { accessToken: string }) =>
    api.post(`/auth/oauth/link/${provider}`, data),

  unlinkAccount: (provider: string) =>
    api.delete(`/auth/oauth/unlink/${provider}`),

  // Sessions
  getSessions: () =>
    api.get<Session[]>('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    api.delete(`/auth/sessions/${sessionId}`),

  // Password Management
  changePassword: (data: PasswordChangeRequest) =>
    api.post('/auth/password/change', data),

  setPassword: (data: PasswordSetRequest) =>
    api.post('/auth/password/set', data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post('/auth/password/forgot', data),

  verifyResetToken: (data: { phoneNumber: string; token: string }) =>
    api.post('/auth/password/verify-reset-token', data),

  resetPassword: (data: ResetPasswordRequest) =>
    api.post('/auth/password/reset', data),

  checkPasswordStrength: (password: string) =>
    api.post('/auth/password/strength', { password }),

  // Token Utilities
  verifyToken: () =>
    api.post('/auth/token/verify'),

  decodeToken: () =>
    api.post('/auth/token/decode'),
};

export default authApi;
