import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

// Re-export MongoDB memory utilities for convenience
export * from './mongodb-memory';
export * from './test-module.factory';

// Mock user data
export const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  phoneNumber: '+1234567890',
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  password: '$2b$10$hashedpassword',
  avatar: null,
  bio: 'Test bio',
  status: 'online',
  isActive: true,
  isVerified: false,
  role: 'user',
  fcmTokens: [],
  linkedDevices: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  toObject: function() {
    const { password, ...rest } = this;
    return rest;
  },
  save: jest.fn().mockResolvedValue(this),
};

// Mock conversation data
export const mockConversation = {
  _id: '507f1f77bcf86cd799439012',
  type: 'single',
  name: null,
  avatar: null,
  participants: [
    { userId: '507f1f77bcf86cd799439011', joinedAt: new Date(), unreadCount: 0, isMuted: false, isPinned: false },
    { userId: '507f1f77bcf86cd799439013', joinedAt: new Date(), unreadCount: 0, isMuted: false, isPinned: false },
  ],
  admins: [],
  lastMessage: null,
  lastMessageAt: new Date(),
  isArchived: false,
  isLocked: false,
  pinnedMessages: [],
  disappearingMessagesTimer: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
};

// Mock message data
export const mockMessage = {
  _id: '507f1f77bcf86cd799439014',
  conversationId: '507f1f77bcf86cd799439012',
  senderId: '507f1f77bcf86cd799439011',
  type: 'text',
  content: 'Hello, this is a test message',
  encryptedContent: null,
  attachments: [],
  reactions: [],
  readReceipts: [],
  replyTo: null,
  isEdited: false,
  isDeleted: false,
  isForwarded: false,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
};

// Mock user settings
export const mockUserSettings = {
  _id: '507f1f77bcf86cd799439015',
  userId: '507f1f77bcf86cd799439011',
  darkMode: false,
  autoDownloadMedia: true,
  pushNotifications: true,
  readReceipts: true,
  lastSeen: true,
  twoFactorAuth: false,
  twoFactorSecret: null,
  twoFactorBackupCodes: [],
  blockedUsers: [],
  save: jest.fn().mockResolvedValue(this),
};

// Create a mock mongoose model
export const createMockModel = (mockData: any) => {
  return {
    new: jest.fn().mockResolvedValue(mockData),
    constructor: jest.fn().mockResolvedValue(mockData),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    exec: jest.fn(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
  };
};

// Create mock query chain
export const createMockQueryChain = (result: any) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

// Helper to create testing module
export async function createTestingModule(metadata: ModuleMetadata): Promise<TestingModule> {
  return Test.createTestingModule(metadata).compile();
}

// Mock JWT tokens
export const mockTokens = {
  accessToken: 'mock.access.token',
  refreshToken: 'mock.refresh.token',
};

// Mock request object
export const createMockRequest = (user?: any) => ({
  user: user || { userId: mockUser._id, phoneNumber: mockUser.phoneNumber },
  headers: {},
  url: '/test',
  method: 'GET',
});

// Mock response object
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};
