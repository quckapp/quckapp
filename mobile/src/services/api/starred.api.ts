/**
 * Starred Messages API Service
 * Handles all starred/saved messages related API calls
 */

import api from '../api';
import { Message } from './conversations.api';

// Types
export interface StarredMessage {
  _id: string;
  message: Message;
  conversationId: string;
  starredAt: string;
}

// Starred Messages API Service
const starredApi = {
  // Star/Unstar Messages
  starMessage: (messageId: string) =>
    api.post<StarredMessage>(`/starred/${messageId}`),

  unstarMessage: (messageId: string) =>
    api.delete(`/starred/${messageId}`),

  // Get Starred Messages
  getStarredMessages: (page: number = 1, limit: number = 50) =>
    api.get<StarredMessage[]>('/starred', {
      params: { page, limit },
    }),

  getStarredByConversation: (conversationId: string) =>
    api.get<StarredMessage[]>(`/starred/conversation/${conversationId}`),
};

export default starredApi;
