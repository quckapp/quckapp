/**
 * New Relic Configuration
 *
 * This file configures the New Relic Node.js agent.
 * All configuration options: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/
 */

'use strict';

exports.config = {
  /**
   * Application name shown in New Relic UI
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || 'QuckChat Backend'],

  /**
   * Your New Relic license key
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY || 'your_license_key_here',

  /**
   * Enable/disable the agent
   */
  agent_enabled: process.env.NEW_RELIC_ENABLED === 'true',

  /**
   * Logging configuration
   */
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: 'stdout',
    enabled: true,
  },

  /**
   * Distributed tracing
   */
  distributed_tracing: {
    enabled: true,
  },

  /**
   * Transaction tracer
   */
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500,
  },

  /**
   * Error collector
   */
  error_collector: {
    enabled: true,
    ignore_status_codes: [404, 401],
    ignore_classes: [],
    ignore_messages: [],
    expected_classes: [],
    expected_messages: [],
    expected_status_codes: [],
  },

  /**
   * Browser monitoring
   */
  browser_monitoring: {
    enable: true,
  },

  /**
   * Slow SQL analysis
   */
  slow_sql: {
    enabled: true,
    max_samples: 10,
  },

  /**
   * Custom attributes
   */
  attributes: {
    enabled: true,
    include_enabled: true,
    include: [
      'request.headers.host',
      'request.headers.user-agent',
      'request.method',
      'request.uri',
      'response.status',
    ],
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.x-api-key',
    ],
  },

  /**
   * Transaction events
   */
  transaction_events: {
    enabled: true,
    max_samples_stored: 10000,
  },

  /**
   * Custom events
   */
  custom_insights_events: {
    enabled: true,
    max_samples_stored: 30000,
  },

  /**
   * Span events (for distributed tracing)
   */
  span_events: {
    enabled: true,
    max_samples_stored: 2000,
  },

  /**
   * Application logging (logs in context)
   */
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000,
    },
    metrics: {
      enabled: true,
    },
    local_decorating: {
      enabled: false,
    },
  },

  /**
   * Code-level metrics
   */
  code_level_metrics: {
    enabled: true,
  },

  /**
   * Allow all headers except sensitive ones
   */
  allow_all_headers: true,

  /**
   * Rules for naming transactions
   */
  rules: {
    ignore: [
      '^/health',
      '^/metrics',
      '^/favicon.ico',
    ],
    name: [],
  },

  /**
   * Labels (tags for filtering in UI)
   */
  labels: {
    environment: process.env.NODE_ENV || 'development',
    service: 'quckchat-backend',
  },
};
