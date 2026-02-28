import { ServiceDefinition } from './types';

/**
 * Master registry of every micro-service, its category, public paths,
 * and default API version.
 *
 * When you add a new service, register it here.
 * Mobile / web / admin consumers read from this registry via the resolver.
 */
export const SERVICE_REGISTRY: readonly ServiceDefinition[] = [
  // ── Auth & Security (Spring Boot) ──────────────────────────────────
  {
    name: 'auth-service',
    category: 'auth',
    paths: ['/auth'],
    defaultVersion: 'v1',
  },
  {
    name: 'permission-service',
    category: 'auth',
    paths: ['/permissions'],
    defaultVersion: 'v1',
  },
  {
    name: 'security-service',
    category: 'auth',
    paths: ['/security'],
    defaultVersion: 'v1',
  },

  // ── User & Admin (Spring Boot) ─────────────────────────────────────
  {
    name: 'user-service',
    category: 'user',
    paths: ['/users'],
    defaultVersion: 'v1',
  },
  {
    name: 'admin-service',
    category: 'user',
    paths: ['/admin'],
    defaultVersion: 'v1',
  },
  {
    name: 'audit-service',
    category: 'user',
    paths: ['/audit'],
    defaultVersion: 'v1',
  },

  // ── Workspace & Channels (Go) ──────────────────────────────────────
  {
    name: 'workspace-service',
    category: 'workspace',
    paths: ['/workspaces', '/invites', '/join'],
    defaultVersion: 'v1',
  },
  {
    name: 'channel-service',
    category: 'workspace',
    paths: ['/channels', '/channel-templates'],
    defaultVersion: 'v1',
  },
  {
    name: 'thread-service',
    category: 'workspace',
    paths: ['/threads'],
    defaultVersion: 'v1',
  },

  // ── Messaging (Elixir / Go) ────────────────────────────────────────
  {
    name: 'message-service',
    category: 'messaging',
    paths: ['/messages'],
    defaultVersion: 'v1',
  },
  {
    name: 'search-service',
    category: 'messaging',
    paths: ['/search'],
    defaultVersion: 'v1',
  },
  {
    name: 'bookmark-service',
    category: 'messaging',
    paths: ['/bookmarks', '/bookmark-folders'],
    defaultVersion: 'v1',
  },

  // ── Real-time (Elixir) ─────────────────────────────────────────────
  {
    name: 'realtime-service',
    category: 'realtime',
    paths: ['/realtime'],
    defaultVersion: 'v1',
  },
  {
    name: 'presence-service',
    category: 'realtime',
    paths: ['/presence'],
    defaultVersion: 'v1',
  },
  {
    name: 'call-service',
    category: 'realtime',
    paths: ['/calls'],
    defaultVersion: 'v1',
  },
  {
    name: 'huddle-service',
    category: 'realtime',
    paths: ['/huddles'],
    defaultVersion: 'v1',
  },

  // ── File & Media (Go) ──────────────────────────────────────────────
  {
    name: 'file-service',
    category: 'media',
    paths: ['/files'],
    defaultVersion: 'v1',
  },
  {
    name: 'media-service',
    category: 'media',
    paths: ['/media'],
    defaultVersion: 'v1',
  },
  {
    name: 'attachment-service',
    category: 'media',
    paths: ['/attachments'],
    defaultVersion: 'v1',
  },
  {
    name: 'cdn-service',
    category: 'media',
    paths: ['/cdn'],
    defaultVersion: 'v1',
  },

  // ── Notifications & Events ─────────────────────────────────────────
  {
    name: 'notification-service',
    category: 'notification',
    paths: ['/notifications', '/notification-templates', '/devices', '/preferences'],
    defaultVersion: 'v1',
  },
  {
    name: 'notification-orchestrator',
    category: 'notification',
    paths: ['/notification-orchestrator'],
    defaultVersion: 'v1',
  },
  {
    name: 'event-broadcast-service',
    category: 'notification',
    paths: ['/broadcast', '/events'],
    defaultVersion: 'v1',
  },
  {
    name: 'reminder-service',
    category: 'notification',
    paths: ['/reminders'],
    defaultVersion: 'v1',
  },

  // ── Analytics & Insights (Python) ──────────────────────────────────
  {
    name: 'analytics-service',
    category: 'analytics',
    paths: ['/analytics'],
    defaultVersion: 'v1',
  },
  {
    name: 'insights-service',
    category: 'analytics',
    paths: ['/insights', '/reports'],
    defaultVersion: 'v1',
  },

  // ── AI & ML (Python) ──────────────────────────────────────────────
  {
    name: 'ml-service',
    category: 'ai',
    paths: ['/ml'],
    defaultVersion: 'v1',
  },
  {
    name: 'moderation-service',
    category: 'ai',
    paths: ['/moderation'],
    defaultVersion: 'v1',
  },
  {
    name: 'sentiment-service',
    category: 'ai',
    paths: ['/sentiment'],
    defaultVersion: 'v1',
  },
  {
    name: 'smart-reply-service',
    category: 'ai',
    paths: ['/replies'],
    defaultVersion: 'v1',
  },

  // ── Data Export & Integration (Python / Go) ────────────────────────
  {
    name: 'export-service',
    category: 'data',
    paths: ['/exports', '/jobs'],
    defaultVersion: 'v1',
  },
  {
    name: 'integration-service',
    category: 'data',
    paths: ['/integrations', '/webhooks', '/oauth'],
    defaultVersion: 'v1',
  },

  // ── BFF / Aggregation (Go) ─────────────────────────────────────────
  {
    name: 'go-bff',
    category: 'bff',
    paths: ['/conversations'],
    defaultVersion: 'v1',
  },
] as const;
