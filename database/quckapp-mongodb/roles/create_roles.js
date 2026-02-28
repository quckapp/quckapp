// Create MongoDB users and roles for QuckApp
// Usage: mongosh admin --file roles/create_roles.js
//
// This script must be run against the 'admin' database by an administrator.
// It creates three users scoped to the 'quckapp' database:
//   1. app_user     — readWrite (used by application services)
//   2. readonly_user — read      (used by dashboards, reporting, debugging)
//   3. backup_user  — backup     (used by mongodump/backup scripts)
//
// Passwords should be rotated and stored in a secrets manager in production.
// The defaults here are for local development only.

const APP_DB = "quckapp";

print("=== Creating QuckApp MongoDB Users ===\n");

// ---------------------------------------------------------------------------
// Helper: create or update a user
// ---------------------------------------------------------------------------
function ensureUser(username, password, roles, customData) {
  const adminDb = db.getSiblingDB("admin");
  const userInfo = adminDb.getUser(username);

  if (userInfo) {
    // User exists — update roles and password
    adminDb.updateUser(username, {
      pwd: password,
      roles: roles,
      customData: customData
    });
    print(`  [UPDATED] User '${username}' — roles updated.`);
  } else {
    adminDb.createUser({
      user: username,
      pwd: password,
      roles: roles,
      customData: customData
    });
    print(`  [CREATED] User '${username}'.`);
  }
}

// ---------------------------------------------------------------------------
// 1. app_user — readWrite on quckapp
//    Used by: message-service, presence-service, call-service,
//             notification-orchestrator, huddle-service,
//             event-broadcast-service, media-service
// ---------------------------------------------------------------------------
ensureUser(
  "quckapp_app",
  "dev_app_password_change_me",  // CHANGE IN PRODUCTION
  [
    { role: "readWrite", db: APP_DB }
  ],
  {
    description: "Application service account for QuckApp",
    services: [
      "message-service",
      "presence-service",
      "call-service",
      "notification-orchestrator",
      "huddle-service",
      "event-broadcast-service",
      "media-service"
    ],
    environment: "development",
    created_by: "create_roles.js"
  }
);

// ---------------------------------------------------------------------------
// 2. readonly_user — read on quckapp
//    Used by: dashboards, admin panels, debugging tools, reporting queries
// ---------------------------------------------------------------------------
ensureUser(
  "quckapp_readonly",
  "dev_readonly_password_change_me",  // CHANGE IN PRODUCTION
  [
    { role: "read", db: APP_DB }
  ],
  {
    description: "Read-only account for dashboards and reporting",
    environment: "development",
    created_by: "create_roles.js"
  }
);

// ---------------------------------------------------------------------------
// 3. backup_user — backup role (admin db scope)
//    Used by: mongodump/mongorestore backup scripts
//    The 'backup' built-in role allows mongodump to read all databases.
// ---------------------------------------------------------------------------
ensureUser(
  "quckapp_backup",
  "dev_backup_password_change_me",  // CHANGE IN PRODUCTION
  [
    { role: "backup", db: "admin" },
    { role: "restore", db: "admin" }
  ],
  {
    description: "Backup and restore account for mongodump/mongorestore",
    environment: "development",
    created_by: "create_roles.js"
  }
);

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
print("\n--- User Verification ---");

const adminDb = db.getSiblingDB("admin");
["quckapp_app", "quckapp_readonly", "quckapp_backup"].forEach((username) => {
  const info = adminDb.getUser(username);
  if (info) {
    const roleList = info.roles.map((r) => `${r.role}@${r.db}`).join(", ");
    print(`  ${username}: ${roleList}`);
  } else {
    print(`  ${username}: NOT FOUND (error)`);
  }
});

print("\n=== QuckApp MongoDB users created successfully ===\n");
print("WARNING: Change default passwords before deploying to production!");
print("");
