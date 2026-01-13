/**
 * Broadcast API Service
 * Handles all broadcast list related API calls
 */

import api from '../api';
import { User } from './users.api';

// Types
export interface BroadcastList {
  _id: string;
  name: string;
  recipients: User[];
  recipientCount: number;
  owner: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBroadcastListRequest {
  name: string;
  recipients: string[];
}

export interface UpdateBroadcastListRequest {
  name?: string;
  recipients?: string[];
}

export interface SendBroadcastMessageRequest {
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  media?: {
    url: string;
    thumbnail?: string;
    duration?: number;
  };
}

export interface BroadcastMessageResult {
  broadcastId: string;
  sentCount: number;
  failedCount: number;
  failed: Array<{
    userId: string;
    reason: string;
  }>;
}

// Broadcast API Service
const broadcastApi = {
  // Broadcast Lists
  createBroadcastList: (data: CreateBroadcastListRequest) =>
    api.post<BroadcastList>('/broadcast', data),

  getBroadcastLists: () =>
    api.get<BroadcastList[]>('/broadcast'),

  getBroadcastList: (broadcastId: string) =>
    api.get<BroadcastList>(`/broadcast/${broadcastId}`),

  updateBroadcastList: (broadcastId: string, data: UpdateBroadcastListRequest) =>
    api.put<BroadcastList>(`/broadcast/${broadcastId}`, data),

  deleteBroadcastList: (broadcastId: string) =>
    api.delete(`/broadcast/${broadcastId}`),

  // Send Broadcast Message
  sendBroadcastMessage: (broadcastId: string, data: SendBroadcastMessageRequest) =>
    api.post<BroadcastMessageResult>(`/broadcast/${broadcastId}/send`, data),
};

export default broadcastApi;
