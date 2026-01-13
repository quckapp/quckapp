---
sidebar_position: 4
title: Monitoring & Observability
description: Sentry, OpenTelemetry, Prometheus, and logging setup
---

# Monitoring & Observability

QuckChat uses a comprehensive monitoring stack for error tracking, distributed tracing, metrics, and logging.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │    Sentry     │  │ OpenTelemetry │  │  Prometheus   │       │
│  │   (Errors)    │  │   (Tracing)   │  │   (Metrics)   │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │   Datadog     │  │   New Relic   │  │  Pino/Winston │       │
│  │ (Infra/APM)   │  │    (APM)      │  │   (Logging)   │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Sentry - Error Tracking

### Configuration

```env
SENTRY_DSN=https://xxx@sentry.io/project
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

### Features

- Automatic error capture
- Performance monitoring
- Release tracking
- User context
- Breadcrumbs

### Usage

```typescript
// Automatic error capture via @sentry/nestjs
import * as Sentry from '@sentry/nestjs';

// Manual error capture
Sentry.captureException(error);

// Add context
Sentry.setUser({ id: userId, email });
Sentry.setTag('module', 'messages');
```

## OpenTelemetry - Distributed Tracing

### Configuration

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
OTEL_SERVICE_NAME=quckchat-backend
```

### Features

- Request tracing across services
- Span creation and context propagation
- Jaeger integration for visualization
- Automatic instrumentation

### Usage

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('quckchat');

const span = tracer.startSpan('send-message');
try {
  // Operation
  span.setStatus({ code: SpanStatusCode.OK });
} finally {
  span.end();
}
```

## Prometheus - Metrics

### Configuration

```env
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

### Default Metrics

- HTTP request duration
- Request count by status code
- Active connections
- Memory usage
- CPU usage

### Custom Metrics

```typescript
import { Counter, Histogram } from 'prom-client';

const messagesCounter = new Counter({
  name: 'messages_sent_total',
  help: 'Total messages sent',
  labelNames: ['type']
});

const responseHistogram = new Histogram({
  name: 'http_response_time_seconds',
  help: 'HTTP response time in seconds',
  buckets: [0.1, 0.5, 1, 2, 5]
});
```

### Endpoints

- `/metrics` - Prometheus metrics endpoint

## Datadog - Infrastructure Monitoring

### Configuration

```env
DD_API_KEY=your-datadog-api-key
DD_SITE=datadoghq.com
DD_SERVICE=quckchat
DD_ENV=production
```

### Features

- APM tracing
- Log aggregation
- Infrastructure metrics
- Custom dashboards

## New Relic - APM

### Configuration

```env
NEW_RELIC_LICENSE_KEY=your-license-key
NEW_RELIC_APP_NAME=QuckChat Backend
NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
```

### Features

- Transaction tracing
- Error analytics
- Browser monitoring
- Alerting

## Logging - Pino & Winston

### Pino (Primary)

High-performance structured logging.

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('MessagesService');
logger.log('Message sent', { messageId, conversationId });
logger.error('Failed to send', { error, stack });
```

### Log Levels

| Level | Usage |
|-------|-------|
| `error` | Errors that need immediate attention |
| `warn` | Warnings that should be investigated |
| `log` | Important business events |
| `debug` | Debugging information |
| `verbose` | Detailed tracing |

### Structured Logging

```json
{
  "level": "info",
  "time": "2025-01-04T10:30:00.000Z",
  "context": "MessagesService",
  "message": "Message sent",
  "messageId": "abc123",
  "conversationId": "xyz789",
  "userId": "user123",
  "duration": 45
}
```

## Health Checks

### Endpoints

```bash
# Overall health
GET /api/v1/health

# Detailed health
GET /api/v1/health/detailed
```

### Response

```json
{
  "status": "ok",
  "info": {
    "mongodb": { "status": "up" },
    "redis": { "status": "up" },
    "kafka": { "status": "up" }
  },
  "details": {
    "mongodb": { "status": "up", "latency": 5 },
    "redis": { "status": "up", "latency": 1 },
    "kafka": { "status": "up", "latency": 10 }
  }
}
```

## Best Practices

1. **Structured Logging**: Always use structured JSON logs
2. **Correlation IDs**: Include request IDs across services
3. **Sampling**: Use sampling for high-volume traces
4. **Alerting**: Set up alerts for error spikes
5. **Dashboards**: Create service-specific dashboards
6. **Retention**: Configure appropriate log retention
