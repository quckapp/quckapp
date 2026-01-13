import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { delay, filter, map, mergeMap, Observable } from 'rxjs';
import { LoggerService } from '../../logger/logger.service';
import {
  CallEndedEvent,
  MessageSentEvent,
  PollClosedEvent,
  StatusCreatedEvent,
  UserCreatedEvent,
} from '../events';
import { SendNotificationCommand } from '../commands';

/**
 * CQRS Sagas - Orchestrate complex workflows across multiple events and commands
 * Sagas listen to events and dispatch new commands as needed
 */

@Injectable()
export class UserSagas {
  constructor(private logger: LoggerService) {}

  /**
   * When a user is created, send a welcome notification
   */
  @Saga()
  userCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(UserCreatedEvent),
      map((event: UserCreatedEvent) => {
        this.logger.log(`[Saga] User created, sending welcome notification`, {
          context: 'UserSagas',
          userId: event.userId,
        });

        return new SendNotificationCommand(
          event.userId,
          'welcome',
          'Welcome to QuckChat!',
          'Thanks for joining. Start chatting with friends and family.',
          { userId: event.userId },
          ['push', 'in_app'],
        );
      }),
    );
  };
}

@Injectable()
export class MessageSagas {
  constructor(private logger: LoggerService) {}

  /**
   * When a message is sent, notify offline recipients
   * This is a simplified example - in production, check online status first
   */
  @Saga()
  messageSentNotification = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(MessageSentEvent),
      // Filter to only process text messages for notifications
      filter((event: MessageSentEvent) => event.messageType === 'text'),
      // Add a small delay to batch notifications
      delay(100),
      mergeMap((event: MessageSentEvent) => {
        this.logger.debug(`[Saga] Message sent, preparing notifications`, {
          context: 'MessageSagas',
          messageId: event.messageId,
          recipientCount: event.recipientIds.length,
        });

        // Create a notification command for each recipient
        return event.recipientIds.map(
          (recipientId) =>
            new SendNotificationCommand(
              recipientId,
              'new_message',
              'New Message',
              event.content.substring(0, 100), // Truncate for preview
              {
                messageId: event.messageId,
                conversationId: event.conversationId,
                senderId: event.senderId,
              },
              ['push'],
            ),
        );
      }),
    );
  };
}

@Injectable()
export class CallSagas {
  constructor(private logger: LoggerService) {}

  /**
   * When a call ends with 'missed' status, send missed call notification
   */
  @Saga()
  missedCallNotification = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(CallEndedEvent),
      filter((event: CallEndedEvent) => event.reason === 'missed'),
      map((event: CallEndedEvent) => {
        this.logger.log(`[Saga] Missed call, sending notification`, {
          context: 'CallSagas',
          callId: event.callId,
        });

        // In real implementation, get callee info
        return new SendNotificationCommand(
          'callee_id', // Would get actual callee from call record
          'missed_call',
          'Missed Call',
          'You missed a call',
          { callId: event.callId },
          ['push', 'in_app'],
        );
      }),
    );
  };
}

@Injectable()
export class StatusSagas {
  constructor(private logger: LoggerService) {}

  /**
   * When a status is created, optionally notify close friends
   * This is typically a user preference
   */
  @Saga()
  statusCreatedNotification = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(StatusCreatedEvent),
      // In real implementation, check user's notification preference
      filter(() => false), // Disabled by default
      map((event: StatusCreatedEvent) => {
        this.logger.debug(`[Saga] Status created, notifying close friends`, {
          context: 'StatusSagas',
          statusId: event.statusId,
        });

        return new SendNotificationCommand(
          'close_friend_id', // Would iterate over close friends
          'new_status',
          'New Status',
          'Your friend posted a new status',
          { statusId: event.statusId, userId: event.userId },
          ['push'],
        );
      }),
    );
  };
}

@Injectable()
export class PollSagas {
  constructor(private logger: LoggerService) {}

  /**
   * When a poll is closed, notify all voters of the results
   */
  @Saga()
  pollClosedNotification = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PollClosedEvent),
      map((event: PollClosedEvent) => {
        this.logger.log(`[Saga] Poll closed, sending results notification`, {
          context: 'PollSagas',
          pollId: event.pollId,
        });

        // In real implementation, get all voters and send individual notifications
        return new SendNotificationCommand(
          'voter_id', // Would iterate over voters
          'poll_results',
          'Poll Results',
          'A poll you voted on has ended',
          { pollId: event.pollId },
          ['in_app'],
        );
      }),
    );
  };
}

// Export all sagas for module registration
export const Sagas = [UserSagas, MessageSagas, CallSagas, StatusSagas, PollSagas];
