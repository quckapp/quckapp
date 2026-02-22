// =============================================================================
// QuckApp MongoDB Database Initialization
// Creates databases and users for Node.js/Express services
// =============================================================================

// Switch to admin for auth
db = db.getSiblingDB('admin');

// Create databases for Node.js services
const databases = [
  'quckapp_messages',
  'quckapp_presence',
  'quckapp_events',
  'quckapp_calls',
  'quckapp_huddles',
  'quckapp_notifications_orch',
  'quckapp_media',
  'quckapp_cdn'
];

databases.forEach(function(dbName) {
  db = db.getSiblingDB(dbName);
  db.createUser({
    user: 'quckapp',
    pwd: 'quckapp123',
    roles: [{ role: 'readWrite', db: dbName }]
  });
  // Create a placeholder collection to ensure db exists
  db.createCollection('_init');
  print('Created database: ' + dbName);
});

print('MongoDB initialization complete');
