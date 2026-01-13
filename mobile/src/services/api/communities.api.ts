/**
 * Communities API Service
 * Handles all community-related API calls
 */

import api from '../api';
import { User } from './users.api';
import { Conversation } from './conversations.api';

// Types
export interface CommunityMember {
  user: User;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
}

export interface Community {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  banner?: string;
  owner: User;
  members: CommunityMember[];
  groups: Conversation[];
  memberCount: number;
  isPublic: boolean;
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityRequest {
  name: string;
  description?: string;
  avatar?: string;
  banner?: string;
  isPublic?: boolean;
}

export interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  isPublic?: boolean;
}

export interface AddMembersRequest {
  members: string[];
}

export interface AddGroupRequest {
  name: string;
  description?: string;
}

// Communities API Service
const communitiesApi = {
  // Create Community
  createCommunity: (data: CreateCommunityRequest) =>
    api.post<Community>('/communities', data),

  // Get Communities
  getCommunities: (page: number = 1, limit: number = 20) =>
    api.get<Community[]>('/communities', {
      params: { page, limit },
    }),

  getCommunity: (communityId: string) =>
    api.get<Community>(`/communities/${communityId}`),

  // Update Community
  updateCommunity: (communityId: string, data: UpdateCommunityRequest) =>
    api.put<Community>(`/communities/${communityId}`, data),

  deleteCommunity: (communityId: string) =>
    api.delete(`/communities/${communityId}`),

  // Members
  addMembers: (communityId: string, data: AddMembersRequest) =>
    api.post(`/communities/${communityId}/members`, data),

  removeMember: (communityId: string, memberId: string) =>
    api.delete(`/communities/${communityId}/members/${memberId}`),

  // Groups
  addGroup: (communityId: string, data: AddGroupRequest) =>
    api.post<Conversation>(`/communities/${communityId}/groups`, data),

  removeGroup: (communityId: string, groupId: string) =>
    api.delete(`/communities/${communityId}/groups/${groupId}`),
};

export default communitiesApi;
