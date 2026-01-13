/**
 * Conversations API Service
 * Handles all conversation-related API calls
 */

import api from '../api';
import { User } from './users.api';

// Types
export interface Participant {
  user: User;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact';
  media?: {
    url: string;
    thumbnail?: string;
    duration?: number;
    size?: number;
    mimeType?: string;
  };
  replyTo?: Message;
  reactions?: Array<{
    emoji: string;
    users: string[];
  }>;
  readBy?: Array<{
    user: string;
    readAt: string;
  }>;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  type: 'single' | 'group';
  name?: string;
  avatar?: string;
  description?: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  pinnedMessages?: string[];
  disappearingMessages?: {
    enabled: boolean;
    duration: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSingleConversationRequest {
  participantId: string;
}

export interface CreateGroupConversationRequest {
  name: string;
  participants: string[];
  avatar?: string;
  description?: string;
}

export interface UpdateConversationRequest {
  name?: string;
  avatar?: string;
  description?: string;
}

export interface AddParticipantsRequest {
  participants: string[];
}

export interface DisappearingMessagesSettings {
  enabled: boolean;
  duration: number; // in seconds (0, 86400, 604800, 2592000)
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Conversations API Service
const conversationsApi = {
  // Create Conversations
  createSingleConversation: (data: CreateSingleConversationRequest) =>
    api.post<Conversation>('/conversations/single', data),

  createGroupConversation: (data: CreateGroupConversationRequest) =>
    api.post<Conversation>('/conversations/group', data),

  // Get Conversations
  getConversations: (page: number = 1, limit: number = 20) =>
    api.get<PaginatedResponse<Conversation>>('/conversations', {
      params: { page, limit },
    }),

  getConversation: (conversationId: string) =>
    api.get<Conversation>(`/conversations/${conversationId}`),

  // Update Conversation
  updateConversation: (conversationId: string, data: UpdateConversationRequest) =>
    api.put<Conversation>(`/conversations/${conversationId}`, data),

  deleteConversation: (conversationId: string) =>
    api.delete(`/conversations/${conversationId}`),

  // Participants
  addParticipants: (conversationId: string, data: AddParticipantsRequest) =>
    api.put(`/conversations/${conversationId}/participants`, data),

  removeParticipant: (conversationId: string, participantId: string) =>
    api.delete(`/conversations/${conversationId}/participants/${participantId}`),

  // Read Status
  markAsRead: (conversationId: string) =>
    api.put(`/conversations/${conversationId}/read`),

  markAllAsRead: () =>
    api.put('/conversations/read-all'),

  // Mute
  toggleMute: (conversationId: string, muted: boolean, duration?: number) =>
    api.put(`/conversations/${conversationId}/mute`, { muted, duration }),

  // Messages
  clearMessages: (conversationId: string) =>
    api.delete(`/conversations/${conversationId}/messages`),

  // AI Search
  aiSearch: (query: string) =>
    api.get<Conversation[]>('/conversations/ai-search', {
      params: { q: query },
    }),

  // Pinned Messages
  pinMessage: (conversationId: string, messageId: string) =>
    api.post(`/conversations/${conversationId}/pin/${messageId}`),

  unpinMessage: (conversationId: string, messageId: string) =>
    api.delete(`/conversations/${conversationId}/pin/${messageId}`),

  getPinnedMessages: (conversationId: string) =>
    api.get<Message[]>(`/conversations/${conversationId}/pinned`),

  // Disappearing Messages
  setDisappearingMessages: (conversationId: string, settings: DisappearingMessagesSettings) =>
    api.put(`/conversations/${conversationId}/disappearing-messages`, settings),

  getDisappearingMessagesSettings: (conversationId: string) =>
    api.get<DisappearingMessagesSettings>(`/conversations/${conversationId}/disappearing-messages`),
};

export default conversationsApi;
