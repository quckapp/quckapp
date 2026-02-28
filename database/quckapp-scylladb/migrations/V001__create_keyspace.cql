-- ============================================================================
-- V001: Create Keyspace
-- Description: QuckApp keyspace with NetworkTopologyStrategy for production
--              and SimpleStrategy fallback for local development.
-- ============================================================================

-- Production keyspace (multi-datacenter)
-- CREATE KEYSPACE IF NOT EXISTS quckapp
--     WITH replication = {
--         'class': 'NetworkTopologyStrategy',
--         'dc1': 3,
--         'dc2': 3
--     }
--     AND durable_writes = true;

-- Development keyspace (single-node)
CREATE KEYSPACE IF NOT EXISTS quckapp
    WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
    }
    AND durable_writes = true;
