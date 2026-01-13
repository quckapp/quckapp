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
  UseGuards,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SetPasswordDto,
  VerifyResetTokenDto,
} from './dto/password.dto';

interface AuthRequest extends Request {
  user: { userId: string; phoneNumber: string };
}

@Controller('auth')
export class SessionController {
  constructor(
    private tokenService: TokenService,
    private passwordService: PasswordService,
  ) {}

  // ==================== Session Management ====================

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getActiveSessions(@Request() req: AuthRequest) {
    const sessions = await this.tokenService.getActiveSessions(req.user.userId);
    return {
      sessions: sessions.map((session) => ({
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      })),
      count: sessions.length,
    };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Request() req: AuthRequest, @Param('sessionId') sessionId: string) {
    const revoked = await this.tokenService.revokeSession(req.user.userId, sessionId);
    return {
      success: revoked,
      message: revoked ? 'Session revoked successfully' : 'Session not found',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authHeader: string,
    @Body('refreshToken') refreshToken?: string,
  ) {
    const accessToken = authHeader?.replace('Bearer ', '');
    await this.tokenService.logout(accessToken, refreshToken);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAllDevices(@Request() req: AuthRequest) {
    const count = await this.tokenService.logoutAllDevices(req.user.userId);
    return {
      success: true,
      message: `Logged out from ${count} device(s)`,
      devicesLoggedOut: count,
    };
  }

  // ==================== Password Management ====================

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req: AuthRequest, @Body() changePasswordDto: ChangePasswordDto) {
    return this.passwordService.changePassword(
      req.user.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post('password/set')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setPassword(@Request() req: AuthRequest, @Body() setPasswordDto: SetPasswordDto) {
    return this.passwordService.setPassword(req.user.userId, setPasswordDto.password);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordService.initiatePasswordReset(
      forgotPasswordDto.phoneNumber,
      forgotPasswordDto.email,
    );
  }

  @Post('password/verify-reset-token')
  @HttpCode(HttpStatus.OK)
  async verifyResetToken(@Body() verifyDto: VerifyResetTokenDto) {
    return this.passwordService.verifyResetToken(verifyDto.token);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.passwordService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  @Post('password/strength')
  @HttpCode(HttpStatus.OK)
  async checkPasswordStrength(@Body('password') password: string) {
    return this.passwordService.getPasswordStrength(password);
  }

  // ==================== Token Utilities ====================

  @Post('token/verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body('token') token: string) {
    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      return {
        valid: true,
        payload: {
          userId: payload.sub,
          phoneNumber: payload.phoneNumber,
          sessionId: payload.sessionId,
        },
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  @Post('token/decode')
  @HttpCode(HttpStatus.OK)
  async decodeToken(@Body('token') token: string) {
    const payload = this.tokenService.decodeToken(token);
    if (!payload) {
      return { success: false, error: 'Invalid token format' };
    }
    return {
      success: true,
      payload: {
        userId: payload.sub,
        phoneNumber: payload.phoneNumber,
        sessionId: payload.sessionId,
        issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
      },
    };
  }
}
