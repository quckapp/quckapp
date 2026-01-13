import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { OtpRecord, OtpRecordDocument } from '../schemas/otp.schema';
import { IServiceResponse } from '../../../shared/interfaces/microservice.interface';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../../shared/utils/service-response.util';
import { SERVICES } from '../../../shared/constants/services';
import { SmsService } from '../../../common/services/sms.service';

interface SendOtpOptions {
  phoneNumber: string;
  channel?: 'sms' | 'whatsapp' | 'email';
  ipAddress?: string;
  userAgent?: string;
}

interface VerifyOtpOptions {
  phoneNumber: string;
  code: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpLength = 6;
  private readonly otpExpiryMinutes = 5;
  private readonly maxAttempts = 3;
  private readonly rateLimitMinutes = 1; // Minimum time between OTP requests

  constructor(
    @InjectModel(OtpRecord.name) private otpModel: Model<OtpRecordDocument>,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private smsService: SmsService,
  ) {}

  /**
   * Generate and send OTP to phone number
   */
  async sendOtp(
    options: SendOtpOptions,
  ): Promise<IServiceResponse<{ message: string; otp?: string }>> {
    const { phoneNumber, channel = 'sms', ipAddress, userAgent } = options;

    try {
      // Check rate limiting
      const rateLimitKey = `otp_rate:${phoneNumber}`;
      const lastRequest = await this.cacheManager.get<number>(rateLimitKey);

      if (lastRequest) {
        const timeSinceLastRequest = Date.now() - lastRequest;
        const waitTime = this.rateLimitMinutes * 60 * 1000 - timeSinceLastRequest;

        if (waitTime > 0) {
          return errorResponse(
            ERROR_CODES.OTP_RATE_LIMITED,
            `Please wait ${Math.ceil(waitTime / 1000)} seconds before requesting another OTP`,
            SERVICES.AUTH_SERVICE,
          );
        }
      }

      // Generate OTP
      const code = this.generateOtp();
      const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

      // Invalidate any existing OTPs for this phone number
      await this.otpModel.updateMany(
        { phoneNumber, isVerified: false },
        { $set: { expiresAt: new Date() } },
      );

      // Create new OTP record
      const otpRecord = new this.otpModel({
        phoneNumber,
        code,
        channel,
        expiresAt,
        maxAttempts: this.maxAttempts,
        ipAddress,
        userAgent,
      });

      await otpRecord.save();

      // Set rate limit
      await this.cacheManager.set(rateLimitKey, Date.now(), this.rateLimitMinutes * 60 * 1000);

      // In production, send OTP via SMS/WhatsApp service
      // For now, we'll use a placeholder
      await this.deliverOtp(phoneNumber, code, channel);

      // Return OTP in response for testing (remove in production with SMS integration)
      // TODO: Remove otp from response once SMS provider is integrated
      return successResponse(
        {
          message: 'OTP sent successfully',
          otp: code, // Temporary: always return OTP until SMS provider is integrated
        },
        SERVICES.AUTH_SERVICE,
      );
    } catch (error) {
      console.error('OTP send error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to send OTP',
        SERVICES.AUTH_SERVICE,
        { error: (error as Error).message },
      );
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(options: VerifyOtpOptions): Promise<IServiceResponse<{ verified: boolean }>> {
    const { phoneNumber, code } = options;

    try {
      // Find the latest unverified OTP for this phone number
      const otpRecord = await this.otpModel
        .findOne({
          phoneNumber,
          isVerified: false,
          expiresAt: { $gt: new Date() },
        })
        .sort({ createdAt: -1 });

      if (!otpRecord) {
        return errorResponse(
          ERROR_CODES.OTP_EXPIRED,
          'OTP not found or has expired. Please request a new OTP.',
          SERVICES.AUTH_SERVICE,
        );
      }

      // Check if max attempts exceeded
      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        await this.otpModel.deleteOne({ _id: otpRecord._id });
        return errorResponse(
          ERROR_CODES.OTP_INVALID,
          'Maximum verification attempts exceeded. Please request a new OTP.',
          SERVICES.AUTH_SERVICE,
        );
      }

      // Verify code
      if (otpRecord.code !== code) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts;
        return errorResponse(
          ERROR_CODES.OTP_INVALID,
          `Invalid OTP code. ${remainingAttempts} attempts remaining.`,
          SERVICES.AUTH_SERVICE,
        );
      }

      // Mark as verified
      otpRecord.isVerified = true;
      otpRecord.verifiedAt = new Date();
      await otpRecord.save();

      return successResponse({ verified: true }, SERVICES.AUTH_SERVICE);
    } catch (error) {
      console.error('OTP verify error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to verify OTP',
        SERVICES.AUTH_SERVICE,
        { error: (error as Error).message },
      );
    }
  }

  /**
   * Generate random OTP code
   */
  private generateOtp(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Deliver OTP via specified channel
   * Uses Twilio SMS service for production
   */
  private async deliverOtp(phoneNumber: string, code: string, channel: string): Promise<boolean> {
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';

    this.logger.log(`[OTP Service] Sending OTP to ${phoneNumber} via ${channel}`);

    switch (channel) {
      case 'sms':
        // Use Twilio SMS service
        const smsResult = await this.smsService.sendOtp(phoneNumber, code);
        if (smsResult.success) {
          this.logger.log(`[OTP Service] SMS sent successfully to ${phoneNumber}`);
          return true;
        } else {
          this.logger.warn(`[OTP Service] SMS failed for ${phoneNumber}: ${smsResult.message}`);
          // In development, still return true to allow testing
          if (isDevelopment) {
            this.logger.log(`[OTP Service] Development mode - OTP: ${code}`);
            return true;
          }
          return false;
        }

      case 'whatsapp':
        // WhatsApp integration can be added here using Twilio WhatsApp API
        this.logger.log(`[OTP Service] WhatsApp not yet implemented, falling back to SMS`);
        return this.deliverOtp(phoneNumber, code, 'sms');

      case 'email':
        // Email integration can be added here
        this.logger.warn(`[OTP Service] Email OTP not implemented for phone: ${phoneNumber}`);
        return false;

      default:
        this.logger.warn(`[OTP Service] Unknown channel: ${channel}`);
        return false;
    }
  }

  /**
   * Cleanup expired OTPs (can be called by scheduler)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.otpModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}
