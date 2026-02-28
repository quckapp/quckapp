-- ============================================================================
-- Database Roles: MySQL User Accounts and Privileges
-- Description: Creates three database-level users with appropriate grants
--              for the QuckApp MySQL database.
--
--   app_user       - Used by Spring Boot services at runtime (DML + routines)
--   readonly_user  - Used by reporting tools, dashboards, read replicas
--   migration_user - Used by Flyway / migration tooling (full DDL + DML)
--
-- IMPORTANT: Replace placeholder passwords before running in any real
--            environment. Use environment-specific secrets management.
-- ============================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 1. Application User (app_user)
--    Used by all Spring Boot microservices for runtime operations.
--    Grants: SELECT, INSERT, UPDATE, DELETE on all tables + EXECUTE routines.
-- ---------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'app_user'@'%'
    IDENTIFIED BY 'CHANGE_ME_app_user_password';

GRANT SELECT, INSERT, UPDATE, DELETE
    ON `quckapp`.* TO 'app_user'@'%';

GRANT EXECUTE
    ON `quckapp`.* TO 'app_user'@'%';

-- Allow the app user to use SHOW VIEW (needed for some ORMs)
GRANT SHOW VIEW
    ON `quckapp`.* TO 'app_user'@'%';

-- ---------------------------------------------------------------------------
-- 2. Read-Only User (readonly_user)
--    Used by analytics dashboards, monitoring, and read replicas.
--    Grants: SELECT only on all tables and views.
-- ---------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'readonly_user'@'%'
    IDENTIFIED BY 'CHANGE_ME_readonly_user_password';

GRANT SELECT
    ON `quckapp`.* TO 'readonly_user'@'%';

GRANT SHOW VIEW
    ON `quckapp`.* TO 'readonly_user'@'%';

-- ---------------------------------------------------------------------------
-- 3. Migration User (migration_user)
--    Used by Flyway or other migration tooling.
--    Grants: Full DDL + DML privileges to create/alter/drop schema objects.
-- ---------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'migration_user'@'%'
    IDENTIFIED BY 'CHANGE_ME_migration_user_password';

GRANT ALL PRIVILEGES
    ON `quckapp`.* TO 'migration_user'@'%';

-- Grant SUPER is intentionally omitted for security. If Flyway requires
-- it for specific operations (e.g., triggers with DEFINER), grant it
-- explicitly and narrowly:
-- GRANT TRIGGER ON `quckapp`.* TO 'migration_user'@'%';

-- Ensure trigger and routine creation privileges
GRANT CREATE ROUTINE, ALTER ROUTINE, TRIGGER
    ON `quckapp`.* TO 'migration_user'@'%';

-- ---------------------------------------------------------------------------
-- Apply changes
-- ---------------------------------------------------------------------------
FLUSH PRIVILEGES;
