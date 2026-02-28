-- ============================================================================
-- Docker Init: init.sql
-- Description: Docker entrypoint script for PostgreSQL 16 container.
--              Creates the QuckApp database, installs required extensions,
--              and prepares the environment for migrations.
--
-- Mount as: /docker-entrypoint-initdb.d/init.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Create the application database (if running as superuser in Docker)
-- The default 'postgres' database is used as the admin connection.
-- ---------------------------------------------------------------------------
SELECT 'Creating QuckApp database...' AS status;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'quckapp') THEN
        PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE quckapp');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- dblink may not be available; database creation handled below
        RAISE NOTICE 'dblink not available, skipping programmatic DB creation';
END $$;

-- NOTE: In Docker, the POSTGRES_DB env var typically creates the database.
-- This script assumes POSTGRES_DB=quckapp is set in docker-compose.

-- ---------------------------------------------------------------------------
-- Install extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Verify extensions
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE 'Installed extensions:';
END $$;

SELECT extname, extversion FROM pg_extension ORDER BY extname;

-- ---------------------------------------------------------------------------
-- Create schema_migrations tracking table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(256) PRIMARY KEY,
    filename    VARCHAR(512) NOT NULL,
    checksum    VARCHAR(64)  NOT NULL,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Create application roles (safe to re-run)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- app_user: used by NestJS services at runtime
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'changeme_app';
    END IF;

    -- readonly_user: dashboards and debugging
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_user') THEN
        CREATE ROLE readonly_user WITH LOGIN PASSWORD 'changeme_readonly';
    END IF;

    -- migration_user: schema migrations
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_user') THEN
        CREATE ROLE migration_user WITH LOGIN CREATEDB PASSWORD 'changeme_migration';
    END IF;
END $$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE quckapp TO migration_user;
GRANT CONNECT ON DATABASE quckapp TO app_user;
GRANT CONNECT ON DATABASE quckapp TO readonly_user;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO migration_user;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO migration_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO migration_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON FUNCTIONS TO migration_user;

SELECT 'QuckApp PostgreSQL initialization complete.' AS status;
