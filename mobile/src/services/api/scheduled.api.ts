/**
 * Scheduled Messages API Service
 * Handles all scheduled message related API calls
 */

import api from '../api';
import { Message } from './conversations.api';

// Types
export type ScheduledMessageStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface ScheduledMessage {
  _id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media?: {
    url: string;
    thumbnail?: string;
    duration?: number;
  };
  scheduledAt: string;
  status: ScheduledMessageStatus;
  sentMessage?: Message;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledMessageRequest {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  media?: {
    url: string;
    thumbnail?: string;
    duration?: number;
  };
  scheduledAt: string;
}

export interface UpdateScheduledMessageRequest {
  content?: string;
  scheduledAt?: string;
}

// Scheduled Messages API Service
const scheduledApi = {
  // Create Scheduled Message
  createScheduledMessage: (data: CreateScheduledMessageRequest) =>
    api.post<ScheduledMessage>('/scheduled-messages', data),

  // Get Scheduled Messages
  getScheduledMessages: (page: number = 1, limit: number = 20) =>
    api.get<ScheduledMessage[]>('/scheduled-messages', {
      params: { page, limit },
    }),

  getConversationScheduledMessages: (conversationId: string) =>
    api.get<ScheduledMessage[]>(`/scheduled-messages/conversation/${conversationId}`),

  getScheduledMessage: (messageId: string) =>
    api.get<ScheduledMessage>(`/scheduled-messages/${messageId}`),

  // Update Scheduled Message
  updateScheduledMessage: (messageId: string, data: UpdateScheduledMessageRequest) =>
    api.put<ScheduledMessage>(`/scheduled-messages/${messageId}`, data),

  // Delete Scheduled Message
  deleteScheduledMessage: (messageId: string) =>
    api.delete(`/scheduled-messages/${messageId}`),

  // Cancel Scheduled Message
  cancelScheduledMessage: (messageId: string) =>
    api.put<ScheduledMessage>(`/scheduled-messages/${messageId}/cancel`),
};

export default scheduledApi;
