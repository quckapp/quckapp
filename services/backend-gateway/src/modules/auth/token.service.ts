import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// In-memory blacklist for development (use Redis in production)
interface BlacklistedToken {
  token: string;
  expiresAt: Date;
  reason: string;
  userId: string;
}

interface ActiveSession {
  sessionId: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface TokenPayload {
  sub: string;
  phoneNumber: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  private blacklistedTokens: Map<string, BlacklistedToken> = new Map();
  private activeSessions: Map<string, ActiveSession> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  async generateTokenPair(
    userId: string,
    phoneNumber: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const sessionId = this.generateSessionId();

    const payload: TokenPayload = {
      sub: userId,
      phoneNumber,
      sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    // Track active session
    const expiresIn = this.parseExpiration(
      this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    );
    this.activeSessions.set(sessionId, {
      sessionId,
      userId,
      deviceInfo: deviceInfo || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + expiresIn),
    });

    return { accessToken, refreshToken, sessionId };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      if (this.isTokenBlacklisted(token)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Update session activity
      if (payload.sessionId) {
        this.updateSessionActivity(payload.sessionId);
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      if (this.isTokenBlacklisted(token)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async refreshTokens(
    refreshToken: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);

    // Blacklist the old refresh token (rotation)
    await this.blacklistToken(refreshToken, payload.sub, 'Token rotation');

    // Generate new token pair
    return this.generateTokenPair(payload.sub, payload.phoneNumber, deviceInfo, ipAddress);
  }

  async blacklistToken(token: string, userId: string, reason: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as TokenPayload;
      const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      this.blacklistedTokens.set(token, {
        token,
        expiresAt,
        reason,
        userId,
      });

      // If token has a session, invalidate it
      if (decoded?.sessionId) {
        this.activeSessions.delete(decoded.sessionId);
      }
    } catch (error) {
      // Token might be invalid, but still blacklist it
      this.blacklistedTokens.set(token, {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason,
        userId,
      });
    }
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    const decoded = this.jwtService.decode(accessToken) as TokenPayload;
    const userId = decoded?.sub || 'unknown';

    await this.blacklistToken(accessToken, userId, 'User logout');

    if (refreshToken) {
      await this.blacklistToken(refreshToken, userId, 'User logout');
    }
  }

  async logoutAllDevices(userId: string): Promise<number> {
    let count = 0;

    // Remove all sessions for this user
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId === userId) {
        this.activeSessions.delete(sessionId);
        count++;
      }
    }

    return count;
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);

    if (session && session.userId === userId) {
      this.activeSessions.delete(sessionId);
      return true;
    }

    return false;
  }

  async getActiveSessions(userId: string): Promise<ActiveSession[]> {
    const sessions: ActiveSession[] = [];

    for (const session of this.activeSessions.values()) {
      if (session.userId === userId && session.expiresAt > new Date()) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      return this.jwtService.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  isTokenBlacklisted(token: string): boolean {
    const blacklisted = this.blacklistedTokens.get(token);
    if (!blacklisted) {
      return false;
    }

    // Check if blacklist entry is still valid
    if (blacklisted.expiresAt < new Date()) {
      this.blacklistedTokens.delete(token);
      return false;
    }

    return true;
  }

  private updateSessionActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    } // Default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();

    // Clean up blacklisted tokens
    for (const [token, entry] of this.blacklistedTokens) {
      if (entry.expiresAt < now) {
        this.blacklistedTokens.delete(token);
      }
    }

    // Clean up expired sessions
    for (const [sessionId, session] of this.activeSessions) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}
