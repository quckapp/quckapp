/**
 * CQRS Commands - Write operations that change state
 * Commands should be named in imperative form (e.g., CreateUser, SendMessage)
 */

// ============================================
// USER COMMANDS
// ============================================

export class CreateUserCommand {
  constructor(
    public readonly phoneNumber: string,
    public readonly displayName?: string,
    public readonly avatarUrl?: string,
  ) {}
}

export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly updates: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      settings?: Record<string, any>;
    },
  ) {}
}

export class DeleteUserCommand {
  constructor(
    public readonly userId: string,
    public readonly reason?: string,
  ) {}
}

export class BlockUserCommand {
  constructor(
    public readonly userId: string,
    public readonly blockedUserId: string,
  ) {}
}

export class UnblockUserCommand {
  constructor(
    public readonly userId: string,
    public readonly unblockedUserId: string,
  ) {}
}

// ============================================
// MESSAGE COMMANDS
// ============================================

export class SendMessageCommand {
  constructor(
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly content: string,
    public readonly messageType:
      | 'text'
      | 'image'
      | 'video'
      | 'audio'
      | 'file'
      | 'location'
      | 'contact' = 'text',
    public readonly metadata?: {
      replyToId?: string;
      forwardedFromId?: string;
      mediaUrl?: string;
      thumbnailUrl?: string;
    },
  ) {}
}

export class EditMessageCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly newContent: string,
  ) {}
}

export class DeleteMessageCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly deleteType: 'for_me' | 'for_everyone' = 'for_me',
  ) {}
}

export class MarkMessageReadCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
  ) {}
}

export class MarkConversationReadCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly upToMessageId?: string,
  ) {}
}

export class AddReactionCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly reaction: string,
  ) {}
}

export class RemoveReactionCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly reaction: string,
  ) {}
}

export class PinMessageCommand {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}

export class UnpinMessageCommand {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}

export class ScheduleMessageCommand {
  constructor(
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly content: string,
    public readonly scheduledFor: Date,
    public readonly messageType: string = 'text',
  ) {}
}

// ============================================
// CONVERSATION COMMANDS
// ============================================

export class CreateConversationCommand {
  constructor(
    public readonly creatorId: string,
    public readonly participantIds: string[],
    public readonly type: 'direct' | 'group' = 'direct',
    public readonly name?: string,
    public readonly avatarUrl?: string,
  ) {}
}

export class UpdateConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly updates: {
      name?: string;
      description?: string;
      avatarUrl?: string;
    },
  ) {}
}

export class AddParticipantCommand {
  constructor(
    public readonly conversationId: string,
    public readonly addedBy: string,
    public readonly participantId: string,
  ) {}
}

export class RemoveParticipantCommand {
  constructor(
    public readonly conversationId: string,
    public readonly removedBy: string,
    public readonly participantId: string,
  ) {}
}

export class LeaveConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}

export class ArchiveConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}

export class MuteConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly muteDuration?: number, // in seconds, undefined = forever
  ) {}
}

// ============================================
// CALL COMMANDS
// ============================================

export class InitiateCallCommand {
  constructor(
    public readonly callerId: string,
    public readonly calleeIds: string[],
    public readonly callType: 'audio' | 'video',
    public readonly conversationId?: string,
  ) {}
}

export class AnswerCallCommand {
  constructor(
    public readonly callId: string,
    public readonly userId: string,
  ) {}
}

export class RejectCallCommand {
  constructor(
    public readonly callId: string,
    public readonly userId: string,
    public readonly reason?: string,
  ) {}
}

export class EndCallCommand {
  constructor(
    public readonly callId: string,
    public readonly userId: string,
  ) {}
}

export class ToggleCallMediaCommand {
  constructor(
    public readonly callId: string,
    public readonly userId: string,
    public readonly mediaType: 'audio' | 'video' | 'screen',
    public readonly enabled: boolean,
  ) {}
}

// ============================================
// STATUS COMMANDS
// ============================================

export class CreateStatusCommand {
  constructor(
    public readonly userId: string,
    public readonly mediaUrl: string,
    public readonly mediaType: 'image' | 'video' | 'text',
    public readonly caption?: string,
    public readonly backgroundColor?: string,
    public readonly duration?: number, // in hours, default 24
  ) {}
}

export class DeleteStatusCommand {
  constructor(
    public readonly statusId: string,
    public readonly userId: string,
  ) {}
}

export class ViewStatusCommand {
  constructor(
    public readonly statusId: string,
    public readonly viewerId: string,
  ) {}
}

// ============================================
// POLL COMMANDS
// ============================================

export class CreatePollCommand {
  constructor(
    public readonly conversationId: string,
    public readonly creatorId: string,
    public readonly question: string,
    public readonly options: string[],
    public readonly allowMultipleVotes: boolean = false,
    public readonly expiresAt?: Date,
  ) {}
}

export class VotePollCommand {
  constructor(
    public readonly pollId: string,
    public readonly voterId: string,
    public readonly optionIndices: number[],
  ) {}
}

export class ClosePollCommand {
  constructor(
    public readonly pollId: string,
    public readonly userId: string,
  ) {}
}

// ============================================
// NOTIFICATION COMMANDS
// ============================================

export class SendNotificationCommand {
  constructor(
    public readonly userId: string,
    public readonly type: string,
    public readonly title: string,
    public readonly body: string,
    public readonly data?: Record<string, any>,
    public readonly channels?: ('push' | 'email' | 'sms' | 'in_app')[],
  ) {}
}

export class MarkNotificationReadCommand {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
  ) {}
}

export class RegisterPushTokenCommand {
  constructor(
    public readonly userId: string,
    public readonly token: string,
    public readonly platform: 'ios' | 'android' | 'web',
    public readonly deviceId?: string,
  ) {}
}

// ============================================
// EXPORT COMMANDS
// ============================================

export class RequestDataExportCommand {
  constructor(
    public readonly userId: string,
    public readonly exportType: 'messages' | 'media' | 'contacts' | 'all',
    public readonly dateRange?: {
      from: Date;
      to: Date;
    },
  ) {}
}
