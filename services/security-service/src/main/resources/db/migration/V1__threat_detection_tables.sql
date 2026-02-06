-- QuckApp Security Service - Threat Detection Tables
-- MySQL Database

-- Blocked IPs (single IPs and CIDR ranges)
CREATE TABLE blocked_ips (
    id CHAR(36) PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    cidr_range VARCHAR(50),
    reason VARCHAR(500) NOT NULL,
    blocked_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    is_permanent BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_cidr ON blocked_ips(cidr_range);
CREATE INDEX idx_blocked_ips_expires ON blocked_ips(expires_at);
CREATE INDEX idx_blocked_ips_permanent ON blocked_ips(is_permanent);

-- Threat Events (detected threats log)
CREATE TABLE threat_events (
    id CHAR(36) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    source_ip VARCHAR(45),
    target_user_id CHAR(36),
    target_email VARCHAR(255),
    description TEXT NOT NULL,
    details JSON,
    country VARCHAR(100),
    city VARCHAR(100),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_threat_events_type ON threat_events(event_type);
CREATE INDEX idx_threat_events_severity ON threat_events(severity);
CREATE INDEX idx_threat_events_source_ip ON threat_events(source_ip);
CREATE INDEX idx_threat_events_user ON threat_events(target_user_id);
CREATE INDEX idx_threat_events_created ON threat_events(created_at);
CREATE INDEX idx_threat_events_resolved ON threat_events(resolved);

-- Threat Detection Rules (configurable rules engine)
CREATE TABLE threat_rules (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    threshold INT NOT NULL DEFAULT 5,
    window_minutes INT NOT NULL DEFAULT 5,
    action VARCHAR(50) NOT NULL DEFAULT 'LOG',
    auto_block_duration_hours INT,
    conditions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_threat_rules_type ON threat_rules(rule_type);
CREATE INDEX idx_threat_rules_enabled ON threat_rules(enabled);

-- Geo Block Rules (country/region blocking)
CREATE TABLE geo_block_rules (
    id CHAR(36) PRIMARY KEY,
    country_code VARCHAR(10) NOT NULL,
    country_name VARCHAR(255),
    block_type VARCHAR(20) NOT NULL DEFAULT 'DENY',
    reason VARCHAR(500),
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE UNIQUE INDEX idx_geo_block_country ON geo_block_rules(country_code);
CREATE INDEX idx_geo_block_enabled ON geo_block_rules(enabled);

-- Insert default threat detection rules
INSERT INTO threat_rules (id, name, description, rule_type, severity, threshold, window_minutes, action, auto_block_duration_hours) VALUES
(UUID(), 'brute_force_login', 'Detect brute force login attempts', 'BRUTE_FORCE', 'HIGH', 5, 5, 'BLOCK', 24),
(UUID(), 'credential_stuffing', 'Detect credential stuffing attacks', 'CREDENTIAL_STUFFING', 'CRITICAL', 10, 15, 'BLOCK', 72),
(UUID(), 'impossible_travel', 'Detect impossible travel patterns', 'IMPOSSIBLE_TRAVEL', 'HIGH', 1, 30, 'LOG', NULL),
(UUID(), 'rate_limit_abuse', 'Detect API rate limit abuse', 'RATE_LIMIT', 'MEDIUM', 100, 1, 'BLOCK', 1);
