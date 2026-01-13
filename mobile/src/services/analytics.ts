import api from './api';

export interface AnalyticsOverview {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    activeToday: number;
  };
  messages: {
    total: number;
    today: number;
    thisWeek: number;
    avgPerDay: number;
  };
  conversations: {
    total: number;
    activeToday: number;
  };
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
}

export interface MessageActivityData {
  date: string;
  messages: number;
}

export interface TopActiveUser {
  _id: string;
  messageCount: number;
  displayName: string;
  username: string;
  avatar?: string;
}

export interface MessageTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface ConversationStats {
  total: number;
  direct: number;
  group: number;
  averageParticipants: number;
}

export interface EngagementMetrics {
  activeUserCount: number;
  totalUsers: number;
  engagementRate: number;
  avgMessagesPerActiveUser: number;
}

export const analyticsApi = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    const response = await api.get('/analytics/overview');
    return response.data;
  },

  getUserGrowth: async (days: number = 30): Promise<UserGrowthData[]> => {
    const response = await api.get(`/analytics/user-growth?days=${days}`);
    return response.data;
  },

  getMessageActivity: async (days: number = 30): Promise<MessageActivityData[]> => {
    const response = await api.get(`/analytics/message-activity?days=${days}`);
    return response.data;
  },

  getTopActiveUsers: async (limit: number = 10): Promise<TopActiveUser[]> => {
    const response = await api.get(`/analytics/top-active-users?limit=${limit}`);
    return response.data;
  },

  getMessageTypeDistribution: async (): Promise<MessageTypeDistribution[]> => {
    const response = await api.get('/analytics/message-types');
    return response.data;
  },

  getConversationStats: async (): Promise<ConversationStats> => {
    const response = await api.get('/analytics/conversation-stats');
    return response.data;
  },

  getEngagementMetrics: async (): Promise<EngagementMetrics> => {
    const response = await api.get('/analytics/engagement');
    return response.data;
  },
};
