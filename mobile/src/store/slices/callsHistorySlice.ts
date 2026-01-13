import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface CallParticipant {
  userId: string;
  joinedAt?: Date;
  leftAt?: Date;
  isInitiator: boolean;
}

interface CallHistory {
  _id: string;
  conversationId?: string;
  initiatorId: string;
  type: 'audio' | 'video';
  status: 'ongoing' | 'completed' | 'missed' | 'rejected' | 'failed';
  participants: CallParticipant[];
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
  isGroupCall?: boolean;
  initiator?: {
    _id: string;
    displayName: string;
    phoneNumber: string;
    avatar?: string;
  };
}

interface CallsHistoryState {
  calls: CallHistory[];
  loading: boolean;
  error: string | null;
}

const initialState: CallsHistoryState = {
  calls: [],
  loading: false,
  error: null,
};

// Fetch all calls (regular calls + huddles)
export const fetchCalls = createAsyncThunk(
  'callsHistory/fetchAll',
  async () => {
    // Fetch both regular calls and huddle history in parallel
    const [callsResponse, huddlesResponse] = await Promise.all([
      api.get('/calls'),
      api.get('/huddle/history/me').catch(() => ({ data: [] })), // Gracefully handle if huddle endpoint fails
    ]);

    const regularCalls = (callsResponse.data || []).map((call: any) => ({
      ...call,
      isGroupCall: call.isGroupCall || false,
    }));

    // Transform huddle data to match CallHistory interface
    const huddles = (huddlesResponse.data || []).map((huddle: any) => ({
      _id: huddle._id,
      conversationId: huddle.chatId,
      initiatorId: huddle.host?._id || huddle.hostId,
      type: huddle.type || 'audio',
      status: huddle.status === 'active' ? 'ongoing' : 'completed',
      participants: (huddle.participants || []).map((p: any) => ({
        userId: p.id || p.userId || p._id,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        isInitiator: p.id === huddle.host?._id,
      })),
      startedAt: huddle.startTime || huddle.createdAt,
      endedAt: huddle.endTime,
      duration: huddle.duration || 0,
      createdAt: huddle.createdAt,
      updatedAt: huddle.updatedAt || huddle.createdAt,
      isGroupCall: true, // Huddles are always group calls
      initiator: huddle.host,
    }));

    // Combine and sort by createdAt (most recent first)
    const allCalls = [...regularCalls, ...huddles].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return allCalls;
  }
);

// Fetch single call
export const fetchCall = createAsyncThunk(
  'callsHistory/fetchOne',
  async (callId: string) => {
    const response = await api.get(`/calls/${callId}`);
    return response.data;
  }
);

// Create a call record
export const createCall = createAsyncThunk(
  'callsHistory/create',
  async (data: {
    conversationId?: string;
    type: 'audio' | 'video';
    participantIds?: string[];
  }) => {
    const response = await api.post('/calls', data);
    return response.data;
  }
);

// Update call status
export const updateCall = createAsyncThunk(
  'callsHistory/update',
  async ({ callId, data }: { callId: string; data: { status?: string; duration?: number } }) => {
    const response = await api.put(`/calls/${callId}`, data);
    return response.data;
  }
);

// Join a call
export const joinCall = createAsyncThunk(
  'callsHistory/join',
  async (callId: string) => {
    const response = await api.put(`/calls/${callId}/join`);
    return response.data;
  }
);

// Leave a call
export const leaveCall = createAsyncThunk(
  'callsHistory/leave',
  async (callId: string) => {
    const response = await api.put(`/calls/${callId}/leave`);
    return response.data;
  }
);

// Delete call history
export const deleteCallHistory = createAsyncThunk(
  'callsHistory/deleteHistory',
  async () => {
    await api.delete('/calls/history');
  }
);

const callsHistorySlice = createSlice({
  name: 'callsHistory',
  initialState,
  reducers: {
    clearCallsError: (state) => {
      state.error = null;
    },
    addCallToHistory: (state, action: PayloadAction<CallHistory>) => {
      // Add new call to the beginning of the list
      state.calls.unshift(action.payload);
    },
    updateCallInHistory: (state, action: PayloadAction<CallHistory>) => {
      const index = state.calls.findIndex((c) => c._id === action.payload._id);
      if (index !== -1) {
        state.calls[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all calls
      .addCase(fetchCalls.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCalls.fulfilled, (state, action) => {
        state.loading = false;
        state.calls = action.payload;
      })
      .addCase(fetchCalls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch calls';
      })
      // Fetch single call
      .addCase(fetchCall.fulfilled, (state, action) => {
        const index = state.calls.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.calls[index] = action.payload;
        } else {
          state.calls.unshift(action.payload);
        }
      })
      // Create call
      .addCase(createCall.fulfilled, (state, action) => {
        state.calls.unshift(action.payload);
      })
      .addCase(createCall.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create call';
      })
      // Update call
      .addCase(updateCall.fulfilled, (state, action) => {
        const index = state.calls.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.calls[index] = action.payload;
        }
      })
      .addCase(updateCall.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update call';
      })
      // Join call
      .addCase(joinCall.fulfilled, (state, action) => {
        const index = state.calls.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.calls[index] = action.payload;
        }
      })
      // Leave call
      .addCase(leaveCall.fulfilled, (state, action) => {
        const index = state.calls.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.calls[index] = action.payload;
        }
      })
      // Delete call history
      .addCase(deleteCallHistory.fulfilled, (state) => {
        state.calls = [];
      })
      .addCase(deleteCallHistory.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete call history';
      });
  },
});

export const { clearCallsError, addCallToHistory, updateCallInHistory } = callsHistorySlice.actions;

export default callsHistorySlice.reducer;
