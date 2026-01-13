-- QuikApp PostgreSQL Initialization Script
-- Creates databases for NestJS gateway services

-- Create databases
CREATE DATABASE quikapp_gateway;
CREATE DATABASE quikapp_notifications;

-- Create application user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'quikapp') THEN
    CREATE USER quikapp WITH PASSWORD 'quikapp123';
  END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE quikapp TO quikapp;
GRANT ALL PRIVILEGES ON DATABASE quikapp_gateway TO quikapp;
GRANT ALL PRIVILEGES ON DATABASE quikapp_notifications TO quikapp;

-- Connect to gateway database and set up schema
\c quikapp_gateway;
GRANT ALL ON SCHEMA public TO quikapp;

-- Connect to notifications database and set up schema
\c quikapp_notifications;
GRANT ALL ON SCHEMA public TO quikapp;

-- Log completion
SELECT 'QuikApp PostgreSQL initialization complete' AS status;
