-- ============================================================================
-- Seed: seed_templates.sql
-- Description: Default notification templates for development environment
-- PostgreSQL 16 | QuckApp
-- ============================================================================

BEGIN;

INSERT INTO notification_templates (name, subject, body_template, channel, variables, active)
VALUES
    -- ===================== Push channel =====================================
    (
        'welcome',
        'Welcome to QuckApp!',
        'Hi {{user_name}}, welcome to QuckApp! Start by setting up your profile and joining a workspace.',
        'push',
        '[{"name": "user_name", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'message_received',
        'New message from {{sender_name}}',
        '{{sender_name}}: {{message_preview}}',
        'push',
        '[{"name": "sender_name", "type": "string", "required": true}, {"name": "message_preview", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'mention',
        '{{sender_name}} mentioned you',
        '{{sender_name}} mentioned you in #{{channel_name}}: "{{message_preview}}"',
        'push',
        '[{"name": "sender_name", "type": "string", "required": true}, {"name": "channel_name", "type": "string", "required": true}, {"name": "message_preview", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'channel_invite',
        'You''ve been invited to #{{channel_name}}',
        '{{inviter_name}} invited you to join #{{channel_name}} in {{workspace_name}}.',
        'push',
        '[{"name": "inviter_name", "type": "string", "required": true}, {"name": "channel_name", "type": "string", "required": true}, {"name": "workspace_name", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'reaction_added',
        '{{sender_name}} reacted to your message',
        '{{sender_name}} reacted with {{emoji}} to your message in #{{channel_name}}.',
        'push',
        '[{"name": "sender_name", "type": "string", "required": true}, {"name": "emoji", "type": "string", "required": true}, {"name": "channel_name", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'thread_reply',
        '{{sender_name}} replied to a thread',
        '{{sender_name}} replied to a thread you''re following in #{{channel_name}}: "{{message_preview}}"',
        'push',
        '[{"name": "sender_name", "type": "string", "required": true}, {"name": "channel_name", "type": "string", "required": true}, {"name": "message_preview", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'call_incoming',
        'Incoming call from {{caller_name}}',
        '{{caller_name}} is calling you{{#if channel_name}} in #{{channel_name}}{{/if}}.',
        'push',
        '[{"name": "caller_name", "type": "string", "required": true}, {"name": "channel_name", "type": "string", "required": false}]'::jsonb,
        TRUE
    ),
    (
        'huddle_started',
        'Huddle started in #{{channel_name}}',
        '{{initiator_name}} started a huddle in #{{channel_name}}. Join now!',
        'push',
        '[{"name": "initiator_name", "type": "string", "required": true}, {"name": "channel_name", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'reminder',
        'Reminder: {{reminder_title}}',
        'You asked to be reminded: {{reminder_body}}',
        'push',
        '[{"name": "reminder_title", "type": "string", "required": true}, {"name": "reminder_body", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),

    -- ===================== Email channel ====================================
    (
        'welcome_email',
        'Welcome to QuckApp, {{user_name}}!',
        '<h1>Welcome, {{user_name}}!</h1><p>Thanks for signing up for QuckApp. Get started by <a href="{{setup_url}}">completing your profile</a>.</p>',
        'email',
        '[{"name": "user_name", "type": "string", "required": true}, {"name": "setup_url", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'message_digest_email',
        'You have {{unread_count}} unread messages',
        '<p>Hi {{user_name}},</p><p>You have <strong>{{unread_count}}</strong> unread messages across {{channel_count}} channels.</p><p><a href="{{app_url}}">Open QuckApp</a></p>',
        'email',
        '[{"name": "user_name", "type": "string", "required": true}, {"name": "unread_count", "type": "number", "required": true}, {"name": "channel_count", "type": "number", "required": true}, {"name": "app_url", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'channel_invite_email',
        '{{inviter_name}} invited you to #{{channel_name}}',
        '<p>Hi {{user_name}},</p><p><strong>{{inviter_name}}</strong> invited you to join <strong>#{{channel_name}}</strong> in {{workspace_name}}.</p><p><a href="{{invite_url}}">Accept Invitation</a></p>',
        'email',
        '[{"name": "user_name", "type": "string", "required": true}, {"name": "inviter_name", "type": "string", "required": true}, {"name": "channel_name", "type": "string", "required": true}, {"name": "workspace_name", "type": "string", "required": true}, {"name": "invite_url", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),

    -- ===================== In-app channel ==================================
    (
        'mention_in_app',
        '{{sender_name}} mentioned you in #{{channel_name}}',
        '{{sender_name}} mentioned you: "{{message_preview}}"',
        'in_app',
        '[{"name": "sender_name", "type": "string", "required": true}, {"name": "channel_name", "type": "string", "required": true}, {"name": "message_preview", "type": "string", "required": true}]'::jsonb,
        TRUE
    ),
    (
        'workspace_joined_in_app',
        'Welcome to {{workspace_name}}!',
        'You''ve joined {{workspace_name}}. Say hello to the team!',
        'in_app',
        '[{"name": "workspace_name", "type": "string", "required": true}]'::jsonb,
        TRUE
    )
ON CONFLICT (name) DO UPDATE
    SET subject       = EXCLUDED.subject,
        body_template = EXCLUDED.body_template,
        channel       = EXCLUDED.channel,
        variables     = EXCLUDED.variables,
        active        = EXCLUDED.active,
        updated_at    = now();

COMMIT;
