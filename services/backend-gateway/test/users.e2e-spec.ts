import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { UsersService } from '../src/modules/users/users.service';
import { User, UserSchema, UserDocument } from '../src/modules/users/schemas/user.schema';
import {
  UserSettings,
  UserSettingsSchema,
  UserSettingsDocument,
} from '../src/modules/users/schemas/user-settings.schema';
import { faker } from '@faker-js/faker';

describe('UsersService Integration Tests', () => {
  let service: UsersService;
  let module: TestingModule;
  let mongoServer: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let connection: Connection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: UserSettings.name, schema: UserSettingsSchema },
        ]),
      ],
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    connection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
    await module.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    const collections = connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  const createTestUser = () => ({
    phoneNumber: faker.phone.number({ style: 'international' }),
    email: faker.internet.email(),
    password: faker.internet.password(),
    username: faker.internet.username().toLowerCase().replace(/[^a-z0-9]/g, ''),
    displayName: faker.person.fullName(),
    avatar: faker.image.avatar(),
    bio: faker.lorem.sentence(),
    status: 'offline',
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData = createTestUser();

      const user = await service.create(userData);

      expect(user).toBeDefined();
      expect(user.phoneNumber).toBe(userData.phoneNumber);
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.displayName).toBe(userData.displayName);
      expect(user._id).toBeDefined();
    });

    it('should fail to create user with duplicate phone number', async () => {
      const userData = createTestUser();

      await service.create(userData);

      await expect(service.create(userData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find a user by ID', async () => {
      const userData = createTestUser();
      const createdUser = await service.create(userData);

      const foundUser = await service.findById(createdUser._id.toString());

      expect(foundUser).toBeDefined();
      expect(foundUser._id.toString()).toBe(createdUser._id.toString());
      expect(foundUser.phoneNumber).toBe(userData.phoneNumber);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(service.findById(fakeId)).rejects.toThrow('User not found');
    });
  });

  describe('findByPhoneNumber', () => {
    it('should find a user by phone number', async () => {
      const userData = createTestUser();
      await service.create(userData);

      const foundUser = await service.findByPhoneNumber(userData.phoneNumber);

      expect(foundUser).toBeDefined();
      expect(foundUser?.phoneNumber).toBe(userData.phoneNumber);
    });

    it('should return null for non-existent phone number', async () => {
      const foundUser = await service.findByPhoneNumber('+9999999999');

      expect(foundUser).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find a user by username', async () => {
      const userData = createTestUser();
      await service.create(userData);

      const foundUser = await service.findByUsername(userData.username);

      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe(userData.username);
    });
  });

  describe('updateStatus', () => {
    it('should update user status', async () => {
      const userData = createTestUser();
      const createdUser = await service.create(userData);

      const updatedUser = await service.updateStatus(createdUser._id.toString(), 'online');

      expect(updatedUser.status).toBe('online');
      expect(updatedUser.lastSeen).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userData = createTestUser();
      const createdUser = await service.create(userData);
      const newDisplayName = faker.person.fullName();
      const newBio = faker.lorem.sentence();

      const updatedUser = await service.updateProfile(createdUser._id.toString(), {
        displayName: newDisplayName,
        bio: newBio,
      });

      expect(updatedUser.displayName).toBe(newDisplayName);
      expect(updatedUser.bio).toBe(newBio);
    });
  });

  describe('searchUsers', () => {
    it('should search users by username', async () => {
      const user1 = await service.create({ ...createTestUser(), username: 'johndoe' });
      await service.create({ ...createTestUser(), username: 'janedoe' });
      await service.create({ ...createTestUser(), username: 'bobsmith' });

      const results = await service.searchUsers('doe', user1._id.toString());

      expect(results.length).toBe(1);
      expect(results[0].username).toBe('janedoe');
    });

    it('should search users by display name', async () => {
      const user1 = await service.create({ ...createTestUser(), displayName: 'John Doe' });
      await service.create({ ...createTestUser(), displayName: 'Jane Doe' });

      const results = await service.searchUsers('Doe', user1._id.toString());

      expect(results.length).toBe(1);
      expect(results[0].displayName).toBe('Jane Doe');
    });
  });

  describe('FCM tokens', () => {
    it('should add FCM token', async () => {
      const userData = createTestUser();
      const createdUser = await service.create(userData);
      const fcmToken = faker.string.alphanumeric(100);

      await service.addFcmToken(createdUser._id.toString(), fcmToken);

      const updatedUser = await service.findById(createdUser._id.toString());
      expect(updatedUser.fcmTokens).toContain(fcmToken);
    });

    it('should remove FCM token', async () => {
      const fcmToken = faker.string.alphanumeric(100);
      const userData = { ...createTestUser(), fcmTokens: [fcmToken] };
      const createdUser = await service.create(userData);

      await service.removeFcmToken(createdUser._id.toString(), fcmToken);

      const updatedUser = await service.findById(createdUser._id.toString());
      expect(updatedUser.fcmTokens).not.toContain(fcmToken);
    });
  });

  describe('linked devices', () => {
    it('should link a new device', async () => {
      const userData = createTestUser();
      const createdUser = await service.create(userData);
      const deviceData = {
        deviceId: faker.string.uuid(),
        deviceName: faker.commerce.productName(),
        deviceType: 'mobile',
      };

      const updatedUser = await service.linkDevice(createdUser._id.toString(), deviceData);

      expect(updatedUser.linkedDevices).toHaveLength(1);
      expect(updatedUser.linkedDevices[0].deviceId).toBe(deviceData.deviceId);
    });

    it('should unlink a device', async () => {
      const deviceId = faker.string.uuid();
      const userData = createTestUser();
      const createdUser = await service.create(userData);
      await service.linkDevice(createdUser._id.toString(), {
        deviceId,
        deviceName: 'Test Device',
        deviceType: 'mobile',
      });

      await service.unlinkDevice(createdUser._id.toString(), deviceId);

      const devices = await service.getLinkedDevices(createdUser._id.toString());
      expect(devices).toHaveLength(0);
    });
  });

  describe('settings', () => {
    it('should create default settings for new user', async () => {
      const userData = createTestUser();
      const createdUser = await service.create(userData);

      const settings = await service.getSettings(createdUser._id.toString());

      expect(settings).toBeDefined();
      expect(settings.userId.toString()).toBe(createdUser._id.toString());
    });

    it('should block and unblock users', async () => {
      const user1 = await service.create(createTestUser());
      const user2 = await service.create(createTestUser());

      await service.blockUser(user1._id.toString(), user2._id.toString());
      let blockedUsers = await service.getBlockedUsers(user1._id.toString());
      expect(blockedUsers.length).toBe(1);

      await service.unblockUser(user1._id.toString(), user2._id.toString());
      blockedUsers = await service.getBlockedUsers(user1._id.toString());
      expect(blockedUsers.length).toBe(0);
    });
  });

  describe('OAuth', () => {
    it('should create OAuth user', async () => {
      const oauthData = {
        username: faker.internet.username().toLowerCase().replace(/[^a-z0-9]/g, ''),
        displayName: faker.person.fullName(),
        email: faker.internet.email(),
        provider: 'google',
        providerId: faker.string.uuid(),
      };

      const user = await service.createOAuthUser(oauthData);

      expect(user).toBeDefined();
      expect(user.oauthProviders).toHaveLength(1);
      expect(user.oauthProviders[0].provider).toBe('google');
      expect(user.isVerified).toBe(true);
    });

    it('should find user by OAuth provider', async () => {
      const providerId = faker.string.uuid();
      await service.createOAuthUser({
        username: faker.internet.username().toLowerCase().replace(/[^a-z0-9]/g, ''),
        displayName: faker.person.fullName(),
        email: faker.internet.email(),
        provider: 'google',
        providerId,
      });

      const foundUser = await service.findByOAuthProvider('google', providerId);

      expect(foundUser).toBeDefined();
      expect(foundUser?.oauthProviders[0].providerId).toBe(providerId);
    });

    it('should link OAuth account to existing user', async () => {
      const userData = createTestUser();
      const createdUser = await service.create(userData);
      const providerId = faker.string.uuid();

      const updatedUser = await service.linkOAuthAccount(
        createdUser._id.toString(),
        'facebook',
        providerId,
        'oauth@example.com',
      );

      expect(updatedUser.oauthProviders).toHaveLength(1);
      expect(updatedUser.oauthProviders[0].provider).toBe('facebook');
    });
  });
});
