/**
 * Database Seed Script
 *
 * This script populates the database with realistic fake data for development and testing.
 * Uses @faker-js/faker to generate realistic mock data.
 *
 * Usage:
 *   npm run seed              - Seed the database
 *   npm run seed:clean        - Clear all data and reseed
 *   npm run seed -- --users=50 --conversations=20  - Custom counts
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

dotenv.config();

// Schema definitions
const UserSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, default: null },
    password: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatar: { type: String, default: null },
    bio: { type: String, default: null },
    status: { type: String, default: 'offline', enum: ['online', 'offline', 'away'] },
    lastSeen: { type: Date, default: Date.now },
    fcmTokens: { type: [String], default: [] },
    linkedDevices: { type: Array, default: [] },
    publicKey: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    role: { type: String, default: 'user', enum: ['user', 'moderator', 'admin', 'super_admin'] },
    permissions: { type: [String], default: [] },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: String, default: null },
    oauthProviders: { type: Array, default: [] },
  },
  { timestamps: true },
);

const ConversationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ['single', 'group'] },
    name: { type: String },
    avatar: { type: String },
    description: { type: String },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        joinedAt: { type: Date, default: Date.now },
        lastReadMessageId: { type: String, default: null },
        unreadCount: { type: Number, default: 0 },
        isMuted: { type: Boolean, default: false },
        isPinned: { type: Boolean, default: false },
      },
    ],
    admins: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    disappearingMessagesTimer: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const MessageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'image', 'video', 'audio', 'file', 'call', 'huddle', 'system'],
    },
    content: { type: String },
    encryptedContent: { type: String },
    attachments: { type: Array, default: [] },
    reactions: { type: Array, default: [] },
    readReceipts: { type: Array, default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    isForwarded: { type: Boolean, default: false },
    forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    metadata: { type: Object },
    expiresAt: { type: Date },
    isExpired: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Parse command line arguments
function parseArgs(): { users: number; conversations: number; messages: number; clean: boolean } {
  const args = process.argv.slice(2);
  const config = {
    users: 20,
    conversations: 15,
    messages: 100,
    clean: false,
  };

  args.forEach((arg) => {
    if (arg === '--clean') {
      config.clean = true;
    } else if (arg.startsWith('--users=')) {
      config.users = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--conversations=')) {
      config.conversations = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--messages=')) {
      config.messages = parseInt(arg.split('=')[1], 10);
    }
  });

  return config;
}

// Generate fake user data
function generateUser(index: number): any {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    phoneNumber: faker.phone.number({ style: 'international' }),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    password: '', // Will be set later with bcrypt
    username: faker.internet
      .username({ firstName, lastName })
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20),
    displayName: `${firstName} ${lastName}`,
    avatar: faker.image.avatar(),
    bio: faker.person.bio(),
    status: faker.helpers.arrayElement(['online', 'offline', 'away']),
    lastSeen: faker.date.recent({ days: 7 }),
    isActive: true,
    isVerified: faker.datatype.boolean({ probability: 0.7 }),
    role: 'user',
    linkedDevices:
      faker.datatype.boolean({ probability: 0.3 })
        ? [
            {
              deviceId: faker.string.uuid(),
              deviceName: faker.helpers.arrayElement([
                'iPhone 15 Pro',
                'Samsung Galaxy S24',
                'Pixel 8',
                'OnePlus 12',
              ]),
              deviceType: 'mobile',
              lastActive: faker.date.recent({ days: 1 }),
              linkedAt: faker.date.past({ years: 1 }),
            },
          ]
        : [],
  };
}

// Generate conversation data
function generateConversation(users: any[], type: 'single' | 'group'): any {
  const participantCount = type === 'single' ? 2 : faker.number.int({ min: 3, max: 10 });
  const selectedUsers = faker.helpers.arrayElements(users, participantCount);
  const creator = selectedUsers[0];

  const conversation: any = {
    type,
    participants: selectedUsers.map((user) => ({
      userId: user._id,
      joinedAt: faker.date.past({ years: 1 }),
      unreadCount: faker.number.int({ min: 0, max: 20 }),
      isMuted: faker.datatype.boolean({ probability: 0.1 }),
      isPinned: faker.datatype.boolean({ probability: 0.15 }),
    })),
    createdBy: creator._id,
    lastMessageAt: faker.date.recent({ days: 30 }),
    isArchived: faker.datatype.boolean({ probability: 0.05 }),
    isLocked: false,
    disappearingMessagesTimer: faker.helpers.arrayElement([0, 0, 0, 86400, 604800]),
  };

  if (type === 'group') {
    conversation.name = faker.helpers.arrayElement([
      faker.company.name() + ' Team',
      faker.word.adjective() + ' ' + faker.word.noun() + 's',
      faker.music.genre() + ' Lovers',
      faker.location.city() + ' Friends',
      faker.commerce.department() + ' Chat',
    ]);
    conversation.description = faker.lorem.sentence();
    conversation.avatar = faker.image.urlLoremFlickr({ category: 'people' });
    conversation.admins = [creator._id.toString()];
  }

  return conversation;
}

// Generate message data
function generateMessage(conversation: any, users: any[]): any {
  const participantIds: any[] = conversation.participants.map((p: any) => p.userId);
  const sender: any = faker.helpers.arrayElement(participantIds);
  const messageType = faker.helpers.weightedArrayElement([
    { value: 'text', weight: 85 },
    { value: 'image', weight: 8 },
    { value: 'audio', weight: 4 },
    { value: 'file', weight: 3 },
  ]);

  const message: any = {
    conversationId: conversation._id,
    senderId: sender,
    type: messageType,
    isEdited: faker.datatype.boolean({ probability: 0.05 }),
    isDeleted: faker.datatype.boolean({ probability: 0.02 }),
    isForwarded: faker.datatype.boolean({ probability: 0.1 }),
    reactions: [],
    readReceipts: [],
  };

  switch (messageType) {
    case 'text':
      message.content = faker.helpers.arrayElement([
        faker.lorem.sentence(),
        faker.lorem.sentences({ min: 1, max: 3 }),
        faker.hacker.phrase(),
        faker.company.catchPhrase(),
        '👍',
        '😂',
        'OK',
        'Thanks!',
        'See you soon!',
        faker.lorem.paragraph(),
      ]);
      break;

    case 'image':
      message.content = 'Shared an image';
      message.attachments = [
        {
          type: 'image',
          url: faker.image.url(),
          thumbnailUrl: faker.image.url({ width: 150, height: 150 }),
          fileName: faker.system.fileName({ extensionCount: 1 }),
          fileSize: faker.number.int({ min: 50000, max: 5000000 }),
          mimeType: 'image/jpeg',
          width: faker.number.int({ min: 640, max: 4096 }),
          height: faker.number.int({ min: 480, max: 3072 }),
        },
      ];
      break;

    case 'audio':
      message.content = 'Voice message';
      message.attachments = [
        {
          type: 'audio',
          url: faker.internet.url(),
          fileName: 'voice_message.m4a',
          fileSize: faker.number.int({ min: 10000, max: 500000 }),
          mimeType: 'audio/m4a',
          duration: faker.number.int({ min: 1, max: 120 }),
        },
      ];
      break;

    case 'file':
      message.content = 'Shared a file';
      message.attachments = [
        {
          type: 'file',
          url: faker.internet.url(),
          fileName: faker.system.fileName(),
          fileSize: faker.number.int({ min: 1000, max: 10000000 }),
          mimeType: faker.system.mimeType(),
        },
      ];
      break;
  }

  // Add reactions occasionally
  if (faker.datatype.boolean({ probability: 0.2 })) {
    const reactionCount = faker.number.int({ min: 1, max: 5 });
    const reactors = faker.helpers.arrayElements(participantIds, Math.min(reactionCount, participantIds.length));
    message.reactions = reactors.map((userId: any) => ({
      emoji: faker.helpers.arrayElement(['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']),
      userId,
      createdAt: faker.date.recent({ days: 7 }),
    }));
  }

  // Add read receipts
  const readers = faker.helpers.arrayElements(
    participantIds.filter((id: any) => id.toString() !== sender.toString()),
    faker.number.int({ min: 0, max: participantIds.length - 1 }),
  );
  message.readReceipts = readers.map((userId: any) => ({
    userId,
    readAt: faker.date.recent({ days: 1 }),
  }));

  return message;
}

async function seed() {
  const config = parseArgs();
  const mongoUri =
    process.env.MONGODB_URI_DEV || process.env.MONGODB_URI || 'mongodb://localhost:27017/quckchat';

  console.log('\n🌱 Starting database seed...\n');
  console.log(`Configuration:`);
  console.log(`  - Users: ${config.users}`);
  console.log(`  - Conversations: ${config.conversations}`);
  console.log(`  - Messages: ${config.messages}`);
  console.log(`  - Clean mode: ${config.clean}`);
  console.log('');

  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', UserSchema);
    const Conversation = mongoose.model('Conversation', ConversationSchema);
    const Message = mongoose.model('Message', MessageSchema);

    // Clean existing data if requested
    if (config.clean) {
      console.log('🗑️  Cleaning existing data...');
      await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
      console.log('✅ Database cleaned\n');
    }

    // Generate and insert users
    console.log(`👥 Creating ${config.users} users...`);
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const usersData = Array.from({ length: config.users }, (_, i) => ({
      ...generateUser(i),
      password: hashedPassword,
    }));

    // Ensure unique usernames
    const usedUsernames = new Set<string>();
    usersData.forEach((user) => {
      let username = user.username;
      let counter = 1;
      while (usedUsernames.has(username)) {
        username = `${user.username}${counter}`;
        counter++;
      }
      user.username = username;
      usedUsernames.add(username);
    });

    const users = await User.insertMany(usersData, { ordered: false }).catch((err) => {
      // Handle duplicate key errors gracefully
      if (err.writeErrors) {
        console.log(`⚠️  Some users skipped due to duplicates`);
        return err.insertedDocs || [];
      }
      throw err;
    });
    console.log(`✅ Created ${users.length} users\n`);

    if (users.length < 2) {
      console.log('❌ Not enough users to create conversations. Exiting.');
      return;
    }

    // Generate and insert conversations
    console.log(`💬 Creating ${config.conversations} conversations...`);
    const conversationsData = Array.from({ length: config.conversations }, () => {
      const type = faker.helpers.weightedArrayElement([
        { value: 'single' as const, weight: 60 },
        { value: 'group' as const, weight: 40 },
      ]);
      return generateConversation(users, type);
    });

    const conversations = await Conversation.insertMany(conversationsData);
    console.log(`✅ Created ${conversations.length} conversations\n`);

    // Generate and insert messages
    console.log(`📝 Creating ${config.messages} messages...`);
    const messagesData: any[] = [];
    const messagesPerConversation = Math.ceil(config.messages / conversations.length);

    conversations.forEach((conversation) => {
      const messageCount = faker.number.int({
        min: Math.floor(messagesPerConversation * 0.5),
        max: Math.ceil(messagesPerConversation * 1.5),
      });

      for (let i = 0; i < messageCount && messagesData.length < config.messages; i++) {
        messagesData.push(generateMessage(conversation, users));
      }
    });

    // Sort messages by a random date to simulate real conversation flow
    messagesData.forEach((msg, index) => {
      msg.createdAt = faker.date.recent({ days: 30 });
    });
    messagesData.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const messages = await Message.insertMany(messagesData);
    console.log(`✅ Created ${messages.length} messages\n`);

    // Update last message references in conversations
    console.log('🔄 Updating conversation references...');
    for (const conversation of conversations) {
      const lastMessage = await Message.findOne({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .exec();

      if (lastMessage) {
        await Conversation.updateOne(
          { _id: conversation._id },
          {
            lastMessage: lastMessage._id,
            lastMessageAt: lastMessage.createdAt,
          },
        );
      }
    }
    console.log('✅ References updated\n');

    // Print summary
    console.log('═'.repeat(50));
    console.log('📊 SEED SUMMARY');
    console.log('═'.repeat(50));
    console.log(`  Users created:         ${users.length}`);
    console.log(`  Conversations created: ${conversations.length}`);
    console.log(`  Messages created:      ${messages.length}`);
    console.log('═'.repeat(50));
    console.log('\n📌 Test user credentials:');
    console.log('   Phone: (any seeded user phone number)');
    console.log('   Password: Password123!');
    console.log('═'.repeat(50));

    // Print some sample users
    console.log('\n👤 Sample users:');
    users.slice(0, 5).forEach((user: any) => {
      console.log(`   - ${user.displayName} (@${user.username}) - ${user.phoneNumber}`);
    });

    console.log('\n✨ Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

seed();
