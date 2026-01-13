/**
 * Link Preview API Service
 * Handles URL link preview related API calls
 */

import api from '../api';

// Types
export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  type?: string;
}

export interface BatchLinkPreviewRequest {
  urls: string[];
}

export interface ExtractLinksRequest {
  text: string;
}

export interface LinkPreviewStats {
  totalPreviews: number;
  cachedPreviews: number;
  cacheHitRate: string;
}

// Link Preview API Service
const linkPreviewApi = {
  // Get link preview
  getPreview: (url: string) =>
    api.get<LinkPreview>('/link-preview', {
      params: { url },
    }),

  // Batch get link previews
  batchGetPreviews: (data: BatchLinkPreviewRequest) =>
    api.post<LinkPreview[]>('/link-preview/batch', data),

  // Extract links from text
  extractLinks: (data: ExtractLinksRequest) =>
    api.post<string[]>('/link-preview/extract', data),

  // Get stats
  getStats: () =>
    api.get<LinkPreviewStats>('/link-preview/stats'),
};

export default linkPreviewApi;
