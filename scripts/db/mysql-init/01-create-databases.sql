-- =============================================================================
-- QuckApp MySQL Database Initialization
-- Creates all databases needed by Spring Boot and Go services
-- =============================================================================

CREATE DATABASE IF NOT EXISTS quckapp_auth;
CREATE DATABASE IF NOT EXISTS quckapp_users;
CREATE DATABASE IF NOT EXISTS quckapp_permissions;
CREATE DATABASE IF NOT EXISTS quckapp_audit;
CREATE DATABASE IF NOT EXISTS quckapp_admin;
CREATE DATABASE IF NOT EXISTS quckapp_security;
CREATE DATABASE IF NOT EXISTS quckapp_etl;

-- Go services
CREATE DATABASE IF NOT EXISTS quckapp_workspace;
CREATE DATABASE IF NOT EXISTS quckapp_channel;
CREATE DATABASE IF NOT EXISTS quckapp_search;
CREATE DATABASE IF NOT EXISTS quckapp_bookmark;
CREATE DATABASE IF NOT EXISTS quckapp_thread;
CREATE DATABASE IF NOT EXISTS quckapp_reminder;
CREATE DATABASE IF NOT EXISTS quckapp_file;
CREATE DATABASE IF NOT EXISTS quckapp_attachment;

-- Python services
CREATE DATABASE IF NOT EXISTS quckapp_analytics;
CREATE DATABASE IF NOT EXISTS quckapp_moderation;
CREATE DATABASE IF NOT EXISTS quckapp_export;
CREATE DATABASE IF NOT EXISTS quckapp_integration;

-- Grant permissions
GRANT ALL PRIVILEGES ON quckapp_auth.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_users.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_permissions.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_audit.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_admin.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_security.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_etl.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_workspace.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_channel.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_search.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_bookmark.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_thread.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_reminder.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_file.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_attachment.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_analytics.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_moderation.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_export.* TO 'quckapp'@'%';
GRANT ALL PRIVILEGES ON quckapp_integration.* TO 'quckapp'@'%';

FLUSH PRIVILEGES;
