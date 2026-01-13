import { Global, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { SentryService } from './sentry.service';
import { SentryExceptionFilter } from './sentry-exception.filter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SentryService, SentryExceptionFilter],
  exports: [SentryService, SentryExceptionFilter],
})
export class SentryModule implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const release = this.configService.get<string>('APP_VERSION', '1.0.0');

    if (!dsn) {
      console.warn('Sentry DSN not configured - error tracking disabled');
      return;
    }

    Sentry.init({
      dsn,
      environment,
      release: `quickchat-backend@${release}`,

      // Performance Monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

      // Profiling
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

      // Integrations
      integrations: [
        nodeProfilingIntegration(),
        Sentry.mongooseIntegration(),
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],

      // Before send hook for filtering/modifying events
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (environment === 'development') {
          const enableDevSentry = process.env.SENTRY_ENABLE_DEV === 'true';
          if (!enableDevSentry) {
            return null;
          }
        }

        // Filter out certain types of errors
        const error = hint.originalException;
        if (error instanceof Error) {
          // Don't report validation errors
          if (error.name === 'ValidationError' || error.name === 'BadRequestException') {
            return null;
          }

          // Don't report authentication errors (these are expected)
          if (error.name === 'UnauthorizedException') {
            return null;
          }
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Ignore network-related errors that are typically transient
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        // Ignore WebSocket close errors
        'WebSocket is not open',
        'WebSocket connection closed',
      ],

      // Deny URLs - ignore errors from these sources
      denyUrls: [
        // Health check endpoints
        /\/health/,
        /\/metrics/,
      ],
    });

    console.log(`Sentry initialized for environment: ${environment}`);
  }
}
