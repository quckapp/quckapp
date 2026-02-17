-- QuckApp Security Service - Audit & Compliance Tables
-- MySQL Database

-- Security Events (immutable audit log)
CREATE TABLE security_events (
    id CHAR(36) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    source_service VARCHAR(100),
    user_id CHAR(36),
    user_email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    details JSON,
    request_id VARCHAR(255),
    session_id VARCHAR(255),
    country VARCHAR(100),
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_service ON security_events(source_service);
CREATE INDEX idx_security_events_resource ON security_events(resource_type, resource_id);
CREATE INDEX idx_security_events_action ON security_events(action);
CREATE INDEX idx_security_events_status ON security_events(status);
CREATE INDEX idx_security_events_created ON security_events(created_at);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);

-- Compliance Reports
CREATE TABLE compliance_reports (
    id CHAR(36) PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    summary JSON,
    findings JSON,
    total_events BIGINT DEFAULT 0,
    critical_findings INT DEFAULT 0,
    high_findings INT DEFAULT 0,
    medium_findings INT DEFAULT 0,
    low_findings INT DEFAULT 0,
    generated_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    generated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX idx_compliance_reports_period ON compliance_reports(period_start, period_end);

-- Access Reviews
CREATE TABLE access_reviews (
    id CHAR(36) PRIMARY KEY,
    review_type VARCHAR(50) NOT NULL DEFAULT 'PERIODIC',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    user_id CHAR(36) NOT NULL,
    user_email VARCHAR(255),
    current_roles JSON,
    current_permissions JSON,
    recommendation VARCHAR(50),
    reviewer_id CHAR(36),
    reviewer_email VARCHAR(255),
    review_notes TEXT,
    reviewed_at TIMESTAMP NULL,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_access_reviews_status ON access_reviews(status);
CREATE INDEX idx_access_reviews_user ON access_reviews(user_id);
CREATE INDEX idx_access_reviews_reviewer ON access_reviews(reviewer_id);
CREATE INDEX idx_access_reviews_due ON access_reviews(due_date);

-- Encryption Key Tracking
CREATE TABLE encryption_keys (
    id CHAR(36) PRIMARY KEY,
    key_alias VARCHAR(255) NOT NULL UNIQUE,
    key_type VARCHAR(50) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    key_size INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    service_name VARCHAR(100),
    purpose VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    rotation_interval_days INT DEFAULT 90,
    next_rotation_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_encryption_keys_status ON encryption_keys(status);
CREATE INDEX idx_encryption_keys_service ON encryption_keys(service_name);
CREATE INDEX idx_encryption_keys_expires ON encryption_keys(expires_at);
CREATE INDEX idx_encryption_keys_next_rotation ON encryption_keys(next_rotation_at);
