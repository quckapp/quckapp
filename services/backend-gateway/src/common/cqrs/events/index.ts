import { IEvent } from '@nestjs/cqrs';

/**
 * CQRS Domain Events - Events that represent state changes
 * These are different from @nestjs/event-emitter events
 * Domain events are used within the CQRS pattern for event sourcing and sagas
 */

// ============================================
// USER DOMAIN EVENTS
// ============================================

export class UserCreatedEvent implements IEvent {
  constructor(
    public readonly userId: string,
    public readonly phoneNumber: string,
    public readonly displayName: string | undefined,
    public readonly createdAt: Date,
  ) {}
}

export class UserUpdatedEvent implements IEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, any>,
    public readonly updatedAt: Date,
  ) {}
}

export class UserDeletedEvent implements IEvent {
  constructor(
    public readonly userId: string,
    public readonly reason: string | undefined,
    public readonly deletedAt: Date,
  ) {}
}

export class UserBlockedEvent implements IEvent {
  constructor(
    public readonly userId: string,
    public readonly blockedUserId: string,
    public readonly blockedAt: Date,
  ) {}
}

// ============================================
// MESSAGE DOMAIN EVENTS
// ============================================

export class MessageSentEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly recipientIds: string[],
    public readonly content: string,
    public readonly messageType: string,
    public readonly sentAt: Date,
  ) {}
}

export class MessageDeliveredEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly recipientId: string,
    public readonly deliveredAt: Date,
  ) {}
}

export class MessageReadEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly readerId: string,
    public readonly readAt: Date,
  ) {}
}

export class MessageDeletedEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly deletedBy: string,
    public readonly deleteType: 'for_me' | 'for_everyone',
    public readonly deletedAt: Date,
  ) {}
}

export class MessageEditedEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly previousContent: string,
    public readonly newContent: string,
    public readonly editedAt: Date,
  ) {}
}

export class ReactionAddedEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly reaction: string,
    public readonly addedAt: Date,
  ) {}
}

// ============================================
// CONVERSATION DOMAIN EVENTS
// ============================================

export class ConversationCreatedEvent implements IEvent {
  constructor(
    public readonly conversationId: string,
    public readonly type: 'direct' | 'group',
    public readonly creatorId: string,
    public readonly participantIds: string[],
    public readonly name: string | undefined,
    public readonly createdAt: Date,
  ) {}
}

export class ParticipantAddedEvent implements IEvent {
  constructor(
    public readonly conversationId: string,
    public readonly participantId: string,
    public readonly addedBy: string,
    public readonly addedAt: Date,
  ) {}
}

export class ParticipantRemovedEvent implements IEvent {
  constructor(
    public readonly conversationId: string,
    public readonly participantId: string,
    public readonly removedBy: string,
    public readonly removedAt: Date,
  ) {}
}

// ============================================
// CALL DOMAIN EVENTS
// ============================================

export class CallInitiatedEvent implements IEvent {
  constructor(
    public readonly callId: string,
    public readonly callerId: string,
    public readonly calleeIds: string[],
    public readonly callType: 'audio' | 'video',
    public readonly initiatedAt: Date,
  ) {}
}

export class CallAnsweredEvent implements IEvent {
  constructor(
    public readonly callId: string,
    public readonly answeredBy: string,
    public readonly answeredAt: Date,
  ) {}
}

export class CallEndedEvent implements IEvent {
  constructor(
    public readonly callId: string,
    public readonly endedBy: string | undefined,
    public readonly reason: string,
    public readonly duration: number | undefined,
    public readonly endedAt: Date,
  ) {}
}

// ============================================
// STATUS DOMAIN EVENTS
// ============================================

export class StatusCreatedEvent implements IEvent {
  constructor(
    public readonly statusId: string,
    public readonly userId: string,
    public readonly mediaType: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
  ) {}
}

export class StatusViewedEvent implements IEvent {
  constructor(
    public readonly statusId: string,
    public readonly viewerId: string,
    public readonly viewedAt: Date,
  ) {}
}

export class StatusExpiredEvent implements IEvent {
  constructor(
    public readonly statusId: string,
    public readonly userId: string,
    public readonly expiredAt: Date,
  ) {}
}

// ============================================
// POLL DOMAIN EVENTS
// ============================================

export class PollCreatedEvent implements IEvent {
  constructor(
    public readonly pollId: string,
    public readonly conversationId: string,
    public readonly creatorId: string,
    public readonly question: string,
    public readonly options: string[],
    public readonly createdAt: Date,
  ) {}
}

export class PollVotedEvent implements IEvent {
  constructor(
    public readonly pollId: string,
    public readonly voterId: string,
    public readonly optionIndices: number[],
    public readonly votedAt: Date,
  ) {}
}

export class PollClosedEvent implements IEvent {
  constructor(
    public readonly pollId: string,
    public readonly closedBy: string | undefined,
    public readonly reason: 'manual' | 'expired',
    public readonly closedAt: Date,
  ) {}
}

// ============================================
// NOTIFICATION DOMAIN EVENTS
// ============================================

export class NotificationSentEvent implements IEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly channels: string[],
    public readonly sentAt: Date,
  ) {}
}

export class NotificationReadEvent implements IEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly readAt: Date,
  ) {}
}
