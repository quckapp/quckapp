import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';

interface AuthRequest extends Request {
  user: { userId: string; phoneNumber: string };
}

interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP',
    description: 'Send a one-time password to the provided phone number',
  })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP', description: 'Verify the OTP and authenticate the user' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully, returns JWT tokens' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('complete-profile')
  @ApiOperation({
    summary: 'Complete Profile',
    description: 'Complete user profile after phone verification',
  })
  @ApiResponse({ status: 201, description: 'Profile completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid profile data' })
  async completeProfile(@Body() completeProfileDto: CompleteProfileDto) {
    return this.authService.completeProfile(completeProfileDto.phoneNumber, completeProfileDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register', description: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login', description: 'Login with phone number and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Token',
    description: 'Get new access token using refresh token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { refreshToken: { type: 'string' } },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({ status: 200, description: 'New tokens generated' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  // Two-Factor Authentication Endpoints
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Setup 2FA',
    description: 'Initialize two-factor authentication for the user',
  })
  @ApiResponse({
    status: 200,
    description: '2FA setup initialized, returns secret and backup codes',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setupTwoFactor(@Request() req: AuthRequest) {
    const result = await this.twoFactorService.initializeTwoFactor(req.user.userId);
    return {
      message: 'Two-factor authentication initialized. Please verify with the code.',
      secret: result.secret,
      backupCodes: result.backupCodes,
    };
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable 2FA',
    description: 'Enable two-factor authentication after setup',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'TOTP code from authenticator app' } },
      required: ['code'],
    },
  })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async enableTwoFactor(@Request() req: AuthRequest, @Body('code') code: string) {
    const result = await this.twoFactorService.enableTwoFactor(req.user.userId, code);
    return {
      message: 'Two-factor authentication enabled successfully',
      backupCodes: result.backupCodes,
    };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA', description: 'Disable two-factor authentication' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'TOTP code to confirm' } },
      required: ['code'],
    },
  })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async disableTwoFactor(@Request() req: AuthRequest, @Body('code') code: string) {
    await this.twoFactorService.disableTwoFactor(req.user.userId, code);
    return { message: 'Two-factor authentication disabled successfully' };
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA Code', description: 'Verify a 2FA code during login' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { userId: { type: 'string' }, code: { type: 'string' } },
      required: ['userId', 'code'],
    },
  })
  @ApiResponse({ status: 200, description: 'Returns whether the code is valid' })
  async verifyTwoFactor(@Body('userId') userId: string, @Body('code') code: string) {
    const isValid = await this.twoFactorService.verifyTwoFactorCode(userId, code);
    return { valid: isValid };
  }

  @Post('2fa/backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate Backup Codes',
    description: 'Generate new backup codes (invalidates old ones)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'Current TOTP code to confirm' } },
      required: ['code'],
    },
  })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async regenerateBackupCodes(@Request() req: AuthRequest, @Body('code') code: string) {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(req.user.userId, code);
    return {
      message: 'Backup codes regenerated successfully',
      backupCodes,
    };
  }

  // ============================================
  // Spring Boot Auth Integration Endpoints
  // ============================================

  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete 2FA Login',
    description: 'Complete login with 2FA code (Spring Auth)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tempToken: { type: 'string', description: 'Temporary token from initial login' },
        code: { type: 'string', description: '6-digit 2FA code' },
      },
      required: ['tempToken', 'code'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async loginWith2FA(
    @Body('tempToken') tempToken: string,
    @Body('code') code: string,
    @Req() req: ExpressRequest,
  ) {
    return this.authService.loginWith2FA(tempToken, code, this.getClientInfo(req));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout', description: 'Logout and revoke tokens' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Headers('authorization') authHeader: string, @Req() req: ExpressRequest) {
    const token = this.extractToken(authHeader);
    await this.authService.logout(token, this.getClientInfo(req));
    return { message: 'Logged out successfully' };
  }

  // Password Management
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forgot Password', description: 'Request password reset email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string' } },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset email sent if account exists' })
  async forgotPassword(@Body('email') email: string, @Req() req: ExpressRequest) {
    return this.authService.forgotPassword(email, this.getClientInfo(req));
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset Password', description: 'Reset password with token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        newPassword: { type: 'string' },
      },
      required: ['token', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
    @Req() req: ExpressRequest,
  ) {
    return this.authService.resetPassword(token, newPassword, this.getClientInfo(req));
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change Password', description: 'Change password (authenticated)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Headers('authorization') authHeader: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
    @Req() req: ExpressRequest,
  ) {
    const token = this.extractToken(authHeader);
    return this.authService.changePassword(token, currentPassword, newPassword, this.getClientInfo(req));
  }

  // Session Management
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Sessions', description: 'Get all active sessions' })
  @ApiResponse({ status: 200, description: 'Returns list of active sessions' })
  async getSessions(@Headers('authorization') authHeader: string) {
    const token = this.extractToken(authHeader);
    return this.authService.getSessions(token);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate Session', description: 'Terminate a specific session' })
  @ApiResponse({ status: 200, description: 'Session terminated' })
  async terminateSession(
    @Headers('authorization') authHeader: string,
    @Param('sessionId') sessionId: string,
    @Req() req: ExpressRequest,
  ) {
    const token = this.extractToken(authHeader);
    await this.authService.terminateSession(token, sessionId, this.getClientInfo(req));
    return { message: 'Session terminated' };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate All Sessions', description: 'Terminate all other sessions' })
  @ApiResponse({ status: 200, description: 'All other sessions terminated' })
  async terminateAllSessions(@Headers('authorization') authHeader: string, @Req() req: ExpressRequest) {
    const token = this.extractToken(authHeader);
    await this.authService.terminateAllOtherSessions(token, this.getClientInfo(req));
    return { message: 'All other sessions terminated' };
  }

  // Health Check
  @Get('spring-health')
  @ApiOperation({ summary: 'Spring Auth Health', description: 'Check Spring Auth service health' })
  @ApiResponse({ status: 200, description: 'Returns health status' })
  async springHealthCheck() {
    const isHealthy = await this.authService.checkSpringAuthHealth();
    return {
      enabled: this.authService.isSpringAuthEnabled(),
      healthy: isHealthy,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private extractToken(authHeader: string): string {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    throw new Error('Invalid Authorization header');
  }

  private getClientInfo(req: ExpressRequest): ClientInfo {
    return {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['x-device-id'] as string,
    };
  }

  private getClientIp(req: ExpressRequest): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      return ips.split(',')[0].trim();
    }
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }
    return req.ip || '';
  }
}
