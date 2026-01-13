import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IServiceResponse } from '../../../shared/interfaces/microservice.interface';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../../shared/utils/service-response.util';
import { SERVICES } from '../../../shared/constants/services';

export interface TokenPayload {
  userId: string;
  phoneNumber: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.accessTokenExpiry = this.configService.get('JWT_EXPIRES_IN') || '1h';
    this.refreshTokenExpiry = this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
    this.jwtSecret = this.configService.get('JWT_SECRET') || 'your-super-secret-jwt-key';
    this.refreshSecret = this.configService.get('JWT_REFRESH_SECRET') || 'your-refresh-secret-key';
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(
    userId: string,
    phoneNumber: string,
    sessionId: string,
  ): Promise<IServiceResponse<TokenPair>> {
    try {
      const accessPayload: TokenPayload = {
        userId,
        phoneNumber,
        sessionId,
        type: 'access',
      };

      const refreshPayload: TokenPayload = {
        userId,
        phoneNumber,
        sessionId,
        type: 'refresh',
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(accessPayload, {
          secret: this.jwtSecret,
          expiresIn: this.accessTokenExpiry,
        }),
        this.jwtService.signAsync(refreshPayload, {
          secret: this.refreshSecret,
          expiresIn: this.refreshTokenExpiry,
        }),
      ]);

      // Calculate expiry times in seconds
      const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiry);
      const refreshExpiresIn = this.parseExpiryToSeconds(this.refreshTokenExpiry);

      return successResponse(
        {
          accessToken,
          refreshToken,
          expiresIn,
          refreshExpiresIn,
        },
        SERVICES.AUTH_SERVICE,
      );
    } catch (error) {
      console.error('Token generation error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to generate tokens',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<IServiceResponse<TokenPayload>> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return errorResponse(
          ERROR_CODES.TOKEN_INVALID,
          'Token has been revoked',
          SERVICES.AUTH_SERVICE,
        );
      }

      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.jwtSecret,
      });

      if (payload.type !== 'access') {
        return errorResponse(
          ERROR_CODES.TOKEN_INVALID,
          'Invalid token type',
          SERVICES.AUTH_SERVICE,
        );
      }

      return successResponse(payload, SERVICES.AUTH_SERVICE);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return errorResponse(ERROR_CODES.TOKEN_EXPIRED, 'Token has expired', SERVICES.AUTH_SERVICE);
      }
      return errorResponse(ERROR_CODES.TOKEN_INVALID, 'Invalid token', SERVICES.AUTH_SERVICE);
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<IServiceResponse<TokenPayload>> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return errorResponse(
          ERROR_CODES.TOKEN_INVALID,
          'Refresh token has been revoked',
          SERVICES.AUTH_SERVICE,
        );
      }

      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.refreshSecret,
      });

      if (payload.type !== 'refresh') {
        return errorResponse(
          ERROR_CODES.TOKEN_INVALID,
          'Invalid token type',
          SERVICES.AUTH_SERVICE,
        );
      }

      return successResponse(payload, SERVICES.AUTH_SERVICE);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return errorResponse(
          ERROR_CODES.TOKEN_EXPIRED,
          'Refresh token has expired',
          SERVICES.AUTH_SERVICE,
        );
      }
      return errorResponse(
        ERROR_CODES.TOKEN_INVALID,
        'Invalid refresh token',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<IServiceResponse<TokenPair>> {
    const validation = await this.validateRefreshToken(refreshToken);

    if (!validation.success || !validation.data) {
      return validation as any;
    }

    const { userId, phoneNumber, sessionId } = validation.data;

    // Blacklist old refresh token (rotate tokens)
    await this.blacklistToken(refreshToken);

    // Generate new token pair
    return this.generateTokenPair(userId, phoneNumber, sessionId);
  }

  /**
   * Blacklist a token (for logout or token rotation)
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      // Decode token to get expiry time
      const decoded = this.jwtService.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = (decoded.exp * 1000 - Date.now()) / 1000;
        if (ttl > 0) {
          const key = `blacklist:${this.hashToken(token)}`;
          await this.cacheManager.set(key, true, Math.ceil(ttl) * 1000);
        }
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${this.hashToken(token)}`;
    const result = await this.cacheManager.get(key);
    return !!result;
  }

  /**
   * Decode token without verification (for reading payload)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return this.jwtService.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600;
    } // Default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }

  /**
   * Simple hash for token (for cache key)
   */
  private hashToken(token: string): string {
    // Use last 32 chars of token as hash (simpler than crypto)
    return token.slice(-32);
  }
}
