-- ============================================================================
-- Docker Entrypoint Init Script
-- Description: Creates databases for all QuckApp Spring Boot microservices.
--              This file is mounted into /docker-entrypoint-initdb.d/ and
--              is executed automatically when the MySQL container starts
--              for the first time.
--
-- Services:
--   auth-service        -> quckapp_auth
--   user-service        -> quckapp_users
--   permission-service  -> quckapp_permissions
--   audit-service       -> quckapp_audit
--   admin-service       -> quckapp_admin
--   security-service    -> quckapp_security
--
-- A shared database (quckapp) is also created for monolithic / local dev use.
-- ============================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 1. Shared / monolithic database (used in local development)
-- ---------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `quckapp`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. Per-service databases (used in microservice deployments)
-- ---------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `quckapp_auth`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `quckapp_users`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `quckapp_permissions`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `quckapp_audit`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `quckapp_admin`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `quckapp_security`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. Application users (dev passwords - NEVER use in production)
-- ---------------------------------------------------------------------------

-- Runtime application user
CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'app_user_dev_password';

-- Read-only reporting user
CREATE USER IF NOT EXISTS 'readonly_user'@'%' IDENTIFIED BY 'readonly_dev_password';

-- Migration / DDL user
CREATE USER IF NOT EXISTS 'migration_user'@'%' IDENTIFIED BY 'migration_dev_password';

-- ---------------------------------------------------------------------------
-- 4. Grant privileges on shared database
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW
    ON `quckapp`.* TO 'app_user'@'%';

GRANT SELECT, SHOW VIEW
    ON `quckapp`.* TO 'readonly_user'@'%';

GRANT ALL PRIVILEGES
    ON `quckapp`.* TO 'migration_user'@'%';

-- ---------------------------------------------------------------------------
-- 5. Grant privileges on per-service databases
-- ---------------------------------------------------------------------------

-- auth
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON `quckapp_auth`.*        TO 'app_user'@'%';
GRANT ALL PRIVILEGES                                      ON `quckapp_auth`.*        TO 'migration_user'@'%';
GRANT SELECT, SHOW VIEW                                   ON `quckapp_auth`.*        TO 'readonly_user'@'%';

-- users
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON `quckapp_users`.*       TO 'app_user'@'%';
GRANT ALL PRIVILEGES                                      ON `quckapp_users`.*       TO 'migration_user'@'%';
GRANT SELECT, SHOW VIEW                                   ON `quckapp_users`.*       TO 'readonly_user'@'%';

-- permissions
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON `quckapp_permissions`.* TO 'app_user'@'%';
GRANT ALL PRIVILEGES                                      ON `quckapp_permissions`.* TO 'migration_user'@'%';
GRANT SELECT, SHOW VIEW                                   ON `quckapp_permissions`.* TO 'readonly_user'@'%';

-- audit
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON `quckapp_audit`.*       TO 'app_user'@'%';
GRANT ALL PRIVILEGES                                      ON `quckapp_audit`.*       TO 'migration_user'@'%';
GRANT SELECT, SHOW VIEW                                   ON `quckapp_audit`.*       TO 'readonly_user'@'%';

-- admin
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON `quckapp_admin`.*       TO 'app_user'@'%';
GRANT ALL PRIVILEGES                                      ON `quckapp_admin`.*       TO 'migration_user'@'%';
GRANT SELECT, SHOW VIEW                                   ON `quckapp_admin`.*       TO 'readonly_user'@'%';

-- security
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON `quckapp_security`.*    TO 'app_user'@'%';
GRANT ALL PRIVILEGES                                      ON `quckapp_security`.*    TO 'migration_user'@'%';
GRANT SELECT, SHOW VIEW                                   ON `quckapp_security`.*    TO 'readonly_user'@'%';

-- ---------------------------------------------------------------------------
-- 6. Apply privilege changes
-- ---------------------------------------------------------------------------
FLUSH PRIVILEGES;
