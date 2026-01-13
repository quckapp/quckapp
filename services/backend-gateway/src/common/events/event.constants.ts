/**
 * Event Constants - Centralized event name definitions
 * Using constants prevents typos and enables autocomplete
 */

// ============================================
// USER EVENTS
// ============================================
export const UserEvents = {
  // Account lifecycle
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
  PROFILE_COMPLETED: 'user.profile.completed',

  // Authentication
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  LOGIN_FAILED: 'user.login.failed',
  PASSWORD_CHANGED: 'user.password.changed',
  PASSWORD_RESET_REQUESTED: 'user.password.reset.requested',
  PASSWORD_RESET_COMPLETED: 'user.password.reset.completed',

  // Two-Factor Authentication
  TWO_FACTOR_ENABLED: 'user.2fa.enabled',
  TWO_FACTOR_DISABLED: 'user.2fa.disabled',
  TWO_FACTOR_VERIFIED: 'user.2fa.verified',

  // Status
  ONLINE: 'user.online',
  OFFLINE: 'user.offline',
  STATUS_CHANGED: 'user.status.changed',

  // Blocking
  BLOCKED: 'user.blocked',
  UNBLOCKED: 'user.unblocked',

  // Settings
  SETTINGS_UPDATED: 'user.settings.updated',
  PRIVACY_UPDATED: 'user.privacy.updated',
} as const;

// ============================================
// MESSAGE EVENTS
// ============================================
export const MessageEvents = {
  // Message lifecycle
  SENT: 'message.sent',
  RECEIVED: 'message.received',
  DELIVERED: 'message.delivered',
  READ: 'message.read',
  DELETED: 'message.deleted',
  EDITED: 'message.edited',

  // Reactions
  REACTION_ADDED: 'message.reaction.added',
  REACTION_REMOVED: 'message.reaction.removed',

  // Special message types
  SCHEDULED_SENT: 'message.scheduled.sent',
  DISAPPEARED: 'message.disappeared',
  PINNED: 'message.pinned',
  UNPINNED: 'message.unpinned',

  // Bulk operations
  BULK_DELETED: 'message.bulk.deleted',
  BULK_READ: 'message.bulk.read',
} as const;

// ============================================
// CONVERSATION EVENTS
// ============================================
export const ConversationEvents = {
  // Lifecycle
  CREATED: 'conversation.created',
  UPDATED: 'conversation.updated',
  DELETED: 'conversation.deleted',
  ARCHIVED: 'conversation.archived',
  UNARCHIVED: 'conversation.unarchived',

  // Participants
  PARTICIPANT_ADDED: 'conversation.participant.added',
  PARTICIPANT_REMOVED: 'conversation.participant.removed',
  PARTICIPANT_LEFT: 'conversation.participant.left',

  // Group specific
  ADMIN_ADDED: 'conversation.admin.added',
  ADMIN_REMOVED: 'conversation.admin.removed',
  NAME_CHANGED: 'conversation.name.changed',
  AVATAR_CHANGED: 'conversation.avatar.changed',
  DESCRIPTION_CHANGED: 'conversation.description.changed',

  // Typing
  TYPING_STARTED: 'conversation.typing.started',
  TYPING_STOPPED: 'conversation.typing.stopped',

  // Mute
  MUTED: 'conversation.muted',
  UNMUTED: 'conversation.unmuted',
} as const;

// ============================================
// CALL EVENTS
// ============================================
export const CallEvents = {
  // Call lifecycle
  INITIATED: 'call.initiated',
  RINGING: 'call.ringing',
  ANSWERED: 'call.answered',
  REJECTED: 'call.rejected',
  ENDED: 'call.ended',
  MISSED: 'call.missed',

  // Participants
  PARTICIPANT_JOINED: 'call.participant.joined',
  PARTICIPANT_LEFT: 'call.participant.left',

  // Media
  MUTED: 'call.muted',
  UNMUTED: 'call.unmuted',
  VIDEO_ENABLED: 'call.video.enabled',
  VIDEO_DISABLED: 'call.video.disabled',
  SCREEN_SHARE_STARTED: 'call.screenshare.started',
  SCREEN_SHARE_STOPPED: 'call.screenshare.stopped',

  // Recording
  RECORDING_STARTED: 'call.recording.started',
  RECORDING_STOPPED: 'call.recording.stopped',
} as const;

// ============================================
// NOTIFICATION EVENTS
// ============================================
export const NotificationEvents = {
  CREATED: 'notification.created',
  SENT: 'notification.sent',
  DELIVERED: 'notification.delivered',
  READ: 'notification.read',
  FAILED: 'notification.failed',

  // Push notifications
  PUSH_SENT: 'notification.push.sent',
  PUSH_FAILED: 'notification.push.failed',
  TOKEN_REGISTERED: 'notification.token.registered',
  TOKEN_REMOVED: 'notification.token.removed',
} as const;

// ============================================
// STATUS/STORY EVENTS
// ============================================
export const StatusEvents = {
  CREATED: 'status.created',
  VIEWED: 'status.viewed',
  DELETED: 'status.deleted',
  EXPIRED: 'status.expired',
  REACTION_ADDED: 'status.reaction.added',
  REPLY_SENT: 'status.reply.sent',
} as const;

// ============================================
// POLL EVENTS
// ============================================
export const PollEvents = {
  CREATED: 'poll.created',
  VOTED: 'poll.voted',
  VOTE_CHANGED: 'poll.vote.changed',
  CLOSED: 'poll.closed',
  RESULTS_AVAILABLE: 'poll.results.available',
} as const;

// ============================================
// COMMUNITY EVENTS
// ============================================
export const CommunityEvents = {
  CREATED: 'community.created',
  UPDATED: 'community.updated',
  DELETED: 'community.deleted',
  MEMBER_JOINED: 'community.member.joined',
  MEMBER_LEFT: 'community.member.left',
  MEMBER_BANNED: 'community.member.banned',
  MEMBER_UNBANNED: 'community.member.unbanned',
  ROLE_ASSIGNED: 'community.role.assigned',
  CHANNEL_CREATED: 'community.channel.created',
  CHANNEL_DELETED: 'community.channel.deleted',
} as const;

// ============================================
// FILE/UPLOAD EVENTS
// ============================================
export const UploadEvents = {
  STARTED: 'upload.started',
  COMPLETED: 'upload.completed',
  FAILED: 'upload.failed',
  DELETED: 'upload.deleted',
  TRANSCRIPTION_COMPLETED: 'upload.transcription.completed',
  THUMBNAIL_GENERATED: 'upload.thumbnail.generated',
} as const;

// ============================================
// SYSTEM EVENTS
// ============================================
export const SystemEvents = {
  // Server lifecycle
  SERVER_STARTED: 'system.server.started',
  SERVER_STOPPING: 'system.server.stopping',

  // Maintenance
  MAINTENANCE_STARTED: 'system.maintenance.started',
  MAINTENANCE_ENDED: 'system.maintenance.ended',

  // Errors
  ERROR_OCCURRED: 'system.error.occurred',
  CRITICAL_ERROR: 'system.error.critical',

  // Security
  SUSPICIOUS_ACTIVITY: 'system.security.suspicious',
  RATE_LIMIT_EXCEEDED: 'system.security.ratelimit',
  BRUTE_FORCE_DETECTED: 'system.security.bruteforce',
} as const;

// ============================================
// ANALYTICS EVENTS
// ============================================
export const AnalyticsEvents = {
  PAGE_VIEW: 'analytics.pageview',
  ACTION_PERFORMED: 'analytics.action',
  ERROR_TRACKED: 'analytics.error',
  PERFORMANCE_METRIC: 'analytics.performance',
} as const;

// ============================================
// EXPORT EVENTS
// ============================================
export const ExportEvents = {
  REQUESTED: 'export.requested',
  STARTED: 'export.started',
  COMPLETED: 'export.completed',
  FAILED: 'export.failed',
  DOWNLOADED: 'export.downloaded',
} as const;

// Combined type for all events
export type AppEvent =
  | (typeof UserEvents)[keyof typeof UserEvents]
  | (typeof MessageEvents)[keyof typeof MessageEvents]
  | (typeof ConversationEvents)[keyof typeof ConversationEvents]
  | (typeof CallEvents)[keyof typeof CallEvents]
  | (typeof NotificationEvents)[keyof typeof NotificationEvents]
  | (typeof StatusEvents)[keyof typeof StatusEvents]
  | (typeof PollEvents)[keyof typeof PollEvents]
  | (typeof CommunityEvents)[keyof typeof CommunityEvents]
  | (typeof UploadEvents)[keyof typeof UploadEvents]
  | (typeof SystemEvents)[keyof typeof SystemEvents]
  | (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]
  | (typeof ExportEvents)[keyof typeof ExportEvents];
