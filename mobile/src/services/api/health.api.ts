/**
 * Health API Service
 * Handles health check related API calls
 */

import api from '../api';

// Types
export interface HealthStatus {
  status: 'ok' | 'error';
  info: {
    mongodb: { status: string };
    redis: { status: string; host?: string; port?: string };
    memory_heap: { status: string };
    memory_rss: { status: string };
    disk: { status: string };
    application: {
      status: string;
      version: string;
      environment: string;
      uptime: string;
      startTime: string;
      processId: number;
      memory: {
        heapUsed: string;
        heapTotal: string;
        heapUsedPercent: string;
      };
    };
  };
  error: Record<string, any>;
  details: Record<string, any>;
}

export interface MetricsResponse {
  status: string;
  timestamp: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
    arrayBuffers: string;
  };
  cpu: {
    user: number;
    system: number;
  };
  node: {
    version: string;
    platform: string;
    arch: string;
  };
  environment: string;
}

// Health API Service
const healthApi = {
  // Main health check
  check: () =>
    api.get<HealthStatus>('/health'),

  // Kubernetes probes
  liveness: () =>
    api.get<HealthStatus>('/health/live'),

  readiness: () =>
    api.get<HealthStatus>('/health/ready'),

  // Individual checks
  database: () =>
    api.get<HealthStatus>('/health/db'),

  memory: () =>
    api.get<HealthStatus>('/health/memory'),

  // Metrics
  metrics: () =>
    api.get<MetricsResponse>('/health/metrics'),
};

export default healthApi;
