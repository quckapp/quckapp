import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Message {
  _id: string;
  conversationId: string;
  senderId: any;
  type: string;
  content?: string;
  attachments?: any[];
  reactions?: any[];
  readReceipts?: any[];
  replyTo?: any;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MessagesState {
  messagesByConversation: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
  typingUsers: Record<string, string[]>;
}

const initialState: MessagesState = {
  messagesByConversation: {},
  loading: false,
  error: null,
  typingUsers: {},
};

export const fetchMessages = createAsyncThunk(
  'messages/fetch',
  async ({ conversationId, limit, before }: { conversationId: string; limit?: number; before?: string }) => {
    const params: any = { limit: limit || 50 };
    if (before) params.before = before;

    const response = await api.get(`/messages/conversation/${conversationId}`, { params });
    return { conversationId, messages: response.data };
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      const conversationId = action.payload.conversationId;
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }
      const exists = state.messagesByConversation[conversationId].find(m => m._id === action.payload._id);
      if (!exists) {
        state.messagesByConversation[conversationId].push(action.payload);
      }
    },
    updateMessage: (state, action: PayloadAction<Message>) => {
      const conversationId = action.payload.conversationId;
      if (state.messagesByConversation[conversationId]) {
        const index = state.messagesByConversation[conversationId].findIndex(m => m._id === action.payload._id);
        if (index !== -1) {
          state.messagesByConversation[conversationId][index] = action.payload;
        }
      }
    },
    removeMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string }>) => {
      if (state.messagesByConversation[action.payload.conversationId]) {
        state.messagesByConversation[action.payload.conversationId] = state.messagesByConversation[
          action.payload.conversationId
        ].filter(m => m._id !== action.payload.messageId);
      }
    },
    addReaction: (state, action: PayloadAction<{ conversationId: string; messageId: string; reaction: any }>) => {
      const messages = state.messagesByConversation[action.payload.conversationId];
      if (messages) {
        const message = messages.find(m => m._id === action.payload.messageId);
        if (message) {
          if (!message.reactions) message.reactions = [];
          message.reactions.push(action.payload.reaction);
        }
      }
    },
    removeReaction: (state, action: PayloadAction<{ conversationId: string; messageId: string; userId: string; emoji: string }>) => {
      const messages = state.messagesByConversation[action.payload.conversationId];
      if (messages) {
        const message = messages.find(m => m._id === action.payload.messageId);
        if (message && message.reactions) {
          message.reactions = message.reactions.filter(
            r => !(r.userId === action.payload.userId && r.emoji === action.payload.emoji)
          );
        }
      }
    },
    setTypingUsers: (state, action: PayloadAction<{ conversationId: string; userIds: string[] }>) => {
      state.typingUsers[action.payload.conversationId] = action.payload.userIds;
    },
    addTypingUser: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      if (!state.typingUsers[action.payload.conversationId]) {
        state.typingUsers[action.payload.conversationId] = [];
      }
      if (!state.typingUsers[action.payload.conversationId].includes(action.payload.userId)) {
        state.typingUsers[action.payload.conversationId].push(action.payload.userId);
      }
    },
    removeTypingUser: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      if (state.typingUsers[action.payload.conversationId]) {
        state.typingUsers[action.payload.conversationId] = state.typingUsers[action.payload.conversationId].filter(
          id => id !== action.payload.userId
        );
      }
    },
    addReadReceipt: (state, action: PayloadAction<{ conversationId: string; messageId: string; userId: string; readAt: string }>) => {
      const messages = state.messagesByConversation[action.payload.conversationId];
      if (messages) {
        const message = messages.find(m => m._id === action.payload.messageId);
        if (message) {
          if (!message.readReceipts) message.readReceipts = [];
          // Check if this user already has a read receipt
          const existingReceipt = message.readReceipts.find((r: any) => r.userId === action.payload.userId);
          if (!existingReceipt) {
            message.readReceipts.push({
              userId: action.payload.userId,
              readAt: action.payload.readAt,
            });
          }
        }
      }
    },
    clearConversationMessages: (state, action: PayloadAction<{ conversationId: string }>) => {
      state.messagesByConversation[action.payload.conversationId] = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messagesByConversation[action.payload.conversationId] = action.payload.messages.reverse();
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      });
  },
});

export const {
  addMessage,
  updateMessage,
  removeMessage,
  addReaction,
  removeReaction,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
  addReadReceipt,
  clearConversationMessages,
} = messagesSlice.actions;

// Selector that returns plain objects without Immer proxies
export const selectMessagesForConversation = (state: any, conversationId: string) => {
  const messages = state.messages.messagesByConversation[conversationId] || [];
  // Deep clone to remove any Immer proxies
  return JSON.parse(JSON.stringify(messages));
};

export default messagesSlice.reducer;
