export interface User {
  _id: string;
  phoneNumber: string;
  email?: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away';
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  permissions?: AdminPermissions;
  isActive: boolean;
  isVerified: boolean;
  isBanned: boolean;
  bannedAt?: string;
  bannedBy?: string;
  banReason?: string;
  banExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPermissions {
  canManageUsers: boolean;
  canBanUsers: boolean;
  canDeleteMessages: boolean;
  canViewAnalytics: boolean;
  canManageReports: boolean;
  canManageCommunities: boolean;
  canViewAuditLogs: boolean;
  canManageSystem: boolean;
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    banned: number;
    online: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    growthRate: number;
  };
  messages: {
    total: number;
    today: number;
    growthRate: number;
  };
  conversations: {
    total: number;
    active: number;
  };
  reports: {
    pending: number;
    resolvedToday: number;
  };
}

export interface RealTimeStats {
  onlineUsers: number;
  messagesLastHour: number;
  messagesPerMinute: number;
  activeConversationsLastHour: number;
  timestamp: string;
}

export interface Report {
  _id: string;
  reportedBy: {
    _id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  type: 'user' | 'message' | 'conversation' | 'community';
  targetId: string;
  targetUserId?: {
    _id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isBanned?: boolean;
  };
  reason: string;
  description?: string;
  screenshots?: string[];
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewedBy?: {
    _id: string;
    username: string;
    displayName: string;
  };
  reviewedAt?: string;
  resolution?: string;
  actionTaken?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  _id: string;
  adminId: string;
  adminName: string;
  action: string;
  description: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface AnalyticsData {
  userGrowth: Array<{ _id: string; count: number }>;
  messageActivity: Array<{ _id: string; count: number }>;
  conversationActivity: Array<{ _id: string; count: number }>;
  userStatusDistribution: Array<{ _id: string; count: number }>;
  roleDistribution: Array<{ _id: string; count: number }>;
  messageTypes: Array<{ _id: string; count: number }>;
  topActiveUsers: Array<{
    _id: string;
    messageCount: number;
    username: string;
    displayName: string;
    avatar?: string;
  }>;
  reportStats: {
    total: number;
    pending: number;
    resolved: number;
    dismissed: number;
  };
  reportsByReason: Array<{ _id: string; count: number }>;
}

export interface SystemHealth {
  status: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  database: {
    collections: {
      users: number;
      messages: number;
      conversations: number;
    };
    status: string;
  };
  recentErrors: unknown[];
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  isDeleted: boolean;
  createdAt: string;
}
