import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TwoFactorSecret, TwoFactorSecretDocument } from '../schemas/two-factor.schema';
import { IServiceResponse } from '../../../shared/interfaces/microservice.interface';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../../shared/utils/service-response.util';
import { SERVICES } from '../../../shared/constants/services';

interface EnableTwoFactorResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

@Injectable()
export class TwoFactorAuthService {
  private readonly encryptionKey: string;
  private readonly appName: string;

  constructor(
    @InjectModel(TwoFactorSecret.name) private twoFactorModel: Model<TwoFactorSecretDocument>,
    private configService: ConfigService,
  ) {
    this.encryptionKey =
      this.configService.get('ENCRYPTION_KEY') || 'default-encryption-key-32-chars!';
    this.appName = this.configService.get('APP_NAME') || 'QuickChat';
  }

  /**
   * Check if 2FA is enabled for user
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const record = await this.twoFactorModel.findOne({ userId, isEnabled: true });
    return !!record;
  }

  /**
   * Enable 2FA for user
   */
  async enableTwoFactor(
    userId: string,
    method: 'totp' | 'sms' | 'email' = 'totp',
    identifier?: string, // phone for SMS, email for email
  ): Promise<IServiceResponse<EnableTwoFactorResult>> {
    try {
      // Check if already enabled
      const existing = await this.twoFactorModel.findOne({ userId });
      if (existing?.isEnabled) {
        return errorResponse(
          ERROR_CODES.CONFLICT,
          'Two-factor authentication is already enabled',
          SERVICES.AUTH_SERVICE,
        );
      }

      // Generate secret for TOTP
      const secret = this.generateSecret();
      const encryptedSecret = this.encrypt(secret);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(8);
      const encryptedBackupCodes = backupCodes.map((code) => this.encrypt(code));

      // Create or update 2FA record
      await this.twoFactorModel.findOneAndUpdate(
        { userId },
        {
          userId,
          secret: encryptedSecret,
          method,
          isEnabled: false, // Not enabled until verified
          backupCodes: encryptedBackupCodes,
          recoveryEmail: method === 'email' ? identifier : undefined,
          recoveryPhone: method === 'sms' ? identifier : undefined,
        },
        { upsert: true, new: true },
      );

      // Generate QR code URL for TOTP
      const qrCodeUrl = this.generateTotpUri(secret, userId);

      return successResponse(
        {
          secret,
          qrCodeUrl,
          backupCodes,
        },
        SERVICES.AUTH_SERVICE,
      );
    } catch (error) {
      console.error('Enable 2FA error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to enable two-factor authentication',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Verify and activate 2FA
   */
  async verifyAndActivate(userId: string, code: string): Promise<IServiceResponse<void>> {
    try {
      const record = await this.twoFactorModel.findOne({ userId });

      if (!record) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Two-factor setup not found. Please start the setup process again.',
          SERVICES.AUTH_SERVICE,
        );
      }

      if (record.isEnabled) {
        return errorResponse(
          ERROR_CODES.CONFLICT,
          'Two-factor authentication is already active',
          SERVICES.AUTH_SERVICE,
        );
      }

      // Verify the code
      const secret = this.decrypt(record.secret);
      const isValid = this.verifyTotp(secret, code);

      if (!isValid) {
        return errorResponse(
          ERROR_CODES.TWO_FACTOR_INVALID,
          'Invalid verification code',
          SERVICES.AUTH_SERVICE,
        );
      }

      // Activate 2FA
      record.isEnabled = true;
      record.enabledAt = new Date();
      await record.save();

      return successResponse(undefined, SERVICES.AUTH_SERVICE);
    } catch (error) {
      console.error('Verify 2FA error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to verify two-factor code',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Verify 2FA code for login
   */
  async verifyTwoFactorCode(
    userId: string,
    code: string,
  ): Promise<IServiceResponse<{ verified: boolean }>> {
    try {
      const record = await this.twoFactorModel.findOne({ userId, isEnabled: true });

      if (!record) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Two-factor authentication is not enabled',
          SERVICES.AUTH_SERVICE,
        );
      }

      // First try TOTP verification
      const secret = this.decrypt(record.secret);
      let isValid = this.verifyTotp(secret, code);

      // If TOTP fails, check backup codes
      if (!isValid) {
        const backupCodeIndex = record.backupCodes.findIndex(
          (encryptedCode) => this.decrypt(encryptedCode) === code,
        );

        if (backupCodeIndex !== -1) {
          // Remove used backup code
          record.backupCodes.splice(backupCodeIndex, 1);
          await record.save();
          isValid = true;
        }
      }

      if (!isValid) {
        return errorResponse(
          ERROR_CODES.TWO_FACTOR_INVALID,
          'Invalid two-factor authentication code',
          SERVICES.AUTH_SERVICE,
        );
      }

      // Update last used
      record.lastUsedAt = new Date();
      await record.save();

      return successResponse({ verified: true }, SERVICES.AUTH_SERVICE);
    } catch (error) {
      console.error('Verify 2FA login error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to verify two-factor code',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Disable 2FA
   */
  async disableTwoFactor(userId: string, code: string): Promise<IServiceResponse<void>> {
    try {
      // Verify code first
      const verification = await this.verifyTwoFactorCode(userId, code);
      if (!verification.success) {
        return verification as any;
      }

      await this.twoFactorModel.deleteOne({ userId });

      return successResponse(undefined, SERVICES.AUTH_SERVICE);
    } catch (error) {
      console.error('Disable 2FA error:', error);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to disable two-factor authentication',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<IServiceResponse<string[]>> {
    try {
      // Verify current code first
      const verification = await this.verifyTwoFactorCode(userId, code);
      if (!verification.success) {
        return verification as any;
      }

      const record = await this.twoFactorModel.findOne({ userId, isEnabled: true });
      if (!record) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Two-factor authentication is not enabled',
          SERVICES.AUTH_SERVICE,
        );
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes(8);
      record.backupCodes = backupCodes.map((code) => this.encrypt(code));
      await record.save();

      return successResponse(backupCodes, SERVICES.AUTH_SERVICE);
    } catch (error) {
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to regenerate backup codes',
        SERVICES.AUTH_SERVICE,
      );
    }
  }

  /**
   * Get 2FA status for user
   */
  async getTwoFactorStatus(userId: string): Promise<
    IServiceResponse<{
      isEnabled: boolean;
      method?: string;
      backupCodesRemaining?: number;
      enabledAt?: Date;
    }>
  > {
    const record = await this.twoFactorModel.findOne({ userId });

    if (!record || !record.isEnabled) {
      return successResponse({ isEnabled: false }, SERVICES.AUTH_SERVICE);
    }

    return successResponse(
      {
        isEnabled: true,
        method: record.method,
        backupCodesRemaining: record.backupCodes.length,
        enabledAt: record.enabledAt,
      },
      SERVICES.AUTH_SERVICE,
    );
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Generate a random secret for TOTP
   */
  private generateSecret(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  /**
   * Generate TOTP URI for QR code
   */
  private generateTotpUri(secret: string, userId: string): string {
    const base32Secret = this.hexToBase32(secret);
    return `otpauth://totp/${encodeURIComponent(this.appName)}:${encodeURIComponent(userId)}?secret=${base32Secret}&issuer=${encodeURIComponent(this.appName)}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Verify TOTP code
   * Simple implementation - in production, use a library like 'otplib'
   */
  private verifyTotp(secret: string, code: string): boolean {
    // Generate codes for current and adjacent time windows (30s each)
    const timeWindows = [-1, 0, 1];
    const currentTime = Math.floor(Date.now() / 1000 / 30);

    for (const offset of timeWindows) {
      const expectedCode = this.generateTotp(secret, currentTime + offset);
      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate TOTP code for a given time window
   */
  private generateTotp(secret: string, timeCounter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(timeCounter));

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(buffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Encrypt string
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt string
   */
  private decrypt(text: string): string {
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Convert hex to base32 (for QR code)
   */
  private hexToBase32(hex: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const buffer = Buffer.from(hex, 'hex');
    let bits = '';
    for (const byte of buffer) {
      bits += byte.toString(2).padStart(8, '0');
    }
    let base32 = '';
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.slice(i, i + 5).padEnd(5, '0');
      base32 += alphabet[parseInt(chunk, 2)];
    }
    return base32;
  }
}
