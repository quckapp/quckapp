import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { MessagesModule } from '../src/modules/messages/messages.module';
import { ConversationsModule } from '../src/modules/conversations/conversations.module';

describe('MessagesController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let accessToken: string;
  let userId: string;
  let conversationId: string;
  let messageId: string;

  const testUser1 = {
    phoneNumber: '+1234567890',
    username: 'user1',
    password: 'Test@123456',
    displayName: 'User One',
  };

  const testUser2 = {
    phoneNumber: '+0987654321',
    username: 'user2',
    password: 'Test@123456',
    displayName: 'User Two',
  };

  beforeAll(async () => {
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
            ENCRYPTION_KEY: 'test-encryption-key',
          })],
        }),
        MongooseModule.forRoot(mongoUri),
        AuthModule,
        UsersModule,
        MessagesModule,
        ConversationsModule,
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

    // Register and login user 1
    const registerRes1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser1);

    accessToken = registerRes1.body.accessToken;
    userId = registerRes1.body.user._id;

    // Register user 2
    const registerRes2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser2);

    const user2Id = registerRes2.body.user._id;

    // Create a conversation between user1 and user2
    const convRes = await request(app.getHttpServer())
      .post('/api/v1/conversations/single')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recipientId: user2Id });

    conversationId = convRes.body._id;
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('/api/v1/messages (POST via gateway)', () => {
    // Note: Messages are typically sent via WebSocket, but we test the REST endpoints
  });

  describe('/api/v1/messages/conversation/:conversationId (GET)', () => {
    it('should get messages for a conversation', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/messages/conversation/${conversationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/messages/conversation/${conversationId}`)
        .expect(401);
    });

    it('should support pagination with limit', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/messages/conversation/${conversationId}?limit=10`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('/api/v1/messages/:id (PUT) - Edit message', () => {
    beforeAll(async () => {
      // We need to create a message first - this would typically be done via WebSocket
      // For testing purposes, we'll skip this if messages can only be created via gateway
    });

    it('should reject editing without authentication', () => {
      return request(app.getHttpServer())
        .put('/api/v1/messages/507f1f77bcf86cd799439011')
        .send({ content: 'Updated content' })
        .expect(401);
    });
  });

  describe('/api/v1/messages/:id/reactions (POST)', () => {
    it('should reject adding reaction without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/messages/507f1f77bcf86cd799439011/reactions')
        .send({ emoji: '👍' })
        .expect(401);
    });
  });

  describe('/api/v1/messages/search/query (GET)', () => {
    it('should search messages', () => {
      return request(app.getHttpServer())
        .get('/api/v1/messages/search/query?q=test')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('messages');
          expect(res.body).toHaveProperty('total');
        });
    });

    it('should search within specific conversation', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/messages/search/query?q=test&conversationId=${conversationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject search without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/messages/search/query?q=test')
        .expect(401);
    });
  });
});
