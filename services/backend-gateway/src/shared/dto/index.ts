/**
 * Shared DTOs - Data Transfer Objects for microservice communication
 * These ensure type safety across service boundaries
 */

// ============================================
// COMMON DTOs
// ============================================

export interface PaginationDto {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponseDto<T> {
  items: T[];
  total: number;
  limit: number;
  page?: number;
  offset?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  hasMore?: boolean;
}

export interface ServiceResponseDto<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  metadata?: {
    timestamp: Date;
    requestId?: string;
    service: string;
    duration?: number;
    version?: string;
  };
}

// ============================================
// AUTH DTOs
// ============================================

export interface SendOtpDto {
  phoneNumber: string;
  type?: 'sms' | 'whatsapp';
}

export interface VerifyOtpDto {
  phoneNumber: string;
  code: string;
}

export interface LoginDto {
  phoneNumber: string;
  otp: string;
  deviceInfo?: DeviceInfoDto;
}

export interface DeviceInfoDto {
  deviceId?: string;
  deviceType: 'ios' | 'android' | 'web';
  os?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
}

export interface TokenPairDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ValidateTokenDto {
  token: string;
}

export interface TokenPayloadDto {
  userId: string;
  phoneNumber: string;
  iat: number;
  exp: number;
}

// ============================================
// USER DTOs
// ============================================

export interface CreateUserDto {
  phoneNumber: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateUserDto {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  settings?: UserSettingsDto;
}

export interface UserDto {
  id: string;
  phoneNumber: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: Date;
  isOnline: boolean;
  isVerified: boolean;
  isPremium: boolean;
  settings: UserSettingsDto;
  blockedUsers: string[];
  contacts: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettingsDto {
  privacy: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    about: 'everyone' | 'contacts' | 'nobody';
    groups: 'everyone' | 'contacts' | 'nobody';
    calls: 'everyone' | 'contacts' | 'nobody';
  };
  notifications: {
    messages: boolean;
    groups: boolean;
    calls: boolean;
    preview: boolean;
    sound: string;
    vibrate: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: 'small' | 'medium' | 'large';
}

export interface UserProfileDto extends UserDto {
  privacy?: UserPrivacyDto;
}

export interface UserPrivacyDto {
  lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility?: 'everyone' | 'contacts' | 'nobody';
  statusVisibility?: 'everyone' | 'contacts' | 'nobody';
  readReceipts?: boolean;
}

export interface SearchUsersDto extends PaginationDto {
  query: string;
  excludeUserIds?: string[];
}

export interface UserPresenceDto {
  userId: string;
  isOnline: boolean;
  lastSeen?: Date;
}

// ============================================
// MESSAGE DTOs
// ============================================

export interface SendMessageDto {
  conversationId: string;
  senderId: string;
  content?: string;
  type?: MessageType;
  replyTo?: string;
  forwardedFrom?: {
    messageId: string;
    conversationId: string;
    senderId: string;
  };
  mentions?: string[];
  attachments?: AttachmentDto[];
  metadata?: Record<string, any>;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'location'
  | 'contact'
  | 'poll'
  | 'sticker'
  | 'gif';

export interface AttachmentDto {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  replyTo?: string;
  forwardedFrom?: {
    messageId: string;
    conversationId: string;
    senderId: string;
  };
  mentions: string[];
  attachments: AttachmentDto[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy: string[];
  deliveredTo: string[];
  reactions: MessageReactionDto[];
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageReactionDto {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface UpdateMessageDto {
  content?: string;
}

export interface GetMessagesDto extends PaginationDto {
  conversationId: string;
  userId: string;
  before?: string;
  after?: string;
}

export interface SearchMessagesDto extends PaginationDto {
  userId: string;
  query: string;
  conversationId?: string;
  messageType?: MessageType;
  startDate?: Date;
  endDate?: Date;
}

export interface ScheduleMessageDto extends SendMessageDto {
  scheduledFor: Date;
}

// ============================================
// CONVERSATION DTOs
// ============================================

export interface CreateConversationDto {
  participants: string[];
  type?: 'direct' | 'group' | 'channel';
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface ConversationDto {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name: string;
  description: string;
  avatarUrl: string;
  participants: ConversationParticipantDto[];
  admins: string[];
  settings: ConversationSettingsDto;
  pinnedMessages: string[];
  isGroup: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: MessageDto;
  unreadCount?: number;
}

export interface ConversationParticipantDto {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  isMuted: boolean;
  mutedUntil?: Date;
}

export interface ConversationSettingsDto {
  muteNotifications: boolean;
  isArchived: boolean;
  isPinned: boolean;
}

export interface UpdateConversationDto {
  name?: string;
  description?: string;
  avatarUrl?: string;
  settings?: Partial<ConversationSettingsDto>;
}

export interface ParticipantDto {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  joinedAt: Date;
}

// ============================================
// NOTIFICATION DTOs
// ============================================

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  channels?: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high';
}

export type NotificationType =
  | 'message'
  | 'call'
  | 'mention'
  | 'reaction'
  | 'status'
  | 'system'
  | 'security';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  isRead: boolean;
  isSent: boolean;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface RegisterPushTokenDto {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
}

// ============================================
// MEDIA DTOs
// ============================================

export interface UploadMediaDto {
  userId: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'document';
  filename: string;
  originalName?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface MediaDto {
  id: string;
  userId: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'document';
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata: Record<string, any>;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadFileDto {
  userId: string;
  file: Buffer;
  filename: string;
  mimeType: string;
  purpose: 'message' | 'avatar' | 'status' | 'group';
}

export interface MediaFileDto {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  purpose: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface LinkPreviewDto {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// ============================================
// CALL DTOs
// ============================================

export interface InitiateCallDto {
  callerId: string;
  calleeIds: string[];
  type: 'audio' | 'video';
  conversationId?: string;
}

export interface CallDto {
  id: string;
  type: 'audio' | 'video' | 'group_audio' | 'group_video';
  status: CallStatus;
  callerId?: string;
  calleeIds?: string[];
  initiatorId?: string;
  conversationId?: string;
  participants: CallParticipantDto[];
  isGroupCall: boolean;
  startedAt?: Date;
  answeredAt?: Date;
  connectedAt?: Date;
  endedAt?: Date;
  duration?: number;
  endReason?: string;
  iceServers?: any;
  createdAt: Date;
  updatedAt: Date;
}

export type CallStatus =
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'connected'
  | 'ended'
  | 'missed'
  | 'rejected'
  | 'declined'
  | 'busy'
  | 'failed';

export interface CallParticipantDto {
  userId: string;
  joinedAt?: Date;
  leftAt?: Date;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  status: string;
}

export interface SignalingDto {
  callId: string;
  fromUserId: string;
  toUserId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
}
