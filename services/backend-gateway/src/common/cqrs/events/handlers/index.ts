import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../logger/logger.service';
import {
  CallEndedEvent,
  CallInitiatedEvent,
  ConversationCreatedEvent,
  MessageDeliveredEvent,
  MessageReadEvent,
  MessageSentEvent,
  NotificationSentEvent,
  PollCreatedEvent,
  PollVotedEvent,
  StatusCreatedEvent,
  UserCreatedEvent,
  UserUpdatedEvent,
} from '../index';

/**
 * CQRS Event Handlers - React to domain events
 * Used for side effects, projections, and integrations
 */

// ============================================
// USER EVENT HANDLERS
// ============================================

@EventsHandler(UserCreatedEvent)
@Injectable()
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: UserCreatedEvent): void {
    this.logger.log(`[CQRS Event] User created: ${event.userId}`, {
      context: 'UserCreatedEventHandler',
    });

    // Side effects:
    // - Update read model/projection
    // - Send welcome notification
    // - Initialize user preferences
    // - Sync to external systems
    // - Update analytics
  }
}

@EventsHandler(UserUpdatedEvent)
@Injectable()
export class UserUpdatedEventHandler implements IEventHandler<UserUpdatedEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: UserUpdatedEvent): void {
    this.logger.debug(`[CQRS Event] User updated: ${event.userId}`, {
      context: 'UserUpdatedEventHandler',
      changes: Object.keys(event.changes),
    });

    // Side effects:
    // - Update read model
    // - Invalidate cache
    // - Sync to search index
    // - Notify connected devices
  }
}

// ============================================
// MESSAGE EVENT HANDLERS
// ============================================

@EventsHandler(MessageSentEvent)
@Injectable()
export class MessageSentEventHandler implements IEventHandler<MessageSentEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: MessageSentEvent): void {
    this.logger.debug(`[CQRS Event] Message sent: ${event.messageId}`, {
      context: 'MessageSentEventHandler',
      conversationId: event.conversationId,
    });

    // Side effects:
    // - Update conversation read model (last message, timestamp)
    // - Update unread counts for recipients
    // - Add to search index
    // - Process @mentions
    // - Generate link previews
    // - Queue push notifications
  }
}

@EventsHandler(MessageDeliveredEvent)
@Injectable()
export class MessageDeliveredEventHandler implements IEventHandler<MessageDeliveredEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: MessageDeliveredEvent): void {
    this.logger.debug(`[CQRS Event] Message delivered: ${event.messageId}`, {
      context: 'MessageDeliveredEventHandler',
    });

    // Side effects:
    // - Update message status projection
    // - Broadcast delivery receipt via WebSocket
  }
}

@EventsHandler(MessageReadEvent)
@Injectable()
export class MessageReadEventHandler implements IEventHandler<MessageReadEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: MessageReadEvent): void {
    this.logger.debug(`[CQRS Event] Message read: ${event.messageId}`, {
      context: 'MessageReadEventHandler',
    });

    // Side effects:
    // - Update message status projection
    // - Update unread count projection
    // - Broadcast read receipt via WebSocket
  }
}

// ============================================
// CONVERSATION EVENT HANDLERS
// ============================================

@EventsHandler(ConversationCreatedEvent)
@Injectable()
export class ConversationCreatedEventHandler implements IEventHandler<ConversationCreatedEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: ConversationCreatedEvent): void {
    this.logger.log(`[CQRS Event] Conversation created: ${event.conversationId}`, {
      context: 'ConversationCreatedEventHandler',
      type: event.type,
    });

    // Side effects:
    // - Create conversation read model
    // - Notify participants via WebSocket
    // - Send system message (for groups)
  }
}

// ============================================
// CALL EVENT HANDLERS
// ============================================

@EventsHandler(CallInitiatedEvent)
@Injectable()
export class CallInitiatedEventHandler implements IEventHandler<CallInitiatedEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: CallInitiatedEvent): void {
    this.logger.log(`[CQRS Event] Call initiated: ${event.callId}`, {
      context: 'CallInitiatedEventHandler',
      callType: event.callType,
    });

    // Side effects:
    // - Create call record in read model
    // - Send push notifications to callees
    // - Set up WebRTC signaling
    // - Set call timeout
  }
}

@EventsHandler(CallEndedEvent)
@Injectable()
export class CallEndedEventHandler implements IEventHandler<CallEndedEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: CallEndedEvent): void {
    this.logger.log(`[CQRS Event] Call ended: ${event.callId}`, {
      context: 'CallEndedEventHandler',
      reason: event.reason,
      duration: event.duration,
    });

    // Side effects:
    // - Update call record with duration
    // - Create call history entry
    // - Cleanup WebRTC resources
    // - Update analytics
  }
}

// ============================================
// STATUS EVENT HANDLERS
// ============================================

@EventsHandler(StatusCreatedEvent)
@Injectable()
export class StatusCreatedEventHandler implements IEventHandler<StatusCreatedEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: StatusCreatedEvent): void {
    this.logger.debug(`[CQRS Event] Status created: ${event.statusId}`, {
      context: 'StatusCreatedEventHandler',
    });

    // Side effects:
    // - Add to contacts' status feed
    // - Schedule expiration
    // - Process media (compress, generate thumbnails)
  }
}

// ============================================
// POLL EVENT HANDLERS
// ============================================

@EventsHandler(PollCreatedEvent)
@Injectable()
export class PollCreatedEventHandler implements IEventHandler<PollCreatedEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: PollCreatedEvent): void {
    this.logger.debug(`[CQRS Event] Poll created: ${event.pollId}`, {
      context: 'PollCreatedEventHandler',
    });

    // Side effects:
    // - Create poll read model
    // - Schedule expiration if set
    // - Notify conversation participants
  }
}

@EventsHandler(PollVotedEvent)
@Injectable()
export class PollVotedEventHandler implements IEventHandler<PollVotedEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: PollVotedEvent): void {
    this.logger.debug(`[CQRS Event] Poll voted: ${event.pollId}`, {
      context: 'PollVotedEventHandler',
    });

    // Side effects:
    // - Update poll results projection
    // - Broadcast updated results
    // - Notify poll creator
  }
}

// ============================================
// NOTIFICATION EVENT HANDLERS
// ============================================

@EventsHandler(NotificationSentEvent)
@Injectable()
export class NotificationSentEventHandler implements IEventHandler<NotificationSentEvent> {
  constructor(private logger: LoggerService) {}

  handle(event: NotificationSentEvent): void {
    this.logger.debug(`[CQRS Event] Notification sent: ${event.notificationId}`, {
      context: 'NotificationSentEventHandler',
      channels: event.channels,
    });

    // Side effects:
    // - Update notification read model
    // - Track delivery analytics
    // - Handle retry logic for failed channels
  }
}

// Export all handlers for module registration
export const EventHandlers = [
  UserCreatedEventHandler,
  UserUpdatedEventHandler,
  MessageSentEventHandler,
  MessageDeliveredEventHandler,
  MessageReadEventHandler,
  ConversationCreatedEventHandler,
  CallInitiatedEventHandler,
  CallEndedEventHandler,
  StatusCreatedEventHandler,
  PollCreatedEventHandler,
  PollVotedEventHandler,
  NotificationSentEventHandler,
];
