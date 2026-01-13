// =============================================================================
// QUIKAPP - MongoDB Initialization Script
// =============================================================================
// Creates initial database, collections, and indexes
// =============================================================================

// Switch to quikapp database
db = db.getSiblingDB('quikapp');

// Create application user
db.createUser({
    user: 'quikapp',
    pwd: 'quikapp_secret',
    roles: [
        { role: 'readWrite', db: 'quikapp' }
    ]
});

// Create collections with validation
db.createCollection('audit_logs', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['timestamp', 'action', 'actor_id', 'resource_type'],
            properties: {
                timestamp: {
                    bsonType: 'date',
                    description: 'Timestamp is required'
                },
                action: {
                    bsonType: 'string',
                    description: 'Action type is required'
                },
                actor_id: {
                    bsonType: 'string',
                    description: 'Actor ID is required'
                },
                resource_type: {
                    bsonType: 'string',
                    description: 'Resource type is required'
                },
                resource_id: {
                    bsonType: 'string'
                },
                workspace_id: {
                    bsonType: 'string'
                },
                metadata: {
                    bsonType: 'object'
                },
                ip_address: {
                    bsonType: 'string'
                },
                user_agent: {
                    bsonType: 'string'
                }
            }
        }
    }
});

// Create indexes for audit_logs
db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ actor_id: 1, timestamp: -1 });
db.audit_logs.createIndex({ workspace_id: 1, timestamp: -1 });
db.audit_logs.createIndex({ resource_type: 1, action: 1 });
db.audit_logs.createIndex({ 'metadata.correlation_id': 1 });

// Create activity_logs collection
db.createCollection('activity_logs');
db.activity_logs.createIndex({ user_id: 1, timestamp: -1 });
db.activity_logs.createIndex({ workspace_id: 1, timestamp: -1 });
db.activity_logs.createIndex({ timestamp: -1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Create error_logs collection
db.createCollection('error_logs');
db.error_logs.createIndex({ timestamp: -1 });
db.error_logs.createIndex({ service: 1, timestamp: -1 });
db.error_logs.createIndex({ level: 1 });
db.error_logs.createIndex({ timestamp: -1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// Create file_metadata collection
db.createCollection('file_metadata');
db.file_metadata.createIndex({ file_id: 1 }, { unique: true });
db.file_metadata.createIndex({ workspace_id: 1, created_at: -1 });
db.file_metadata.createIndex({ uploader_id: 1 });
db.file_metadata.createIndex({ content_type: 1 });
db.file_metadata.createIndex({ 'metadata.tags': 1 });

print('QuikApp MongoDB initialization complete');
