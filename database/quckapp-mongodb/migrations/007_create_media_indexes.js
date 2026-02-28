// Migration 007: Create indexes for the media_files collection
// Service: media-service (Go)
// Collection: media_files
//
// Run with: mongosh quckapp --file 007_create_media_indexes.js

const collName = "media_files";

print(`[007] Creating indexes on '${collName}' collection...`);

if (!db.getCollectionNames().includes(collName)) {
  db.createCollection(collName);
  print(`  Created collection '${collName}'`);
}

// 1. Compound index on (workspace_id, uploaded_by) — primary query pattern:
//    list files uploaded by a user within a workspace (file browser, user uploads).
db.media_files.createIndex(
  { workspace_id: 1, uploaded_by: 1 },
  {
    name: "idx_media_workspace_uploader",
    background: true,
    comment: "Primary lookup: files by workspace and uploader"
  }
);
print("  Created index: idx_media_workspace_uploader");

// 2. Index on file_hash — deduplicate uploads. Before storing a new file,
//    the media-service checks if a file with the same hash already exists.
db.media_files.createIndex(
  { file_hash: 1 },
  {
    name: "idx_media_file_hash",
    background: true,
    comment: "Deduplication: lookup files by content hash"
  }
);
print("  Created index: idx_media_file_hash");

// 3. Index on (channel_id, created_at) — list files shared in a channel
db.media_files.createIndex(
  { channel_id: 1, created_at: -1 },
  {
    name: "idx_media_channel_created",
    background: true,
    comment: "List files shared in a channel ordered by time"
  }
);
print("  Created index: idx_media_channel_created");

// 4. Index on (workspace_id, mime_type) — filter files by type within workspace
db.media_files.createIndex(
  { workspace_id: 1, mime_type: 1 },
  {
    name: "idx_media_workspace_mimetype",
    background: true,
    comment: "Filter files by MIME type within a workspace"
  }
);
print("  Created index: idx_media_workspace_mimetype");

// 5. Index on (workspace_id, file_size) — storage analytics, quota checks
db.media_files.createIndex(
  { workspace_id: 1, file_size: -1 },
  {
    name: "idx_media_workspace_size",
    background: true,
    comment: "Storage analytics and quota calculations"
  }
);
print("  Created index: idx_media_workspace_size");

// 6. TTL index on deleted_at — purge deleted file metadata after 30 days
db.media_files.createIndex(
  { deleted_at: 1 },
  {
    name: "idx_media_deleted_ttl",
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { deleted_at: { $exists: true } },
    background: true,
    comment: "TTL: auto-purge deleted file metadata after 30 days"
  }
);
print("  Created index: idx_media_deleted_ttl");

print("[007] Media files indexes created successfully.\n");
