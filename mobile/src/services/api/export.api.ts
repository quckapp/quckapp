/**
 * Export API Service
 * Handles data export related API calls
 */

import api from '../api';

// Types
export interface ExportData {
  profile: any;
  conversations: any[];
  messages: any[];
  media: any[];
  settings: any;
  exportedAt: string;
}

export interface ExportConversationOptions {
  includeMedia?: boolean;
  startDate?: string;
  endDate?: string;
  format?: 'json' | 'txt' | 'html';
}

export interface DownloadRequest {
  type: 'profile' | 'conversations' | 'messages' | 'all';
  format?: 'json' | 'zip';
  conversationIds?: string[];
}

// Export API Service
const exportApi = {
  // Get exportable data
  getData: () =>
    api.get<ExportData>('/export/data'),

  // Export conversation
  exportConversation: (conversationId: string, options?: ExportConversationOptions) =>
    api.get(`/export/conversation/${conversationId}`, {
      params: options,
    }),

  // Request download
  requestDownload: (data: DownloadRequest) =>
    api.post<{ filename: string; downloadUrl: string }>('/export/download', data),

  // Download file
  downloadFile: (filename: string) =>
    api.get(`/export/download/${filename}`, {
      responseType: 'blob',
    }),
};

export default exportApi;
