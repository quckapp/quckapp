import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { UserSettings, UserSettingsDocument } from '../users/schemas/user-settings.schema';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectModel(UserSettings.name) private userSettingsModel: Model<UserSettingsDocument>,
  ) {}

  // Generate a random secret for TOTP
  generateSecret(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  // Generate backup codes
  generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Generate TOTP code based on secret and time
  generateTOTP(secret: string, timeStep: number = 30): string {
    const time = Math.floor(Date.now() / 1000 / timeStep);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const code =
      (((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)) %
      1000000;

    return code.toString().padStart(6, '0');
  }

  // Verify TOTP code (checks current and previous time window)
  verifyTOTP(secret: string, code: string, timeStep: number = 30): boolean {
    const currentCode = this.generateTOTP(secret, timeStep);

    // Also check previous time step for clock drift tolerance
    const time = Math.floor(Date.now() / 1000 / timeStep) - 1;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const prevCode =
      (((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)) %
      1000000;

    const previousCode = prevCode.toString().padStart(6, '0');

    return code === currentCode || code === previousCode;
  }

  // Initialize 2FA for a user
  async initializeTwoFactor(userId: string): Promise<{ secret: string; backupCodes: string[] }> {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();

    // Store temporarily (will be confirmed when user verifies)
    await this.userSettingsModel.findOneAndUpdate(
      { userId },
      {
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
      },
      { upsert: true },
    );

    return { secret, backupCodes };
  }

  // Enable 2FA after verification
  async enableTwoFactor(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const settings = await this.userSettingsModel.findOne({ userId });

    if (!settings || !settings.twoFactorSecret) {
      throw new BadRequestException('2FA not initialized. Please call setup first.');
    }

    const isValid = this.verifyTOTP(settings.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    settings.twoFactorAuth = true;
    settings.twoFactorEnabledAt = new Date();
    await settings.save();

    return { backupCodes: settings.twoFactorBackupCodes };
  }

  // Disable 2FA
  async disableTwoFactor(userId: string, code: string): Promise<void> {
    const settings = await this.userSettingsModel.findOne({ userId });

    if (!settings || !settings.twoFactorAuth) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = this.verifyTOTP(settings.twoFactorSecret, code);
    if (!isValid) {
      // Check backup codes
      const isBackupCode = settings.twoFactorBackupCodes.includes(code);
      if (!isBackupCode) {
        throw new BadRequestException('Invalid verification code');
      }
    }

    settings.twoFactorAuth = false;
    settings.twoFactorSecret = null as any;
    settings.twoFactorBackupCodes = [];
    settings.twoFactorEnabledAt = null as any;
    await settings.save();
  }

  // Verify 2FA code during login
  async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    const settings = await this.userSettingsModel.findOne({ userId });

    if (!settings || !settings.twoFactorAuth) {
      return true; // 2FA not enabled, allow login
    }

    // First try TOTP
    const isValidTOTP = this.verifyTOTP(settings.twoFactorSecret, code);
    if (isValidTOTP) {
      return true;
    }

    // Check backup codes
    const backupCodeIndex = settings.twoFactorBackupCodes.indexOf(code);
    if (backupCodeIndex !== -1) {
      // Remove used backup code
      settings.twoFactorBackupCodes.splice(backupCodeIndex, 1);
      await settings.save();
      return true;
    }

    return false;
  }

  // Check if user has 2FA enabled
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const settings = await this.userSettingsModel.findOne({ userId });
    return settings?.twoFactorAuth ?? false;
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    const settings = await this.userSettingsModel.findOne({ userId });

    if (!settings || !settings.twoFactorAuth) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = this.verifyTOTP(settings.twoFactorSecret, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const newBackupCodes = this.generateBackupCodes();
    settings.twoFactorBackupCodes = newBackupCodes;
    await settings.save();

    return newBackupCodes;
  }
}
