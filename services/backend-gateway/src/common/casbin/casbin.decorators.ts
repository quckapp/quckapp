import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { CasbinGuard, CasbinOwnershipGuard, CasbinPermissionGuard } from './casbin.guard';

// Metadata keys
export const POLICY_KEY = 'casbin:policy';
export const RESOURCE_KEY = 'casbin:resource';
export const ACTION_KEY = 'casbin:action';
export const SKIP_CASBIN_KEY = 'casbin:skip';
export const OWNERSHIP_FIELD_KEY = 'casbin:ownershipField';

// Policy actions
export type PolicyAction = 'read' | 'create' | 'update' | 'delete' | 'search' | 'manage' | string;

// Policy definition interface
export interface PolicyDefinition {
  resource: string;
  action: PolicyAction;
  domain?: string;
}

/**
 * Define a policy for a route
 * @param resource - The resource path (e.g., 'users/:userId', 'messages')
 * @param action - The action (read, create, update, delete, etc.)
 * @param domain - Optional domain for multi-tenant scenarios (default: '*')
 *
 * @example
 * ```typescript
 * @Policy('admin/users', 'read')
 * @Get()
 * getAllUsers() { ... }
 *
 * @Policy('users/:userId', 'update')
 * @Patch(':id')
 * updateUser(@Param('id') id: string) { ... }
 * ```
 */
export const Policy = (resource: string, action: PolicyAction, domain?: string) =>
  SetMetadata(POLICY_KEY, { resource, action, domain } as PolicyDefinition);

/**
 * Set the resource for casbin check
 * Use with @Action decorator
 *
 * @example
 * ```typescript
 * @Resource('conversations')
 * @Action('create')
 * @Post()
 * createConversation() { ... }
 * ```
 */
export const Resource = (resource: string) => SetMetadata(RESOURCE_KEY, resource);

/**
 * Set the action for casbin check
 * Use with @Resource decorator
 */
export const Action = (action: PolicyAction) => SetMetadata(ACTION_KEY, action);

/**
 * Skip casbin authorization for this route
 * Useful for public endpoints or endpoints that have their own authorization logic
 *
 * @example
 * ```typescript
 * @SkipCasbin()
 * @Get('health')
 * healthCheck() { ... }
 * ```
 */
export const SkipCasbin = () => SetMetadata(SKIP_CASBIN_KEY, true);

/**
 * Specify the field used to determine resource ownership
 * Used with CasbinOwnershipGuard
 *
 * @param field - The param or body field containing the owner ID
 *
 * @example
 * ```typescript
 * @OwnershipField('userId')
 * @Get(':userId/profile')
 * getProfile(@Param('userId') userId: string) { ... }
 * ```
 */
export const OwnershipField = (field: string) => SetMetadata(OWNERSHIP_FIELD_KEY, field);

/**
 * Combined decorator for common CRUD operations
 * Applies both Policy and uses CasbinGuard
 */
export const RequirePolicy = (resource: string, action: PolicyAction, domain?: string) =>
  applyDecorators(Policy(resource, action, domain), UseGuards(CasbinGuard));

/**
 * Require that the user owns the resource or has elevated permissions
 * Combines policy check with ownership verification
 */
export const RequireOwnership = (resource: string, action: PolicyAction, ownerField = 'userId') =>
  applyDecorators(
    Policy(resource, action),
    OwnershipField(ownerField),
    UseGuards(CasbinOwnershipGuard),
  );

/**
 * Decorator for admin-only routes
 * Shorthand for requiring admin role permissions
 */
export const AdminOnly = (resource: string, action: PolicyAction = 'read') =>
  applyDecorators(Policy(`admin/${resource}`, action), UseGuards(CasbinGuard));

/**
 * Decorator for moderator-accessible routes
 */
export const ModeratorAccess = (resource: string, action: PolicyAction = 'read') =>
  applyDecorators(Policy(resource, action), UseGuards(CasbinGuard));

/**
 * Decorator for routes that require specific permissions
 * Uses explicit permission checking
 */
export const RequirePermission = (resource: string, action: PolicyAction) =>
  applyDecorators(Policy(resource, action), UseGuards(CasbinPermissionGuard));

// Pre-defined policy decorators for common resources

/**
 * User resource policies
 */
export const UserPolicy = {
  Read: (userId = ':userId') => RequirePolicy(`users/${userId}`, 'read'),
  Update: (userId = ':userId') => RequirePolicy(`users/${userId}`, 'update'),
  Delete: (userId = ':userId') => RequirePolicy(`users/${userId}`, 'delete'),
  Search: () => RequirePolicy('users', 'search'),
  Settings: {
    Read: (userId = ':userId') => RequirePolicy(`users/${userId}/settings`, 'read'),
    Update: (userId = ':userId') => RequirePolicy(`users/${userId}/settings`, 'update'),
  },
};

/**
 * Conversation resource policies
 */
export const ConversationPolicy = {
  List: () => RequirePolicy('conversations', 'read'),
  Create: () => RequirePolicy('conversations', 'create'),
  Read: (id = ':conversationId') => RequirePolicy(`conversations/${id}`, 'read'),
  Update: (id = ':conversationId') => RequirePolicy(`conversations/${id}`, 'update'),
  Delete: (id = ':conversationId') => RequirePolicy(`conversations/${id}`, 'delete'),
};

/**
 * Message resource policies
 */
export const MessagePolicy = {
  List: () => RequirePolicy('messages', 'read'),
  Create: () => RequirePolicy('messages', 'create'),
  Read: (id = ':messageId') => RequirePolicy(`messages/${id}`, 'read'),
  Update: (id = ':messageId') => RequirePolicy(`messages/${id}`, 'update'),
  Delete: (id = ':messageId') => RequirePolicy(`messages/${id}`, 'delete'),
};

/**
 * Admin resource policies
 */
export const AdminPolicy = {
  Users: {
    List: () => AdminOnly('users', 'read'),
    Read: (id = ':userId') => AdminOnly(`users/${id}`, 'read'),
    Create: () => AdminOnly('users', 'create'),
    Update: (id = ':userId') => AdminOnly(`users/${id}`, 'update'),
    Delete: (id = ':userId') => AdminOnly(`users/${id}`, 'delete'),
    Ban: (id = ':userId') => AdminOnly(`users/${id}/ban`, 'create'),
    Unban: (id = ':userId') => AdminOnly(`users/${id}/unban`, 'create'),
  },
  Reports: {
    List: () => RequirePolicy('reports', 'read'),
    Read: (id = ':reportId') => RequirePolicy(`reports/${id}`, 'read'),
    Update: (id = ':reportId') => RequirePolicy(`reports/${id}`, 'update'),
    Delete: (id = ':reportId') => RequirePolicy(`reports/${id}`, 'delete'),
  },
  Analytics: {
    Read: () => AdminOnly('analytics', 'read'),
  },
  Settings: {
    Read: () => AdminOnly('settings', 'read'),
    Update: () => AdminOnly('settings', 'update'),
  },
  AuditLogs: {
    Read: () => AdminOnly('audit-logs', 'read'),
  },
};

/**
 * Call resource policies
 */
export const CallPolicy = {
  List: () => RequirePolicy('calls', 'read'),
  Create: () => RequirePolicy('calls', 'create'),
  Read: (id = ':callId') => RequirePolicy(`calls/${id}`, 'read'),
  Update: (id = ':callId') => RequirePolicy(`calls/${id}`, 'update'),
};

/**
 * Media resource policies
 */
export const MediaPolicy = {
  List: () => RequirePolicy('media', 'read'),
  Upload: () => RequirePolicy('media', 'create'),
  Read: (id = ':mediaId') => RequirePolicy(`media/${id}`, 'read'),
  Delete: (id = ':mediaId') => RequirePolicy(`media/${id}`, 'delete'),
};

/**
 * Status/Stories resource policies
 */
export const StatusPolicy = {
  List: () => RequirePolicy('status', 'read'),
  Create: () => RequirePolicy('status', 'create'),
  Read: (id = ':statusId') => RequirePolicy(`status/${id}`, 'read'),
  Delete: (id = ':statusId') => RequirePolicy(`status/${id}`, 'delete'),
};

/**
 * Notification resource policies
 */
export const NotificationPolicy = {
  List: () => RequirePolicy('notifications', 'read'),
  Read: (id = ':notificationId') => RequirePolicy(`notifications/${id}`, 'read'),
  Update: (id = ':notificationId') => RequirePolicy(`notifications/${id}`, 'update'),
};
