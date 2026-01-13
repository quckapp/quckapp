import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { SERVICES } from '../../../shared/constants/services';
import { AUTH_PATTERNS } from '../../../shared/contracts/message-patterns';
import {
  LoginDto,
  SendOtpDto,
  ServiceResponseDto,
  TokenPairDto,
  VerifyOtpDto,
} from '../../../shared/dto';

/**
 * Auth Gateway Controller
 * Routes authentication requests to Auth Microservice
 */
@Controller('auth')
export class AuthGatewayController {
  constructor(@Inject(SERVICES.AUTH_SERVICE) private authClient: ClientProxy) {}

  /**
   * Send OTP to phone number
   */
  @Post('send-otp')
  async sendOtp(@Body() dto: SendOtpDto): Promise<ServiceResponseDto> {
    return this.sendToService(AUTH_PATTERNS.SEND_OTP, dto);
  }

  /**
   * Verify OTP code
   */
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<ServiceResponseDto> {
    return this.sendToService(AUTH_PATTERNS.VERIFY_OTP, dto);
  }

  /**
   * Login with OTP
   */
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<ServiceResponseDto<TokenPairDto>> {
    return this.sendToService(AUTH_PATTERNS.LOGIN, dto);
  }

  /**
   * Logout and invalidate tokens
   */
  @Post('logout')
  async logout(@Req() req: any): Promise<ServiceResponseDto> {
    const userId = req.user?.userId;
    const token = req.headers.authorization?.replace('Bearer ', '');
    return this.sendToService(AUTH_PATTERNS.LOGOUT, { userId, token });
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  async refreshToken(
    @Body() dto: { refreshToken: string },
  ): Promise<ServiceResponseDto<TokenPairDto>> {
    return this.sendToService(AUTH_PATTERNS.REFRESH_TOKEN, dto);
  }

  /**
   * Validate token
   */
  @Post('validate')
  async validateToken(@Body() dto: { token: string }): Promise<ServiceResponseDto> {
    return this.sendToService(AUTH_PATTERNS.VALIDATE_TOKEN, dto);
  }

  /**
   * Enable 2FA
   */
  @Post('2fa/enable')
  async enable2FA(@Req() req: any, @Body() dto: { method: string }): Promise<ServiceResponseDto> {
    return this.sendToService(AUTH_PATTERNS.ENABLE_2FA, {
      userId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Disable 2FA
   */
  @Post('2fa/disable')
  async disable2FA(@Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(AUTH_PATTERNS.DISABLE_2FA, {
      userId: req.user?.userId,
    });
  }

  /**
   * Verify 2FA code
   */
  @Post('2fa/verify')
  async verify2FA(@Body() dto: { userId: string; code: string }): Promise<ServiceResponseDto> {
    return this.sendToService(AUTH_PATTERNS.VERIFY_2FA, dto);
  }

  /**
   * OAuth login
   */
  @Post('oauth/login')
  async oauthLogin(
    @Body() dto: { provider: string; token: string },
  ): Promise<ServiceResponseDto<TokenPairDto>> {
    return this.sendToService(AUTH_PATTERNS.OAUTH_LOGIN, dto);
  }

  /**
   * Get active sessions
   */
  @Post('sessions')
  async getSessions(@Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(AUTH_PATTERNS.GET_SESSIONS, {
      userId: req.user?.userId,
    });
  }

  /**
   * Revoke a session
   */
  @Post('sessions/revoke')
  async revokeSession(
    @Req() req: any,
    @Body() dto: { sessionId: string },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(AUTH_PATTERNS.REVOKE_SESSION, {
      userId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Helper method to send requests to Auth service
   */
  private async sendToService<T>(pattern: string, data: any): Promise<ServiceResponseDto<T>> {
    try {
      const result = await firstValueFrom(
        this.authClient.send<ServiceResponseDto<T>>(pattern, data).pipe(
          timeout(5000),
          catchError((err) => {
            throw new HttpException(
              {
                success: false,
                error: {
                  code: 'SERVICE_ERROR',
                  message: err.message || 'Auth service error',
                },
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: 'Failed to communicate with auth service',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
