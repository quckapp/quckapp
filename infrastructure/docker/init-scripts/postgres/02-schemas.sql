-- =============================================================================
-- QUIKAPP - PostgreSQL Additional Schemas
-- =============================================================================
-- Creates domain-specific schemas for microservices
-- =============================================================================

-- Create schemas for different domains
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS workspaces;
CREATE SCHEMA IF NOT EXISTS messaging;
CREATE SCHEMA IF NOT EXISTS files;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS admin;

-- Grant schema usage to application user
GRANT USAGE ON SCHEMA auth TO quikapp;
GRANT USAGE ON SCHEMA users TO quikapp;
GRANT USAGE ON SCHEMA workspaces TO quikapp;
GRANT USAGE ON SCHEMA messaging TO quikapp;
GRANT USAGE ON SCHEMA files TO quikapp;
GRANT USAGE ON SCHEMA notifications TO quikapp;
GRANT USAGE ON SCHEMA admin TO quikapp;

-- Grant all privileges on all tables in schemas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO quikapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA users TO quikapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA workspaces TO quikapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA messaging TO quikapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA files TO quikapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA notifications TO quikapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA admin TO quikapp;

-- Grant sequence usage
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO quikapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA users TO quikapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA workspaces TO quikapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA messaging TO quikapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA files TO quikapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA notifications TO quikapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA admin TO quikapp;

-- Set default search path
ALTER DATABASE quikapp SET search_path TO public, auth, users, workspaces, messaging, files, notifications, admin;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'QuikApp PostgreSQL schemas initialization complete';
END $$;
