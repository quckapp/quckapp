import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { OtpService } from './services/otp.service';
import { TokenPair, TokenService } from './services/token.service';
import { DeviceInfo, SessionService } from './services/session.service';
import { TwoFactorAuthService } from './services/two-factor.service';
import { OAuthService } from './services/oauth.service';
import { IServiceResponse } from '../../shared/interfaces/microservice.interface';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../shared/utils/service-response.util';
import { SERVICES } from '../../shared/constants/services';
import { USERS_PATTERNS } from '../../shared/contracts/message-patterns';

// DTOs
interface SendOtpDto {
  phoneNumber: string;
  channel?: 'sms' | 'whatsapp' | 'email';
}

interface VerifyOtpDto {
  phoneNumber: string;
  code: string;
}

interface LoginDto {
  phoneNumber: string;
  otp: string;
  deviceInfo?: DeviceInfo;
  twoFactorCode?: string;
}

interface LoginResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
  requiresTwoFactor?: boolean;
}

/**
 * Auth Service Handler
 * Central handler for all authentication business logic
 */
@Injectable()
export class AuthServiceHandler {
  constructor(
    private otpService: OtpService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private twoFactorService: TwoFactorAuthService,
    private oauthService: OAuthService,
    @Inject(SERVICES.USERS_SERVICE) private usersClient: ClientProxy,
  ) {}

  // ============================================
  // OTP Authentication
  // ============================================

  async sendOtp(dto: SendOtpDto): Promise<IServiceResponse> {
    return this.otpService.sendOtp({
      phoneNumber: dto.phoneNumber,
      channel: dto.channel,
    });
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<IServiceResponse> {
    return this.otpService.verifyOtp({
      phoneNumber: dto.phoneNumber,
      code: dto.code,
    });
  }

  async login(dto: LoginDto): Promise<IServiceResponse<LoginResponse>> {
    try {
      // Step 1: Verify OTP
      const otpResult = await this.otpService.verifyOtp({
        phoneNumber: dto.phoneNumber,
        code: dto.otp,
      });

      if (!otpResult.success) {
        return otpResult as any;
      }

      // Step 2: Find or create user
      let user: any;
      let isNewUser = false;

      const userResult = await this.findOrCreateUser(dto.phoneNumber);
      if (!userResult.success || !userResult.data) {
        return userResult as any;
      }

      user = userResult.data.user;
      isNewUser = userResult.data.isNewUser;

      // Step 3: Check 2FA requirement
      const is2FAEnabled = await this.twoFactorService.isTwoFactorEnabled(user._id || user.id);

      if (is2FAEnabled && !dto.twoFactorCode) {
        return successResponse(
          {
            requiresTwoFactor: true,
            user: null,
            accessToken: '',
            refreshToken: '',
            expiresIn: 0,
            isNewUser: false,
          } as any,
          SERVICES.AUTH_SERVICE,
        );
      }

      if (is2FAEnabled && dto.twoFactorCode) {
        const twoFactorResult = await this.twoFactorService.verifyTwoFactorCode(
          user._id || user.id,
          dto.twoFactorCode,
        );

        if (!twoFactorResult.success) {
          return twoFactorResult as any;
        }
      }

      // Step 4: Create session
      const sessionResult = await this.sessionService.createSession({
        userId: user._id || user.id,
        refreshToken: '', // Will be updated
        deviceInfo: dto.deviceInfo,
      });

      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as any;
      }

      // Step 5: Generate tokens
      const tokenResult = await this.tokenService.generateTokenPair(
        user._id || user.id,
        dto.phoneNumber,
        sessionResult.data.sessionId,
      );

      if (!tokenResult.success || !tokenResult.data) {
        return tokenResult as any;
      }

      // Step 6: Update session with refresh token
      await this.sessionService.updateSessionRefreshToken(
        sessionResult.data.sessionId,
        tokenResult.data.refreshToken,
      );

      // Step 7: Update user status to online
      await this.updateUserStatus(user._id || user.id, 'online');

      return successResponse(
        {
          user: this.sanitizeUser(user),
          accessToken: tokenResult.data.accessToken,
          refreshToken: tokenResult.data.refreshToken,
          expiresIn: tokenResult.data.expiresIn,
          isNewUser,
        },
        SERVICES.AUTH_SERVICE,
      );
    } catch (error) {
      console.error('Login error:', error);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Login failed', SERVICES.AUTH_SERVICE);
    }
  }

  async logout(dto: {
    userId: string;
    token: string;
    sessionId?: string;
  }): Promise<IServiceResponse> {
    try {
      // Blacklist the current access token
      if (dto.token) {
        await this.tokenService.blacklistToken(dto.token);
      }

      // If sessionId provided, revoke that specific session
      if (dto.sessionId) {
        await this.sessionService.revokeSession(dto.userId, dto.sessionId, 'User logout');
      }

      // Update user status
      await this.updateUserStatus(dto.userId, 'offline');

      return successResponse({ message: 'Logged out successfully' }, SERVICES.AUTH_SERVICE);
    } catch (error) {
      console.error('Logout error:', error);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Logout failed', SERVICES.AUTH_SERVICE);
    }
  }

  // ============================================
  // Token Management
  // ============================================

  async refreshToken(dto: { refreshToken: string }): Promise<IServiceResponse<TokenPair>> {
    try {
      // Validate refresh token
      const validation = await this.tokenService.validateRefreshToken(dto.refreshToken);
      if (!validation.success || !validation.data) {
        return validation as any;
      }

      const { userId, phoneNumber, sessionId } = validation.data;

      // Verify session is still active
      const sessionResult = await this.sessionService.getSession(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return errorResponse(
          ERROR_CODES.TOKEN_INVALID,
          'Session has been revoked',
          SERVICES.AUTH_SERVICE,
        );
      }

      // Blacklist old refresh token
      await this.tokenService.blacklistToken(dto.refreshToken);

      // Generate new tokens
      const tokenResult = await this.tokenService.generateTokenPair(userId, phoneNumber, sessionId);
      if (!tokenResult.success || !tokenResult.data) {
        return tokenResult;
      }

      // Update session with new refresh token
      await this.sessionService.updateSessionRefreshToken(sessionId, tokenResult.data.refreshToken);

      return tokenResult;
    } catch (error) {
      console.error('Token refresh error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Token refresh failed',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  async validateToken(dto: { token: string }): Promise<IServiceResponse> {
    const result = await this.tokenService.validateAccessToken(dto.token);

    if (!result.success) {
      return result;
    }

    return successResponse(
      {
        valid: true,
        userId: result.data?.userId,
        phoneNumber: result.data?.phoneNumber,
        sessionId: result.data?.sessionId,
      },
      SERVICES.AUTH_SERVICE,
    );
  }

  // ============================================
  // 2FA Management
  // ============================================

  async enable2FA(dto: { userId: string; method: string }): Promise<IServiceResponse> {
    return this.twoFactorService.enableTwoFactor(
      dto.userId,
      dto.method as 'totp' | 'sms' | 'email',
    );
  }

  async verify2FASetup(dto: { userId: string; code: string }): Promise<IServiceResponse> {
    return this.twoFactorService.verifyAndActivate(dto.userId, dto.code);
  }

  async disable2FA(dto: { userId: string; code: string }): Promise<IServiceResponse> {
    return this.twoFactorService.disableTwoFactor(dto.userId, dto.code);
  }

  async verify2FA(dto: { userId: string; code: string }): Promise<IServiceResponse> {
    return this.twoFactorService.verifyTwoFactorCode(dto.userId, dto.code);
  }

  async get2FAStatus(dto: { userId: string }): Promise<IServiceResponse> {
    return this.twoFactorService.getTwoFactorStatus(dto.userId);
  }

  async regenerateBackupCodes(dto: { userId: string; code: string }): Promise<IServiceResponse> {
    return this.twoFactorService.regenerateBackupCodes(dto.userId, dto.code);
  }

  // ============================================
  // OAuth
  // ============================================

  async oauthLogin(dto: {
    provider: string;
    token: string;
    deviceInfo?: DeviceInfo;
  }): Promise<IServiceResponse<LoginResponse>> {
    try {
      // Verify OAuth token
      const oauthResult = await this.oauthService.verifyOAuthToken(
        dto.provider as 'google' | 'facebook' | 'apple',
        dto.token,
      );

      if (!oauthResult.success || !oauthResult.data) {
        return oauthResult as any;
      }

      // Find or create user
      const userResult = await this.oauthService.findOrCreateOAuthUser(oauthResult.data);
      if (!userResult.success || !userResult.data) {
        return userResult as any;
      }

      const { userId, isNewUser } = userResult.data;

      // Fetch full user data
      const fullUserResult = await firstValueFrom(
        this.usersClient.send(USERS_PATTERNS.GET_USER, { userId }).pipe(
          timeout(5000),
          catchError(() => of({ success: false })),
        ),
      );

      // Create session
      const sessionResult = await this.sessionService.createSession({
        userId,
        refreshToken: '',
        deviceInfo: dto.deviceInfo,
      });

      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as any;
      }

      // Generate tokens
      const tokenResult = await this.tokenService.generateTokenPair(
        userId,
        oauthResult.data.email || `oauth_${dto.provider}`,
        sessionResult.data.sessionId,
      );

      if (!tokenResult.success || !tokenResult.data) {
        return tokenResult as any;
      }

      // Update session
      await this.sessionService.updateSessionRefreshToken(
        sessionResult.data.sessionId,
        tokenResult.data.refreshToken,
      );

      return successResponse(
        {
          user: fullUserResult.success ? this.sanitizeUser(fullUserResult.data) : { id: userId },
          accessToken: tokenResult.data.accessToken,
          refreshToken: tokenResult.data.refreshToken,
          expiresIn: tokenResult.data.expiresIn,
          isNewUser,
        },
        SERVICES.AUTH_SERVICE,
      );
    } catch (error) {
      console.error('OAuth login error:', error);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, 'OAuth login failed', SERVICES.AUTH_SERVICE);
    }
  }

  async linkOAuthAccount(dto: {
    userId: string;
    provider: string;
    token: string;
  }): Promise<IServiceResponse> {
    return this.oauthService.linkOAuthAccount(dto.userId, dto.provider, dto.token);
  }

  async unlinkOAuthAccount(dto: { userId: string; provider: string }): Promise<IServiceResponse> {
    return this.oauthService.unlinkOAuthAccount(dto.userId, dto.provider);
  }

  // ============================================
  // Session Management
  // ============================================

  async getSessions(dto: { userId: string }): Promise<IServiceResponse> {
    return this.sessionService.getUserSessions(dto.userId);
  }

  async revokeSession(dto: { userId: string; sessionId: string }): Promise<IServiceResponse> {
    return this.sessionService.revokeSession(dto.userId, dto.sessionId, 'User revoked');
  }

  async revokeAllSessions(dto: {
    userId: string;
    exceptCurrent?: string;
  }): Promise<IServiceResponse> {
    return this.sessionService.revokeAllSessions(dto.userId, dto.exceptCurrent);
  }

  // ============================================
  // Password Management (for accounts with passwords)
  // ============================================

  async changePassword(dto: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<IServiceResponse> {
    try {
      // Delegate to Users service
      const result = await firstValueFrom(
        this.usersClient.send('users.password.change', dto).pipe(
          timeout(5000),
          catchError((err) =>
            of({
              success: false,
              error: { code: 'SERVICE_ERROR', message: err.message },
            }),
          ),
        ),
      );

      if (!result.success) {
        return result;
      }

      // Revoke all other sessions for security
      await this.sessionService.revokeAllSessions(dto.userId);

      return successResponse({ message: 'Password changed successfully' }, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Password change failed',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  async resetPassword(dto: {
    phoneNumber: string;
    newPassword: string;
    otp: string;
  }): Promise<IServiceResponse> {
    try {
      // Verify OTP first
      const otpResult = await this.otpService.verifyOtp({
        phoneNumber: dto.phoneNumber,
        code: dto.otp,
      });

      if (!otpResult.success) {
        return otpResult;
      }

      // Reset password via Users service
      const result = await firstValueFrom(
        this.usersClient
          .send('users.password.reset', {
            phoneNumber: dto.phoneNumber,
            newPassword: dto.newPassword,
          })
          .pipe(
            timeout(5000),
            catchError((err) =>
              of({
                success: false,
                error: { code: 'SERVICE_ERROR', message: err.message },
              }),
            ),
          ),
      );

      return result;
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Password reset failed',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async findOrCreateUser(
    phoneNumber: string,
  ): Promise<IServiceResponse<{ user: any; isNewUser: boolean }>> {
    try {
      // Try to find existing user
      const findResult = await firstValueFrom(
        this.usersClient.send(USERS_PATTERNS.GET_USER_BY_PHONE, { phoneNumber }).pipe(
          timeout(5000),
          catchError(() => of({ success: false, data: null })),
        ),
      );

      if (findResult.success && findResult.data) {
        return successResponse({ user: findResult.data, isNewUser: false }, SERVICES.AUTH_SERVICE);
      }

      // Create new user
      const createResult = await firstValueFrom(
        this.usersClient
          .send(USERS_PATTERNS.CREATE_USER, {
            phoneNumber,
            username: `user${Date.now()}`,
            displayName: phoneNumber,
          })
          .pipe(
            timeout(5000),
            catchError((err) =>
              of({
                success: false,
                error: { code: 'CREATE_FAILED', message: err.message },
              }),
            ),
          ),
      );

      if (!createResult.success) {
        return errorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          'Failed to create user',
          SERVICES.AUTH_SERVICE,
        );
      }

      return successResponse({ user: createResult.data, isNewUser: true }, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, 'User lookup failed', SERVICES.AUTH_SERVICE);
    }
  }

  private async updateUserStatus(userId: string, status: string): Promise<void> {
    try {
      await firstValueFrom(
        this.usersClient.send(USERS_PATTERNS.UPDATE_STATUS, { userId, status }).pipe(
          timeout(3000),
          catchError(() => of(null)),
        ),
      );
    } catch {
      // Non-critical, ignore errors
    }
  }

  private sanitizeUser(user: any): any {
    if (!user) {
      return null;
    }
    const { password, ...sanitized } = user.toObject ? user.toObject() : user;
    return sanitized;
  }
}
