import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';

/**
 * Message Factory
 * Generates realistic mock message data for testing
 */

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact' | 'sticker';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface MockMessageData {
  _id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  replyTo?: string;
  attachments?: MockAttachment[];
  reactions?: MockReaction[];
  mentions?: string[];
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MockAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  thumbnail?: string;
}

export interface MockReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

/**
 * Generate a random MongoDB ObjectId
 */
export function generateObjectId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Generate a single mock message
 */
export function createMockMessage(overrides: Partial<MockMessageData> = {}): MockMessageData {
  return {
    _id: generateObjectId(),
    conversationId: generateObjectId(),
    senderId: generateObjectId(),
    content: faker.lorem.sentence(),
    type: 'text',
    status: faker.helpers.arrayElement(['sent', 'delivered', 'read']),
    isEdited: false,
    isDeleted: false,
    createdAt: faker.date.recent({ days: 7 }),
    updatedAt: faker.date.recent({ days: 1 }),
    ...overrides,
  };
}

/**
 * Generate multiple mock messages
 */
export function createMockMessages(count: number, overrides: Partial<MockMessageData> = {}): MockMessageData[] {
  return Array.from({ length: count }, () => createMockMessage(overrides));
}

/**
 * Generate a mock image message
 */
export function createMockImageMessage(overrides: Partial<MockMessageData> = {}): MockMessageData {
  return createMockMessage({
    type: 'image',
    content: faker.lorem.words(3),
    attachments: [createMockImageAttachment()],
    ...overrides,
  });
}

/**
 * Generate a mock file attachment
 */
export function createMockImageAttachment(): MockAttachment {
  return {
    type: 'image',
    url: faker.image.url(),
    filename: `${faker.string.alphanumeric(10)}.jpg`,
    mimeType: 'image/jpeg',
    size: faker.number.int({ min: 10000, max: 5000000 }),
    thumbnail: faker.image.url({ width: 150, height: 150 }),
  };
}

/**
 * Generate a mock file attachment
 */
export function createMockFileAttachment(type: 'image' | 'video' | 'audio' | 'file' = 'file'): MockAttachment {
  const mimeTypes: Record<string, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif'],
    video: ['video/mp4', 'video/webm'],
    audio: ['audio/mp3', 'audio/wav', 'audio/ogg'],
    file: ['application/pdf', 'application/msword', 'text/plain'],
  };

  const extensions: Record<string, string[]> = {
    image: ['jpg', 'png', 'gif'],
    video: ['mp4', 'webm'],
    audio: ['mp3', 'wav', 'ogg'],
    file: ['pdf', 'doc', 'txt'],
  };

  const ext = faker.helpers.arrayElement(extensions[type]);

  return {
    type,
    url: faker.internet.url(),
    filename: `${faker.string.alphanumeric(10)}.${ext}`,
    mimeType: faker.helpers.arrayElement(mimeTypes[type]),
    size: faker.number.int({ min: 1000, max: 50000000 }),
    ...(type === 'image' || type === 'video' ? { thumbnail: faker.image.url() } : {}),
  };
}

/**
 * Generate a mock reaction
 */
export function createMockReaction(userId?: string): MockReaction {
  return {
    userId: userId || generateObjectId(),
    emoji: faker.helpers.arrayElement(['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥']),
    createdAt: faker.date.recent({ days: 1 }),
  };
}

/**
 * Generate a conversation thread (messages in sequence)
 */
export function createMockConversationThread(
  conversationId: string,
  participantIds: string[],
  messageCount: number = 10,
): MockMessageData[] {
  const messages: MockMessageData[] = [];
  let lastDate = faker.date.recent({ days: 7 });

  for (let i = 0; i < messageCount; i++) {
    const senderId = faker.helpers.arrayElement(participantIds);
    lastDate = new Date(lastDate.getTime() + faker.number.int({ min: 1000, max: 3600000 }));

    messages.push(
      createMockMessage({
        conversationId,
        senderId,
        createdAt: lastDate,
        updatedAt: lastDate,
      }),
    );
  }

  return messages;
}

/**
 * Generate a mock location message
 */
export function createMockLocationMessage(overrides: Partial<MockMessageData> = {}): MockMessageData {
  const lat = faker.location.latitude();
  const lng = faker.location.longitude();

  return createMockMessage({
    type: 'location',
    content: JSON.stringify({
      latitude: lat,
      longitude: lng,
      address: faker.location.streetAddress({ useFullAddress: true }),
    }),
    ...overrides,
  });
}
