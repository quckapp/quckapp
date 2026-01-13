import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';

/**
 * Conversation Factory
 * Generates realistic mock conversation data for testing
 */

export type ConversationType = 'private' | 'group';

export interface MockConversationData {
  _id?: string;
  type: ConversationType;
  name?: string;
  description?: string;
  avatar?: string;
  participants: MockParticipant[];
  admins?: string[];
  createdBy: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  settings?: MockConversationSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MockParticipant {
  userId: string;
  role: 'member' | 'admin' | 'owner';
  joinedAt: Date;
  lastReadAt?: Date;
  nickname?: string;
  isMuted?: boolean;
}

export interface MockConversationSettings {
  allowMemberInvite: boolean;
  allowMemberEdit: boolean;
  messageRetention: number; // days
  isEncrypted: boolean;
}

/**
 * Generate a random MongoDB ObjectId
 */
export function generateObjectId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Generate a mock participant
 */
export function createMockParticipant(overrides: Partial<MockParticipant> = {}): MockParticipant {
  return {
    userId: generateObjectId(),
    role: 'member',
    joinedAt: faker.date.recent({ days: 30 }),
    lastReadAt: faker.date.recent({ days: 1 }),
    isMuted: false,
    ...overrides,
  };
}

/**
 * Generate multiple mock participants
 */
export function createMockParticipants(count: number, overrides: Partial<MockParticipant> = {}): MockParticipant[] {
  return Array.from({ length: count }, () => createMockParticipant(overrides));
}

/**
 * Generate a single mock conversation
 */
export function createMockConversation(overrides: Partial<MockConversationData> = {}): MockConversationData {
  const type = overrides.type || 'private';
  const createdBy = generateObjectId();
  const participants = overrides.participants || [
    createMockParticipant({ userId: createdBy, role: 'owner' }),
    createMockParticipant(),
  ];

  return {
    _id: generateObjectId(),
    type,
    name: type === 'group' ? faker.company.name() : undefined,
    description: type === 'group' ? faker.lorem.sentence() : undefined,
    avatar: type === 'group' ? faker.image.avatar() : undefined,
    participants,
    admins: type === 'group' ? [createdBy] : undefined,
    createdBy,
    lastMessageAt: faker.date.recent({ days: 1 }),
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: faker.date.recent({ days: 30 }),
    updatedAt: faker.date.recent({ days: 1 }),
    ...overrides,
  };
}

/**
 * Generate multiple mock conversations
 */
export function createMockConversations(count: number, overrides: Partial<MockConversationData> = {}): MockConversationData[] {
  return Array.from({ length: count }, () => createMockConversation(overrides));
}

/**
 * Generate a mock private conversation between two users
 */
export function createMockPrivateConversation(user1Id: string, user2Id: string): MockConversationData {
  return createMockConversation({
    type: 'private',
    createdBy: user1Id,
    participants: [
      createMockParticipant({ userId: user1Id, role: 'owner' }),
      createMockParticipant({ userId: user2Id, role: 'member' }),
    ],
  });
}

/**
 * Generate a mock group conversation
 */
export function createMockGroupConversation(
  creatorId: string,
  memberIds: string[],
  overrides: Partial<MockConversationData> = {},
): MockConversationData {
  const participants = [
    createMockParticipant({ userId: creatorId, role: 'owner' }),
    ...memberIds.map((id) => createMockParticipant({ userId: id, role: 'member' })),
  ];

  return createMockConversation({
    type: 'group',
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    avatar: faker.image.avatar(),
    createdBy: creatorId,
    participants,
    admins: [creatorId],
    settings: createMockConversationSettings(),
    ...overrides,
  });
}

/**
 * Generate mock conversation settings
 */
export function createMockConversationSettings(overrides: Partial<MockConversationSettings> = {}): MockConversationSettings {
  return {
    allowMemberInvite: true,
    allowMemberEdit: false,
    messageRetention: 0, // 0 means indefinite
    isEncrypted: false,
    ...overrides,
  };
}

/**
 * Generate a large group conversation for load testing
 */
export function createMockLargeGroup(
  creatorId: string,
  memberCount: number = 100,
): MockConversationData {
  const memberIds = Array.from({ length: memberCount }, () => generateObjectId());

  return createMockGroupConversation(creatorId, memberIds, {
    name: `Large Group (${memberCount + 1} members)`,
    description: faker.lorem.paragraph(),
  });
}

/**
 * Generate conversation with specific last activity
 */
export function createMockActiveConversation(lastActivityMinutesAgo: number = 5): MockConversationData {
  const lastMessageAt = new Date(Date.now() - lastActivityMinutesAgo * 60 * 1000);

  return createMockConversation({
    lastMessageAt,
    lastMessage: generateObjectId(),
    updatedAt: lastMessageAt,
  });
}

/**
 * Generate an archived conversation
 */
export function createMockArchivedConversation(): MockConversationData {
  return createMockConversation({
    isArchived: true,
    lastMessageAt: faker.date.past({ years: 1 }),
  });
}
