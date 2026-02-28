-- ============================================================================
-- Roles: create_roles.sql
-- Description: PostgreSQL role definitions for QuckApp services
-- PostgreSQL 16 | QuckApp
--
-- Roles:
--   app_user       - Used by NestJS services (notification-service,
--                    realtime-service, backend-gateway). Full DML access.
--   readonly_user  - Read-only access for dashboards, analytics, debugging.
--   migration_user - DDL privileges for running schema migrations.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. app_user  (application runtime)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            PASSWORD 'changeme_app';        -- Override via secrets in production
    END IF;
END $$;

-- Grant DML on all current and future tables in public schema
GRANT CONNECT ON DATABASE quckapp TO app_user;
GRANT USAGE   ON SCHEMA public    TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Ensure future tables inherit the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT                  ON SEQUENCES TO app_user;

-- ---------------------------------------------------------------------------
-- 2. readonly_user  (dashboards, debugging)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_user') THEN
        CREATE ROLE readonly_user WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            PASSWORD 'changeme_readonly';   -- Override via secrets in production
    END IF;
END $$;

GRANT CONNECT ON DATABASE quckapp TO readonly_user;
GRANT USAGE   ON SCHEMA public    TO readonly_user;
GRANT SELECT  ON ALL TABLES IN SCHEMA public TO readonly_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly_user;

-- ---------------------------------------------------------------------------
-- 3. migration_user  (schema migrations)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_user') THEN
        CREATE ROLE migration_user WITH
            LOGIN
            NOSUPERUSER
            CREATEDB
            NOCREATEROLE
            PASSWORD 'changeme_migration';  -- Override via secrets in production
    END IF;
END $$;

GRANT CONNECT ON DATABASE quckapp TO migration_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO migration_user;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO migration_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migration_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO migration_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES    TO migration_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO migration_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON FUNCTIONS TO migration_user;
