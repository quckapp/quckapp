// QuikApp MongoDB Initialization Script
// Creates databases and indexes for all MongoDB-backed microservices

// ============================================
// Elixir Services (Real-time Communication)
// ============================================

// Presence Service Database
db = db.getSiblingDB('quikapp_presence');
db.createCollection('user_presence');
db.user_presence.createIndex({ "userId": 1 }, { unique: true });
db.user_presence.createIndex({ "status": 1 });
db.user_presence.createIndex({ "lastSeenAt": 1 });
db.user_presence.createIndex({ "workspaceId": 1, "status": 1 });

db.createCollection('presence_subscriptions');
db.presence_subscriptions.createIndex({ "subscriberId": 1 });
db.presence_subscriptions.createIndex({ "targetUserId": 1 });

// Call Service Database
db = db.getSiblingDB('quikapp_calls');
db.createCollection('active_calls');
db.active_calls.createIndex({ "callId": 1 }, { unique: true });
db.active_calls.createIndex({ "channelId": 1 });
db.active_calls.createIndex({ "status": 1 });
db.active_calls.createIndex({ "createdAt": -1 });
db.active_calls.createIndex({ "participants.userId": 1 });

db.createCollection('call_history');
db.call_history.createIndex({ "callId": 1 }, { unique: true });
db.call_history.createIndex({ "participants.userId": 1 });
db.call_history.createIndex({ "channelId": 1 });
db.call_history.createIndex({ "startedAt": -1 });
db.call_history.createIndex({ "endedAt": -1 });

db.createCollection('call_recordings');
db.call_recordings.createIndex({ "callId": 1 });
db.call_recordings.createIndex({ "createdAt": -1 });

// Message Service Database
db = db.getSiblingDB('quikapp_messages');
db.createCollection('messages');
db.messages.createIndex({ "channelId": 1, "createdAt": -1 });
db.messages.createIndex({ "senderId": 1 });
db.messages.createIndex({ "threadId": 1, "createdAt": -1 });
db.messages.createIndex({ "createdAt": -1 });
db.messages.createIndex({ "channelId": 1, "status": 1 });
db.messages.createIndex({ "mentions": 1 });
db.messages.createIndex({ "reactions.userId": 1 });

db.createCollection('message_reads');
db.message_reads.createIndex({ "messageId": 1 });
db.message_reads.createIndex({ "userId": 1 });
db.message_reads.createIndex({ "channelId": 1, "userId": 1 });

db.createCollection('typing_indicators');
db.typing_indicators.createIndex({ "channelId": 1 });
db.typing_indicators.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

// Notification Orchestrator Database
db = db.getSiblingDB('quikapp_notification_orchestrator');
db.createCollection('notification_queue');
db.notification_queue.createIndex({ "userId": 1, "status": 1 });
db.notification_queue.createIndex({ "priority": -1, "createdAt": 1 });
db.notification_queue.createIndex({ "status": 1, "scheduledAt": 1 });
db.notification_queue.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

db.createCollection('notification_preferences');
db.notification_preferences.createIndex({ "userId": 1 }, { unique: true });
db.notification_preferences.createIndex({ "userId": 1, "channelId": 1 });

db.createCollection('notification_history');
db.notification_history.createIndex({ "userId": 1, "createdAt": -1 });
db.notification_history.createIndex({ "type": 1 });
db.notification_history.createIndex({ "createdAt": -1 });

// Huddle Service Database
db = db.getSiblingDB('quikapp_huddles');
db.createCollection('active_huddles');
db.active_huddles.createIndex({ "huddleId": 1 }, { unique: true });
db.active_huddles.createIndex({ "channelId": 1 });
db.active_huddles.createIndex({ "status": 1 });
db.active_huddles.createIndex({ "participants.userId": 1 });

db.createCollection('huddle_history');
db.huddle_history.createIndex({ "huddleId": 1 });
db.huddle_history.createIndex({ "channelId": 1 });
db.huddle_history.createIndex({ "startedAt": -1 });

// Event Broadcast Service Database
db = db.getSiblingDB('quikapp_events');
db.createCollection('events');
db.events.createIndex({ "eventId": 1 }, { unique: true });
db.events.createIndex({ "type": 1 });
db.events.createIndex({ "targetType": 1, "targetId": 1 });
db.events.createIndex({ "createdAt": -1 });
db.events.createIndex({ "processed": 1, "createdAt": 1 });

db.createCollection('event_subscriptions');
db.event_subscriptions.createIndex({ "subscriberId": 1 });
db.event_subscriptions.createIndex({ "eventType": 1 });
db.event_subscriptions.createIndex({ "targetType": 1, "targetId": 1 });

// ============================================
// Go Services (Storage)
// ============================================

// Media Service Database
db = db.getSiblingDB('quikapp_media');
db.createCollection('media');
db.media.createIndex({ "mediaId": 1 }, { unique: true });
db.media.createIndex({ "userId": 1 });
db.media.createIndex({ "workspaceId": 1 });
db.media.createIndex({ "messageId": 1 });
db.media.createIndex({ "type": 1 });
db.media.createIndex({ "createdAt": -1 });
db.media.createIndex({ "status": 1 });

db.createCollection('media_processing_jobs');
db.media_processing_jobs.createIndex({ "mediaId": 1 });
db.media_processing_jobs.createIndex({ "status": 1, "createdAt": 1 });
db.media_processing_jobs.createIndex({ "priority": -1, "createdAt": 1 });

// File Service Database
db = db.getSiblingDB('quikapp_files');
db.createCollection('files');
db.files.createIndex({ "fileId": 1 }, { unique: true });
db.files.createIndex({ "userId": 1 });
db.files.createIndex({ "workspaceId": 1 });
db.files.createIndex({ "channelId": 1 });
db.files.createIndex({ "messageId": 1 });
db.files.createIndex({ "mimeType": 1 });
db.files.createIndex({ "createdAt": -1 });
db.files.createIndex({ "name": "text", "originalName": "text" });

db.createCollection('file_versions');
db.file_versions.createIndex({ "fileId": 1, "version": -1 });
db.file_versions.createIndex({ "createdAt": -1 });

db.createCollection('file_shares');
db.file_shares.createIndex({ "fileId": 1 });
db.file_shares.createIndex({ "sharedWith": 1 });
db.file_shares.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

// Attachment Service Database
db = db.getSiblingDB('quikapp_attachments');
db.createCollection('attachments');
db.attachments.createIndex({ "attachmentId": 1 }, { unique: true });
db.attachments.createIndex({ "messageId": 1 });
db.attachments.createIndex({ "userId": 1 });
db.attachments.createIndex({ "type": 1 });
db.attachments.createIndex({ "createdAt": -1 });

db.createCollection('attachment_previews');
db.attachment_previews.createIndex({ "attachmentId": 1 });
db.attachment_previews.createIndex({ "status": 1 });

// CDN Service Database
db = db.getSiblingDB('quikapp_cdn');
db.createCollection('cdn_assets');
db.cdn_assets.createIndex({ "assetId": 1 }, { unique: true });
db.cdn_assets.createIndex({ "originalUrl": 1 });
db.cdn_assets.createIndex({ "cdnUrl": 1 });
db.cdn_assets.createIndex({ "status": 1 });
db.cdn_assets.createIndex({ "expiresAt": 1 });

db.createCollection('cdn_cache_stats');
db.cdn_cache_stats.createIndex({ "assetId": 1 });
db.cdn_cache_stats.createIndex({ "lastAccessedAt": -1 });

// ============================================
// Main QuikApp Database (Shared/Legacy)
// ============================================

db = db.getSiblingDB('quikapp');

// Users collection (shared reference)
db.createCollection('users');
db.users.createIndex({ "userId": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });

// Conversations collection
db.createCollection('conversations');
db.conversations.createIndex({ "participants": 1 });
db.conversations.createIndex({ "type": 1 });
db.conversations.createIndex({ "updatedAt": -1 });
db.conversations.createIndex({ "workspaceId": 1 });
db.conversations.createIndex({ "participants": 1, "type": 1 });

// Notifications collection (for notification-service NestJS)
db.createCollection('notifications');
db.notifications.createIndex({ "userId": 1, "read": 1 });
db.notifications.createIndex({ "createdAt": -1 });
db.notifications.createIndex({ "type": 1 });

print('QuikApp MongoDB initialization complete');
print('Created databases: quikapp_presence, quikapp_calls, quikapp_messages, quikapp_notification_orchestrator, quikapp_huddles, quikapp_events, quikapp_media, quikapp_files, quikapp_attachments, quikapp_cdn, quikapp');
