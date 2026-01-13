import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';

interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
}

@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 12;
  private readonly MIN_PASSWORD_LENGTH = 8;
  private readonly MAX_PASSWORD_LENGTH = 128;
  private resetTokens: Map<string, PasswordResetToken> = new Map();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  async hashPassword(password: string): Promise<string> {
    this.validatePasswordStrength(password);
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is same as current
    const isSamePassword = await this.verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Validate and hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update user password
    await this.usersService.updateProfile(userId, { password: hashedPassword } as any);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async setPassword(
    userId: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // This is for OAuth users who don't have a password yet
    if (user.password && user.password !== '') {
      // Check if it's a real password (not a placeholder)
      const isPlaceholder = user.password.length < 20; // bcrypt hashes are longer
      if (!isPlaceholder) {
        throw new BadRequestException('Password already set. Use change password instead.');
      }
    }

    const hashedPassword = await this.hashPassword(password);
    await this.usersService.updateProfile(userId, { password: hashedPassword } as any);

    return {
      success: true,
      message: 'Password set successfully',
    };
  }

  async initiatePasswordReset(
    phoneNumber?: string,
    email?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!phoneNumber && !email) {
      throw new BadRequestException('Phone number or email is required');
    }

    let user;
    if (phoneNumber) {
      user = await this.usersService.findByPhoneNumber(phoneNumber);
    } else if (email) {
      user = await this.usersService.findByEmail(email);
    }

    // Don't reveal if user exists
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this information, a reset link will be sent',
      };
    }

    // Generate reset token
    const resetToken = this.generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    this.resetTokens.set(resetToken, {
      token: resetToken,
      userId: user._id.toString(),
      expiresAt,
      used: false,
    });

    // In production, send email/SMS with reset link
    // For development, log the token
    const nodeEnv = this.configService.get('NODE_ENV') || process.env.NODE_ENV;
    const isDevelopment = nodeEnv === 'development';

    if (isDevelopment) {
      console.log(`Password reset token for ${phoneNumber || email}: ${resetToken}`);
    }

    // TODO: Send email/SMS with reset link
    // const resetLink = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    return {
      success: true,
      message: 'If an account exists with this information, a reset link will be sent',
      ...(isDevelopment && { resetToken }), // Only for development
    };
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const resetToken = this.resetTokens.get(token);

    if (!resetToken) {
      return { valid: false };
    }

    if (resetToken.used) {
      return { valid: false };
    }

    if (resetToken.expiresAt < new Date()) {
      this.resetTokens.delete(token);
      return { valid: false };
    }

    return { valid: true, userId: resetToken.userId };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const verification = await this.verifyResetToken(token);

    if (!verification.valid || !verification.userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const resetToken = this.resetTokens.get(token)!;

    // Hash and save new password
    const hashedPassword = await this.hashPassword(newPassword);
    await this.usersService.updateProfile(verification.userId, { password: hashedPassword } as any);

    // Mark token as used
    resetToken.used = true;

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_PASSWORD_LENGTH} characters`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password',
      'password1',
      '12345678',
      'qwerty123',
      'letmein',
      'welcome1',
      'admin123',
      'iloveyou',
      'sunshine',
      'princess',
    ];

    if (commonPasswords.some((weak) => password.toLowerCase().includes(weak))) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  getPasswordStrength(password: string): {
    score: number;
    strength: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= 8) {
      score += 1;
    }
    if (password.length >= 12) {
      score += 1;
    }
    if (password.length >= 16) {
      score += 1;
    }

    // Character variety
    if (/[a-z]/.test(password)) {
      score += 1;
    }
    if (/[A-Z]/.test(password)) {
      score += 1;
    }
    if (/\d/.test(password)) {
      score += 1;
    }
    if (/[@$!%*?&]/.test(password)) {
      score += 1;
    }
    if (/[^A-Za-z\d@$!%*?&]/.test(password)) {
      score += 1;
    } // Other special chars

    // Feedback
    if (password.length < 12) {
      feedback.push('Consider using a longer password');
    }
    if (!/[A-Z]/.test(password)) {
      feedback.push('Add uppercase letters');
    }
    if (!/\d/.test(password)) {
      feedback.push('Add numbers');
    }
    if (!/[@$!%*?&]/.test(password)) {
      feedback.push('Add special characters');
    }

    // Map score to strength
    let strength: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
    if (score <= 2) {
      strength = 'weak';
    } else if (score <= 4) {
      strength = 'fair';
    } else if (score <= 6) {
      strength = 'good';
    } else if (score <= 7) {
      strength = 'strong';
    } else {
      strength = 'very_strong';
    }

    return { score, strength, feedback };
  }

  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, entry] of this.resetTokens) {
      if (entry.expiresAt < now || entry.used) {
        this.resetTokens.delete(token);
      }
    }
  }
}
