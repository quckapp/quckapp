---
sidebar_position: 2
title: New Features
description: Documentation for new QuckChat features
---

# New Features Implementation

This document details the implementation of 5 major new features for QuckChat:

1. **Broadcast Lists** - Send messages to multiple contacts without creating a group
2. **Linked Devices** - Multi-device support for seamless cross-platform usage
3. **Communities** - Organize multiple groups under a single community
4. **Starred Messages** - Save and organize important messages
5. **Read All** - Mark all conversations as read with one tap

## 1. Broadcast Lists

### Description

Send messages to multiple contacts at once. Recipients receive messages as individual chats, and they can't see other recipients.

### MongoDB Schema

```typescript
// broadcast-list.schema.ts
{
  _id: ObjectId,
  name: String (required),
  createdBy: ObjectId (ref: User, required),
  recipients: [ObjectId] (ref: User),
  description: String,
  lastMessage: ObjectId (ref: Message),
  lastMessageAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/broadcast` | Create a broadcast list |
| GET | `/broadcast` | Get all user's broadcast lists |
| GET | `/broadcast/:id` | Get specific broadcast list |
| PUT | `/broadcast/:id` | Update broadcast list |
| DELETE | `/broadcast/:id` | Delete broadcast list |
| POST | `/broadcast/:id/send` | Send message to all recipients |

### Example: Create Broadcast List

```json
POST /broadcast
{
  "name": "My Team",
  "recipients": ["userId1", "userId2"],
  "description": "Optional description"
}
```

### Example: Send Message

```json
POST /broadcast/:id/send
{
  "type": "text",
  "content": "Hello everyone!",
  "attachments": []
}
```

### Navigation

- **Access from**: Conversations screen - Three-dot menu - "Broadcast Lists"
- **Route**: `ConversationsStack/BroadcastLists`

## 2. Linked Devices

### Description

Use QuckChat on multiple devices simultaneously. All messages sync in real-time across all linked devices.

### MongoDB Schema

Extended `User` schema:

```typescript
linkedDevices: [{
  deviceId: String (required),
  deviceName: String (required),
  deviceType: Enum['mobile', 'web', 'desktop'] (default: 'mobile'),
  lastActive: Date (default: Date.now),
  fcmToken: String,
  linkedAt: Date (default: Date.now)
}]
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/me/linked-devices` | Link a new device |
| GET | `/users/me/linked-devices` | Get all linked devices |
| DELETE | `/users/me/linked-devices/:deviceId` | Unlink a device |
| PUT | `/users/me/linked-devices/:deviceId/active` | Update device activity |

### Example: Link Device

```json
POST /users/me/linked-devices
{
  "deviceId": "unique-device-id",
  "deviceName": "iPhone 13",
  "deviceType": "mobile",
  "fcmToken": "fcm-token-for-notifications"
}
```

### Navigation

- **Access from**: Profile - Settings - "Linked Devices"
- **Route**: `ProfileStack/LinkedDevices`

## 3. Communities

### Description

Create communities to organize multiple groups with shared membership. Similar to WhatsApp Communities.

### MongoDB Schema

```typescript
// community.schema.ts
{
  _id: ObjectId,
  name: String (required),
  description: String,
  avatar: String (URL),
  createdBy: ObjectId (ref: User, required),
  members: [{
    userId: ObjectId (ref: User),
    role: Enum['admin', 'member'] (default: 'member'),
    joinedAt: Date (default: Date.now)
  }],
  groups: [ObjectId] (ref: Conversation),
  announcementGroupId: ObjectId (ref: Conversation),
  isActive: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/communities` | Create a community |
| GET | `/communities` | Get user's communities |
| GET | `/communities/:id` | Get specific community |
| PUT | `/communities/:id` | Update community (admins only) |
| DELETE | `/communities/:id` | Delete community (creator only) |
| POST | `/communities/:id/members` | Add members (admins only) |
| DELETE | `/communities/:id/members/:memberId` | Remove member (admins only) |
| POST | `/communities/:id/groups` | Add group to community |
| DELETE | `/communities/:id/groups/:groupId` | Remove group from community |

### Example: Create Community

```json
POST /communities
{
  "name": "Tech Team",
  "description": "Our technology community",
  "avatar": "https://..."
}
```

### Navigation

- **Access from**: Conversations screen - Three-dot menu - "Communities"
- **Route**: `ConversationsStack/Communities`

## 4. Starred Messages

### Description

Star important messages to find them quickly later. Works across all conversations.

### MongoDB Schema

```typescript
// starred-message.schema.ts
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  messageId: ObjectId (ref: Message, required),
  conversationId: ObjectId (ref: Conversation, required),
  starredAt: Date (default: Date.now),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1, messageId: 1 }` (unique)
- `{ userId: 1, starredAt: -1 }`
- `{ conversationId: 1 }`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/starred/:messageId` | Star a message |
| DELETE | `/starred/:messageId` | Unstar a message |
| GET | `/starred` | Get all starred messages for user |
| GET | `/starred/conversation/:conversationId` | Get starred messages in conversation |

### Example: Star a Message

```
POST /starred/:messageId?conversationId=<id>
```

### Navigation

- **Access from**: Conversations screen - Three-dot menu - "Starred Messages"
- **Route**: `ConversationsStack/StarredMessages`

## 5. Read All

### Description

Mark all unread conversations as read with a single tap. Useful for quickly clearing notification badges.

### API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/conversations/read-all` | Mark all conversations as read |

### Service Logic

```typescript
async markAllAsRead(userId: string): Promise<void> {
  // Find all conversations where user has unread messages
  // Set unreadCount = 0 for that user in all conversations
  // Update lastReadMessageId to the latest message in each conversation
}
```

### UI Integration

Shows "Mark all as read" button at top of conversation list:
- Only visible when there are unread conversations
- Displays checkmark icon with "Mark all as read" text
- Highlighted in primary color

## Navigation Structure

```
MainNavigator
├── ConversationsStack
│   ├── ConversationsList (with Read All button)
│   ├── Chat
│   ├── NewConversation
│   ├── NewGroup
│   ├── ContactInfo
│   ├── ChatProfile
│   ├── BroadcastLists (NEW)
│   ├── StarredMessages (NEW)
│   └── Communities (NEW)
└── ProfileStack
    ├── ProfileView
    ├── EditProfile
    ├── Settings
    ├── NotificationSettings
    ├── PrivacySecurity
    ├── Analytics
    └── LinkedDevices (NEW)
```

## Menu Access Points

### Conversations Screen Three-Dot Menu

1. New Group
2. New Chat
3. **Broadcast Lists** (NEW)
4. **Starred Messages** (NEW)
5. **Communities** (NEW)
6. Settings

### Settings Screen

- Privacy & Security
  - Privacy & Security settings
  - **Linked Devices** (NEW)

### Conversations List

- **Mark all as read button** (NEW) - shows when unread exists

## Database Collections

### New Collections

1. **broadcast_lists** - Stores broadcast list information
2. **communities** - Stores community data and memberships
3. **starred_messages** - Tracks user-starred messages

### Extended Collections

1. **users** - Added `linkedDevices[]` field

## Security & Permissions

### Broadcast Lists

- Only creator can edit/delete broadcast list
- Only creator can send messages to list

### Communities

- Admins can add/remove members
- Admins can add/remove groups
- Only creator can delete community
- Members can view but not edit

### Starred Messages

- User can only see their own starred messages
- Starred status is per-user (not shared)

### Linked Devices

- User can only manage their own devices
- Device authentication required for linking

## API Response Examples

### Broadcast List Response

```json
{
  "_id": "64abc123...",
  "name": "Marketing Team",
  "createdBy": {
    "_id": "user123",
    "displayName": "John Doe"
  },
  "recipients": [
    {
      "_id": "user456",
      "displayName": "Jane Smith",
      "phoneNumber": "+1234567890",
      "avatar": "https://..."
    }
  ],
  "description": "Marketing team broadcast",
  "lastMessageAt": "2025-01-21T10:30:00Z",
  "createdAt": "2025-01-20T08:00:00Z"
}
```

### Starred Message Response

```json
{
  "_id": "star123",
  "userId": "user123",
  "messageId": {
    "_id": "msg456",
    "content": "Important message",
    "type": "text",
    "senderId": {
      "displayName": "John Doe",
      "avatar": "https://..."
    },
    "createdAt": "2025-01-21T09:00:00Z"
  },
  "conversationId": {
    "_id": "conv789",
    "type": "single",
    "name": "Chat with Jane"
  },
  "starredAt": "2025-01-21T10:15:00Z"
}
```

### Community Response

```json
{
  "_id": "comm123",
  "name": "Tech Community",
  "description": "All tech-related discussions",
  "avatar": "https://...",
  "createdBy": "user123",
  "members": [
    {
      "userId": {
        "_id": "user123",
        "displayName": "John Doe"
      },
      "role": "admin",
      "joinedAt": "2025-01-20T00:00:00Z"
    }
  ],
  "groups": ["conv123", "conv456"],
  "isActive": true,
  "createdAt": "2025-01-20T00:00:00Z"
}
```

## Implementation Status

| Feature | Backend Schema | Backend API | Backend Service | Mobile Screen | Navigation | Status |
|---------|---------------|-------------|-----------------|---------------|------------|--------|
| Broadcast Lists | Complete | Complete | Complete | Complete | Complete | Complete |
| Linked Devices | Complete | Complete | Complete | Complete | Complete | Complete |
| Communities | Complete | Complete | Complete | Complete | Complete | Complete |
| Starred Messages | Complete | Complete | Complete | Complete | Complete | Complete |
| Read All | N/A | Complete | Complete | Complete | Complete | Complete |

**All features are fully integrated and ready for use!**
