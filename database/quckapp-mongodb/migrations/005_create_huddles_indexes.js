// Migration 005: Create indexes for the huddles collection
// Service: huddle-service (Elixir/Phoenix)
// Collection: huddles
//
// Run with: mongosh quckapp --file 005_create_huddles_indexes.js

const collName = "huddles";

print(`[005] Creating indexes on '${collName}' collection...`);

if (!db.getCollectionNames().includes(collName)) {
  db.createCollection(collName);
  print(`  Created collection '${collName}'`);
}

// 1. Compound index on (channel_id, active) — primary query pattern:
//    check if there's an active huddle in a given channel and retrieve it.
db.huddles.createIndex(
  { channel_id: 1, active: 1 },
  {
    name: "idx_huddles_channel_active",
    background: true,
    comment: "Primary lookup: active huddle in a channel"
  }
);
print("  Created index: idx_huddles_channel_active");

// 2. Index on (workspace_id, active) — list all active huddles in a workspace
//    (workspace sidebar, admin views).
db.huddles.createIndex(
  { workspace_id: 1, active: 1 },
  {
    name: "idx_huddles_workspace_active",
    background: true,
    comment: "List all active huddles in a workspace"
  }
);
print("  Created index: idx_huddles_workspace_active");

// 3. Multikey index on participants — find huddles a user is currently in
db.huddles.createIndex(
  { "participants.user_id": 1, active: 1 },
  {
    name: "idx_huddles_participant_active",
    background: true,
    comment: "Find active huddles for a specific participant"
  }
);
print("  Created index: idx_huddles_participant_active");

// 4. Index on started_at — chronological huddle history
db.huddles.createIndex(
  { started_at: -1 },
  {
    name: "idx_huddles_started_at",
    background: true,
    comment: "Chronological huddle history"
  }
);
print("  Created index: idx_huddles_started_at");

// 5. Index on initiator_id — huddles started by a user
db.huddles.createIndex(
  { initiator_id: 1, started_at: -1 },
  {
    name: "idx_huddles_initiator",
    background: true,
    comment: "Lookup huddles started by a specific user"
  }
);
print("  Created index: idx_huddles_initiator");

print("[005] Huddles indexes created successfully.\n");
