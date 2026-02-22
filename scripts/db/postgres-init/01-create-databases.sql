-- =============================================================================
-- QuckApp PostgreSQL Database Initialization
-- Creates databases for NestJS services
-- =============================================================================

CREATE DATABASE quckapp_gateway;
CREATE DATABASE quckapp_notification;
CREATE DATABASE quckapp_realtime;

GRANT ALL PRIVILEGES ON DATABASE quckapp_gateway TO quckapp;
GRANT ALL PRIVILEGES ON DATABASE quckapp_notification TO quckapp;
GRANT ALL PRIVILEGES ON DATABASE quckapp_realtime TO quckapp;
