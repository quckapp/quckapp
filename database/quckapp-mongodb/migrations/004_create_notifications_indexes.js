// Migration 004: Create indexes for the notification_events collection
// Service: notification-orchestrator (Elixir/Phoenix)
// Collection: notification_events
//
// Run with: mongosh quckapp --file 004_create_notifications_indexes.js

const collName = "notification_events";

print(`[004] Creating indexes on '${collName}' collection...`);

if (!db.getCollectionNames().includes(collName)) {
  db.createCollection(collName);
  print(`  Created collection '${collName}'`);
}

// 1. Compound index on (user_id, read, created_at) — primary query pattern:
//    fetch unread notifications for a user, ordered by newest first.
//    The `read` field in the middle allows efficient filtering of unread items.
db.notification_events.createIndex(
  { user_id: 1, read: 1, created_at: -1 },
  {
    name: "idx_notifications_user_read_created",
    background: true,
    comment: "Primary lookup: user notifications filtered by read status, ordered by time"
  }
);
print("  Created index: idx_notifications_user_read_created");

// 2. TTL index on created_at — automatically purge notifications older than
//    90 days (7,776,000 seconds). Keeps the collection size bounded.
db.notification_events.createIndex(
  { created_at: 1 },
  {
    name: "idx_notifications_created_ttl",
    expireAfterSeconds: 7776000, // 90 days
    background: true,
    comment: "TTL: auto-purge notifications older than 90 days"
  }
);
print("  Created index: idx_notifications_created_ttl");

// 3. Index on (user_id, event_type) — filter notifications by type
//    (mentions, reactions, thread replies, etc.)
db.notification_events.createIndex(
  { user_id: 1, event_type: 1 },
  {
    name: "idx_notifications_user_type",
    background: true,
    comment: "Filter notifications by event type for a user"
  }
);
print("  Created index: idx_notifications_user_type");

// 4. Index on (user_id, workspace_id, created_at) — workspace-scoped notifications
db.notification_events.createIndex(
  { user_id: 1, workspace_id: 1, created_at: -1 },
  {
    name: "idx_notifications_user_workspace",
    background: true,
    comment: "Workspace-scoped notification retrieval"
  }
);
print("  Created index: idx_notifications_user_workspace");

// 5. Index on source_id — deduplicate or look up notifications by their source
//    (e.g., the message_id or reaction_id that triggered the notification)
db.notification_events.createIndex(
  { source_id: 1, event_type: 1 },
  {
    name: "idx_notifications_source",
    background: true,
    comment: "Lookup notifications by source entity for deduplication"
  }
);
print("  Created index: idx_notifications_source");

print("[004] Notification events indexes created successfully.\n");
