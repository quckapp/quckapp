---
sidebar_position: 4
title: Database Architecture
description: MongoDB schema design and data modeling
---

# Database Architecture

QuckChat uses MongoDB as the primary database with Mongoose ODM for schema definition and data access.

## Database Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MONGODB COLLECTIONS                              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        CORE COLLECTIONS                             │ │
│  │                                                                     │ │
│  │  ┌──────────┐    ┌──────────────┐    ┌──────────────┐             │ │
│  │  │  users   │───▶│conversations │◀───│   messages   │             │ │
│  │  └──────────┘    └──────────────┘    └──────────────┘             │ │
│  │       │                  │                   │                     │ │
│  │       ▼                  ▼                   ▼                     │ │
│  │  ┌──────────┐    ┌──────────────┐    ┌──────────────┐             │ │
│  │  │ contacts │    │    calls     │    │    media     │             │ │
│  │  └──────────┘    └──────────────┘    └──────────────┘             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        AUTH COLLECTIONS                             │ │
│  │                                                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐       │ │
│  │  │  otprecords  │  │   sessions   │  │ twofactorsecrets   │       │ │
│  │  └──────────────┘  └──────────────┘  └────────────────────┘       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      FEATURE COLLECTIONS                            │ │
│  │                                                                     │ │
│  │  ┌────────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────────┐  │ │
│  │  │notifications│ │communities│ │  broadcasts │ │scheduledmessages│  │ │
│  │  └────────────┘ └──────────┘ └─────────────┘ └─────────────────┘  │ │
│  │                                                                     │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐          │ │
│  │  │  polls   │ │ statuses │ │  huddles │ │ starredmessages│         │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                       ADMIN COLLECTIONS                             │ │
│  │                                                                     │ │
│  │  ┌────────────┐  ┌──────────┐  ┌───────────────┐                   │ │
│  │  │ auditlogs  │  │ reports  │  │ systemmetrics │                   │ │
│  │  └────────────┘  └──────────┘  └───────────────┘                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Schemas

### User Schema

```typescript
const UserSchema = new Schema({
  // Identity
  phoneNumber: { type: String, required: true, unique: true },
  email: { type: String, sparse: true },
  password: { type: String },

  // Profile
  username: { type: String, unique: true, sparse: true },
  displayName: { type: String },
  avatar: { type: String },
  bio: { type: String, maxlength: 500 },

  // Status
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  lastSeen: { type: Date },
  statusMessage: { type: String },

  // Auth
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'super_admin'],
    default: 'user'
  },
  permissions: [String],

  // Devices & Tokens
  devices: [{
    deviceId: String,
    deviceName: String,
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    lastActive: Date,
  }],
  fcmTokens: [{ token: String, platform: String }],

  // OAuth
  googleId: { type: String, sparse: true },
  facebookId: { type: String, sparse: true },
  appleId: { type: String, sparse: true },

}, { timestamps: true });

// Indexes
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ 'devices.deviceId': 1 });
```

### Conversation Schema

```typescript
const ConversationSchema = new Schema({
  // Type
  type: {
    type: String,
    enum: ['single', 'group'],
    required: true
  },

  // Group Info (group only)
  name: { type: String },
  description: { type: String },
  avatar: { type: String },

  // Participants
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Last Activity
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: { type: Date },

  // Settings
  settings: {
    muteNotifications: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },

  // Features
  pinnedMessages: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }],
  disappearingMessagesTimer: {
    type: Number,
    enum: [0, 86400, 604800, 2592000] // Off, 1d, 7d, 30d
  },

}, { timestamps: true });

// Indexes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ type: 1, participants: 1 });
```

### Message Schema

```typescript
const MessageSchema = new Schema({
  // References
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Content
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact'],
    default: 'text'
  },
  content: { type: String },

  // Attachments
  attachments: [{
    type: { type: String },
    url: { type: String },
    filename: { type: String },
    size: { type: Number },
    mimeType: { type: String },
    thumbnailUrl: { type: String },
    duration: { type: Number }, // For audio/video
    dimensions: {
      width: Number,
      height: Number,
    },
  }],

  // Reply
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },

  // Reactions
  reactions: [{
    emoji: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],

  // Read Status
  readBy: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date },
  }],

  // Status Flags
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  isForwarded: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },

  // Metadata
  metadata: {
    linkPreview: {
      url: String,
      title: String,
      description: String,
      image: String,
    },
  },

}, { timestamps: true });

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ content: 'text' }); // Full-text search
```

### Call Schema

```typescript
const CallSchema = new Schema({
  // References
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  initiatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Call Type
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  isGroupCall: { type: Boolean, default: false },

  // Status
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'active', 'ended', 'missed', 'rejected'],
    default: 'initiated'
  },

  // Participants
  participants: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: Date,
    leftAt: Date,
    status: {
      type: String,
      enum: ['ringing', 'joined', 'left', 'rejected', 'missed']
    },
  }],

  // Timing
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number }, // in seconds

}, { timestamps: true });

// Indexes
CallSchema.index({ conversationId: 1, createdAt: -1 });
CallSchema.index({ initiatorId: 1 });
CallSchema.index({ 'participants.userId': 1 });
```

## Auth Schemas

### OTP Record Schema

```typescript
const OtpRecordSchema = new Schema({
  phoneNumber: { type: String, required: true },
  code: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

// TTL Index - Auto-delete after expiry
OtpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Session Schema

```typescript
const SessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: { type: String, required: true },
  refreshToken: { type: String },
  deviceInfo: {
    deviceId: String,
    deviceName: String,
    platform: String,
    osVersion: String,
    appVersion: String,
    ip: String,
    userAgent: String,
  },
  isActive: { type: Boolean, default: true },
  lastActive: { type: Date, default: Date.now },
  expiresAt: { type: Date },
}, { timestamps: true });

// Indexes
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ token: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Two Factor Secret Schema

```typescript
const TwoFactorSecretSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  secret: { type: String, required: true },
  isEnabled: { type: Boolean, default: false },
  backupCodes: [{
    code: String,
    usedAt: Date,
  }],
  verifiedAt: { type: Date },
}, { timestamps: true });
```

## Feature Schemas

### Notification Schema

```typescript
const NotificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['message', 'call', 'mention', 'reaction', 'system'],
    required: true
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

// Indexes
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
```

### Poll Schema

```typescript
const PollSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  question: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    votes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
  }],
  allowMultiple: { type: Boolean, default: false },
  isAnonymous: { type: Boolean, default: false },
  expiresAt: { type: Date },
  isClosed: { type: Boolean, default: false },
}, { timestamps: true });
```

## Mongoose Plugins

### Soft Delete
```typescript
import mongooseDelete from 'mongoose-delete';

UserSchema.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: true
});
```

### Pagination
```typescript
import mongoosePaginate from 'mongoose-paginate-v2';

MessageSchema.plugin(mongoosePaginate);

// Usage
const result = await Message.paginate(
  { conversationId },
  { page: 1, limit: 50, sort: { createdAt: -1 } }
);
```

### Auto-populate
```typescript
import mongooseAutopopulate from 'mongoose-autopopulate';

MessageSchema.plugin(mongooseAutopopulate);

// In schema
senderId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  autopopulate: { select: 'displayName avatar' }
}
```

## Indexing Strategy

### Compound Indexes
```typescript
// Conversation lookup by participants
ConversationSchema.index({ type: 1, participants: 1 });

// Message retrieval by conversation
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// User search
UserSchema.index({ displayName: 'text', username: 'text' });
```

### Partial Indexes
```typescript
// Only index active sessions
SessionSchema.index(
  { userId: 1 },
  { partialFilterExpression: { isActive: true } }
);
```

## Data Relationships

```
User (1) ──────┬──── (N) Conversation
               │
               ├──── (N) Message
               │
               ├──── (N) Contact
               │
               ├──── (N) Session
               │
               └──── (1) TwoFactorSecret

Conversation (1) ──── (N) Message
               │
               └──── (N) Call

Message (1) ──── (N) Reaction
          │
          └──── (1) ReplyTo (self-reference)
```

## Database Configuration

```typescript
// mongoose.config.ts
export const mongooseConfig = {
  uri: process.env.NODE_ENV === 'production'
    ? process.env.MONGODB_URI_PROD
    : process.env.MONGODB_URI_DEV,
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  },
};
```
