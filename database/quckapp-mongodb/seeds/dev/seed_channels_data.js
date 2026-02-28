// Seed: Insert sample presence data for development
// Usage: mongosh quckapp --file seeds/dev/seed_channels_data.js
//
// Prerequisites: Run migrations first to ensure indexes exist.

print("[seed] Inserting sample presence data...");

const testWorkspaceId = "ws_dev_001";
const now = new Date();

function minutesAgo(minutes) {
  return new Date(now.getTime() - minutes * 60 * 1000);
}

// ------------------------------------------------------------------
// Presence records — simulates who is online right now
// ------------------------------------------------------------------
const presenceRecords = [
  {
    user_id: "usr_alice_001",
    workspace_id: testWorkspaceId,
    status: "online",
    status_text: "Reviewing PRs",
    status_emoji: "eyes",
    device: "desktop",
    client_version: "2.4.1",
    ip_address: "10.0.1.50",
    last_seen: minutesAgo(0), // just now
    connected_at: minutesAgo(120)
  },
  {
    user_id: "usr_bob_002",
    workspace_id: testWorkspaceId,
    status: "online",
    status_text: "",
    status_emoji: null,
    device: "desktop",
    client_version: "2.4.1",
    ip_address: "10.0.1.51",
    last_seen: minutesAgo(1),
    connected_at: minutesAgo(90)
  },
  {
    user_id: "usr_carol_003",
    workspace_id: testWorkspaceId,
    status: "away",
    status_text: "In a meeting",
    status_emoji: "calendar",
    device: "mobile",
    client_version: "2.4.0",
    ip_address: "10.0.2.12",
    last_seen: minutesAgo(3),
    connected_at: minutesAgo(45)
  },
  {
    user_id: "usr_dave_004",
    workspace_id: testWorkspaceId,
    status: "dnd",
    status_text: "Deep work until 3pm",
    status_emoji: "headphones",
    device: "desktop",
    client_version: "2.4.1",
    ip_address: "10.0.1.80",
    last_seen: minutesAgo(0),
    connected_at: minutesAgo(180)
  },
  {
    user_id: "usr_eve_005",
    workspace_id: testWorkspaceId,
    status: "online",
    status_text: "Benchmarking media-service",
    status_emoji: "rocket",
    device: "desktop",
    client_version: "2.4.1",
    ip_address: "10.0.1.99",
    last_seen: minutesAgo(0),
    connected_at: minutesAgo(60)
  },
  {
    user_id: "usr_frank_006",
    workspace_id: testWorkspaceId,
    status: "offline",
    status_text: "",
    status_emoji: null,
    device: "mobile",
    client_version: "2.3.9",
    ip_address: "10.0.3.5",
    last_seen: minutesAgo(4), // will be TTL-expired soon (5 min threshold)
    connected_at: minutesAgo(200)
  }
];

// Clear existing presence for this workspace
const deletePresence = db.presence.deleteMany({ workspace_id: testWorkspaceId });
print(`  Cleared ${deletePresence.deletedCount} existing presence records.`);

// Use bulkWrite with upsert since (user_id, workspace_id) has a unique index
const presenceOps = presenceRecords.map((record) => ({
  updateOne: {
    filter: { user_id: record.user_id, workspace_id: record.workspace_id },
    update: { $set: record },
    upsert: true
  }
}));
const presenceResult = db.presence.bulkWrite(presenceOps);
print(`  Upserted ${presenceResult.upsertedCount + presenceResult.modifiedCount} presence records.`);

// ------------------------------------------------------------------
// Channel activity data — tracks typing indicators and recent activity
// ------------------------------------------------------------------
print("[seed] Inserting sample channel activity data...");

const channelActivityRecords = [
  {
    channel_id: "ch_general_001",
    workspace_id: testWorkspaceId,
    channel_name: "general",
    channel_type: "public",
    last_message_at: minutesAgo(5),
    message_count_today: 47,
    active_users: ["usr_alice_001", "usr_bob_002", "usr_dave_004"],
    typing_users: [
      { user_id: "usr_bob_002", started_at: minutesAgo(0) }
    ],
    pinned_count: 3,
    updated_at: now
  },
  {
    channel_id: "ch_eng_sync_001",
    workspace_id: testWorkspaceId,
    channel_name: "engineering-sync",
    channel_type: "public",
    last_message_at: minutesAgo(15),
    message_count_today: 23,
    active_users: ["usr_alice_001", "usr_carol_003", "usr_eve_005"],
    typing_users: [],
    pinned_count: 1,
    updated_at: now
  },
  {
    channel_id: "ch_dm_alice_bob",
    workspace_id: testWorkspaceId,
    channel_name: null,
    channel_type: "dm",
    last_message_at: minutesAgo(30),
    message_count_today: 12,
    active_users: ["usr_alice_001", "usr_bob_002"],
    typing_users: [],
    pinned_count: 0,
    updated_at: now
  },
  {
    channel_id: "ch_random_001",
    workspace_id: testWorkspaceId,
    channel_name: "random",
    channel_type: "public",
    last_message_at: minutesAgo(120),
    message_count_today: 8,
    active_users: ["usr_dave_004"],
    typing_users: [],
    pinned_count: 5,
    updated_at: now
  },
  {
    channel_id: "ch_private_backend",
    workspace_id: testWorkspaceId,
    channel_name: "backend-team",
    channel_type: "private",
    last_message_at: minutesAgo(10),
    message_count_today: 31,
    active_users: ["usr_alice_001", "usr_carol_003", "usr_dave_004", "usr_eve_005"],
    typing_users: [
      { user_id: "usr_carol_003", started_at: minutesAgo(0) }
    ],
    pinned_count: 2,
    updated_at: now
  }
];

// Ensure channel_activity collection exists
if (!db.getCollectionNames().includes("channel_activity")) {
  db.createCollection("channel_activity");
}

const deleteActivity = db.channel_activity.deleteMany({ workspace_id: testWorkspaceId });
print(`  Cleared ${deleteActivity.deletedCount} existing channel activity records.`);

const activityResult = db.channel_activity.insertMany(channelActivityRecords);
print(`  Inserted ${activityResult.insertedIds.length} channel activity records.`);

// ------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------
print("\n  --- Seed Summary ---");
print(`  Presence records: ${db.presence.countDocuments({ workspace_id: testWorkspaceId })}`);
print(`  Channel activity: ${db.channel_activity.countDocuments({ workspace_id: testWorkspaceId })}`);

print("[seed] Channel and presence seeding complete.\n");
