/**
 * Transcription API Service
 * Handles audio/video transcription related API calls
 */

import api from '../api';

// Types
export interface Transcription {
  _id: string;
  messageId: string;
  text: string;
  language: string;
  confidence: number;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  createdAt: string;
}

export interface BatchTranscribeRequest {
  messageIds: string[];
}

export interface SearchTranscriptionsParams {
  q: string;
  conversationId?: string;
  language?: string;
  page?: number;
  limit?: number;
}

// Transcription API Service
const transcriptionApi = {
  // Transcribe message
  transcribeMessage: (messageId: string) =>
    api.post<Transcription>(`/transcription/message/${messageId}`),

  // Get transcription
  getTranscription: (messageId: string) =>
    api.get<Transcription>(`/transcription/message/${messageId}`),

  // Batch transcribe
  batchTranscribe: (data: BatchTranscribeRequest) =>
    api.post<Transcription[]>('/transcription/batch', data),

  // Search transcriptions
  searchTranscriptions: (params: SearchTranscriptionsParams) =>
    api.get<Transcription[]>('/transcription/search', { params }),
};

export default transcriptionApi;
