/**
 * Event Payloads - Type definitions for event data
 * Ensures type safety when emitting and handling events
 */

// ============================================
// BASE EVENT PAYLOAD
// ============================================
export interface BaseEventPayload {
  timestamp: Date;
  correlationId?: string;
  metadata?: Record<string, any>;
}

// ============================================
// USER EVENT PAYLOADS
// ============================================
export interface UserCreatedPayload extends BaseEventPayload {
  userId: string;
  phoneNumber: string;
  displayName?: string;
  createdAt: Date;
}

export interface UserUpdatedPayload extends BaseEventPayload {
  userId: string;
  changes: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
}

export interface UserDeletedPayload extends BaseEventPayload {
  userId: string;
  reason?: string;
  deletedAt: Date;
}

export interface UserLoginPayload extends BaseEventPayload {
  userId: string;
  deviceInfo?: {
    type: string;
    os: string;
    browser?: string;
    appVersion?: string;
  };
  ipAddress?: string;
  location?: string;
}

export interface UserLogoutPayload extends BaseEventPayload {
  userId: string;
  sessionId?: string;
  reason?: 'manual' | 'timeout' | 'forced' | 'security';
}

export interface UserLoginFailedPayload extends BaseEventPayload {
  identifier: string;
  reason: string;
  ipAddress?: string;
  attemptCount?: number;
}

export interface UserPasswordChangedPayload extends BaseEventPayload {
  userId: string;
  ipAddress?: string;
}

export interface UserStatusChangedPayload extends BaseEventPayload {
  userId: string;
  previousStatus: string;
  newStatus: string;
}

export interface UserBlockedPayload extends BaseEventPayload {
  userId: string;
  blockedUserId: string;
}

export interface User2FAPayload extends BaseEventPayload {
  userId: string;
  method: 'totp' | 'sms' | 'email';
}

// ============================================
// MESSAGE EVENT PAYLOADS
// ============================================
export interface MessageSentPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientIds: string[];
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact';
  hasMedia: boolean;
  isReply: boolean;
  isForwarded: boolean;
}

export interface MessageDeliveredPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  recipientId: string;
  deliveredAt: Date;
}

export interface MessageReadPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  readerId: string;
  readAt: Date;
}

export interface MessageDeletedPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  deletedBy: string;
  deleteType: 'for_me' | 'for_everyone';
}

export interface MessageEditedPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  editedBy: string;
  previousContent?: string;
  editedAt: Date;
}

export interface MessageReactionPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  userId: string;
  reaction: string;
}

export interface MessagePinnedPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  pinnedBy: string;
}

export interface ScheduledMessageSentPayload extends BaseEventPayload {
  messageId: string;
  scheduledMessageId: string;
  conversationId: string;
  senderId: string;
  scheduledFor: Date;
  actualSentAt: Date;
}

// ============================================
// CONVERSATION EVENT PAYLOADS
// ============================================
export interface ConversationCreatedPayload extends BaseEventPayload {
  conversationId: string;
  type: 'direct' | 'group';
  creatorId: string;
  participantIds: string[];
  name?: string;
}

export interface ConversationUpdatedPayload extends BaseEventPayload {
  conversationId: string;
  updatedBy: string;
  changes: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
}

export interface ConversationParticipantPayload extends BaseEventPayload {
  conversationId: string;
  userId: string;
  addedBy?: string;
  removedBy?: string;
  role?: string;
}

export interface ConversationTypingPayload extends BaseEventPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

// ============================================
// CALL EVENT PAYLOADS
// ============================================
export interface CallInitiatedPayload extends BaseEventPayload {
  callId: string;
  callerId: string;
  calleeIds: string[];
  callType: 'audio' | 'video';
  conversationId?: string;
}

export interface CallAnsweredPayload extends BaseEventPayload {
  callId: string;
  answeredBy: string;
  answeredAt: Date;
}

export interface CallEndedPayload extends BaseEventPayload {
  callId: string;
  endedBy?: string;
  reason: 'completed' | 'rejected' | 'missed' | 'failed' | 'busy';
  duration?: number; // in seconds
  participantCount: number;
}

export interface CallParticipantPayload extends BaseEventPayload {
  callId: string;
  userId: string;
  action: 'joined' | 'left';
}

export interface CallMediaPayload extends BaseEventPayload {
  callId: string;
  userId: string;
  mediaType: 'audio' | 'video' | 'screen';
  enabled: boolean;
}

// ============================================
// NOTIFICATION EVENT PAYLOADS
// ============================================
export interface NotificationCreatedPayload extends BaseEventPayload {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationSentPayload extends BaseEventPayload {
  notificationId: string;
  userId: string;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  success: boolean;
  error?: string;
}

export interface PushTokenPayload extends BaseEventPayload {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
}

// ============================================
// STATUS EVENT PAYLOADS
// ============================================
export interface StatusCreatedPayload extends BaseEventPayload {
  statusId: string;
  userId: string;
  mediaType: 'image' | 'video' | 'text';
  expiresAt: Date;
}

export interface StatusViewedPayload extends BaseEventPayload {
  statusId: string;
  viewerId: string;
  viewedAt: Date;
}

export interface StatusExpiredPayload extends BaseEventPayload {
  statusId: string;
  userId: string;
  expiredAt: Date;
}

// ============================================
// POLL EVENT PAYLOADS
// ============================================
export interface PollCreatedPayload extends BaseEventPayload {
  pollId: string;
  messageId: string;
  conversationId: string;
  creatorId: string;
  question: string;
  options: string[];
  endsAt?: Date;
}

export interface PollVotedPayload extends BaseEventPayload {
  pollId: string;
  voterId: string;
  optionIndex: number;
  previousOptionIndex?: number;
}

export interface PollClosedPayload extends BaseEventPayload {
  pollId: string;
  closedBy?: string;
  reason: 'manual' | 'expired';
  results: {
    optionIndex: number;
    voteCount: number;
  }[];
}

// ============================================
// COMMUNITY EVENT PAYLOADS
// ============================================
export interface CommunityCreatedPayload extends BaseEventPayload {
  communityId: string;
  name: string;
  creatorId: string;
  isPublic: boolean;
}

export interface CommunityMemberPayload extends BaseEventPayload {
  communityId: string;
  userId: string;
  action: 'joined' | 'left' | 'banned' | 'unbanned';
  performedBy?: string;
  reason?: string;
}

export interface CommunityRolePayload extends BaseEventPayload {
  communityId: string;
  userId: string;
  role: string;
  assignedBy: string;
}

// ============================================
// UPLOAD EVENT PAYLOADS
// ============================================
export interface UploadStartedPayload extends BaseEventPayload {
  uploadId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadCompletedPayload extends BaseEventPayload {
  uploadId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  duration?: number; // upload duration in ms
}

export interface UploadFailedPayload extends BaseEventPayload {
  uploadId: string;
  userId: string;
  fileName: string;
  error: string;
}

export interface TranscriptionCompletedPayload extends BaseEventPayload {
  uploadId: string;
  messageId?: string;
  userId: string;
  transcription: string;
  language?: string;
  confidence?: number;
}

// ============================================
// SYSTEM EVENT PAYLOADS
// ============================================
export interface SystemErrorPayload extends BaseEventPayload {
  errorId: string;
  errorType: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityEventPayload extends BaseEventPayload {
  eventType: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

export interface RateLimitPayload extends BaseEventPayload {
  userId?: string;
  ipAddress: string;
  endpoint: string;
  limit: number;
  current: number;
}

// ============================================
// EXPORT EVENT PAYLOADS
// ============================================
export interface ExportRequestedPayload extends BaseEventPayload {
  exportId: string;
  userId: string;
  exportType: 'messages' | 'media' | 'contacts' | 'all';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ExportCompletedPayload extends BaseEventPayload {
  exportId: string;
  userId: string;
  fileUrl: string;
  fileSize: number;
  expiresAt: Date;
}

// ============================================
// ANALYTICS EVENT PAYLOADS
// ============================================
export interface AnalyticsEventPayload extends BaseEventPayload {
  userId?: string;
  sessionId?: string;
  eventName: string;
  properties?: Record<string, any>;
  platform?: string;
  appVersion?: string;
}
