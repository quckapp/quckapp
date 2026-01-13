import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_PATTERNS } from '../../shared/contracts/message-patterns';
import { AuthServiceHandler } from './auth-service.handler';

/**
 * Auth Service Controller
 * Handles incoming TCP messages from other microservices
 */
@Controller()
export class AuthServiceController {
  constructor(private handler: AuthServiceHandler) {}

  // ============================================
  // OTP Authentication
  // ============================================

  @MessagePattern(AUTH_PATTERNS.SEND_OTP)
  async sendOtp(@Payload() dto: { phoneNumber: string; channel?: string }) {
    return this.handler.sendOtp(dto as any);
  }

  @MessagePattern(AUTH_PATTERNS.VERIFY_OTP)
  async verifyOtp(@Payload() dto: { phoneNumber: string; code: string }) {
    return this.handler.verifyOtp(dto);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  async login(
    @Payload()
    dto: {
      phoneNumber: string;
      otp: string;
      deviceInfo?: any;
      twoFactorCode?: string;
    },
  ) {
    return this.handler.login(dto);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  async logout(@Payload() dto: { userId: string; token: string; sessionId?: string }) {
    return this.handler.logout(dto);
  }

  // ============================================
  // Token Management
  // ============================================

  @MessagePattern(AUTH_PATTERNS.REFRESH_TOKEN)
  async refreshToken(@Payload() dto: { refreshToken: string }) {
    return this.handler.refreshToken(dto);
  }

  @MessagePattern(AUTH_PATTERNS.VALIDATE_TOKEN)
  async validateToken(@Payload() dto: { token: string }) {
    return this.handler.validateToken(dto);
  }

  // ============================================
  // Two-Factor Authentication
  // ============================================

  @MessagePattern(AUTH_PATTERNS.ENABLE_2FA)
  async enable2FA(@Payload() dto: { userId: string; method: string }) {
    return this.handler.enable2FA(dto);
  }

  @MessagePattern(AUTH_PATTERNS.DISABLE_2FA)
  async disable2FA(@Payload() dto: { userId: string; code: string }) {
    return this.handler.disable2FA(dto);
  }

  @MessagePattern(AUTH_PATTERNS.VERIFY_2FA)
  async verify2FA(@Payload() dto: { userId: string; code: string }) {
    return this.handler.verify2FA(dto);
  }

  @MessagePattern('auth.2fa.setup.verify')
  async verify2FASetup(@Payload() dto: { userId: string; code: string }) {
    return this.handler.verify2FASetup(dto);
  }

  @MessagePattern('auth.2fa.status')
  async get2FAStatus(@Payload() dto: { userId: string }) {
    return this.handler.get2FAStatus(dto);
  }

  @MessagePattern('auth.2fa.backup.regenerate')
  async regenerateBackupCodes(@Payload() dto: { userId: string; code: string }) {
    return this.handler.regenerateBackupCodes(dto);
  }

  // ============================================
  // OAuth
  // ============================================

  @MessagePattern(AUTH_PATTERNS.OAUTH_LOGIN)
  async oauthLogin(@Payload() dto: { provider: string; token: string; deviceInfo?: any }) {
    return this.handler.oauthLogin(dto);
  }

  @MessagePattern(AUTH_PATTERNS.OAUTH_LINK)
  async linkOAuthAccount(@Payload() dto: { userId: string; provider: string; token: string }) {
    return this.handler.linkOAuthAccount(dto);
  }

  @MessagePattern(AUTH_PATTERNS.OAUTH_UNLINK)
  async unlinkOAuthAccount(@Payload() dto: { userId: string; provider: string }) {
    return this.handler.unlinkOAuthAccount(dto);
  }

  // ============================================
  // Session Management
  // ============================================

  @MessagePattern(AUTH_PATTERNS.GET_SESSIONS)
  async getSessions(@Payload() dto: { userId: string }) {
    return this.handler.getSessions(dto);
  }

  @MessagePattern(AUTH_PATTERNS.REVOKE_SESSION)
  async revokeSession(@Payload() dto: { userId: string; sessionId: string }) {
    return this.handler.revokeSession(dto);
  }

  @MessagePattern(AUTH_PATTERNS.REVOKE_ALL_SESSIONS)
  async revokeAllSessions(@Payload() dto: { userId: string; exceptCurrent?: string }) {
    return this.handler.revokeAllSessions(dto);
  }

  // ============================================
  // Password Management
  // ============================================

  @MessagePattern(AUTH_PATTERNS.CHANGE_PASSWORD)
  async changePassword(
    @Payload()
    dto: {
      userId: string;
      currentPassword: string;
      newPassword: string;
    },
  ) {
    return this.handler.changePassword(dto);
  }

  @MessagePattern(AUTH_PATTERNS.RESET_PASSWORD)
  async resetPassword(@Payload() dto: { phoneNumber: string; newPassword: string; otp: string }) {
    return this.handler.resetPassword(dto);
  }
}
