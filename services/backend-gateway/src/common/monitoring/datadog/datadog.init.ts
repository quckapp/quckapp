/**
 * Datadog Tracer Initialization
 *
 * IMPORTANT: This file must be imported FIRST in your main.ts,
 * before any other imports, for automatic instrumentation to work.
 *
 * Usage in main.ts:
 * ```typescript
 * import './common/monitoring/datadog/datadog.init';
 * // ... rest of imports
 * ```
 */

const isEnabled = process.env.DD_TRACE_ENABLED === 'true';

if (isEnabled) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tracer = require('dd-trace');

  tracer.init({
    // Service identification
    service: process.env.DD_SERVICE || 'quckchat-backend',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    version: process.env.DD_VERSION || process.env.APP_VERSION || '1.0.0',

    // Agent configuration
    hostname: process.env.DD_AGENT_HOST || 'localhost',
    port: parseInt(process.env.DD_TRACE_AGENT_PORT || '8126', 10),

    // Tracing options
    sampleRate: parseFloat(process.env.DD_TRACE_SAMPLE_RATE || '1'),
    runtimeMetrics: process.env.DD_RUNTIME_METRICS_ENABLED !== 'false',
    logInjection: process.env.DD_LOGS_INJECTION !== 'false',
    profiling: process.env.DD_PROFILING_ENABLED === 'true',

    // Tags
    tags: {
      'app.name': 'quckchat',
      'app.type': 'backend',
    },

    // Plugin configuration
    plugins: true,
  });

  // Configure specific plugins
  tracer.use('http', {
    client: true,
    server: true,
  });

  tracer.use('express', {
    hooks: {
      request: (span: any, req: any) => {
        // Add custom tags to request spans
        if (req.user?.id) {
          span.setTag('user.id', req.user.id);
        }
      },
    },
  });

  tracer.use('mongodb-core', {
    service: 'quckchat-mongodb',
  });

  tracer.use('ioredis', {
    service: 'quckchat-redis',
  });

  tracer.use('kafkajs', {
    service: 'quckchat-kafka',
  });

  tracer.use('amqplib', {
    service: 'quckchat-rabbitmq',
  });

  tracer.use('grpc', {
    client: true,
    server: true,
  });

  console.log('[Datadog] APM tracer initialized');
}

export {};
