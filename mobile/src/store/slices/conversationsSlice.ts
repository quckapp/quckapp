import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Conversation {
  _id: string;
  type: 'single' | 'group';
  name?: string;
  avatar?: string;
  description?: string;
  participants: any[];
  lastMessage?: any;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface ConversationsState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loading: boolean;
  error: string | null;
}

const initialState: ConversationsState = {
  conversations: [],
  currentConversation: null,
  loading: false,
  error: null,
};

export const fetchConversations = createAsyncThunk(
  'conversations/fetchAll',
  async () => {
    const response = await api.get('/conversations');
    return response.data;
  }
);

export const createSingleConversation = createAsyncThunk(
  'conversations/createSingle',
  async (recipientId: string) => {
    const response = await api.post('/conversations/single', { recipientId });
    return response.data;
  }
);

export const createGroupConversation = createAsyncThunk(
  'conversations/createGroup',
  async (data: { name: string; participantIds: string[]; description?: string }) => {
    const response = await api.post('/conversations/group', data);
    return response.data;
  }
);

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
    },
    updateConversationLastMessage: (state, action: PayloadAction<{ conversationId: string; message: any }>) => {
      const conversation = state.conversations.find(c => c._id === action.payload.conversationId);
      if (conversation) {
        conversation.lastMessage = action.payload.message;
        conversation.lastMessageAt = action.payload.message.createdAt;
      }
    },
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(c => c._id === action.payload);
      if (conversation && conversation.unreadCount !== undefined) {
        conversation.unreadCount += 1;
      }
    },
    resetUnreadCount: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(c => c._id === action.payload);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch conversations';
      })
      .addCase(createSingleConversation.fulfilled, (state, action) => {
        const exists = state.conversations.find(c => c._id === action.payload._id);
        if (!exists) {
          state.conversations.unshift(action.payload);
        }
        state.currentConversation = action.payload;
      })
      .addCase(createGroupConversation.fulfilled, (state, action) => {
        state.conversations.unshift(action.payload);
        state.currentConversation = action.payload;
      });
  },
});

export const {
  setCurrentConversation,
  updateConversationLastMessage,
  incrementUnreadCount,
  resetUnreadCount,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
