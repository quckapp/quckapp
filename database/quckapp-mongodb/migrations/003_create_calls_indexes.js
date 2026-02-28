// Migration 003: Create indexes for the calls collection
// Service: call-service (Elixir/Phoenix)
// Collection: calls
//
// Run with: mongosh quckapp --file 003_create_calls_indexes.js

const collName = "calls";

print(`[003] Creating indexes on '${collName}' collection...`);

if (!db.getCollectionNames().includes(collName)) {
  db.createCollection(collName);
  print(`  Created collection '${collName}'`);
}

// 1. Compound index on (workspace_id, status) — primary query pattern:
//    list active/ringing/ended calls within a workspace.
db.calls.createIndex(
  { workspace_id: 1, status: 1 },
  {
    name: "idx_calls_workspace_status",
    background: true,
    comment: "Primary lookup: calls by workspace filtered by status (active/ringing/ended)"
  }
);
print("  Created index: idx_calls_workspace_status");

// 2. Multikey index on participants array — find all calls a user is
//    participating in or has participated in. MongoDB automatically creates
//    a multikey index when the field contains an array.
db.calls.createIndex(
  { "participants.user_id": 1 },
  {
    name: "idx_calls_participants",
    background: true,
    comment: "Lookup calls by participant user_id (multikey on array)"
  }
);
print("  Created index: idx_calls_participants");

// 3. Index on (channel_id, status) — find the active call in a channel
db.calls.createIndex(
  { channel_id: 1, status: 1 },
  {
    name: "idx_calls_channel_status",
    background: true,
    comment: "Lookup active call in a specific channel"
  }
);
print("  Created index: idx_calls_channel_status");

// 4. Index on started_at — chronological call history, reporting
db.calls.createIndex(
  { started_at: -1 },
  {
    name: "idx_calls_started_at",
    background: true,
    comment: "Chronological call history ordering"
  }
);
print("  Created index: idx_calls_started_at");

// 5. Index on (initiator_id, started_at) — user's call history
db.calls.createIndex(
  { initiator_id: 1, started_at: -1 },
  {
    name: "idx_calls_initiator",
    background: true,
    comment: "Lookup calls initiated by a specific user"
  }
);
print("  Created index: idx_calls_initiator");

print("[003] Calls indexes created successfully.\n");
