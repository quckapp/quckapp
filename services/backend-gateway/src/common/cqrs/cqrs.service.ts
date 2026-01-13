import { Injectable } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { LoggerService } from '../logger/logger.service';
import { ICommand, IEvent, IQuery } from '@nestjs/cqrs';

/**
 * CqrsService - Unified service for dispatching commands, queries, and events
 * Provides a simplified interface with logging and error handling
 */
@Injectable()
export class CqrsService {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
    private eventBus: EventBus,
    private logger: LoggerService,
  ) {}

  /**
   * Execute a command (write operation)
   * Commands modify state and may trigger events
   */
  async executeCommand<T>(command: ICommand): Promise<T> {
    const commandName = command.constructor.name;
    const startTime = Date.now();

    this.logger.debug(`Executing command: ${commandName}`, {
      context: 'CqrsService',
    });

    try {
      const result = await this.commandBus.execute<ICommand, T>(command);

      this.logger.debug(`Command completed: ${commandName}`, {
        context: 'CqrsService',
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`Command failed: ${commandName}`, {
        context: 'CqrsService',
        errorMessage: (error as Error).message,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Execute a query (read operation)
   * Queries do not modify state
   */
  async executeQuery<T>(query: IQuery): Promise<T> {
    const queryName = query.constructor.name;
    const startTime = Date.now();

    this.logger.debug(`Executing query: ${queryName}`, {
      context: 'CqrsService',
    });

    try {
      const result = await this.queryBus.execute<IQuery, T>(query);

      this.logger.debug(`Query completed: ${queryName}`, {
        context: 'CqrsService',
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`Query failed: ${queryName}`, {
        context: 'CqrsService',
        errorMessage: (error as Error).message,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Publish a domain event
   * Events notify the system of state changes
   */
  publishEvent(event: IEvent): void {
    const eventName = event.constructor.name;

    this.logger.debug(`Publishing event: ${eventName}`, {
      context: 'CqrsService',
    });

    this.eventBus.publish(event);
  }

  /**
   * Publish multiple domain events
   */
  publishEvents(events: IEvent[]): void {
    events.forEach((event) => this.publishEvent(event));
  }

  /**
   * Get the underlying command bus for advanced usage
   */
  getCommandBus(): CommandBus {
    return this.commandBus;
  }

  /**
   * Get the underlying query bus for advanced usage
   */
  getQueryBus(): QueryBus {
    return this.queryBus;
  }

  /**
   * Get the underlying event bus for advanced usage
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }
}
