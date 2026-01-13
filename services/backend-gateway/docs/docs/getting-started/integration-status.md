---
sidebar_position: 4
title: Integration Status
description: Backend and MongoDB integration status for all features
---

# Backend & MongoDB Integration Status

Overview of all mobile features integration with the backend API and MongoDB database.

## Fully Integrated Features (Backend + MongoDB)

### 1. User Management

#### User Profile
- **Schema**: `User` (MongoDB)
- **Endpoints**:
  - `GET /users/me` - Get current user
  - `PUT /users/me` - Update profile
  - `GET /users/:id` - Get user by ID
- **Fields**: `phoneNumber`, `email`, `displayName`, `avatar`, `bio`, `status`, `lastSeen`

#### User Status
- Real-time via WebSocket (`user:online`, `user:offline`)
- REST: `PUT /users/me/status`
- Syncs with MongoDB `User.status` and `User.lastSeen`

#### Block Users
- **Endpoints**:
  - `POST /users/me/blocked-users` - Block user
  - `DELETE /users/me/blocked-users/:userId` - Unblock user
  - `GET /users/me/blocked-users` - Get blocked list
- **Stored in**: `UserSettings.blockedUsers[]`

### 2. Conversations

#### Conversation Management
- **Schema**: `Conversation` (MongoDB)
- **Endpoints**:
  - `GET /conversations` - Get all user conversations
  - `GET /conversations/:id` - Get specific conversation
  - `POST /conversations/single` - Create 1-on-1 chat
  - `POST /conversations/group` - Create group chat
  - `PUT /conversations/:id` - Update conversation
  - `DELETE /conversations/:id` - Delete conversation

#### Participants
- **Stored in**: `Conversation.participants[]`
- **Fields**: `userId`, `joinedAt`, `lastReadMessageId`, `unreadCount`, `isMuted`, `isPinned`
- **Endpoints**:
  - `PUT /conversations/:id/participants` - Add participants
  - `DELETE /conversations/:id/participants/:participantId` - Remove participant

### 3. Messages

#### Message CRUD
- **Schema**: `Message` (MongoDB)
- **WebSocket Events**:
  - `message:send` - Send new message
  - `message:edit` - Edit message
  - `message:delete` - Delete message
  - `message:new` - Receive new message
- **Fields**: `conversationId`, `senderId`, `type`, `content`, `attachments[]`, `reactions[]`, `readReceipts[]`

#### Message Types
- Supported: `text`, `image`, `video`, `audio`, `file`, `call`
- Stored with proper metadata in MongoDB

#### Attachments
- **Schema**: `MessageAttachment` (embedded in Message)
- **Upload**: `POST /upload/image` (returns URL)
- **Fields**: `type`, `url`, `thumbnailUrl`, `fileName`, `fileSize`, `mimeType`, `duration`, `width`, `height`

#### Reactions
- **WebSocket**:
  - `message:reaction:add` - Add reaction
  - `message:reaction:remove` - Remove reaction
- **Stored in**: `Message.reactions[]`
- **Fields**: `emoji`, `userId`, `createdAt`

### 4. User Settings
- **Schema**: `UserSettings` (MongoDB)
- **Endpoints**:
  - `GET /users/me/settings` - Get settings
  - `PUT /users/me/settings` - Update settings

### 5. Notifications
- **FCM Token Management**
  - Endpoint: `PUT /users/me/fcm-token`
  - Stored in: `User.fcmTokens[]`
  - Used for push notifications

### 6. Search
- **User Search**
  - Endpoint: `GET /users/search?q=query`
  - Searches: `phoneNumber`, `username`, `displayName`

## UI-Only Features (No Backend Needed)

These features are client-side only and don't require backend persistence:

| Feature | Backend | Description |
|---------|---------|-------------|
| Timestamp Toggle | No | Session-based preference |
| Date Collapse | No | Temporary UI state |
| Date Navigation | No | Client-side filtering |
| Navigation State | No | React Navigation managed |

## Real-Time Features (WebSocket)

| Feature | WebSocket Event | MongoDB Storage |
|---------|----------------|-----------------|
| New Messages | `message:new` | `Message` |
| Message Edits | `message:edited` | `Message.content`, `isEdited` |
| Message Deletes | `message:deleted` | `Message.isDeleted` |
| Reactions | `message:reaction:added/removed` | `Message.reactions[]` |
| Typing Indicators | `typing:start/stop` | Real-time only |
| User Status | `user:online/offline` | `User.status`, `User.lastSeen` |
| Read Receipts | `message:read` | `Message.readReceipts[]` |

## MongoDB Collections

### users
```javascript
{
  _id: ObjectId,
  phoneNumber: String (unique, indexed),
  email: String,
  username: String (indexed),
  displayName: String,
  avatar: String (URL),
  bio: String,
  status: Enum['online', 'offline', 'away'],
  lastSeen: Date,
  fcmTokens: [String],
  publicKey: String,
  isActive: Boolean,
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### conversations
```javascript
{
  _id: ObjectId,
  type: Enum['single', 'group'],
  name: String,
  avatar: String (URL),
  description: String,
  participants: [{
    userId: ObjectId (ref: User, indexed),
    joinedAt: Date,
    lastReadMessageId: String,
    unreadCount: Number,
    isMuted: Boolean,
    isPinned: Boolean
  }],
  admins: [String],
  createdBy: ObjectId (ref: User),
  lastMessage: ObjectId (ref: Message),
  lastMessageAt: Date (indexed),
  isArchived: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### messages
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId (ref: Conversation, indexed),
  senderId: ObjectId (ref: User, indexed),
  type: Enum['text', 'image', 'video', 'audio', 'file', 'call'],
  content: String,
  encryptedContent: String,
  attachments: [{
    type: String,
    url: String,
    thumbnailUrl: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    duration: Number,
    width: Number,
    height: Number
  }],
  reactions: [{
    emoji: String,
    userId: ObjectId (ref: User),
    createdAt: Date
  }],
  readReceipts: [{
    userId: ObjectId (ref: User),
    readAt: Date
  }],
  replyTo: ObjectId (ref: Message),
  isEdited: Boolean,
  isDeleted: Boolean,
  deletedAt: Date,
  metadata: Object,
  createdAt: Date (indexed with conversationId),
  updatedAt: Date
}
```

### user_settings
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  notifications: {
    enabled: Boolean,
    messageNotifications: Boolean,
    groupNotifications: Boolean,
    sound: Boolean,
    vibration: Boolean
  },
  privacy: {
    lastSeen: Enum['everyone', 'contacts', 'nobody'],
    profilePhoto: Enum['everyone', 'contacts', 'nobody'],
    about: Enum['everyone', 'contacts', 'nobody']
  },
  blockedUsers: [ObjectId (ref: User)],
  createdAt: Date,
  updatedAt: Date
}
```

## Feature Sync Summary

| Feature | Mobile | Backend | MongoDB | WebSocket | Status |
|---------|--------|---------|---------|-----------|--------|
| User Profile | Yes | Yes | Yes | Yes | Fully Synced |
| Conversations | Yes | Yes | Yes | Yes | Fully Synced |
| Messages | Yes | Yes | Yes | Yes | Fully Synced |
| Reactions | Yes | Yes | Yes | Yes | Fully Synced |
| Read Receipts | Yes | Yes | Yes | Yes | Fully Synced |
| Typing | Yes | - | - | Yes | Real-time Only |
| Mute Status | Yes | Yes | Yes | - | Fully Synced |
| Block Users | Yes | Yes | Yes | - | Fully Synced |
| Clear Chat | Yes | Yes | Yes | - | Fully Synced |
| Timestamp Toggle | Yes | - | - | - | UI Only |

## Data Flow Examples

### Sending a Message
```
1. User types message → ChatScreen
2. Press send → socket.emit('message:send')
3. Backend receives → Validates → Saves to MongoDB (messages collection)
4. Backend broadcasts → socket.emit('message:new') to all participants
5. Participants receive → Redux updates → UI updates
6. Message appears in ConversationsScreen (lastMessage updated)
```

### Muting a Conversation
```
1. User clicks mute → ChatProfileScreen or 3-dot menu
2. API call → PUT /conversations/:id/mute
3. Backend updates → MongoDB (conversations.participants[].isMuted = true)
4. Response returns → Redux updates → UI updates
5. Notification behavior changes immediately
```

## Conclusion

All core features are fully integrated:
- Messages: Send, receive, edit, delete → MongoDB + WebSocket
- Conversations: Create, update, delete → MongoDB + REST API
- User Management: Profile, status, settings → MongoDB + REST API
- Real-time Features: Typing, status, reactions → WebSocket + MongoDB
- Notifications: FCM tokens, push notifications → MongoDB + REST API
