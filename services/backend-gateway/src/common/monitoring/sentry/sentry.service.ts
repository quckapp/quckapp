import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';

export interface SentryContext {
  user?: {
    id: string;
    email?: string;
    phoneNumber?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

@Injectable()
export class SentryService {
  private isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = !!this.configService.get<string>('SENTRY_DSN');
  }

  /**
   * Capture an exception with optional context
   */
  captureException(error: Error, context?: SentryContext): string | undefined {
    if (!this.isEnabled) {
      return undefined;
    }

    return Sentry.withScope((scope) => {
      if (context?.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
        });
      }

      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      return Sentry.captureException(error);
    });
  }

  /**
   * Capture a message with optional context
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: SentryContext,
  ): string | undefined {
    if (!this.isEnabled) {
      return undefined;
    }

    return Sentry.withScope((scope) => {
      if (context?.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
        });
      }

      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      return Sentry.captureMessage(message, level);
    });
  }

  /**
   * Set user context for subsequent events
   */
  setUser(user: { id: string; email?: string; phoneNumber?: string } | null): void {
    if (!this.isEnabled) {
      return;
    }

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
    } else {
      Sentry.setUser(null);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.isEnabled) {
      return;
    }
    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set a tag for subsequent events
   */
  setTag(key: string, value: string): void {
    if (!this.isEnabled) {
      return;
    }
    Sentry.setTag(key, value);
  }

  /**
   * Set extra context for subsequent events
   */
  setExtra(key: string, value: any): void {
    if (!this.isEnabled) {
      return;
    }
    Sentry.setExtra(key, value);
  }

  /**
   * Start a new transaction for performance monitoring
   */
  startTransaction(name: string, op: string): Sentry.Span | undefined {
    if (!this.isEnabled) {
      return undefined;
    }
    return Sentry.startInactiveSpan({ name, op });
  }

  /**
   * Create a span within the current transaction
   */
  startSpan<T>(
    options: { name: string; op: string },
    callback: (span: Sentry.Span | undefined) => T,
  ): T {
    if (!this.isEnabled) {
      return callback(undefined);
    }

    return Sentry.startSpan(options, callback);
  }

  /**
   * Check if Sentry is enabled
   */
  isInitialized(): boolean {
    return this.isEnabled;
  }
}
