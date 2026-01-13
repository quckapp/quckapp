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

describe('ConversationsController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;
  let singleConversationId: string;
  let groupConversationId: string;

  const testUser1 = {
    phoneNumber: '+1111111111',
    username: 'convuser1',
    password: 'Test@123456',
    displayName: 'Conv User One',
  };

  const testUser2 = {
    phoneNumber: '+2222222222',
    username: 'convuser2',
    password: 'Test@123456',
    displayName: 'Conv User Two',
  };

  const testUser3 = {
    phoneNumber: '+3333333333',
    username: 'convuser3',
    password: 'Test@123456',
    displayName: 'Conv User Three',
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

    // Register users
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser1);
    user1Token = res1.body.accessToken;
    user1Id = res1.body.user._id;

    const res2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser2);
    user2Token = res2.body.accessToken;
    user2Id = res2.body.user._id;

    const res3 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser3);
    user3Id = res3.body.user._id;
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('/api/v1/conversations/single (POST)', () => {
    it('should create a single conversation', () => {
      return request(app.getHttpServer())
        .post('/api/v1/conversations/single')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ recipientId: user2Id })
        .expect(201)
        .expect((res) => {
          expect(res.body.type).toBe('single');
          expect(res.body.participants).toHaveLength(2);
          singleConversationId = res.body._id;
        });
    });

    it('should return existing conversation if already exists', () => {
      return request(app.getHttpServer())
        .post('/api/v1/conversations/single')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ recipientId: user2Id })
        .expect(201)
        .expect((res) => {
          expect(res.body._id).toBe(singleConversationId);
        });
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/conversations/single')
        .send({ recipientId: user2Id })
        .expect(401);
    });
  });

  describe('/api/v1/conversations/group (POST)', () => {
    it('should create a group conversation', () => {
      return request(app.getHttpServer())
        .post('/api/v1/conversations/group')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Test Group',
          participantIds: [user2Id, user3Id],
          description: 'A test group',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.type).toBe('group');
          expect(res.body.name).toBe('Test Group');
          expect(res.body.participants.length).toBeGreaterThanOrEqual(2);
          expect(res.body.admins).toContain(user1Id);
          groupConversationId = res.body._id;
        });
    });

    it('should include creator as participant and admin', () => {
      return request(app.getHttpServer())
        .post('/api/v1/conversations/group')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Another Group',
          participantIds: [user2Id],
        })
        .expect(201)
        .expect((res) => {
          const participantIds = res.body.participants.map((p: any) => p.userId);
          expect(participantIds).toContain(user1Id);
          expect(res.body.admins).toContain(user1Id);
        });
    });
  });

  describe('/api/v1/conversations (GET)', () => {
    it('should get all user conversations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/conversations')
        .expect(401);
    });
  });

  describe('/api/v1/conversations/:id (GET)', () => {
    it('should get conversation by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/conversations/${singleConversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body._id).toBe(singleConversationId);
        });
    });

    it('should return 404 for non-existent conversation', () => {
      return request(app.getHttpServer())
        .get('/api/v1/conversations/507f1f77bcf86cd799439999')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });
  });

  describe('/api/v1/conversations/:id/participants (PUT)', () => {
    it('should add participants to group', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/conversations/${groupConversationId}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantIds: [user3Id] })
        .expect(200);
    });

    it('should reject adding participants to single conversation', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/conversations/${singleConversationId}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantIds: [user3Id] })
        .expect(403);
    });

    it('should reject non-admin adding participants', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/conversations/${groupConversationId}/participants`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ participantIds: [user3Id] })
        .expect(403);
    });
  });

  describe('/api/v1/conversations/:id/mute (PUT)', () => {
    it('should mute a conversation', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/conversations/${singleConversationId}/mute`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ isMuted: true })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should unmute a conversation', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/conversations/${singleConversationId}/mute`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ isMuted: false })
        .expect(200);
    });
  });

  describe('/api/v1/conversations/:id/disappearing-messages (PUT)', () => {
    it('should set disappearing messages timer', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/conversations/${singleConversationId}/disappearing-messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ timer: 86400 }) // 24 hours
        .expect(200)
        .expect((res) => {
          expect(res.body.disappearingMessagesTimer).toBe(86400);
        });
    });

    it('should disable disappearing messages', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/conversations/${singleConversationId}/disappearing-messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ timer: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.disappearingMessagesTimer).toBe(0);
        });
    });
  });

  describe('/api/v1/conversations/:id/disappearing-messages (GET)', () => {
    it('should get disappearing messages settings', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/conversations/${singleConversationId}/disappearing-messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('enabled');
          expect(res.body).toHaveProperty('timer');
          expect(res.body).toHaveProperty('timerLabel');
        });
    });
  });

  describe('/api/v1/conversations/:id (DELETE)', () => {
    let tempConversationId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/conversations/group')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Temp Group',
          participantIds: [user2Id],
        });
      tempConversationId = res.body._id;
    });

    it('should delete a conversation', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/conversations/${tempConversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should reject non-admin deleting group', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/conversations/${groupConversationId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });
  });
});
