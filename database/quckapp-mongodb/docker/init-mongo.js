// ==============================================================================
// QuckApp MongoDB Docker Entrypoint Initialization Script
//
// This script is mounted into /docker-entrypoint-initdb.d/ and runs automatically
// when the MongoDB container starts for the first time.
//
// It creates:
//   1. The quckapp database
//   2. Application users with appropriate roles
//   3. All collections with schema validators
//   4. All indexes defined in the migration files
//
// MongoDB 7.x compatible.
// ==============================================================================

print("================================================================");
print("  QuckApp MongoDB — Docker Initialization");
print("================================================================\n");

// ---------------------------------------------------------------------------
// 1. Create application users
// ---------------------------------------------------------------------------
print("[1/4] Creating application users...\n");

const adminDb = db.getSiblingDB("admin");

function ensureUser(username, password, roles, description) {
  try {
    const existing = adminDb.getUser(username);
    if (existing) {
      adminDb.updateUser(username, { pwd: password, roles: roles });
      print(`  [UPDATED] ${username}`);
    } else {
      adminDb.createUser({
        user: username,
        pwd: password,
        roles: roles,
        customData: { description: description, created_by: "docker-init" }
      });
      print(`  [CREATED] ${username}`);
    }
  } catch (e) {
    print(`  [WARN] Could not create user ${username}: ${e.message}`);
  }
}

// Read passwords from environment variables or use defaults
const appPassword = process.env.QUCKAPP_MONGO_APP_PASSWORD || "dev_app_password_change_me";
const readonlyPassword = process.env.QUCKAPP_MONGO_READONLY_PASSWORD || "dev_readonly_password_change_me";
const backupPassword = process.env.QUCKAPP_MONGO_BACKUP_PASSWORD || "dev_backup_password_change_me";

ensureUser("quckapp_app", appPassword, [
  { role: "readWrite", db: "quckapp" }
], "Application service account");

ensureUser("quckapp_readonly", readonlyPassword, [
  { role: "read", db: "quckapp" }
], "Read-only account for dashboards");

ensureUser("quckapp_backup", backupPassword, [
  { role: "backup", db: "admin" },
  { role: "restore", db: "admin" }
], "Backup and restore account");

// ---------------------------------------------------------------------------
// 2. Switch to the quckapp database and create collections with validators
// ---------------------------------------------------------------------------
print("\n[2/4] Creating collections with schema validators...\n");

const quckapp = db.getSiblingDB("quckapp");

const VALIDATION_LEVEL = "moderate";
const VALIDATION_ACTION = "warn";

function createValidatedCollection(name, schema) {
  try {
    if (quckapp.getCollectionNames().includes(name)) {
      quckapp.runCommand({
        collMod: name,
        validator: { $jsonSchema: schema },
        validationLevel: VALIDATION_LEVEL,
        validationAction: VALIDATION_ACTION
      });
      print(`  [UPDATED] ${name}`);
    } else {
      quckapp.createCollection(name, {
        validator: { $jsonSchema: schema },
        validationLevel: VALIDATION_LEVEL,
        validationAction: VALIDATION_ACTION
      });
      print(`  [CREATED] ${name}`);
    }
  } catch (e) {
    print(`  [ERROR] ${name}: ${e.message}`);
  }
}

// Messages collection
createValidatedCollection("messages", {
  bsonType: "object",
  required: ["workspace_id", "channel_id", "sender_id", "content", "message_type", "created_at", "updated_at"],
  properties: {
    workspace_id: { bsonType: "string" },
    channel_id: { bsonType: "string" },
    thread_id: { bsonType: ["string", "null"] },
    sender_id: { bsonType: "string" },
    sender_name: { bsonType: "string" },
    content: { bsonType: "string", maxLength: 40000 },
    message_type: { bsonType: "string", enum: ["text", "system", "bot", "ephemeral", "slash_command"] },
    reactions: { bsonType: "array" },
    attachments: { bsonType: "array" },
    mentions: { bsonType: "array" },
    edited: { bsonType: "bool" },
    edited_at: { bsonType: "date" },
    pinned: { bsonType: "bool" },
    metadata: { bsonType: "object" },
    deleted_at: { bsonType: "date" },
    created_at: { bsonType: "date" },
    updated_at: { bsonType: "date" }
  }
});

// Presence collection
createValidatedCollection("presence", {
  bsonType: "object",
  required: ["user_id", "workspace_id", "status", "last_seen"],
  properties: {
    user_id: { bsonType: "string" },
    workspace_id: { bsonType: "string" },
    status: { bsonType: "string", enum: ["online", "away", "dnd", "offline"] },
    status_text: { bsonType: "string" },
    status_emoji: { bsonType: ["string", "null"] },
    device: { bsonType: "string" },
    client_version: { bsonType: "string" },
    ip_address: { bsonType: "string" },
    last_seen: { bsonType: "date" },
    connected_at: { bsonType: "date" }
  }
});

// Calls collection
createValidatedCollection("calls", {
  bsonType: "object",
  required: ["workspace_id", "channel_id", "initiator_id", "call_type", "status", "participants", "started_at", "created_at"],
  properties: {
    workspace_id: { bsonType: "string" },
    channel_id: { bsonType: "string" },
    initiator_id: { bsonType: "string" },
    call_type: { bsonType: "string", enum: ["audio", "video", "screen_share"] },
    status: { bsonType: "string", enum: ["ringing", "active", "on_hold", "ended", "missed", "declined"] },
    participants: { bsonType: "array" },
    settings: { bsonType: "object" },
    quality_metrics: { bsonType: "object" },
    started_at: { bsonType: "date" },
    connected_at: { bsonType: "date" },
    ended_at: { bsonType: "date" },
    duration_seconds: { bsonType: "int" },
    end_reason: { bsonType: "string" },
    created_at: { bsonType: "date" }
  }
});

// Notification events collection
createValidatedCollection("notification_events", {
  bsonType: "object",
  required: ["user_id", "workspace_id", "event_type", "read", "created_at"],
  properties: {
    user_id: { bsonType: "string" },
    workspace_id: { bsonType: "string" },
    event_type: { bsonType: "string" },
    source_id: { bsonType: "string" },
    title: { bsonType: "string" },
    body: { bsonType: "string" },
    read: { bsonType: "bool" },
    read_at: { bsonType: "date" },
    data: { bsonType: "object" },
    created_at: { bsonType: "date" }
  }
});

// Huddles collection
createValidatedCollection("huddles", {
  bsonType: "object",
  required: ["workspace_id", "channel_id", "initiator_id", "active", "started_at"],
  properties: {
    workspace_id: { bsonType: "string" },
    channel_id: { bsonType: "string" },
    initiator_id: { bsonType: "string" },
    active: { bsonType: "bool" },
    participants: { bsonType: "array" },
    started_at: { bsonType: "date" },
    ended_at: { bsonType: "date" }
  }
});

// Events collection
createValidatedCollection("events", {
  bsonType: "object",
  required: ["workspace_id", "event_type", "actor_id", "created_at"],
  properties: {
    workspace_id: { bsonType: "string" },
    channel_id: { bsonType: "string" },
    event_type: { bsonType: "string" },
    actor_id: { bsonType: "string" },
    correlation_id: { bsonType: "string" },
    payload: { bsonType: "object" },
    created_at: { bsonType: "date" }
  }
});

// Media files collection
createValidatedCollection("media_files", {
  bsonType: "object",
  required: ["workspace_id", "channel_id", "uploaded_by", "filename", "mime_type", "file_size", "file_hash", "storage_path", "status", "created_at"],
  properties: {
    workspace_id: { bsonType: "string" },
    channel_id: { bsonType: "string" },
    message_id: { bsonType: ["string", "null"] },
    uploaded_by: { bsonType: "string" },
    filename: { bsonType: "string" },
    original_filename: { bsonType: "string" },
    mime_type: { bsonType: "string" },
    file_size: { bsonType: "long" },
    file_hash: { bsonType: "string" },
    storage_path: { bsonType: "string" },
    storage_bucket: { bsonType: "string" },
    cdn_url: { bsonType: "string" },
    thumbnail_url: { bsonType: "string" },
    status: { bsonType: "string", enum: ["uploading", "processing", "ready", "failed", "quarantined"] },
    dimensions: { bsonType: "object" },
    virus_scan: { bsonType: "object" },
    metadata: { bsonType: "object" },
    deleted_at: { bsonType: "date" },
    created_at: { bsonType: "date" },
    updated_at: { bsonType: "date" }
  }
});

// Migration tracking collection
if (!quckapp.getCollectionNames().includes("_migrations")) {
  quckapp.createCollection("_migrations");
  print("  [CREATED] _migrations (tracking)");
}

// ---------------------------------------------------------------------------
// 3. Create all indexes
// ---------------------------------------------------------------------------
print("\n[3/4] Creating indexes...\n");

// --- Messages indexes ---
quckapp.messages.createIndex({ channel_id: 1, created_at: -1 }, { name: "idx_messages_channel_created" });
quckapp.messages.createIndex({ content: "text" }, { name: "idx_messages_content_text", default_language: "english" });
quckapp.messages.createIndex({ sender_id: 1 }, { name: "idx_messages_sender" });
quckapp.messages.createIndex({ deleted_at: 1 }, { name: "idx_messages_deleted_ttl", expireAfterSeconds: 2592000, partialFilterExpression: { deleted_at: { $exists: true } } });
quckapp.messages.createIndex({ thread_id: 1, created_at: 1 }, { name: "idx_messages_thread", partialFilterExpression: { thread_id: { $exists: true } } });
quckapp.messages.createIndex({ channel_id: 1, sender_id: 1, created_at: -1 }, { name: "idx_messages_channel_sender" });
print("  Messages: 6 indexes");

// --- Presence indexes ---
quckapp.presence.createIndex({ user_id: 1, workspace_id: 1 }, { name: "idx_presence_user_workspace", unique: true });
quckapp.presence.createIndex({ last_seen: 1 }, { name: "idx_presence_last_seen_ttl", expireAfterSeconds: 300 });
quckapp.presence.createIndex({ workspace_id: 1, status: 1 }, { name: "idx_presence_workspace_status" });
quckapp.presence.createIndex({ status: 1 }, { name: "idx_presence_status" });
print("  Presence: 4 indexes");

// --- Calls indexes ---
quckapp.calls.createIndex({ workspace_id: 1, status: 1 }, { name: "idx_calls_workspace_status" });
quckapp.calls.createIndex({ "participants.user_id": 1 }, { name: "idx_calls_participants" });
quckapp.calls.createIndex({ channel_id: 1, status: 1 }, { name: "idx_calls_channel_status" });
quckapp.calls.createIndex({ started_at: -1 }, { name: "idx_calls_started_at" });
quckapp.calls.createIndex({ initiator_id: 1, started_at: -1 }, { name: "idx_calls_initiator" });
print("  Calls: 5 indexes");

// --- Notification events indexes ---
quckapp.notification_events.createIndex({ user_id: 1, read: 1, created_at: -1 }, { name: "idx_notifications_user_read_created" });
quckapp.notification_events.createIndex({ created_at: 1 }, { name: "idx_notifications_created_ttl", expireAfterSeconds: 7776000 });
quckapp.notification_events.createIndex({ user_id: 1, event_type: 1 }, { name: "idx_notifications_user_type" });
quckapp.notification_events.createIndex({ user_id: 1, workspace_id: 1, created_at: -1 }, { name: "idx_notifications_user_workspace" });
quckapp.notification_events.createIndex({ source_id: 1, event_type: 1 }, { name: "idx_notifications_source" });
print("  Notifications: 5 indexes");

// --- Huddles indexes ---
quckapp.huddles.createIndex({ channel_id: 1, active: 1 }, { name: "idx_huddles_channel_active" });
quckapp.huddles.createIndex({ workspace_id: 1, active: 1 }, { name: "idx_huddles_workspace_active" });
quckapp.huddles.createIndex({ "participants.user_id": 1, active: 1 }, { name: "idx_huddles_participant_active" });
quckapp.huddles.createIndex({ started_at: -1 }, { name: "idx_huddles_started_at" });
quckapp.huddles.createIndex({ initiator_id: 1, started_at: -1 }, { name: "idx_huddles_initiator" });
print("  Huddles: 5 indexes");

// --- Events indexes ---
quckapp.events.createIndex({ workspace_id: 1, event_type: 1, created_at: -1 }, { name: "idx_events_workspace_type_created" });
quckapp.events.createIndex({ created_at: 1 }, { name: "idx_events_created_ttl", expireAfterSeconds: 2592000 });
quckapp.events.createIndex({ channel_id: 1, event_type: 1, created_at: -1 }, { name: "idx_events_channel_type" });
quckapp.events.createIndex({ actor_id: 1, created_at: -1 }, { name: "idx_events_actor" });
quckapp.events.createIndex({ correlation_id: 1 }, { name: "idx_events_correlation", sparse: true });
print("  Events: 5 indexes");

// --- Media files indexes ---
quckapp.media_files.createIndex({ workspace_id: 1, uploaded_by: 1 }, { name: "idx_media_workspace_uploader" });
quckapp.media_files.createIndex({ file_hash: 1 }, { name: "idx_media_file_hash" });
quckapp.media_files.createIndex({ channel_id: 1, created_at: -1 }, { name: "idx_media_channel_created" });
quckapp.media_files.createIndex({ workspace_id: 1, mime_type: 1 }, { name: "idx_media_workspace_mimetype" });
quckapp.media_files.createIndex({ workspace_id: 1, file_size: -1 }, { name: "idx_media_workspace_size" });
quckapp.media_files.createIndex({ deleted_at: 1 }, { name: "idx_media_deleted_ttl", expireAfterSeconds: 2592000, partialFilterExpression: { deleted_at: { $exists: true } } });
print("  Media files: 6 indexes");

// --- Migrations tracking index ---
quckapp.getCollection("_migrations").createIndex({ filename: 1 }, { unique: true });

// ---------------------------------------------------------------------------
// 4. Summary
// ---------------------------------------------------------------------------
print("\n[4/4] Initialization summary:\n");

const collections = quckapp.getCollectionNames();
print(`  Database    : quckapp`);
print(`  Collections : ${collections.length}`);
collections.forEach(function(coll) {
  const indexCount = quckapp.getCollection(coll).getIndexes().length;
  print(`    ${coll} (${indexCount} indexes)`);
});

print("\n================================================================");
print("  QuckApp MongoDB — Initialization Complete");
print("================================================================\n");
