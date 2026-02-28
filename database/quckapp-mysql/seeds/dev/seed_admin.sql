-- ============================================================================
-- Seed: Default Admin User and Admin Settings
-- Environment: Development
-- Description: Creates the initial super-admin account and populates
--              platform-wide configuration defaults.
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- 1. Default Admin User
--    Password: "Admin@123" (bcrypt hash)
--    IMPORTANT: Change this immediately in non-development environments.
-- ---------------------------------------------------------------------------
INSERT INTO `users` (`id`, `email`, `password_hash`, `status`, `created_at`, `updated_at`) VALUES
    (1, 'admin@quckapp.com', '$2a$12$LJ3m4ys3Lk0TSwHnbHvB4OThJdcxRNJGG7.FDgqGM4Y1yArg3lkFW', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- Admin profile
INSERT INTO `user_profiles` (`user_id`, `display_name`, `avatar_url`, `bio`, `timezone`, `created_at`, `updated_at`) VALUES
    (1, 'QuckApp Admin', NULL, 'Platform administrator', 'UTC', NOW(), NOW())
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Admin settings
INSERT INTO `user_settings` (`user_id`, `theme`, `language`, `notifications_enabled`, `created_at`, `updated_at`) VALUES
    (1, 'system', 'en', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;

-- Assign super_admin role (global scope, workspace_id = 0 for platform level)
INSERT INTO `user_roles` (`user_id`, `role_id`, `workspace_id`, `granted_at`, `granted_by`) VALUES
    (1, 1, 0, NOW(), NULL)
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;

-- ---------------------------------------------------------------------------
-- 2. Default Admin Settings
-- ---------------------------------------------------------------------------
INSERT INTO `admin_settings` (`key`, `value`, `category`, `updated_by`, `updated_at`) VALUES
    -- General
    ('app_name',                'QuckApp',             'general',       1, NOW()),
    ('app_description',         'Real-time collaboration and messaging platform', 'general', 1, NOW()),
    ('app_url',                 'https://app.quckapp.com', 'general',   1, NOW()),
    ('support_email',           'support@quckapp.com', 'general',       1, NOW()),

    -- Maintenance
    ('maintenance_mode',        'false',               'maintenance',   1, NOW()),
    ('maintenance_message',     'We are performing scheduled maintenance. Please check back soon.', 'maintenance', 1, NOW()),

    -- Registration
    ('registration_enabled',    'true',                'registration',  1, NOW()),
    ('invite_only',             'false',               'registration',  1, NOW()),
    ('default_role',            'member',              'registration',  1, NOW()),
    ('email_verification_required', 'true',            'registration',  1, NOW()),

    -- Security
    ('max_login_attempts',      '5',                   'security',      1, NOW()),
    ('lockout_duration_minutes','30',                   'security',      1, NOW()),
    ('password_min_length',     '8',                   'security',      1, NOW()),
    ('session_timeout_minutes', '1440',                'security',      1, NOW()),
    ('two_factor_required',     'false',               'security',      1, NOW()),

    -- Storage
    ('max_upload_size_mb',      '50',                  'storage',       1, NOW()),
    ('allowed_file_types',      'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip', 'storage', 1, NOW()),

    -- Email
    ('smtp_host',               'localhost',           'email',         1, NOW()),
    ('smtp_port',               '587',                 'email',         1, NOW()),
    ('smtp_from_address',       'noreply@quckapp.com', 'email',        1, NOW()),
    ('smtp_from_name',          'QuckApp',             'email',         1, NOW())
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ---------------------------------------------------------------------------
-- 3. Default Feature Flags
-- ---------------------------------------------------------------------------
INSERT INTO `feature_flags` (`name`, `enabled`, `description`, `percentage`, `conditions`, `created_at`, `updated_at`) VALUES
    ('dark_mode',              TRUE,  'Enable dark mode UI theme',                       100, NULL,                                    NOW(), NOW()),
    ('file_sharing',           TRUE,  'Allow file uploads and sharing in channels',      100, NULL,                                    NOW(), NOW()),
    ('video_calls',            FALSE, 'Enable video calling feature',                      0, NULL,                                    NOW(), NOW()),
    ('message_reactions',      TRUE,  'Allow emoji reactions on messages',               100, NULL,                                    NOW(), NOW()),
    ('message_threads',        TRUE,  'Enable threaded message replies',                 100, NULL,                                    NOW(), NOW()),
    ('guest_access',           TRUE,  'Allow guest users to access workspaces',          100, NULL,                                    NOW(), NOW()),
    ('audit_log_export',       FALSE, 'Allow exporting audit logs to CSV',                 0, NULL,                                    NOW(), NOW()),
    ('advanced_search',        FALSE, 'Enable advanced full-text search across messages',  0, '{"min_plan": "enterprise"}',            NOW(), NOW()),
    ('sso_login',              FALSE, 'Enable SAML/SSO authentication',                    0, '{"min_plan": "business"}',              NOW(), NOW()),
    ('beta_features',          FALSE, 'Show beta feature previews to opted-in users',     10, '{"user_setting": "beta_opt_in"}',       NOW(), NOW())
ON DUPLICATE KEY UPDATE `enabled` = VALUES(`enabled`);
