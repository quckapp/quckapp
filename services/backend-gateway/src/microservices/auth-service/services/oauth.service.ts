import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import axios from 'axios';
import { SERVICES } from '../../../shared/constants/services';
import { USERS_PATTERNS } from '../../../shared/contracts/message-patterns';
import { IServiceResponse } from '../../../shared/interfaces/microservice.interface';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../../shared/utils/service-response.util';

export interface OAuthUserInfo {
  providerId: string;
  provider: string;
  email?: string;
  displayName?: string;
  avatar?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

interface FacebookUserInfo {
  id: string;
  email?: string;
  name: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface AppleUserInfo {
  sub: string;
  email?: string;
  name?: string;
}

@Injectable()
export class OAuthService {
  constructor(
    private configService: ConfigService,
    @Inject(SERVICES.USERS_SERVICE) private usersClient: ClientProxy,
  ) {}

  /**
   * Verify OAuth token and get user info
   */
  async verifyOAuthToken(
    provider: 'google' | 'facebook' | 'apple',
    token: string,
  ): Promise<IServiceResponse<OAuthUserInfo>> {
    try {
      let userInfo: OAuthUserInfo;

      switch (provider) {
        case 'google':
          userInfo = await this.verifyGoogleToken(token);
          break;
        case 'facebook':
          userInfo = await this.verifyFacebookToken(token);
          break;
        case 'apple':
          userInfo = await this.verifyAppleToken(token);
          break;
        default:
          return errorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            'Unsupported OAuth provider',
            SERVICES.AUTH_SERVICE,
          );
      }

      return successResponse(userInfo, SERVICES.AUTH_SERVICE);
    } catch (error: any) {
      console.error(`OAuth ${provider} verification error:`, error);
      return errorResponse(
        ERROR_CODES.UNAUTHORIZED,
        error.message || `Failed to verify ${provider} token`,
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Find or create user from OAuth info
   */
  async findOrCreateOAuthUser(
    oauthInfo: OAuthUserInfo,
  ): Promise<IServiceResponse<{ userId: string; isNewUser: boolean }>> {
    try {
      // First, try to find user by OAuth provider
      const findResult = await firstValueFrom(
        this.usersClient
          .send(USERS_PATTERNS.GET_USER, {
            oauthProvider: oauthInfo.provider,
            oauthProviderId: oauthInfo.providerId,
          })
          .pipe(timeout(5000)),
      );

      if (findResult.success && findResult.data) {
        return successResponse(
          { userId: findResult.data._id || findResult.data.id, isNewUser: false },
          SERVICES.AUTH_SERVICE,
        );
      }

      // If not found by OAuth, try by email
      if (oauthInfo.email) {
        const emailResult = await firstValueFrom(
          this.usersClient
            .send(USERS_PATTERNS.GET_USER, { email: oauthInfo.email })
            .pipe(timeout(5000)),
        );

        if (emailResult.success && emailResult.data) {
          // Link OAuth to existing user
          await firstValueFrom(
            this.usersClient
              .send(USERS_PATTERNS.UPDATE_USER, {
                userId: emailResult.data._id || emailResult.data.id,
                oauthProvider: {
                  provider: oauthInfo.provider,
                  providerId: oauthInfo.providerId,
                  email: oauthInfo.email,
                },
              })
              .pipe(timeout(5000)),
          );

          return successResponse(
            { userId: emailResult.data._id || emailResult.data.id, isNewUser: false },
            SERVICES.AUTH_SERVICE,
          );
        }
      }

      // Create new user
      const createResult = await firstValueFrom(
        this.usersClient
          .send(USERS_PATTERNS.CREATE_USER, {
            phoneNumber: `oauth_${oauthInfo.provider}_${oauthInfo.providerId}`,
            email: oauthInfo.email,
            displayName: oauthInfo.displayName || `User${Date.now()}`,
            username: this.generateUsername(oauthInfo.displayName),
            avatar: oauthInfo.avatar,
            isVerified: true,
            oauthProviders: [
              {
                provider: oauthInfo.provider,
                providerId: oauthInfo.providerId,
                email: oauthInfo.email,
              },
            ],
          })
          .pipe(timeout(5000)),
      );

      if (!createResult.success) {
        return errorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          'Failed to create user account',
          SERVICES.AUTH_SERVICE,
        );
      }

      return successResponse(
        { userId: createResult.data._id || createResult.data.id, isNewUser: true },
        SERVICES.AUTH_SERVICE,
      );
    } catch (error: any) {
      console.error('OAuth user creation error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to process OAuth login',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(
    userId: string,
    provider: string,
    token: string,
  ): Promise<IServiceResponse<void>> {
    try {
      const oauthResult = await this.verifyOAuthToken(provider as any, token);
      if (!oauthResult.success || !oauthResult.data) {
        return oauthResult as any;
      }

      const updateResult = await firstValueFrom(
        this.usersClient
          .send(USERS_PATTERNS.UPDATE_USER, {
            userId,
            oauthProvider: {
              provider: oauthResult.data.provider,
              providerId: oauthResult.data.providerId,
              email: oauthResult.data.email,
            },
          })
          .pipe(timeout(5000)),
      );

      if (!updateResult.success) {
        return errorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          'Failed to link OAuth account',
          SERVICES.AUTH_SERVICE,
        );
      }

      return successResponse(undefined, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to link OAuth account',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Unlink OAuth account from user
   */
  async unlinkOAuthAccount(userId: string, provider: string): Promise<IServiceResponse<void>> {
    try {
      const result = await firstValueFrom(
        this.usersClient
          .send(USERS_PATTERNS.UPDATE_USER, {
            userId,
            unlinkOAuthProvider: provider,
          })
          .pipe(timeout(5000)),
      );

      if (!result.success) {
        return errorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          'Failed to unlink OAuth account',
          SERVICES.AUTH_SERVICE,
        );
      }

      return successResponse(undefined, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to unlink OAuth account',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  // ============================================
  // Provider-specific verification
  // ============================================

  private async verifyGoogleToken(token: string): Promise<OAuthUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { id, email, name, picture } = response.data;

      return {
        providerId: id,
        provider: 'google',
        email,
        displayName: name,
        avatar: picture,
      };
    } catch (error: any) {
      throw new Error('Invalid Google token');
    }
  }

  private async verifyFacebookToken(token: string): Promise<OAuthUserInfo> {
    try {
      const response = await axios.get<FacebookUserInfo>('https://graph.facebook.com/me', {
        params: {
          access_token: token,
          fields: 'id,email,name,picture.type(large)',
        },
      });

      const { id, email, name, picture } = response.data;

      return {
        providerId: id,
        provider: 'facebook',
        email,
        displayName: name,
        avatar: picture?.data?.url,
      };
    } catch (error: any) {
      throw new Error('Invalid Facebook token');
    }
  }

  private async verifyAppleToken(token: string): Promise<OAuthUserInfo> {
    // Apple Sign In requires JWT verification
    // For simplicity, we decode the identity token
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid Apple token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) as AppleUserInfo;

      return {
        providerId: payload.sub,
        provider: 'apple',
        email: payload.email,
        displayName: payload.name || undefined,
      };
    } catch (error: any) {
      throw new Error('Invalid Apple token');
    }
  }

  // ============================================
  // Helper methods
  // ============================================

  private generateUsername(displayName?: string): string {
    const base = displayName ? displayName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user';
    const suffix = Math.floor(Math.random() * 10000);
    return `${base}${suffix}`;
  }
}
