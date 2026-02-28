// Migration 006: Create indexes for the events collection
// Service: event-broadcast-service (Elixir/Phoenix)
// Collection: events
//
// Run with: mongosh quckapp --file 006_create_events_indexes.js

const collName = "events";

print(`[006] Creating indexes on '${collName}' collection...`);

if (!db.getCollectionNames().includes(collName)) {
  db.createCollection(collName);
  print(`  Created collection '${collName}'`);
}

// 1. Compound index on (workspace_id, event_type, created_at) — primary query:
//    retrieve events of a specific type within a workspace, ordered by time.
//    Used by event-broadcast-service for replay, audit, and debugging.
db.events.createIndex(
  { workspace_id: 1, event_type: 1, created_at: -1 },
  {
    name: "idx_events_workspace_type_created",
    background: true,
    comment: "Primary lookup: events by workspace and type, ordered by time"
  }
);
print("  Created index: idx_events_workspace_type_created");

// 2. TTL index on created_at — automatically purge events older than 30 days
//    (2,592,000 seconds). Events are ephemeral broadcast records.
db.events.createIndex(
  { created_at: 1 },
  {
    name: "idx_events_created_ttl",
    expireAfterSeconds: 2592000, // 30 days
    background: true,
    comment: "TTL: auto-purge events older than 30 days"
  }
);
print("  Created index: idx_events_created_ttl");

// 3. Index on (channel_id, event_type) — channel-scoped event lookups
db.events.createIndex(
  { channel_id: 1, event_type: 1, created_at: -1 },
  {
    name: "idx_events_channel_type",
    background: true,
    comment: "Channel-scoped event lookups for replay"
  }
);
print("  Created index: idx_events_channel_type");

// 4. Index on actor_id — trace events triggered by a specific user
db.events.createIndex(
  { actor_id: 1, created_at: -1 },
  {
    name: "idx_events_actor",
    background: true,
    comment: "Trace events by the user who triggered them"
  }
);
print("  Created index: idx_events_actor");

// 5. Index on correlation_id — trace related events across services
db.events.createIndex(
  { correlation_id: 1 },
  {
    name: "idx_events_correlation",
    sparse: true,
    background: true,
    comment: "Trace correlated events across services"
  }
);
print("  Created index: idx_events_correlation");

print("[006] Events indexes created successfully.\n");
