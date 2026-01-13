export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  MODERATOR = 'moderator',
}

export enum Permission {
  // User permissions
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  DELETE_USERS = 'delete:users',

  // Message permissions
  READ_MESSAGES = 'read:messages',
  WRITE_MESSAGES = 'write:messages',
  DELETE_MESSAGES = 'delete:messages',

  // Conversation permissions
  READ_CONVERSATIONS = 'read:conversations',
  WRITE_CONVERSATIONS = 'write:conversations',
  DELETE_CONVERSATIONS = 'delete:conversations',

  // Admin permissions
  ACCESS_ADMIN = 'access:admin',
  MANAGE_USERS = 'manage:users',
  MANAGE_CONTENT = 'manage:content',
  VIEW_ANALYTICS = 'view:analytics',

  // System permissions
  MANAGE_SYSTEM = 'manage:system',
  VIEW_LOGS = 'view:logs',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.READ_USERS,
    Permission.READ_MESSAGES,
    Permission.WRITE_MESSAGES,
    Permission.READ_CONVERSATIONS,
    Permission.WRITE_CONVERSATIONS,
  ],
  [UserRole.MODERATOR]: [
    Permission.READ_USERS,
    Permission.READ_MESSAGES,
    Permission.WRITE_MESSAGES,
    Permission.DELETE_MESSAGES,
    Permission.READ_CONVERSATIONS,
    Permission.WRITE_CONVERSATIONS,
    Permission.MANAGE_CONTENT,
  ],
  [UserRole.ADMIN]: [
    Permission.READ_USERS,
    Permission.WRITE_USERS,
    Permission.READ_MESSAGES,
    Permission.WRITE_MESSAGES,
    Permission.DELETE_MESSAGES,
    Permission.READ_CONVERSATIONS,
    Permission.WRITE_CONVERSATIONS,
    Permission.DELETE_CONVERSATIONS,
    Permission.ACCESS_ADMIN,
    Permission.MANAGE_USERS,
    Permission.MANAGE_CONTENT,
    Permission.VIEW_ANALYTICS,
  ],
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
};
