// Seed: Insert sample messages into a test channel
// Usage: mongosh quckapp --file seeds/dev/seed_messages.js
//
// Prerequisites: Run migrations first to ensure indexes exist.

print("[seed] Inserting sample messages...");

const testWorkspaceId = "ws_dev_001";
const testChannelId = "ch_general_001";
const testThreadId = "thread_001";

const users = [
  { id: "usr_alice_001", name: "Alice Chen" },
  { id: "usr_bob_002", name: "Bob Martinez" },
  { id: "usr_carol_003", name: "Carol Johnson" },
  { id: "usr_dave_004", name: "Dave Kim" },
  { id: "usr_eve_005", name: "Eve Nakamura" }
];

const now = new Date();

function minutesAgo(minutes) {
  return new Date(now.getTime() - minutes * 60 * 1000);
}

const messages = [
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[0].id,
    sender_name: users[0].name,
    content: "Hey team! Just pushed the new feature branch for the real-time notifications. Can someone review it?",
    message_type: "text",
    reactions: [
      { emoji: "eyes", user_id: users[1].id, created_at: minutesAgo(58) },
      { emoji: "thumbsup", user_id: users[2].id, created_at: minutesAgo(57) }
    ],
    attachments: [],
    mentions: [],
    edited: false,
    pinned: false,
    created_at: minutesAgo(60),
    updated_at: minutesAgo(60)
  },
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[1].id,
    sender_name: users[1].name,
    content: "Sure, I'll take a look! Which repo is it in?",
    message_type: "text",
    reactions: [],
    attachments: [],
    mentions: [{ user_id: users[0].id, offset: 0, length: 0 }],
    edited: false,
    pinned: false,
    created_at: minutesAgo(55),
    updated_at: minutesAgo(55)
  },
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[0].id,
    sender_name: users[0].name,
    content: "It's in the notification-orchestrator repo, branch: feat/realtime-push",
    message_type: "text",
    reactions: [
      { emoji: "thumbsup", user_id: users[1].id, created_at: minutesAgo(49) }
    ],
    attachments: [],
    mentions: [],
    edited: false,
    pinned: false,
    thread_id: null,
    created_at: minutesAgo(50),
    updated_at: minutesAgo(50)
  },
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[2].id,
    sender_name: users[2].name,
    content: "I've been working on the presence service integration. Here's the design doc:",
    message_type: "text",
    reactions: [],
    attachments: [
      {
        file_id: "file_doc_001",
        filename: "presence-service-design.pdf",
        mime_type: "application/pdf",
        file_size: 245760,
        url: "https://cdn.quckapp.dev/files/presence-service-design.pdf"
      }
    ],
    mentions: [],
    edited: false,
    pinned: true,
    created_at: minutesAgo(45),
    updated_at: minutesAgo(45)
  },
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[3].id,
    sender_name: users[3].name,
    content: "@Carol Johnson Looks great! One question — are we handling the TTL for presence at the MongoDB level or application level?",
    message_type: "text",
    reactions: [],
    attachments: [],
    mentions: [{ user_id: users[2].id, offset: 0, length: 14 }],
    edited: false,
    pinned: false,
    created_at: minutesAgo(40),
    updated_at: minutesAgo(40)
  },
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[2].id,
    sender_name: users[2].name,
    content: "Both actually! MongoDB TTL index as a safety net (5 min), and the Elixir GenServer handles graceful cleanup on disconnect.",
    message_type: "text",
    reactions: [
      { emoji: "fire", user_id: users[3].id, created_at: minutesAgo(34) },
      { emoji: "100", user_id: users[4].id, created_at: minutesAgo(33) }
    ],
    attachments: [],
    mentions: [],
    edited: false,
    pinned: false,
    created_at: minutesAgo(35),
    updated_at: minutesAgo(35)
  },
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[4].id,
    sender_name: users[4].name,
    content: "Quick update on the media-service: Go implementation is passing all benchmarks. Upload throughput is 3x faster than the prototype.",
    message_type: "text",
    reactions: [
      { emoji: "rocket", user_id: users[0].id, created_at: minutesAgo(24) },
      { emoji: "tada", user_id: users[1].id, created_at: minutesAgo(23) },
      { emoji: "clap", user_id: users[2].id, created_at: minutesAgo(22) }
    ],
    attachments: [],
    mentions: [],
    edited: false,
    pinned: false,
    created_at: minutesAgo(25),
    updated_at: minutesAgo(25)
  },
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[0].id,
    sender_name: users[0].name,
    content: "Amazing work Eve! Let's do a quick huddle to discuss the rollout plan. Anyone free in 10?",
    message_type: "text",
    reactions: [
      { emoji: "thumbsup", user_id: users[1].id, created_at: minutesAgo(14) },
      { emoji: "thumbsup", user_id: users[4].id, created_at: minutesAgo(13) }
    ],
    attachments: [],
    mentions: [{ user_id: users[4].id, offset: 0, length: 3 }],
    edited: true,
    edited_at: minutesAgo(14),
    pinned: false,
    created_at: minutesAgo(15),
    updated_at: minutesAgo(14)
  },
  // Thread message — reply to the first message
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    thread_id: testThreadId,
    sender_id: users[1].id,
    sender_name: users[1].name,
    content: "Reviewed the PR. Left a few comments on the WebSocket reconnection logic — minor stuff. LGTM otherwise!",
    message_type: "text",
    reactions: [
      { emoji: "pray", user_id: users[0].id, created_at: minutesAgo(9) }
    ],
    attachments: [],
    mentions: [],
    edited: false,
    pinned: false,
    created_at: minutesAgo(10),
    updated_at: minutesAgo(10)
  },
  {
    _id: ObjectId(),
    workspace_id: testWorkspaceId,
    channel_id: testChannelId,
    sender_id: users[3].id,
    sender_name: users[3].name,
    content: "Starting the huddle now in #engineering-sync. Join when ready!",
    message_type: "system",
    reactions: [],
    attachments: [],
    mentions: [],
    edited: false,
    pinned: false,
    metadata: {
      system_event: "huddle_started",
      huddle_id: "huddle_001",
      target_channel: "ch_eng_sync_001"
    },
    created_at: minutesAgo(5),
    updated_at: minutesAgo(5)
  }
];

// Clear existing seed data in the test channel
const deleteResult = db.messages.deleteMany({ channel_id: testChannelId });
print(`  Cleared ${deleteResult.deletedCount} existing messages in test channel.`);

// Insert seed messages
const insertResult = db.messages.insertMany(messages, { ordered: true });
print(`  Inserted ${insertResult.insertedIds.length} sample messages.`);

// Verify
const count = db.messages.countDocuments({ channel_id: testChannelId });
print(`  Verified: ${count} messages in channel '${testChannelId}'.`);

print("[seed] Messages seeding complete.\n");
