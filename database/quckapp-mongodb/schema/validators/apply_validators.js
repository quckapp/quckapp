// Apply JSON Schema validators to all QuckApp MongoDB collections
// Usage: mongosh quckapp --file schema/validators/apply_validators.js
//
// This script reads the JSON schema files from schema/collections/ and applies
// them using db.createCollection() (for new collections) or db.runCommand({collMod})
// (for existing collections).
//
// Validation action is set to "warn" by default so existing documents are not
// rejected. Change to "error" for strict enforcement.

const VALIDATION_LEVEL = "moderate"; // "off" | "moderate" | "strict"
const VALIDATION_ACTION = "warn";    // "warn" | "error"

// Schema definitions — embedded to avoid filesystem access limitations in mongosh.
// These match the JSON files in schema/collections/*.json.

const schemas = {
  messages: {
    bsonType: "object",
    title: "messages",
    description: "Schema for the messages collection used by message-service (Elixir/Phoenix)",
    required: [
      "workspace_id", "channel_id", "sender_id", "sender_name",
      "content", "message_type", "created_at", "updated_at"
    ],
    properties: {
      _id: { bsonType: "objectId" },
      workspace_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      channel_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      thread_id: { bsonType: ["string", "null"] },
      sender_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      sender_name: { bsonType: "string", minLength: 1, maxLength: 256 },
      content: { bsonType: "string", maxLength: 40000 },
      message_type: {
        bsonType: "string",
        enum: ["text", "system", "bot", "ephemeral", "slash_command"]
      },
      reactions: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["emoji", "user_id", "created_at"],
          properties: {
            emoji: { bsonType: "string", minLength: 1, maxLength: 64 },
            user_id: { bsonType: "string", minLength: 1, maxLength: 64 },
            created_at: { bsonType: "date" }
          }
        }
      },
      attachments: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["file_id", "filename", "mime_type", "file_size"],
          properties: {
            file_id: { bsonType: "string" },
            filename: { bsonType: "string", maxLength: 512 },
            mime_type: { bsonType: "string", maxLength: 128 },
            file_size: { bsonType: "long", minimum: 0 },
            url: { bsonType: "string", maxLength: 2048 }
          }
        }
      },
      mentions: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["user_id"],
          properties: {
            user_id: { bsonType: "string", maxLength: 64 },
            offset: { bsonType: "int", minimum: 0 },
            length: { bsonType: "int", minimum: 0 }
          }
        }
      },
      edited: { bsonType: "bool" },
      edited_at: { bsonType: "date" },
      pinned: { bsonType: "bool" },
      metadata: { bsonType: "object" },
      deleted_at: { bsonType: "date" },
      created_at: { bsonType: "date" },
      updated_at: { bsonType: "date" }
    },
    additionalProperties: false
  },

  presence: {
    bsonType: "object",
    title: "presence",
    description: "Schema for the presence collection used by presence-service (Elixir/Phoenix)",
    required: ["user_id", "workspace_id", "status", "last_seen"],
    properties: {
      _id: { bsonType: "objectId" },
      user_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      workspace_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      status: { bsonType: "string", enum: ["online", "away", "dnd", "offline"] },
      status_text: { bsonType: "string", maxLength: 256 },
      status_emoji: { bsonType: ["string", "null"], maxLength: 64 },
      device: { bsonType: "string", enum: ["desktop", "mobile", "web", "api"] },
      client_version: { bsonType: "string", maxLength: 32 },
      ip_address: { bsonType: "string", maxLength: 45 },
      last_seen: { bsonType: "date" },
      connected_at: { bsonType: "date" }
    },
    additionalProperties: false
  },

  calls: {
    bsonType: "object",
    title: "calls",
    description: "Schema for the calls collection used by call-service (Elixir/Phoenix)",
    required: [
      "workspace_id", "channel_id", "initiator_id", "call_type",
      "status", "participants", "started_at", "created_at"
    ],
    properties: {
      _id: { bsonType: "objectId" },
      workspace_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      channel_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      initiator_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      call_type: { bsonType: "string", enum: ["audio", "video", "screen_share"] },
      status: {
        bsonType: "string",
        enum: ["ringing", "active", "on_hold", "ended", "missed", "declined"]
      },
      participants: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["user_id", "role", "joined_at"],
          properties: {
            user_id: { bsonType: "string", minLength: 1, maxLength: 64 },
            role: { bsonType: "string", enum: ["initiator", "participant", "observer"] },
            joined_at: { bsonType: "date" },
            left_at: { bsonType: "date" },
            muted: { bsonType: "bool" },
            video_enabled: { bsonType: "bool" },
            screen_sharing: { bsonType: "bool" }
          }
        }
      },
      settings: {
        bsonType: "object",
        properties: {
          max_participants: { bsonType: "int", minimum: 2, maximum: 50 },
          recording_enabled: { bsonType: "bool" },
          recording_url: { bsonType: "string", maxLength: 2048 },
          noise_cancellation: { bsonType: "bool" }
        }
      },
      quality_metrics: {
        bsonType: "object",
        properties: {
          avg_latency_ms: { bsonType: "double" },
          packet_loss_pct: { bsonType: "double", minimum: 0, maximum: 100 },
          avg_bitrate_kbps: { bsonType: "double" }
        }
      },
      started_at: { bsonType: "date" },
      connected_at: { bsonType: "date" },
      ended_at: { bsonType: "date" },
      duration_seconds: { bsonType: "int", minimum: 0 },
      end_reason: {
        bsonType: "string",
        enum: ["normal", "timeout", "error", "cancelled", "network_failure"]
      },
      created_at: { bsonType: "date" }
    },
    additionalProperties: false
  },

  media_files: {
    bsonType: "object",
    title: "media_files",
    description: "Schema for the media_files collection used by media-service (Go)",
    required: [
      "workspace_id", "channel_id", "uploaded_by", "filename",
      "original_filename", "mime_type", "file_size", "file_hash",
      "storage_path", "status", "created_at"
    ],
    properties: {
      _id: { bsonType: "objectId" },
      workspace_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      channel_id: { bsonType: "string", minLength: 1, maxLength: 64 },
      message_id: { bsonType: ["string", "null"], maxLength: 64 },
      uploaded_by: { bsonType: "string", minLength: 1, maxLength: 64 },
      filename: { bsonType: "string", minLength: 1, maxLength: 512 },
      original_filename: { bsonType: "string", minLength: 1, maxLength: 512 },
      mime_type: { bsonType: "string", minLength: 1, maxLength: 128 },
      file_size: { bsonType: "long", minimum: 0 },
      file_hash: { bsonType: "string", minLength: 1, maxLength: 128 },
      storage_path: { bsonType: "string", minLength: 1, maxLength: 1024 },
      storage_bucket: { bsonType: "string", maxLength: 256 },
      cdn_url: { bsonType: "string", maxLength: 2048 },
      thumbnail_url: { bsonType: "string", maxLength: 2048 },
      status: {
        bsonType: "string",
        enum: ["uploading", "processing", "ready", "failed", "quarantined"]
      },
      dimensions: {
        bsonType: "object",
        properties: {
          width: { bsonType: "int", minimum: 0 },
          height: { bsonType: "int", minimum: 0 },
          duration_seconds: { bsonType: "double", minimum: 0 }
        }
      },
      virus_scan: {
        bsonType: "object",
        properties: {
          scanned: { bsonType: "bool" },
          clean: { bsonType: "bool" },
          scanner_version: { bsonType: "string", maxLength: 64 },
          scanned_at: { bsonType: "date" }
        }
      },
      metadata: { bsonType: "object" },
      deleted_at: { bsonType: "date" },
      created_at: { bsonType: "date" },
      updated_at: { bsonType: "date" }
    },
    additionalProperties: false
  }
};

// ---------------------------------------------------------------------------
// Apply validators
// ---------------------------------------------------------------------------

function applyValidator(collectionName, schema) {
  const existingCollections = db.getCollectionNames();
  const validatorDoc = {
    $jsonSchema: schema
  };

  if (existingCollections.includes(collectionName)) {
    // Collection exists — modify its validator
    const result = db.runCommand({
      collMod: collectionName,
      validator: validatorDoc,
      validationLevel: VALIDATION_LEVEL,
      validationAction: VALIDATION_ACTION
    });

    if (result.ok === 1) {
      print(`  [OK] Updated validator on existing collection '${collectionName}'`);
    } else {
      print(`  [ERROR] Failed to update validator on '${collectionName}': ${tojson(result)}`);
    }
  } else {
    // Collection does not exist — create with validator
    const result = db.createCollection(collectionName, {
      validator: validatorDoc,
      validationLevel: VALIDATION_LEVEL,
      validationAction: VALIDATION_ACTION
    });

    if (result.ok === 1) {
      print(`  [OK] Created collection '${collectionName}' with validator`);
    } else {
      print(`  [ERROR] Failed to create collection '${collectionName}': ${tojson(result)}`);
    }
  }
}

print("=== Applying JSON Schema Validators ===\n");

for (const [collectionName, schema] of Object.entries(schemas)) {
  applyValidator(collectionName, schema);
}

print("\n=== Schema validation applied successfully ===");
print(`  Validation level : ${VALIDATION_LEVEL}`);
print(`  Validation action: ${VALIDATION_ACTION}`);
print("");
