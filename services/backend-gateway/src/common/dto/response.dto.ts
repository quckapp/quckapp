import { Exclude, Expose, Transform, Type } from 'class-transformer';

// Base API Response
export class ApiResponseDto<T> {
  @Expose()
  success: boolean;

  @Expose()
  message?: string;

  @Expose()
  data?: T;

  @Expose()
  timestamp: string;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto({
      success: true,
      data,
      message,
    });
  }

  static error(message: string): ApiResponseDto<null> {
    return new ApiResponseDto({
      success: false,
      message,
      data: null,
    });
  }
}

// Paginated Response
export class PaginatedResponseDto<T> {
  @Expose()
  items: T[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;

  @Expose()
  hasNextPage: boolean;

  @Expose()
  hasPrevPage: boolean;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPrevPage = page > 1;
  }
}

// User Response DTO (excludes sensitive fields)
export class UserResponseDto {
  @Expose()
  _id: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  username: string;

  @Expose()
  displayName: string;

  @Expose()
  email?: string;

  @Expose()
  avatar?: string;

  @Expose()
  bio?: string;

  @Expose()
  status: string;

  @Expose()
  isVerified: boolean;

  @Expose()
  lastSeen?: Date;

  @Exclude()
  password: string;

  @Exclude()
  fcmTokens: string[];

  @Exclude()
  linkedDevices: any[];

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}

// Message Response DTO
export class MessageResponseDto {
  @Expose()
  _id: string;

  @Expose()
  conversationId: string;

  @Expose()
  @Type(() => UserResponseDto)
  senderId: UserResponseDto;

  @Expose()
  type: string;

  @Expose()
  content?: string;

  @Expose()
  attachments: any[];

  @Expose()
  reactions: any[];

  @Expose()
  readReceipts: any[];

  @Expose()
  replyTo?: string;

  @Expose()
  isEdited: boolean;

  @Expose()
  isDeleted: boolean;

  @Expose()
  isForwarded: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Exclude()
  encryptedContent?: string;

  constructor(partial: Partial<MessageResponseDto>) {
    Object.assign(this, partial);
  }
}

// Conversation Response DTO
export class ConversationResponseDto {
  @Expose()
  _id: string;

  @Expose()
  type: string;

  @Expose()
  name?: string;

  @Expose()
  avatar?: string;

  @Expose()
  description?: string;

  @Expose()
  @Type(() => ParticipantResponseDto)
  participants: ParticipantResponseDto[];

  @Expose()
  admins: string[];

  @Expose()
  lastMessage?: any;

  @Expose()
  lastMessageAt: Date;

  @Expose()
  isArchived: boolean;

  @Expose()
  isLocked: boolean;

  @Expose()
  pinnedMessages: string[];

  @Expose()
  disappearingMessagesTimer: number;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<ConversationResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ParticipantResponseDto {
  @Expose()
  @Type(() => UserResponseDto)
  userId: UserResponseDto;

  @Expose()
  joinedAt: Date;

  @Expose()
  unreadCount: number;

  @Expose()
  isMuted: boolean;

  @Expose()
  isPinned: boolean;

  constructor(partial: Partial<ParticipantResponseDto>) {
    Object.assign(this, partial);
  }
}

// Auth Response DTO
export class AuthResponseDto {
  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}

// 2FA Response DTOs
export class TwoFactorSetupResponseDto {
  @Expose()
  message: string;

  @Expose()
  secret: string;

  @Expose()
  backupCodes: string[];

  constructor(partial: Partial<TwoFactorSetupResponseDto>) {
    Object.assign(this, partial);
  }
}

export class TwoFactorRequiredResponseDto {
  @Expose()
  requiresTwoFactor: boolean;

  @Expose()
  userId: string;

  @Expose()
  message: string;

  constructor(partial: Partial<TwoFactorRequiredResponseDto>) {
    Object.assign(this, partial);
  }
}
