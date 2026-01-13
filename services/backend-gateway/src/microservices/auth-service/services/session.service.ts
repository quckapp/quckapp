import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Session, SessionDocument } from '../schemas/session.schema';
import { IServiceResponse } from '../../../shared/interfaces/microservice.interface';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../../shared/utils/service-response.util';
import { SERVICES } from '../../../shared/constants/services';

export interface DeviceInfo {
  deviceId?: string;
  deviceType: string;
  deviceName?: string;
  os?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  userAgent?: string;
}

export interface CreateSessionOptions {
  userId: string;
  refreshToken: string;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
}

@Injectable()
export class SessionService {
  private readonly sessionExpiryDays: number;

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private configService: ConfigService,
  ) {
    this.sessionExpiryDays = parseInt(this.configService.get('SESSION_EXPIRY_DAYS') || '30', 10);
  }

  /**
   * Create a new session
   */
  async createSession(
    options: CreateSessionOptions,
  ): Promise<IServiceResponse<{ sessionId: string }>> {
    try {
      const { userId, refreshToken, deviceInfo, ipAddress } = options;

      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.sessionExpiryDays);

      // Check if device already has an active session
      if (deviceInfo?.deviceId) {
        const existingSession = await this.sessionModel.findOne({
          userId,
          'deviceInfo.deviceId': deviceInfo.deviceId,
          isActive: true,
        });

        if (existingSession) {
          // Update existing session instead of creating new one
          existingSession.refreshToken = refreshToken;
          existingSession.lastActiveAt = new Date();
          existingSession.expiresAt = expiresAt;
          existingSession.ipAddress = ipAddress || existingSession.ipAddress;
          if (deviceInfo.pushToken) {
            existingSession.deviceInfo.pushToken = deviceInfo.pushToken;
          }
          await existingSession.save();

          return successResponse({ sessionId: existingSession.sessionId }, SERVICES.AUTH_SERVICE);
        }
      }

      // Create new session
      const session = new this.sessionModel({
        userId,
        sessionId,
        refreshToken,
        deviceInfo: deviceInfo || { deviceType: 'unknown' },
        ipAddress,
        expiresAt,
        lastActiveAt: new Date(),
      });

      await session.save();

      return successResponse({ sessionId }, SERVICES.AUTH_SERVICE);
    } catch (error) {
      console.error('Session creation error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to create session',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<IServiceResponse<SessionDocument | null>> {
    try {
      const session = await this.sessionModel.findOne({
        sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      return successResponse(session, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to get session',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Get session by refresh token
   */
  async getSessionByRefreshToken(
    refreshToken: string,
  ): Promise<IServiceResponse<SessionDocument | null>> {
    try {
      const session = await this.sessionModel.findOne({
        refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      return successResponse(session, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to get session',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<IServiceResponse<SessionDocument[]>> {
    try {
      const sessions = await this.sessionModel
        .find({
          userId,
          isActive: true,
          expiresAt: { $gt: new Date() },
        })
        .sort({ lastActiveAt: -1 });

      return successResponse(sessions, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to get user sessions',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Update session last active time
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne({ sessionId }, { $set: { lastActiveAt: new Date() } });
  }

  /**
   * Update session refresh token (token rotation)
   */
  async updateSessionRefreshToken(
    sessionId: string,
    newRefreshToken: string,
  ): Promise<IServiceResponse<void>> {
    try {
      const result = await this.sessionModel.updateOne(
        { sessionId, isActive: true },
        {
          $set: {
            refreshToken: newRefreshToken,
            lastActiveAt: new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Session not found', SERVICES.AUTH_SERVICE);
      }

      return successResponse(undefined, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to update session',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    reason?: string,
  ): Promise<IServiceResponse<void>> {
    try {
      const result = await this.sessionModel.updateOne(
        { userId, sessionId, isActive: true },
        {
          $set: {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: reason || 'User requested',
          },
        },
      );

      if (result.matchedCount === 0) {
        return errorResponse(ERROR_CODES.NOT_FOUND, 'Session not found', SERVICES.AUTH_SERVICE);
      }

      return successResponse(undefined, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to revoke session',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Revoke all sessions for a user (except current if specified)
   */
  async revokeAllSessions(
    userId: string,
    exceptSessionId?: string,
  ): Promise<IServiceResponse<{ revokedCount: number }>> {
    try {
      const query: any = { userId, isActive: true };
      if (exceptSessionId) {
        query.sessionId = { $ne: exceptSessionId };
      }

      const result = await this.sessionModel.updateMany(query, {
        $set: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'User revoked all sessions',
        },
      });

      return successResponse({ revokedCount: result.modifiedCount }, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to revoke sessions',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Get session count for user
   */
  async getSessionCount(userId: string): Promise<number> {
    return this.sessionModel.countDocuments({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Cleanup expired sessions (for scheduler)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionModel.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { isActive: false, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // 30 days old revoked
      ],
    });
    return result.deletedCount;
  }
}
