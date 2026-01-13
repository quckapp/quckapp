import { Global, Module } from '@nestjs/common';
import { PrometheusModule as NestPrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

// Custom metrics providers
const httpRequestsCounter = makeCounterProvider({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = makeHistogramProvider({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

const websocketConnectionsGauge = makeGaugeProvider({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['gateway'],
});

const messagesCounter = makeCounterProvider({
  name: 'messages_total',
  help: 'Total number of messages processed',
  labelNames: ['type', 'status'],
});

const authAttemptsCounter = makeCounterProvider({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status'],
});

const jobsCounter = makeCounterProvider({
  name: 'jobs_total',
  help: 'Total number of background jobs processed',
  labelNames: ['queue', 'status'],
});

const jobDurationHistogram = makeHistogramProvider({
  name: 'job_duration_seconds',
  help: 'Duration of background job processing in seconds',
  labelNames: ['queue', 'job_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

const databaseQueryDuration = makeHistogramProvider({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

const cacheHitsCounter = makeCounterProvider({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});

const cacheMissesCounter = makeCounterProvider({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});

const activeUsersGauge = makeGaugeProvider({
  name: 'active_users_current',
  help: 'Current number of active users',
  labelNames: ['status'],
});

@Global()
@Module({
  imports: [
    NestPrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'quickchat_',
        },
      },
      path: '/metrics',
      defaultLabels: {
        app: 'quickchat',
        env: process.env.NODE_ENV || 'development',
      },
    }),
  ],
  providers: [
    MetricsService,
    httpRequestsCounter,
    httpRequestDuration,
    websocketConnectionsGauge,
    messagesCounter,
    authAttemptsCounter,
    jobsCounter,
    jobDurationHistogram,
    databaseQueryDuration,
    cacheHitsCounter,
    cacheMissesCounter,
    activeUsersGauge,
  ],
  exports: [MetricsService, NestPrometheusModule],
})
export class PrometheusModule {}
