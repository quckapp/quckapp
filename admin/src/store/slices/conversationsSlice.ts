import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Participant {
  _id: string;
  displayName: string;
  username: string;
  avatar?: string;
  status?: 'online' | 'offline';
}

interface Conversation {
  _id: string;
  type: 'single' | 'group';
  name?: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    type: string;
    createdAt: string;
    sender: {
      displayName: string;
    };
  };
  messageCount: number;
  isLocked?: boolean;
  createdAt: string;
  lastMessageAt?: string;
}

interface ConversationsState {
  conversations: Conversation[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
}

const initialState: ConversationsState = {
  conversations: [],
  total: 0,
  page: 1,
  pages: 1,
  loading: false,
  error: null,
};

export const fetchConversations = createAsyncThunk(
  'conversations/fetchConversations',
  async (params: {
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/conversations', { params });
    return response.data;
  }
);

export const deleteConversation = createAsyncThunk(
  'conversations/deleteConversation',
  async ({ conversationId, reason }: { conversationId: string; reason: string }) => {
    await api.delete(`/admin/conversations/${conversationId}`, { data: { reason } });
    return conversationId;
  }
);

export const lockConversation = createAsyncThunk(
  'conversations/lockConversation',
  async ({ conversationId, lock }: { conversationId: string; lock: boolean }) => {
    const response = await api.patch(`/admin/conversations/${conversationId}/lock`, { lock });
    return response.data;
  }
);

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload.conversations || [];
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.pages = action.payload.pages || 1;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch conversations';
      })
      .addCase(deleteConversation.fulfilled, (state, action) => {
        state.conversations = state.conversations.filter((c) => c._id !== action.payload);
        state.total -= 1;
      })
      .addCase(lockConversation.fulfilled, (state, action) => {
        const index = state.conversations.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.conversations[index] = action.payload;
        }
      });
  },
});

export const { clearError } = conversationsSlice.actions;
export default conversationsSlice.reducer;
