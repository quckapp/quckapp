import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TwoFactorService } from './two-factor.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let twoFactorService: jest.Mocked<TwoFactorService>;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    phoneNumber: '+1234567890',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    isActive: true,
    toObject: function () {
      const { password, ...rest } = this;
      return rest;
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByPhoneNumber: jest.fn(),
            findByUsername: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '1h',
                JWT_REFRESH_EXPIRES_IN: '7d',
                NODE_ENV: 'test',
              };
              return config[key];
            }),
          },
        },
        {
          provide: TwoFactorService,
          useValue: {
            isTwoFactorEnabled: jest.fn().mockResolvedValue(false),
            verifyTwoFactorCode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    twoFactorService = module.get(TwoFactorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      phoneNumber: '+1234567890',
      username: 'newuser',
      password: 'password123',
      displayName: 'New User',
      email: 'new@example.com',
    };

    it('should successfully register a new user', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if phone number exists', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Phone number already exists');
    });

    it('should throw ConflictException if username exists', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Username already exists');
    });

    it('should throw ConflictException if email exists', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already exists');
    });
  });

  describe('login', () => {
    const loginDto = {
      phoneNumber: '+1234567890',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid phone number', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException for deactivated account', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByPhoneNumber.mockResolvedValue(inactiveUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Account is deactivated');
    });

    it('should require 2FA code when 2FA is enabled', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      twoFactorService.isTwoFactorEnabled.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('requiresTwoFactor', true);
      expect(result).toHaveProperty('userId');
    });

    it('should login successfully with valid 2FA code', async () => {
      usersService.findByPhoneNumber.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      twoFactorService.isTwoFactorEnabled.mockResolvedValue(true);
      twoFactorService.verifyTwoFactorCode.mockResolvedValue(true);

      const result = await service.login({ ...loginDto, twoFactorCode: '123456' });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser._id });
      usersService.findById.mockResolvedValue(mockUser as any);

      const result = await service.refreshToken('valid.refresh.token');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid.token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('sendOtp', () => {
    it('should generate and store OTP', async () => {
      const result = await service.sendOtp({ phoneNumber: '+1234567890' });

      expect(result).toHaveProperty('message', 'OTP sent successfully');
    });
  });

  describe('verifyOtp', () => {
    it('should throw BadRequestException for expired OTP', async () => {
      await expect(
        service.verifyOtp({ phoneNumber: '+1234567890', otp: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
