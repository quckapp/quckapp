-- QuckApp Security Service - WAF Tables
-- MySQL Database

-- WAF Rules (detection patterns)
CREATE TABLE waf_rules (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    pattern TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    enabled BOOLEAN DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 100,
    action VARCHAR(50) NOT NULL DEFAULT 'LOG',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_waf_rules_category ON waf_rules(category);
CREATE INDEX idx_waf_rules_enabled ON waf_rules(enabled);
CREATE INDEX idx_waf_rules_priority ON waf_rules(priority);

-- WAF Events (intercepted requests log)
CREATE TABLE waf_events (
    id CHAR(36) PRIMARY KEY,
    rule_id CHAR(36),
    rule_name VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    action_taken VARCHAR(50) NOT NULL,
    source_ip VARCHAR(45),
    request_method VARCHAR(10),
    request_path VARCHAR(2000),
    request_headers JSON,
    matched_pattern TEXT,
    matched_content TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_id) REFERENCES waf_rules(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_waf_events_rule ON waf_events(rule_id);
CREATE INDEX idx_waf_events_category ON waf_events(category);
CREATE INDEX idx_waf_events_source_ip ON waf_events(source_ip);
CREATE INDEX idx_waf_events_created ON waf_events(created_at);
CREATE INDEX idx_waf_events_severity ON waf_events(severity);

-- WAF Configuration (global settings)
CREATE TABLE waf_config (
    id CHAR(36) PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default WAF configuration
INSERT INTO waf_config (id, config_key, config_value, description) VALUES
(UUID(), 'waf_enabled', 'true', 'Master switch for WAF'),
(UUID(), 'waf_mode', 'DETECT', 'WAF mode: DETECT (log only) or BLOCK (reject requests)'),
(UUID(), 'max_request_body_size', '10485760', 'Maximum request body size in bytes (10MB)'),
(UUID(), 'rate_limit_requests_per_minute', '60', 'Default rate limit per IP per minute'),
(UUID(), 'rate_limit_burst_size', '100', 'Maximum burst requests allowed');

-- Insert default WAF rules for SQL Injection
INSERT INTO waf_rules (id, name, description, category, pattern, severity, priority, action) VALUES
(UUID(), 'sqli_union_select', 'SQL Injection - UNION SELECT', 'SQL_INJECTION', '(?i)(union\\s+(all\\s+)?select)', 'CRITICAL', 10, 'BLOCK'),
(UUID(), 'sqli_or_1_eq_1', 'SQL Injection - OR 1=1', 'SQL_INJECTION', '(?i)(or\\s+1\\s*=\\s*1)', 'HIGH', 10, 'BLOCK'),
(UUID(), 'sqli_drop_table', 'SQL Injection - DROP TABLE', 'SQL_INJECTION', '(?i)(drop\\s+table)', 'CRITICAL', 10, 'BLOCK'),
(UUID(), 'sqli_semicolon', 'SQL Injection - Statement termination', 'SQL_INJECTION', '(;\\s*(drop|delete|update|insert|alter))', 'HIGH', 20, 'BLOCK'),
(UUID(), 'sqli_comment', 'SQL Injection - Comment injection', 'SQL_INJECTION', '(?i)(--|#|/\\*)', 'MEDIUM', 30, 'LOG');

-- Insert default WAF rules for XSS
INSERT INTO waf_rules (id, name, description, category, pattern, severity, priority, action) VALUES
(UUID(), 'xss_script_tag', 'XSS - Script tag', 'XSS', '(?i)(<script[^>]*>)', 'CRITICAL', 10, 'BLOCK'),
(UUID(), 'xss_event_handler', 'XSS - Event handler', 'XSS', '(?i)(on(load|error|click|mouseover|submit|focus|blur)\\s*=)', 'HIGH', 10, 'BLOCK'),
(UUID(), 'xss_javascript_uri', 'XSS - Javascript URI', 'XSS', '(?i)(javascript\\s*:)', 'HIGH', 10, 'BLOCK'),
(UUID(), 'xss_img_src', 'XSS - Image source injection', 'XSS', '(?i)(<img[^>]+src\\s*=\\s*[\"'']?javascript)', 'HIGH', 20, 'BLOCK'),
(UUID(), 'xss_iframe', 'XSS - Iframe injection', 'XSS', '(?i)(<iframe[^>]*>)', 'HIGH', 20, 'BLOCK');

-- Insert default WAF rules for Path Traversal
INSERT INTO waf_rules (id, name, description, category, pattern, severity, priority, action) VALUES
(UUID(), 'path_traversal_dotdot', 'Path Traversal - Directory traversal', 'PATH_TRAVERSAL', '(\\.\\./|\\.\\.\\\\)', 'HIGH', 10, 'BLOCK'),
(UUID(), 'path_traversal_etc', 'Path Traversal - /etc/ access', 'PATH_TRAVERSAL', '(?i)(/etc/(passwd|shadow|hosts))', 'CRITICAL', 10, 'BLOCK');
