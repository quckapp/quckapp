/**
 * Polls API Service
 * Handles all poll-related API calls
 */

import api from '../api';
import { User } from './users.api';

// Types
export interface PollOption {
  id: string;
  text: string;
  votes: string[];
  voteCount: number;
}

export interface Poll {
  _id: string;
  conversationId: string;
  messageId?: string;
  question: string;
  options: PollOption[];
  creator: User;
  isMultipleChoice: boolean;
  isAnonymous: boolean;
  expiresAt?: string;
  isClosed: boolean;
  totalVotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePollRequest {
  conversationId: string;
  question: string;
  options: string[];
  isMultipleChoice?: boolean;
  isAnonymous?: boolean;
  expiresAt?: string;
}

export interface VotePollRequest {
  optionIds: string[];
}

export interface PollResults {
  poll: Poll;
  results: Array<{
    optionId: string;
    text: string;
    votes: number;
    percentage: number;
    voters?: User[];
  }>;
}

// Polls API Service
const pollsApi = {
  // Create Poll
  createPoll: (data: CreatePollRequest) =>
    api.post<Poll>('/polls', data),

  // Get Polls
  getPoll: (pollId: string) =>
    api.get<Poll>(`/polls/${pollId}`),

  deletePoll: (pollId: string) =>
    api.delete(`/polls/${pollId}`),

  getPollResults: (pollId: string) =>
    api.get<PollResults>(`/polls/${pollId}/results`),

  getConversationPolls: (conversationId: string) =>
    api.get<Poll[]>(`/polls/conversation/${conversationId}`),

  // Voting
  votePoll: (pollId: string, data: VotePollRequest) =>
    api.post<Poll>(`/polls/${pollId}/vote`, data),

  removeVote: (pollId: string) =>
    api.delete(`/polls/${pollId}/vote`),

  closePoll: (pollId: string) =>
    api.put<Poll>(`/polls/${pollId}/close`),
};

export default pollsApi;
