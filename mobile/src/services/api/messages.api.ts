/**
 * Messages API Service
 * Handles all message-related API calls
 */

import api from '../api';
import { Message, PaginatedResponse } from './conversations.api';

// Types
export interface SendMessageRequest {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact';
  media?: {
    url: string;
    thumbnail?: string;
    duration?: number;
    size?: number;
    mimeType?: string;
  };
  replyTo?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  contact?: {
    name: string;
    phoneNumber: string;
  };
}

export interface EditMessageRequest {
  content: string;
}

export interface AddReactionRequest {
  emoji: string;
}

export interface SearchMessagesParams {
  q: string;
  conversationId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Messages API Service
const messagesApi = {
  // Get Messages
  getConversationMessages: (
    conversationId: string,
    page: number = 1,
    limit: number = 50,
    before?: string
  ) =>
    api.get<PaginatedResponse<Message>>(`/messages/conversation/${conversationId}`, {
      params: { page, limit, before },
    }),

  getMessage: (messageId: string) =>
    api.get<Message>(`/messages/${messageId}`),

  // Edit Message
  editMessage: (messageId: string, data: EditMessageRequest) =>
    api.put<Message>(`/messages/${messageId}`, data),

  // Delete Message
  deleteMessage: (messageId: string, forEveryone: boolean = false) =>
    api.delete(`/messages/${messageId}`, {
      params: { forEveryone },
    }),

  // Reactions
  addReaction: (messageId: string, data: AddReactionRequest) =>
    api.post(`/messages/${messageId}/reactions`, data),

  removeReaction: (messageId: string, emoji: string) =>
    api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),

  // Read Status
  markAsRead: (messageId: string) =>
    api.post(`/messages/${messageId}/read`),

  // Search
  searchMessages: (params: SearchMessagesParams) =>
    api.get<PaginatedResponse<Message>>('/messages/search/query', { params }),
};

export default messagesApi;
