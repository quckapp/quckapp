// Migration 002: Create indexes for the presence collection
// Service: presence-service (Elixir/Phoenix)
// Collection: presence
//
// Run with: mongosh quckapp --file 002_create_presence_indexes.js

const collName = "presence";

print(`[002] Creating indexes on '${collName}' collection...`);

if (!db.getCollectionNames().includes(collName)) {
  db.createCollection(collName);
  print(`  Created collection '${collName}'`);
}

// 1. Compound unique index on (user_id, workspace_id) — one presence record
//    per user per workspace. This is the primary lookup pattern for the
//    presence-service when checking or updating user status.
db.presence.createIndex(
  { user_id: 1, workspace_id: 1 },
  {
    name: "idx_presence_user_workspace",
    unique: true,
    background: true,
    comment: "Primary lookup: unique presence per user per workspace"
  }
);
print("  Created index: idx_presence_user_workspace");

// 2. TTL index on last_seen — automatically expire stale presence documents
//    after 5 minutes (300 seconds). If a user hasn't heartbeated within
//    5 minutes, their presence record is automatically removed.
db.presence.createIndex(
  { last_seen: 1 },
  {
    name: "idx_presence_last_seen_ttl",
    expireAfterSeconds: 300, // 5 minutes
    background: true,
    comment: "TTL: auto-expire presence after 5 minutes of inactivity"
  }
);
print("  Created index: idx_presence_last_seen_ttl");

// 3. Index on workspace_id — fetch all online users in a workspace
//    (sidebar presence indicators, member lists).
db.presence.createIndex(
  { workspace_id: 1, status: 1 },
  {
    name: "idx_presence_workspace_status",
    background: true,
    comment: "Fetch online users in a workspace filtered by status"
  }
);
print("  Created index: idx_presence_workspace_status");

// 4. Index on status — aggregate counts of online/away/dnd users
db.presence.createIndex(
  { status: 1 },
  {
    name: "idx_presence_status",
    background: true,
    comment: "Aggregate presence counts by status"
  }
);
print("  Created index: idx_presence_status");

print("[002] Presence indexes created successfully.\n");
