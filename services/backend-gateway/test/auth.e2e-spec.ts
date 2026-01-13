import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  const testUser = {
    phoneNumber: '+1234567890',
    username: 'testuser',
    password: 'Test@123456',
    displayName: 'Test User',
    email: 'test@example.com',
  };

  beforeAll(async () => {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            JWT_SECRET: 'test-jwt-secret',
            JWT_REFRESH_SECRET: 'test-refresh-secret',
            JWT_EXPIRES_IN: '1h',
            JWT_REFRESH_EXPIRES_IN: '7d',
            NODE_ENV: 'test',
          })],
        }),
        MongooseModule.forRoot(mongoUri),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.phoneNumber).toBe(testUser.phoneNumber);
          expect(res.body.user.username).toBe(testUser.username);
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should reject duplicate phone number', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('Phone number already exists');
        });
    });

    it('should reject duplicate username', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          phoneNumber: '+9876543210',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('Username already exists');
        });
    });

    it('should reject invalid phone number format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          phoneNumber: 'invalid',
          username: 'newuser',
        })
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          phoneNumber: testUser.phoneNumber,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          phoneNumber: testUser.phoneNumber,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('should reject non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          phoneNumber: '+0000000000',
          password: 'anypassword',
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          phoneNumber: testUser.phoneNumber,
          password: testUser.password,
        });

      refreshToken = res.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  describe('/api/v1/auth/send-otp (POST)', () => {
    it('should send OTP to phone number', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phoneNumber: '+1111111111' })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('OTP sent successfully');
        });
    });
  });

  describe('2FA endpoints', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          phoneNumber: testUser.phoneNumber,
          password: testUser.password,
        });

      accessToken = res.body.accessToken;
    });

    it('should setup 2FA', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('secret');
          expect(res.body).toHaveProperty('backupCodes');
          expect(res.body.backupCodes).toHaveLength(8);
        });
    });

    it('should reject 2FA setup without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/2fa/setup')
        .expect(401);
    });
  });
});
