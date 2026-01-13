/**
 * Status/Stories API Service
 * Handles all status (stories) related API calls
 */

import api from '../api';
import { User } from './users.api';

// Types
export type StatusType = 'image' | 'video' | 'text';

export interface StatusViewer {
  user: User;
  viewedAt: string;
}

export interface Status {
  _id: string;
  user: User;
  type: StatusType;
  content: string;
  media?: {
    url: string;
    thumbnail?: string;
    duration?: number;
  };
  backgroundColor?: string;
  fontStyle?: string;
  caption?: string;
  viewers: StatusViewer[];
  viewCount: number;
  expiresAt: string;
  createdAt: string;
}

export interface CreateStatusRequest {
  type: StatusType;
  content?: string;
  media?: {
    url: string;
    thumbnail?: string;
    duration?: number;
  };
  backgroundColor?: string;
  fontStyle?: string;
  caption?: string;
}

export interface ContactStatuses {
  user: User;
  statuses: Status[];
  hasUnviewed: boolean;
}

// Status API Service
const statusApi = {
  // Create Status
  createStatus: (data: CreateStatusRequest) =>
    api.post<Status>('/status', data),

  // Get Statuses
  getStatuses: () =>
    api.get<ContactStatuses[]>('/status'),

  getUserStatuses: (userId: string) =>
    api.get<Status[]>(`/status/user/${userId}`),

  getStatus: (statusId: string) =>
    api.get<Status>(`/status/${statusId}`),

  // Delete Status
  deleteStatus: (statusId: string) =>
    api.delete(`/status/${statusId}`),

  // View Status
  markStatusViewed: (statusId: string) =>
    api.put(`/status/${statusId}/view`),
};

export default statusApi;
