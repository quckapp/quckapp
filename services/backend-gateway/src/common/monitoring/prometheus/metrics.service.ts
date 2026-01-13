import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,

    @InjectMetric('websocket_connections_active')
    private readonly websocketConnectionsGauge: Gauge<string>,

    @InjectMetric('messages_total')
    private readonly messagesCounter: Counter<string>,

    @InjectMetric('auth_attempts_total')
    private readonly authAttemptsCounter: Counter<string>,

    @InjectMetric('jobs_total')
    private readonly jobsCounter: Counter<string>,

    @InjectMetric('job_duration_seconds')
    private readonly jobDurationHistogram: Histogram<string>,

    @InjectMetric('database_query_duration_seconds')
    private readonly databaseQueryDuration: Histogram<string>,

    @InjectMetric('cache_hits_total')
    private readonly cacheHitsCounter: Counter<string>,

    @InjectMetric('cache_misses_total')
    private readonly cacheMissesCounter: Counter<string>,

    @InjectMetric('active_users_current')
    private readonly activeUsersGauge: Gauge<string>,
  ) {}

  // HTTP Metrics
  incrementHttpRequests(method: string, route: string, statusCode: number): void {
    this.httpRequestsCounter.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  observeHttpRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode.toString(),
      },
      durationSeconds,
    );
  }

  // WebSocket Metrics
  setWebsocketConnections(gateway: string, count: number): void {
    this.websocketConnectionsGauge.set({ gateway }, count);
  }

  incrementWebsocketConnections(gateway: string): void {
    this.websocketConnectionsGauge.inc({ gateway });
  }

  decrementWebsocketConnections(gateway: string): void {
    this.websocketConnectionsGauge.dec({ gateway });
  }

  // Message Metrics
  incrementMessages(type: string, status: 'sent' | 'delivered' | 'read' | 'failed'): void {
    this.messagesCounter.inc({ type, status });
  }

  // Authentication Metrics
  incrementAuthAttempts(
    type: 'login' | 'register' | 'otp' | '2fa',
    status: 'success' | 'failure',
  ): void {
    this.authAttemptsCounter.inc({ type, status });
  }

  // Background Job Metrics
  incrementJobs(queue: string, status: 'completed' | 'failed' | 'stalled'): void {
    this.jobsCounter.inc({ queue, status });
  }

  observeJobDuration(queue: string, jobType: string, durationSeconds: number): void {
    this.jobDurationHistogram.observe({ queue, job_type: jobType }, durationSeconds);
  }

  // Database Metrics
  observeDatabaseQueryDuration(
    operation: string,
    collection: string,
    durationSeconds: number,
  ): void {
    this.databaseQueryDuration.observe({ operation, collection }, durationSeconds);
  }

  // Cache Metrics
  incrementCacheHits(cacheType: string): void {
    this.cacheHitsCounter.inc({ cache_type: cacheType });
  }

  incrementCacheMisses(cacheType: string): void {
    this.cacheMissesCounter.inc({ cache_type: cacheType });
  }

  // User Metrics
  setActiveUsers(status: 'online' | 'away' | 'busy', count: number): void {
    this.activeUsersGauge.set({ status }, count);
  }

  // Timer helper for measuring durations
  startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e9; // Convert nanoseconds to seconds
    };
  }
}
