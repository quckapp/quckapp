-- Permissions table (static permission definitions)
CREATE TABLE permissions (
    id BINARY(16) PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_permission_resource_action (resource, action),
    INDEX idx_permission_resource (resource)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles table
CREATE TABLE roles (
    id BINARY(16) PRIMARY KEY,
    workspace_id BINARY(16) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    is_system BOOLEAN DEFAULT FALSE,
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_workspace_name (workspace_id, name),
    INDEX idx_role_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role-Permission junction table
CREATE TABLE role_permissions (
    role_id BINARY(16) NOT NULL,
    permission_id BINARY(16) NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User roles table
CREATE TABLE user_roles (
    user_id BINARY(16) NOT NULL,
    role_id BINARY(16) NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    channel_id BINARY(16),
    granted_by BINARY(16),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id, workspace_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    INDEX idx_user_role_user (user_id),
    INDEX idx_user_role_workspace (workspace_id),
    INDEX idx_user_role_channel (channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default permissions
INSERT INTO permissions (id, resource, action, description) VALUES
-- Workspace permissions
(UUID_TO_BIN(UUID()), 'workspace', 'create', 'Create workspaces'),
(UUID_TO_BIN(UUID()), 'workspace', 'read', 'View workspace details'),
(UUID_TO_BIN(UUID()), 'workspace', 'update', 'Update workspace settings'),
(UUID_TO_BIN(UUID()), 'workspace', 'delete', 'Delete workspaces'),
(UUID_TO_BIN(UUID()), 'workspace', 'manage_members', 'Manage workspace members'),
(UUID_TO_BIN(UUID()), 'workspace', '*', 'Full workspace access'),

-- Channel permissions
(UUID_TO_BIN(UUID()), 'channel', 'create', 'Create channels'),
(UUID_TO_BIN(UUID()), 'channel', 'read', 'View channel details'),
(UUID_TO_BIN(UUID()), 'channel', 'update', 'Update channel settings'),
(UUID_TO_BIN(UUID()), 'channel', 'delete', 'Delete channels'),
(UUID_TO_BIN(UUID()), 'channel', 'manage_members', 'Manage channel members'),
(UUID_TO_BIN(UUID()), 'channel', '*', 'Full channel access'),

-- Message permissions
(UUID_TO_BIN(UUID()), 'message', 'create', 'Send messages'),
(UUID_TO_BIN(UUID()), 'message', 'read', 'Read messages'),
(UUID_TO_BIN(UUID()), 'message', 'update', 'Edit own messages'),
(UUID_TO_BIN(UUID()), 'message', 'delete', 'Delete messages'),
(UUID_TO_BIN(UUID()), 'message', 'pin', 'Pin messages'),
(UUID_TO_BIN(UUID()), 'message', '*', 'Full message access'),

-- File permissions
(UUID_TO_BIN(UUID()), 'file', 'upload', 'Upload files'),
(UUID_TO_BIN(UUID()), 'file', 'download', 'Download files'),
(UUID_TO_BIN(UUID()), 'file', 'delete', 'Delete files'),
(UUID_TO_BIN(UUID()), 'file', '*', 'Full file access'),

-- User permissions
(UUID_TO_BIN(UUID()), 'user', 'read', 'View user profiles'),
(UUID_TO_BIN(UUID()), 'user', 'update', 'Update user profiles'),
(UUID_TO_BIN(UUID()), 'user', 'invite', 'Invite users'),
(UUID_TO_BIN(UUID()), 'user', 'remove', 'Remove users'),
(UUID_TO_BIN(UUID()), 'user', '*', 'Full user access'),

-- Role permissions
(UUID_TO_BIN(UUID()), 'role', 'create', 'Create roles'),
(UUID_TO_BIN(UUID()), 'role', 'read', 'View roles'),
(UUID_TO_BIN(UUID()), 'role', 'update', 'Update roles'),
(UUID_TO_BIN(UUID()), 'role', 'delete', 'Delete roles'),
(UUID_TO_BIN(UUID()), 'role', 'assign', 'Assign roles to users'),
(UUID_TO_BIN(UUID()), 'role', '*', 'Full role access'),

-- Admin permissions
(UUID_TO_BIN(UUID()), 'admin', 'access', 'Access admin panel'),
(UUID_TO_BIN(UUID()), 'admin', 'manage_settings', 'Manage system settings'),
(UUID_TO_BIN(UUID()), 'admin', 'view_audit_logs', 'View audit logs'),
(UUID_TO_BIN(UUID()), 'admin', 'manage_integrations', 'Manage integrations'),
(UUID_TO_BIN(UUID()), 'admin', '*', 'Full admin access');
