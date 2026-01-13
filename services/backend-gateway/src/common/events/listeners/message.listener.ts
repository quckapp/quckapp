import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoggerService } from '../../logger/logger.service';
import { MessageEvents } from '../event.constants';
import {
  MessageDeletedPayload,
  MessageDeliveredPayload,
  MessageEditedPayload,
  MessagePinnedPayload,
  MessageReactionPayload,
  MessageReadPayload,
  MessageSentPayload,
  ScheduledMessageSentPayload,
} from '../event.payloads';

/**
 * MessageEventListener - Handles all message-related events
 */
@Injectable()
export class MessageEventListener {
  constructor(private logger: LoggerService) {}

  @OnEvent(MessageEvents.SENT)
  handleMessageSent(payload: MessageSentPayload): void {
    this.logger.debug(`Message sent: ${payload.messageId} in ${payload.conversationId}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
      senderId: payload.senderId,
      messageType: payload.messageType,
    });

    // Side effects:
    // - Send push notifications to offline recipients
    // - Update conversation last message
    // - Increment unread count for recipients
    // - Trigger delivery receipts
    // - Process media (generate thumbnails, transcribe audio)
    // - Check for link previews
  }

  @OnEvent(MessageEvents.DELIVERED)
  handleMessageDelivered(payload: MessageDeliveredPayload): void {
    this.logger.debug(`Message delivered: ${payload.messageId} to ${payload.recipientId}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
    });

    // Side effects:
    // - Update message status
    // - Send delivery receipt to sender via WebSocket
    // - Update analytics
  }

  @OnEvent(MessageEvents.READ)
  handleMessageRead(payload: MessageReadPayload): void {
    this.logger.debug(`Message read: ${payload.messageId} by ${payload.readerId}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
    });

    // Side effects:
    // - Update message status
    // - Send read receipt to sender via WebSocket
    // - Decrement unread count
    // - Update last read timestamp
  }

  @OnEvent(MessageEvents.DELETED)
  handleMessageDeleted(payload: MessageDeletedPayload): void {
    this.logger.debug(`Message deleted: ${payload.messageId} (${payload.deleteType})`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
      deletedBy: payload.deletedBy,
    });

    // Side effects:
    // - Notify recipients if deleted for everyone
    // - Remove from search index
    // - Delete associated media files
    // - Update conversation last message if needed
  }

  @OnEvent(MessageEvents.EDITED)
  handleMessageEdited(payload: MessageEditedPayload): void {
    this.logger.debug(`Message edited: ${payload.messageId}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
      editedBy: payload.editedBy,
    });

    // Side effects:
    // - Notify recipients of edit
    // - Update search index
    // - Re-process link previews if URL changed
    // - Store edit history
  }

  @OnEvent(MessageEvents.REACTION_ADDED)
  handleReactionAdded(payload: MessageReactionPayload): void {
    this.logger.debug(`Reaction added to ${payload.messageId}: ${payload.reaction}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
      userId: payload.userId,
    });

    // Side effects:
    // - Notify message sender
    // - Broadcast to conversation participants
    // - Update message reaction count
  }

  @OnEvent(MessageEvents.REACTION_REMOVED)
  handleReactionRemoved(payload: MessageReactionPayload): void {
    this.logger.debug(`Reaction removed from ${payload.messageId}: ${payload.reaction}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
      userId: payload.userId,
    });

    // Side effects:
    // - Broadcast to conversation participants
    // - Update message reaction count
  }

  @OnEvent(MessageEvents.PINNED)
  handleMessagePinned(payload: MessagePinnedPayload): void {
    this.logger.log(`Message pinned: ${payload.messageId} in ${payload.conversationId}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
      pinnedBy: payload.pinnedBy,
    });

    // Side effects:
    // - Notify conversation participants
    // - Update pinned messages list
    // - Check pin limit and unpin oldest if needed
  }

  @OnEvent(MessageEvents.UNPINNED)
  handleMessageUnpinned(payload: MessagePinnedPayload): void {
    this.logger.log(`Message unpinned: ${payload.messageId}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
    });

    // Side effects:
    // - Notify conversation participants
    // - Update pinned messages list
  }

  @OnEvent(MessageEvents.SCHEDULED_SENT)
  handleScheduledMessageSent(payload: ScheduledMessageSentPayload): void {
    this.logger.log(`Scheduled message sent: ${payload.messageId}`, {
      context: 'MessageEventListener',
      correlationId: payload.correlationId,
      scheduledFor: payload.scheduledFor,
      actualSentAt: payload.actualSentAt,
    });

    // Side effects:
    // - Same as regular message sent
    // - Update scheduled message status
    // - Notify sender of successful delivery
  }

  @OnEvent(MessageEvents.DISAPPEARED)
  handleMessageDisappeared(payload: {
    messageId: string;
    conversationId: string;
    timestamp: Date;
  }): void {
    this.logger.debug(`Message disappeared: ${payload.messageId}`, {
      context: 'MessageEventListener',
    });

    // Side effects:
    // - Delete message from database
    // - Delete associated media
    // - Notify participants to remove from UI
    // - Clear from cache
  }

  @OnEvent(MessageEvents.BULK_DELETED)
  handleBulkDeleted(payload: {
    messageIds: string[];
    conversationId: string;
    deletedBy: string;
    timestamp: Date;
  }): void {
    this.logger.log(
      `Bulk delete: ${payload.messageIds.length} messages in ${payload.conversationId}`,
      {
        context: 'MessageEventListener',
      },
    );

    // Side effects:
    // - Delete all associated media
    // - Update conversation
    // - Clear from search index
    // - Notify participants
  }

  @OnEvent(MessageEvents.BULK_READ)
  handleBulkRead(payload: {
    conversationId: string;
    readerId: string;
    upToMessageId: string;
    timestamp: Date;
  }): void {
    this.logger.debug(`Bulk read in ${payload.conversationId} by ${payload.readerId}`, {
      context: 'MessageEventListener',
    });

    // Side effects:
    // - Update all message statuses
    // - Send bulk read receipt
    // - Reset unread count
  }
}
