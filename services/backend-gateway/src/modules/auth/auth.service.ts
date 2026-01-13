import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TwoFactorService } from './two-factor.service';
import { SpringAuthClientService } from './spring-auth-client.service';
import { KafkaService, KAFKA_TOPICS } from '../../common/kafka/kafka.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';

interface OtpStore {
  otp: string;
  expiresAt: Date;
  attempts: number;
}

interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private otpStore: Map<string, OtpStore> = new Map();
  private readonly useSpringAuth: boolean;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private twoFactorService: TwoFactorService,
    private springAuthClient: SpringAuthClientService,
    private kafkaService: KafkaService,
  ) {
    // Enable Spring Boot auth if configured
    this.useSpringAuth = this.configService.get('USE_SPRING_AUTH') === 'true';
  }

  async register(registerDto: RegisterDto, clientInfo?: ClientInfo) {
    const existingPhone = await this.usersService.findByPhoneNumber(registerDto.phoneNumber);
    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    const existingUsername = await this.usersService.findByUsername(registerDto.username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    if (registerDto.email) {
      const existingEmail = await this.usersService.findByEmail(registerDto.email);
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user in MongoDB
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    let tokens: { accessToken: string; refreshToken: string };
    let springAuthId: string | undefined;

    // Register in Spring Boot auth service if enabled
    if (this.useSpringAuth && registerDto.email) {
      try {
        const springResponse = await this.springAuthClient.register(
          {
            email: registerDto.email,
            password: registerDto.password,
            externalId: user._id.toString(),
          },
          clientInfo,
        );
        tokens = {
          accessToken: springResponse.accessToken,
          refreshToken: springResponse.refreshToken,
        };
        springAuthId = springResponse.user.id;
        this.logger.log(`User registered in Spring Auth service: ${springAuthId}`);
      } catch (error) {
        this.logger.error(`Failed to register in Spring Auth: ${error.message}`);
        // Fall back to local token generation
        tokens = await this.generateTokens(user._id.toString(), user.phoneNumber);
      }
    } else {
      tokens = await this.generateTokens(user._id.toString(), user.phoneNumber);
    }

    // Publish user created event to Kafka
    await this.publishAuthEvent('USER_REGISTERED', {
      userId: user._id.toString(),
      email: registerDto.email,
      phoneNumber: registerDto.phoneNumber,
      springAuthId,
      timestamp: new Date().toISOString(),
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto & { twoFactorCode?: string; email?: string }, clientInfo?: ClientInfo) {
    const user = await this.usersService.findByPhoneNumber(loginDto.phoneNumber);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Use Spring Boot auth if enabled and user has email
    if (this.useSpringAuth && user.email) {
      try {
        const springResponse = await this.springAuthClient.login(
          {
            email: user.email,
            password: loginDto.password,
            deviceId: clientInfo?.deviceId,
            deviceName: clientInfo?.userAgent,
          },
          clientInfo,
        );

        // Handle 2FA from Spring Boot
        if (springResponse.requiresTwoFactor) {
          return {
            requiresTwoFactor: true,
            tempToken: springResponse.tempToken,
            userId: user._id.toString(),
            message: 'Two-factor authentication required',
          };
        }

        // Publish login event
        await this.publishAuthEvent('USER_LOGIN', {
          userId: user._id.toString(),
          email: user.email,
          springAuthId: springResponse.user.id,
          success: true,
          timestamp: new Date().toISOString(),
        });

        return {
          user: this.sanitizeUser(user),
          accessToken: springResponse.accessToken,
          refreshToken: springResponse.refreshToken,
        };
      } catch (error) {
        this.logger.error(`Spring Auth login failed: ${error.message}`);
        // Fall through to local authentication
      }
    }

    // Local 2FA check (fallback or non-Spring mode)
    const is2FAEnabled = await this.twoFactorService.isTwoFactorEnabled(user._id.toString());

    if (is2FAEnabled) {
      if (!loginDto.twoFactorCode) {
        return {
          requiresTwoFactor: true,
          userId: user._id.toString(),
          message: 'Two-factor authentication required',
        };
      }

      const isValidCode = await this.twoFactorService.verifyTwoFactorCode(
        user._id.toString(),
        loginDto.twoFactorCode,
      );

      if (!isValidCode) {
        throw new UnauthorizedException('Invalid two-factor authentication code');
      }
    }

    const tokens = await this.generateTokens(user._id.toString(), user.phoneNumber);

    // Publish login event
    await this.publishAuthEvent('USER_LOGIN', {
      userId: user._id.toString(),
      email: user.email,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async loginWith2FA(tempToken: string, code: string, clientInfo?: ClientInfo) {
    if (!this.useSpringAuth) {
      throw new BadRequestException('Spring Auth not enabled');
    }

    const springResponse = await this.springAuthClient.loginWith2FA(
      { tempToken, code },
      clientInfo,
    );

    // Find user by external ID
    const user = await this.usersService.findById(springResponse.user.externalId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Publish login event
    await this.publishAuthEvent('USER_LOGIN_2FA', {
      userId: user._id.toString(),
      email: user.email,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return {
      user: this.sanitizeUser(user),
      accessToken: springResponse.accessToken,
      refreshToken: springResponse.refreshToken,
    };
  }

  async refreshToken(refreshToken: string, clientInfo?: ClientInfo) {
    // Try Spring Boot auth first if enabled
    if (this.useSpringAuth) {
      try {
        const springResponse = await this.springAuthClient.refreshToken(
          { refreshToken },
          clientInfo,
        );

        // Validate token to get user info
        const validation = await this.springAuthClient.validateToken({
          token: springResponse.accessToken,
        });

        const user = await this.usersService.findById(validation.externalId);

        if (!user) {
          throw new UnauthorizedException('User not found');
        }

        return {
          user: this.sanitizeUser(user),
          accessToken: springResponse.accessToken,
          refreshToken: springResponse.refreshToken,
        };
      } catch (error) {
        this.logger.error(`Spring Auth refresh failed: ${error.message}`);
        // Fall through to local refresh
      }
    }

    // Local token refresh
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      const tokens = await this.generateTokens(user._id.toString(), user.phoneNumber);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateSpringToken(token: string) {
    if (!this.useSpringAuth) {
      throw new BadRequestException('Spring Auth not enabled');
    }
    return this.springAuthClient.validateToken({ token });
  }

  async logout(accessToken: string, clientInfo?: ClientInfo) {
    if (this.useSpringAuth) {
      try {
        await this.springAuthClient.logout(accessToken, clientInfo);
      } catch (error) {
        this.logger.error(`Spring Auth logout failed: ${error.message}`);
      }
    }

    // Publish logout event
    await this.publishAuthEvent('USER_LOGOUT', {
      timestamp: new Date().toISOString(),
    });
  }

  private async generateTokens(userId: string, phoneNumber: string) {
    const payload = { sub: userId, phoneNumber };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async sendOtp(sendOtpDto: SendOtpDto) {
    const { phoneNumber } = sendOtpDto;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 5 minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.otpStore.set(phoneNumber, {
      otp,
      expiresAt,
      attempts: 0,
    });

    // TODO: In production, send SMS via Twilio, AWS SNS, etc.
    // For development, log the OTP
    console.log(`OTP for ${phoneNumber}: ${otp}`);

    const nodeEnv = this.configService.get('NODE_ENV') || process.env.NODE_ENV;
    const isDevelopment = nodeEnv === 'development';

    return {
      message: 'OTP sent successfully',
      // In development, return OTP for testing
      ...(isDevelopment && { otp }),
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phoneNumber, otp } = verifyOtpDto;

    const storedOtp = this.otpStore.get(phoneNumber);

    if (!storedOtp) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (new Date() > storedOtp.expiresAt) {
      this.otpStore.delete(phoneNumber);
      throw new BadRequestException('OTP expired');
    }

    if (storedOtp.attempts >= 3) {
      this.otpStore.delete(phoneNumber);
      throw new BadRequestException('Too many attempts. Please request a new OTP');
    }

    if (storedOtp.otp !== otp) {
      storedOtp.attempts++;
      throw new BadRequestException('Invalid OTP');
    }

    // OTP verified successfully
    this.otpStore.delete(phoneNumber);

    // Check if user exists
    const user = await this.usersService.findByPhoneNumber(phoneNumber);

    if (user) {
      // Existing user - generate tokens and login
      const tokens = await this.generateTokens(user._id.toString(), user.phoneNumber);
      return {
        isNewUser: false,
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } else {
      // New user - return temp token for profile completion
      const tempToken = await this.jwtService.signAsync(
        { phoneNumber, temp: true },
        { secret: this.configService.get('JWT_SECRET'), expiresIn: '15m' },
      );

      return {
        isNewUser: true,
        tempToken,
        phoneNumber,
      };
    }
  }

  async completeProfile(phoneNumber: string, completeProfileDto: CompleteProfileDto) {
    const existingUsername = await this.usersService.findByUsername(completeProfileDto.username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    if (completeProfileDto.email) {
      const existingEmail = await this.usersService.findByEmail(completeProfileDto.email);
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Create user without password (OTP-based auth)
    const user = await this.usersService.create({
      phoneNumber,
      username: completeProfileDto.username,
      displayName: completeProfileDto.displayName,
      email: completeProfileDto.email,
      password: await bcrypt.hash(Math.random().toString(), 10), // Random password as placeholder
    });

    const tokens = await this.generateTokens(user._id.toString(), user.phoneNumber);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  private sanitizeUser(user: any) {
    const { password, ...result } = user.toObject();
    return result;
  }

  // ============================================
  // Spring Boot Auth - Additional Methods
  // ============================================

  async forgotPassword(email: string, clientInfo?: ClientInfo) {
    if (this.useSpringAuth) {
      await this.springAuthClient.forgotPassword(email, clientInfo);
    }
    // Local implementation can be added here if needed
    return { message: 'Password reset email sent if account exists' };
  }

  async resetPassword(token: string, newPassword: string, clientInfo?: ClientInfo) {
    if (this.useSpringAuth) {
      await this.springAuthClient.resetPassword({ token, newPassword }, clientInfo);
    }
    return { message: 'Password reset successful' };
  }

  async changePassword(accessToken: string, currentPassword: string, newPassword: string, clientInfo?: ClientInfo) {
    if (this.useSpringAuth) {
      await this.springAuthClient.changePassword(
        accessToken,
        { currentPassword, newPassword },
        clientInfo,
      );
    }

    await this.publishAuthEvent('PASSWORD_CHANGED', {
      timestamp: new Date().toISOString(),
    });

    return { message: 'Password changed successfully' };
  }

  // ============================================
  // Session Management (Spring Boot)
  // ============================================

  async getSessions(accessToken: string) {
    if (!this.useSpringAuth) {
      throw new BadRequestException('Spring Auth not enabled');
    }
    return this.springAuthClient.getSessions(accessToken);
  }

  async terminateSession(accessToken: string, sessionId: string, clientInfo?: ClientInfo) {
    if (!this.useSpringAuth) {
      throw new BadRequestException('Spring Auth not enabled');
    }
    await this.springAuthClient.terminateSession(accessToken, sessionId, clientInfo);
  }

  async terminateAllOtherSessions(accessToken: string, clientInfo?: ClientInfo) {
    if (!this.useSpringAuth) {
      throw new BadRequestException('Spring Auth not enabled');
    }
    await this.springAuthClient.terminateAllOtherSessions(accessToken, clientInfo);
  }

  // ============================================
  // OAuth (Spring Boot)
  // ============================================

  async oauthLogin(provider: string, accessToken: string, idToken?: string, clientInfo?: ClientInfo) {
    if (!this.useSpringAuth) {
      throw new BadRequestException('Spring Auth not enabled');
    }

    const springResponse = await this.springAuthClient.oauthLogin(
      provider,
      { accessToken, idToken },
      clientInfo,
    );

    // Find or create user by external ID
    let user = await this.usersService.findById(springResponse.user.externalId);

    if (!user && springResponse.user.email) {
      const userByEmail = await this.usersService.findByEmail(springResponse.user.email);
      if (userByEmail) {
        user = userByEmail;
      }
    }

    await this.publishAuthEvent('OAUTH_LOGIN', {
      provider,
      email: springResponse.user.email,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return {
      user: user ? this.sanitizeUser(user) : springResponse.user,
      accessToken: springResponse.accessToken,
      refreshToken: springResponse.refreshToken,
    };
  }

  async linkOAuthProvider(
    accessToken: string,
    provider: string,
    providerAccessToken: string,
    idToken?: string,
    clientInfo?: ClientInfo,
  ) {
    if (!this.useSpringAuth) {
      throw new BadRequestException('Spring Auth not enabled');
    }
    await this.springAuthClient.linkOAuthProvider(
      accessToken,
      provider,
      { accessToken: providerAccessToken, idToken },
      clientInfo,
    );
  }

  async unlinkOAuthProvider(accessToken: string, provider: string, clientInfo?: ClientInfo) {
    if (!this.useSpringAuth) {
      throw new BadRequestException('Spring Auth not enabled');
    }
    await this.springAuthClient.unlinkOAuthProvider(accessToken, provider, clientInfo);
  }

  // ============================================
  // Health & Status
  // ============================================

  async checkSpringAuthHealth(): Promise<boolean> {
    if (!this.useSpringAuth) {
      return false;
    }
    return this.springAuthClient.healthCheck();
  }

  isSpringAuthEnabled(): boolean {
    return this.useSpringAuth;
  }

  // ============================================
  // Kafka Event Publishing
  // ============================================

  private async publishAuthEvent(eventType: string, data: any) {
    try {
      await this.kafkaService.publish('auth.events', {
        eventType,
        data,
        source: 'nestjs-auth-service',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to publish auth event: ${error.message}`);
      // Don't throw - event publishing should not break auth flow
    }
  }
}
