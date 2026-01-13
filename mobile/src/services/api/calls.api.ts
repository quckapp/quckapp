/**
 * Calls API Service
 * Handles all call-related API calls (1-on-1 and group calls)
 */

import api from '../api';
import { User } from './users.api';

// Types
export type CallType = 'audio' | 'video';
export type CallStatus = 'pending' | 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';

export interface CallParticipant {
  user: User;
  joinedAt?: string;
  leftAt?: string;
  status: 'invited' | 'ringing' | 'joined' | 'left' | 'rejected';
}

export interface Call {
  _id: string;
  conversationId: string;
  type: CallType;
  status: CallStatus;
  initiator: User;
  participants: CallParticipant[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallRequest {
  conversationId: string;
  type: CallType;
  participants?: string[];
}

export interface UpdateCallRequest {
  status?: CallStatus;
}

// Huddle (Group Calls) Types
export type HuddleType = 'audio' | 'video';
export type HuddleStatus = 'active' | 'ended';

export interface HuddleParticipant {
  id: string;
  name: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isMuted: boolean;
  joinedAt: string;
}

export interface Huddle {
  _id: string;
  roomId: string;
  chatId: string;
  type: HuddleType;
  status: HuddleStatus;
  host: User;
  participants: HuddleParticipant[];
  maxParticipants: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
}

export interface CreateHuddleRequest {
  chatId: string;
  type: HuddleType;
  maxParticipants?: number;
}

export interface JoinHuddleRequest {
  roomId: string;
}

export interface UpdateParticipantRequest {
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isMuted?: boolean;
}

export interface HuddleStats {
  totalHuddles: number;
  totalDuration: number;
  avgDuration: number;
  mostActiveChat?: string;
}

// Calls API Service
const callsApi = {
  // 1-on-1 Calls
  createCall: (data: CreateCallRequest) =>
    api.post<Call>('/calls', data),

  getCalls: (page: number = 1, limit: number = 20) =>
    api.get<Call[]>('/calls', {
      params: { page, limit },
    }),

  getCall: (callId: string) =>
    api.get<Call>(`/calls/${callId}`),

  updateCall: (callId: string, data: UpdateCallRequest) =>
    api.put<Call>(`/calls/${callId}`, data),

  joinCall: (callId: string) =>
    api.put(`/calls/${callId}/join`),

  leaveCall: (callId: string) =>
    api.put(`/calls/${callId}/leave`),

  clearCallHistory: () =>
    api.delete('/calls/history'),

  // Huddle (Group Calls)
  createHuddle: (data: CreateHuddleRequest) =>
    api.post<Huddle>('/huddle', data),

  joinHuddle: (data: JoinHuddleRequest) =>
    api.post<Huddle>('/huddle/join', data),

  leaveHuddle: (roomId: string) =>
    api.post(`/huddle/${roomId}/leave`),

  updateParticipant: (roomId: string, data: UpdateParticipantRequest) =>
    api.put(`/huddle/${roomId}/participant`, data),

  getHuddle: (roomId: string) =>
    api.get<Huddle>(`/huddle/${roomId}`),

  endHuddle: (roomId: string) =>
    api.delete(`/huddle/${roomId}`),

  getHuddleParticipants: (roomId: string) =>
    api.get<HuddleParticipant[]>(`/huddle/${roomId}/participants`),

  getActiveHuddle: () =>
    api.get<Huddle>('/huddle/active/me'),

  getHuddleByChat: (chatId: string) =>
    api.get<Huddle>(`/huddle/chat/${chatId}`),

  getHuddleHistory: (page: number = 1, limit: number = 20) =>
    api.get<Huddle[]>('/huddle/history/me', {
      params: { page, limit },
    }),

  getHuddleStats: () =>
    api.get<HuddleStats>('/huddle/stats/me'),

  getActiveHuddleCount: () =>
    api.get<{ count: number }>('/huddle/active/count'),
};

export default callsApi;
