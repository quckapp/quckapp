-- ============================================================================
-- Seed: Default Roles and Permissions
-- Environment: Development
-- Description: Inserts the four standard roles and a comprehensive set of
--              permissions, then maps permissions to roles.
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- 1. Default Roles
-- ---------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `name`, `description`, `created_at`) VALUES
    (1, 'super_admin',     'Platform-level super administrator with unrestricted access', NOW()),
    (2, 'workspace_admin', 'Workspace administrator with full control over a workspace',  NOW()),
    (3, 'member',          'Regular workspace member with standard privileges',            NOW()),
    (4, 'guest',           'Guest with limited read-only access',                          NOW())
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- ---------------------------------------------------------------------------
-- 2. Default Permissions
-- ---------------------------------------------------------------------------
INSERT INTO `permissions` (`id`, `name`, `resource`, `action`, `created_at`) VALUES
    -- Workspace permissions
    ( 1, 'Create Workspace',        'workspaces', 'create',  NOW()),
    ( 2, 'Read Workspace',          'workspaces', 'read',    NOW()),
    ( 3, 'Update Workspace',        'workspaces', 'update',  NOW()),
    ( 4, 'Delete Workspace',        'workspaces', 'delete',  NOW()),

    -- Channel permissions
    ( 5, 'Create Channel',          'channels',   'create',  NOW()),
    ( 6, 'Read Channel',            'channels',   'read',    NOW()),
    ( 7, 'Update Channel',          'channels',   'update',  NOW()),
    ( 8, 'Delete Channel',          'channels',   'delete',  NOW()),

    -- Message permissions
    ( 9, 'Create Message',          'messages',   'create',  NOW()),
    (10, 'Read Message',            'messages',   'read',    NOW()),
    (11, 'Update Message',          'messages',   'update',  NOW()),
    (12, 'Delete Message',          'messages',   'delete',  NOW()),

    -- User management permissions
    (13, 'Create User',             'users',      'create',  NOW()),
    (14, 'Read User',               'users',      'read',    NOW()),
    (15, 'Update User',             'users',      'update',  NOW()),
    (16, 'Delete User',             'users',      'delete',  NOW()),

    -- Role / permission management
    (17, 'Assign Role',             'roles',      'assign',  NOW()),
    (18, 'Revoke Role',             'roles',      'revoke',  NOW()),
    (19, 'Read Role',               'roles',      'read',    NOW()),
    (20, 'Manage Permissions',      'permissions', 'manage', NOW()),

    -- Audit
    (21, 'Read Audit Logs',         'audit_logs', 'read',    NOW()),

    -- Admin
    (22, 'Manage Admin Settings',   'admin_settings', 'manage', NOW()),
    (23, 'Manage Feature Flags',    'feature_flags',  'manage', NOW()),

    -- File / upload permissions
    (24, 'Upload File',             'files',      'create',  NOW()),
    (25, 'Read File',               'files',      'read',    NOW()),
    (26, 'Delete File',             'files',      'delete',  NOW()),

    -- Invite permissions
    (27, 'Invite Member',           'invites',    'create',  NOW()),
    (28, 'Read Invite',             'invites',    'read',    NOW()),
    (29, 'Revoke Invite',           'invites',    'delete',  NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- 3. Role-Permission Mappings
-- ---------------------------------------------------------------------------

-- super_admin: all permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, `id` FROM `permissions`
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- workspace_admin: everything except platform-level admin settings
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
    -- Workspaces
    (2,  1), (2,  2), (2,  3), (2,  4),
    -- Channels
    (2,  5), (2,  6), (2,  7), (2,  8),
    -- Messages
    (2,  9), (2, 10), (2, 11), (2, 12),
    -- Users (within workspace)
    (2, 13), (2, 14), (2, 15), (2, 16),
    -- Roles
    (2, 17), (2, 18), (2, 19),
    -- Audit
    (2, 21),
    -- Feature flags (read-only implied by workspace scope)
    (2, 23),
    -- Files
    (2, 24), (2, 25), (2, 26),
    -- Invites
    (2, 27), (2, 28), (2, 29)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- member: standard CRUD on channels, messages, files; read workspace/users
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
    -- Workspaces (read only)
    (3,  2),
    -- Channels
    (3,  5), (3,  6), (3,  7),
    -- Messages
    (3,  9), (3, 10), (3, 11),
    -- Users (read)
    (3, 14),
    -- Roles (read)
    (3, 19),
    -- Files
    (3, 24), (3, 25),
    -- Invites (read)
    (3, 28)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;

-- guest: read-only on channels and messages they are invited to
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
    -- Workspaces (read)
    (4,  2),
    -- Channels (read)
    (4,  6),
    -- Messages (read)
    (4, 10),
    -- Users (read)
    (4, 14),
    -- Files (read)
    (4, 25)
ON DUPLICATE KEY UPDATE `role_id` = `role_id`;
