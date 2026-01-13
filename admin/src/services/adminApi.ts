import api from './api';
import type {
  User,
  DashboardStats,
  RealTimeStats,
  Report,
  AuditLog,
  AnalyticsData,
  SystemHealth,
  AdminPermissions,
} from '../types';

export const adminApi = {
  // Auth
  login: async (phoneNumber: string, password: string) => {
    const response = await api.post('/auth/login', { phoneNumber, password });
    return response.data;
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },

  getRealTimeStats: async (): Promise<RealTimeStats> => {
    const response = await api.get('/admin/dashboard/realtime');
    return response.data;
  },

  // User Management
  getUsers: async (params: {
    search?: string;
    role?: string;
    isBanned?: boolean;
    isActive?: boolean;
    isVerified?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ users: User[]; total: number; page: number; pages: number }> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserDetails: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  banUser: async (userId: string, reason: string, expiresAt?: string): Promise<User> => {
    const response = await api.post(`/admin/users/${userId}/ban`, { reason, expiresAt });
    return response.data;
  },

  unbanUser: async (userId: string): Promise<User> => {
    const response = await api.post(`/admin/users/${userId}/unban`);
    return response.data;
  },

  verifyUser: async (userId: string): Promise<User> => {
    const response = await api.post(`/admin/users/${userId}/verify`);
    return response.data;
  },

  updateUserRole: async (userId: string, role: string, permissions?: string[]): Promise<User> => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role, permissions });
    return response.data;
  },

  getUserMessages: async (userId: string, page?: number, limit?: number) => {
    const response = await api.get(`/admin/users/${userId}/messages`, { params: { page, limit } });
    return response.data;
  },

  // Reports
  getReports: async (params: {
    type?: string;
    status?: string;
    reason?: string;
    page?: number;
    limit?: number;
  }): Promise<{ reports: Report[]; total: number; page: number; pages: number }> => {
    const response = await api.get('/admin/reports', { params });
    return response.data;
  },

  getReportDetails: async (reportId: string) => {
    const response = await api.get(`/admin/reports/${reportId}`);
    return response.data;
  },

  updateReport: async (reportId: string, data: {
    status?: string;
    resolution?: string;
    actionTaken?: string;
  }): Promise<Report> => {
    const response = await api.patch(`/admin/reports/${reportId}`, data);
    return response.data;
  },

  // Content Moderation
  deleteMessage: async (messageId: string, reason: string): Promise<void> => {
    await api.delete(`/admin/messages/${messageId}`, { data: { reason } });
  },

  // Analytics
  getAnalytics: async (params: {
    startDate?: string;
    endDate?: string;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<AnalyticsData> => {
    const response = await api.get('/admin/analytics', { params });
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (params: {
    action?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; total: number; page: number; pages: number }> => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },

  // System Health
  getSystemHealth: async (): Promise<SystemHealth> => {
    const response = await api.get('/admin/system/health');
    return response.data;
  },

  updateSystemSettings: async (settings: Record<string, unknown>) => {
    const response = await api.patch('/admin/system/settings', settings);
    return response.data;
  },

  clearCache: async () => {
    const response = await api.post('/admin/system/clear-cache');
    return response.data;
  },

  // Admin Profile
  getAdminProfile: async (): Promise<{ user: User }> => {
    const response = await api.get('/admin/profile');
    return response.data;
  },

  // Conversations
  getConversations: async (params: {
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/conversations', { params });
    return response.data;
  },

  deleteConversation: async (conversationId: string, reason: string) => {
    const response = await api.delete(`/admin/conversations/${conversationId}`, {
      data: { reason },
    });
    return response.data;
  },

  lockConversation: async (conversationId: string, lock: boolean) => {
    const response = await api.patch(`/admin/conversations/${conversationId}/lock`, { lock });
    return response.data;
  },

  // Admin Broadcasts
  getBroadcasts: async (params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/broadcasts', { params });
    return response.data;
  },

  createBroadcast: async (data: {
    title: string;
    message: string;
    targetAudience: 'all' | 'active' | 'new' | 'custom';
    scheduledAt?: string;
    customUserIds?: string[];
  }) => {
    const response = await api.post('/admin/broadcasts', data);
    return response.data;
  },

  updateBroadcast: async (
    broadcastId: string,
    data: {
      title?: string;
      message?: string;
      targetAudience?: string;
      scheduledAt?: string;
    }
  ) => {
    const response = await api.patch(`/admin/broadcasts/${broadcastId}`, data);
    return response.data;
  },

  sendBroadcast: async (broadcastId: string) => {
    const response = await api.post(`/admin/broadcasts/${broadcastId}/send`);
    return response.data;
  },

  deleteBroadcast: async (broadcastId: string) => {
    await api.delete(`/admin/broadcasts/${broadcastId}`);
  },

  // Flagged Content / Moderation
  getFlaggedContent: async (params: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/moderation/flagged', { params });
    return response.data;
  },
};

export default adminApi;
