/**
 * Analytics API Service
 * Handles all analytics related API calls
 */

import api from '../api';

// Types
export interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalConversations: number;
  totalCalls: number;
  totalHuddles: number;
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
  totalUsers: number;
}

export interface MessageActivityData {
  date: string;
  messages: number;
  textMessages: number;
  mediaMessages: number;
}

export interface TopActiveUser {
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  messageCount: number;
  lastActive: string;
}

export interface MessageTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface ConversationStats {
  totalConversations: number;
  singleChats: number;
  groupChats: number;
  avgParticipantsPerGroup: number;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  avgMessagesPerUser: number;
}

// Analytics API Service
const analyticsApi = {
  getOverview: () =>
    api.get<OverviewStats>('/analytics/overview'),

  getUserGrowth: (startDate?: string, endDate?: string) =>
    api.get<UserGrowthData[]>('/analytics/user-growth', {
      params: { startDate, endDate },
    }),

  getMessageActivity: (startDate?: string, endDate?: string) =>
    api.get<MessageActivityData[]>('/analytics/message-activity', {
      params: { startDate, endDate },
    }),

  getTopActiveUsers: (limit: number = 10) =>
    api.get<TopActiveUser[]>('/analytics/top-active-users', {
      params: { limit },
    }),

  getMessageTypeDistribution: () =>
    api.get<MessageTypeDistribution[]>('/analytics/message-types'),

  getConversationStats: () =>
    api.get<ConversationStats>('/analytics/conversation-stats'),

  getEngagementMetrics: () =>
    api.get<EngagementMetrics>('/analytics/engagement'),
};

export default analyticsApi;
