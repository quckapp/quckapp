// Migration 001: Create indexes for the messages collection
// Service: message-service (Elixir/Phoenix)
// Collection: messages
//
// Run with: mongosh quckapp --file 001_create_messages_indexes.js

const collName = "messages";

print(`[001] Creating indexes on '${collName}' collection...`);

// Ensure the collection exists before creating indexes
if (!db.getCollectionNames().includes(collName)) {
  db.createCollection(collName);
  print(`  Created collection '${collName}'`);
}

// 1. Compound index on (channel_id, created_at) — primary query pattern:
//    fetch messages in a channel ordered by timestamp (pagination, history).
db.messages.createIndex(
  { channel_id: 1, created_at: -1 },
  {
    name: "idx_messages_channel_created",
    background: true,
    comment: "Primary lookup: messages by channel ordered by newest first"
  }
);
print("  Created index: idx_messages_channel_created");

// 2. Text index on content — supports full-text search within messages.
//    Only one text index allowed per collection in MongoDB.
db.messages.createIndex(
  { content: "text" },
  {
    name: "idx_messages_content_text",
    default_language: "english",
    weights: { content: 10 },
    background: true,
    comment: "Full-text search on message content"
  }
);
print("  Created index: idx_messages_content_text");

// 3. Index on sender_id — look up all messages sent by a specific user
//    (profile views, moderation, audit trails).
db.messages.createIndex(
  { sender_id: 1 },
  {
    name: "idx_messages_sender",
    background: true,
    comment: "Lookup messages by sender for user profiles and moderation"
  }
);
print("  Created index: idx_messages_sender");

// 4. TTL index on deleted_at — automatically purge soft-deleted messages
//    after 30 days (0 seconds means: expire at the date stored in deleted_at).
db.messages.createIndex(
  { deleted_at: 1 },
  {
    name: "idx_messages_deleted_ttl",
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { deleted_at: { $exists: true } },
    background: true,
    comment: "TTL: auto-purge soft-deleted messages after 30 days"
  }
);
print("  Created index: idx_messages_deleted_ttl");

// 5. Index on thread_id — efficient thread message retrieval
db.messages.createIndex(
  { thread_id: 1, created_at: 1 },
  {
    name: "idx_messages_thread",
    partialFilterExpression: { thread_id: { $exists: true } },
    background: true,
    comment: "Thread message retrieval"
  }
);
print("  Created index: idx_messages_thread");

// 6. Index on (channel_id, sender_id, created_at) — per-user message history in a channel
db.messages.createIndex(
  { channel_id: 1, sender_id: 1, created_at: -1 },
  {
    name: "idx_messages_channel_sender",
    background: true,
    comment: "Per-user message history within a channel"
  }
);
print("  Created index: idx_messages_channel_sender");

print("[001] Messages indexes created successfully.\n");
