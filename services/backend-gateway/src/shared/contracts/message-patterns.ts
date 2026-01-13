/**
 * Message Patterns - Contract definitions for microservice communication
 * These patterns define the API between services
 */

// ============================================
// AUTH SERVICE PATTERNS
// ============================================

export const AUTH_PATTERNS = {
  // Commands
  SEND_OTP: 'auth.send_otp',
  VERIFY_OTP: 'auth.verify_otp',
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  REFRESH_TOKEN: 'auth.refresh_token',
  VALIDATE_TOKEN: 'auth.validate_token',
  CHANGE_PASSWORD: 'auth.change_password',
  RESET_PASSWORD: 'auth.reset_password',

  // 2FA
  ENABLE_2FA: 'auth.2fa.enable',
  DISABLE_2FA: 'auth.2fa.disable',
  VERIFY_2FA: 'auth.2fa.verify',

  // OAuth
  OAUTH_LOGIN: 'auth.oauth.login',
  OAUTH_LINK: 'auth.oauth.link',
  OAUTH_UNLINK: 'auth.oauth.unlink',

  // Sessions
  GET_SESSIONS: 'auth.sessions.get',
  REVOKE_SESSION: 'auth.sessions.revoke',
  REVOKE_ALL_SESSIONS: 'auth.sessions.revoke_all',
} as const;

// ============================================
// USERS SERVICE PATTERNS
// ============================================

export const USERS_PATTERNS = {
  // CRUD
  CREATE_USER: 'users.create',
  GET_USER: 'users.get',
  GET_USER_BY_PHONE: 'users.get_by_phone',
  UPDATE_USER: 'users.update',
  DELETE_USER: 'users.delete',

  // Profile
  GET_PROFILE: 'users.profile.get',
  UPDATE_PROFILE: 'users.profile.update',
  UPDATE_AVATAR: 'users.profile.avatar',

  // Search
  SEARCH_USERS: 'users.search',
  GET_CONTACTS: 'users.contacts.get',
  SYNC_CONTACTS: 'users.contacts.sync',

  // Blocking
  BLOCK_USER: 'users.block',
  UNBLOCK_USER: 'users.unblock',
  GET_BLOCKED: 'users.blocked.get',
  GET_BLOCKED_USERS: 'users.blocked.get',

  // Presence
  SET_ONLINE: 'users.presence.online',
  SET_OFFLINE: 'users.presence.offline',
  GET_PRESENCE: 'users.presence.get',
  GET_PRESENCE_BULK: 'users.presence.get_bulk',
  UPDATE_STATUS: 'users.status.update',

  // Settings
  GET_SETTINGS: 'users.settings.get',
  UPDATE_SETTINGS: 'users.settings.update',

  // Verification
  VERIFY_USER: 'users.verify',

  // FCM Tokens
  SAVE_FCM_TOKEN: 'users.fcm_token.save',
  ADD_FCM_TOKEN: 'users.fcm_token.save',
  REMOVE_FCM_TOKEN: 'users.fcm_token.remove',

  // Device linking
  LINK_DEVICE: 'users.device.link',
  UNLINK_DEVICE: 'users.device.unlink',
  GET_LINKED_DEVICES: 'users.devices.get',
} as const;

// ============================================
// MESSAGES SERVICE PATTERNS
// ============================================

export const MESSAGES_PATTERNS = {
  // CRUD
  SEND_MESSAGE: 'messages.send',
  GET_MESSAGE: 'messages.get',
  GET_MESSAGES: 'messages.get_many',
  GET_CONVERSATION_MESSAGES: 'messages.conversation.get',
  EDIT_MESSAGE: 'messages.edit',
  UPDATE_MESSAGE: 'messages.update',
  DELETE_MESSAGE: 'messages.delete',
  DELETE_MESSAGES_BULK: 'messages.delete_bulk',

  // Status
  MARK_DELIVERED: 'messages.mark_delivered',
  MARK_AS_DELIVERED: 'messages.mark_delivered',
  MARK_READ: 'messages.mark_read',
  MARK_AS_READ: 'messages.mark_read',
  MARK_READ_BULK: 'messages.mark_read_bulk',

  // Search
  SEARCH_MESSAGES: 'messages.search',

  // Reactions
  ADD_REACTION: 'messages.reaction.add',
  REMOVE_REACTION: 'messages.reaction.remove',

  // Pinning
  PIN_MESSAGE: 'messages.pin',
  UNPIN_MESSAGE: 'messages.unpin',
  GET_PINNED: 'messages.pinned.get',

  // Starring
  STAR_MESSAGE: 'messages.star',
  UNSTAR_MESSAGE: 'messages.unstar',
  GET_STARRED: 'messages.starred.get',

  // Forwarding
  FORWARD_MESSAGE: 'messages.forward',

  // Unread
  GET_UNREAD_COUNT: 'messages.unread.count',

  // Scheduled
  SCHEDULE_MESSAGE: 'messages.schedule',
  CANCEL_SCHEDULED: 'messages.schedule.cancel',
  GET_SCHEDULED: 'messages.scheduled.get',

  // Disappearing
  SET_DISAPPEARING: 'messages.disappearing.set',
  PROCESS_EXPIRED: 'messages.disappearing.process',
} as const;

// ============================================
// CONVERSATIONS SERVICE PATTERNS
// ============================================

export const CONVERSATIONS_PATTERNS = {
  // CRUD
  CREATE_CONVERSATION: 'conversations.create',
  GET_CONVERSATION: 'conversations.get',
  GET_USER_CONVERSATIONS: 'conversations.get_user',
  UPDATE_CONVERSATION: 'conversations.update',
  DELETE_CONVERSATION: 'conversations.delete',

  // Direct
  GET_OR_CREATE_DIRECT: 'conversations.direct.get_or_create',

  // Participants
  ADD_PARTICIPANT: 'conversations.participant.add',
  REMOVE_PARTICIPANT: 'conversations.participant.remove',
  LEAVE_CONVERSATION: 'conversations.leave',
  GET_PARTICIPANTS: 'conversations.participants.get',

  // Admin
  ADD_ADMIN: 'conversations.admin.add',
  REMOVE_ADMIN: 'conversations.admin.remove',
  MAKE_ADMIN: 'conversations.admin.make',

  // Archive/Mute
  ARCHIVE: 'conversations.archive',
  UNARCHIVE: 'conversations.unarchive',
  MUTE: 'conversations.mute',
  UNMUTE: 'conversations.unmute',
  ARCHIVE_CONVERSATION: 'conversations.archive',
  UNARCHIVE_CONVERSATION: 'conversations.unarchive',
  MUTE_CONVERSATION: 'conversations.mute',
  UNMUTE_CONVERSATION: 'conversations.unmute',

  // Typing
  TYPING_START: 'conversations.typing.start',
  TYPING_STOP: 'conversations.typing.stop',
  SET_TYPING: 'conversations.typing.set',

  // Unread
  GET_UNREAD_COUNT: 'conversations.unread.count',
  CLEAR_UNREAD: 'conversations.unread.clear',
} as const;

// ============================================
// NOTIFICATIONS SERVICE PATTERNS
// ============================================

export const NOTIFICATIONS_PATTERNS = {
  // Send
  SEND_NOTIFICATION: 'notifications.send',
  SEND_BULK_NOTIFICATIONS: 'notifications.send_bulk',
  SEND_PUSH: 'notifications.push.send',
  SEND_EMAIL: 'notifications.email.send',
  SEND_SMS: 'notifications.sms.send',

  // CRUD
  GET_NOTIFICATIONS: 'notifications.get',
  GET_UNREAD_COUNT: 'notifications.unread.count',
  MARK_READ: 'notifications.mark_read',
  MARK_AS_READ: 'notifications.mark_read',
  MARK_ALL_READ: 'notifications.mark_all_read',
  MARK_ALL_AS_READ: 'notifications.mark_all_read',
  DELETE_NOTIFICATION: 'notifications.delete',
  CLEAR_ALL: 'notifications.clear_all',

  // Push Tokens
  REGISTER_TOKEN: 'notifications.token.register',
  REGISTER_PUSH_TOKEN: 'notifications.token.register',
  UNREGISTER_TOKEN: 'notifications.token.unregister',
  UNREGISTER_PUSH_TOKEN: 'notifications.token.unregister',
  GET_TOKENS: 'notifications.tokens.get',

  // Preferences
  GET_PREFERENCES: 'notifications.preferences.get',
  UPDATE_PREFERENCES: 'notifications.preferences.update',
} as const;

// ============================================
// MEDIA SERVICE PATTERNS
// ============================================

export const MEDIA_PATTERNS = {
  // Upload
  UPLOAD_FILE: 'media.upload',
  UPLOAD_MEDIA: 'media.upload',
  UPLOAD_AVATAR: 'media.upload.avatar',
  UPLOAD_STATUS: 'media.upload.status',

  // Processing
  GENERATE_THUMBNAIL: 'media.thumbnail.generate',
  COMPRESS_IMAGE: 'media.image.compress',
  COMPRESS_VIDEO: 'media.video.compress',
  TRANSCRIBE_AUDIO: 'media.audio.transcribe',
  PROCESS_MEDIA: 'media.process',

  // Retrieval
  GET_FILE: 'media.get',
  GET_MEDIA: 'media.get',
  GET_FILE_URL: 'media.url.get',
  GET_DOWNLOAD_URL: 'media.download.url',
  GET_UPLOAD_URL: 'media.upload.url',
  GET_USER_MEDIA: 'media.user.get',
  GET_STORAGE_USAGE: 'media.storage.usage',

  // Delete
  DELETE_FILE: 'media.delete',
  DELETE_MEDIA: 'media.delete',
  DELETE_FILES_BULK: 'media.delete_bulk',

  // Link Preview
  GET_LINK_PREVIEW: 'media.link.preview',
} as const;

// ============================================
// CALLS SERVICE PATTERNS
// ============================================

export const CALLS_PATTERNS = {
  // Lifecycle
  INITIATE_CALL: 'calls.initiate',
  ANSWER_CALL: 'calls.answer',
  REJECT_CALL: 'calls.reject',
  END_CALL: 'calls.end',

  // Participants
  JOIN_CALL: 'calls.join',
  LEAVE_CALL: 'calls.leave',

  // Media
  TOGGLE_AUDIO: 'calls.audio.toggle',
  TOGGLE_VIDEO: 'calls.video.toggle',
  START_SCREEN_SHARE: 'calls.screenshare.start',
  STOP_SCREEN_SHARE: 'calls.screenshare.stop',

  // Signaling
  SEND_OFFER: 'calls.signaling.offer',
  SEND_ANSWER: 'calls.signaling.answer',
  SEND_ICE_CANDIDATE: 'calls.signaling.ice',

  // History
  GET_CALL_HISTORY: 'calls.history.get',
  GET_CALL: 'calls.get',
} as const;

// ============================================
// ANALYTICS SERVICE PATTERNS
// ============================================

export const ANALYTICS_PATTERNS = {
  // Track
  TRACK_EVENT: 'analytics.track',
  TRACK_PAGE_VIEW: 'analytics.pageview',
  TRACK_ERROR: 'analytics.error',

  // Query
  GET_USER_ANALYTICS: 'analytics.user.get',
  GET_CONVERSATION_ANALYTICS: 'analytics.conversation.get',
  GET_SYSTEM_ANALYTICS: 'analytics.system.get',

  // Aggregation
  AGGREGATE_DAILY: 'analytics.aggregate.daily',
  AGGREGATE_WEEKLY: 'analytics.aggregate.weekly',
  AGGREGATE_MONTHLY: 'analytics.aggregate.monthly',
} as const;

// ============================================
// EVENT PATTERNS (Pub/Sub)
// ============================================

export const EVENT_PATTERNS = {
  // User Events
  USER_CREATED: 'event.user.created',
  USER_UPDATED: 'event.user.updated',
  USER_DELETED: 'event.user.deleted',
  USER_ONLINE: 'event.user.online',
  USER_OFFLINE: 'event.user.offline',

  // Message Events
  MESSAGE_SENT: 'event.message.sent',
  MESSAGE_DELIVERED: 'event.message.delivered',
  MESSAGE_READ: 'event.message.read',
  MESSAGE_DELETED: 'event.message.deleted',
  MESSAGE_EDITED: 'event.message.edited',

  // Conversation Events
  CONVERSATION_CREATED: 'event.conversation.created',
  CONVERSATION_UPDATED: 'event.conversation.updated',
  PARTICIPANT_ADDED: 'event.conversation.participant_added',
  PARTICIPANT_REMOVED: 'event.conversation.participant_removed',
  TYPING_STARTED: 'event.conversation.typing_started',
  TYPING_STOPPED: 'event.conversation.typing_stopped',

  // Call Events
  CALL_INITIATED: 'event.call.initiated',
  CALL_ANSWERED: 'event.call.answered',
  CALL_ENDED: 'event.call.ended',
  CALL_MISSED: 'event.call.missed',

  // Notification Events
  NOTIFICATION_SENT: 'event.notification.sent',
  PUSH_SENT: 'event.notification.push_sent',
} as const;
