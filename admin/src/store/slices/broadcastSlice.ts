import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminApi from '../../services/adminApi';

interface Broadcast {
  _id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'active' | 'new' | 'custom';
  targetCount?: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  createdBy: {
    _id: string;
    displayName: string;
  };
  stats?: {
    delivered: number;
    read: number;
    failed: number;
  };
  createdAt: string;
}

interface BroadcastState {
  broadcasts: Broadcast[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
}

const initialState: BroadcastState = {
  broadcasts: [],
  total: 0,
  page: 1,
  pages: 1,
  loading: false,
  error: null,
};

export const fetchBroadcasts = createAsyncThunk(
  'broadcast/fetchBroadcasts',
  async (params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    return adminApi.getBroadcasts(params);
  }
);

export const createBroadcast = createAsyncThunk(
  'broadcast/createBroadcast',
  async (data: {
    title: string;
    message: string;
    targetAudience: 'all' | 'active' | 'new' | 'custom';
    scheduledAt?: string;
  }) => {
    return adminApi.createBroadcast(data);
  }
);

export const sendBroadcast = createAsyncThunk(
  'broadcast/sendBroadcast',
  async (broadcastId: string) => {
    return adminApi.sendBroadcast(broadcastId);
  }
);

export const deleteBroadcast = createAsyncThunk(
  'broadcast/deleteBroadcast',
  async (broadcastId: string) => {
    await adminApi.deleteBroadcast(broadcastId);
    return broadcastId;
  }
);

const broadcastSlice = createSlice({
  name: 'broadcast',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch broadcasts
      .addCase(fetchBroadcasts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBroadcasts.fulfilled, (state, action) => {
        state.loading = false;
        state.broadcasts = action.payload.broadcasts || [];
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.pages = action.payload.pages || 1;
      })
      .addCase(fetchBroadcasts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch broadcasts';
      })
      // Create broadcast
      .addCase(createBroadcast.pending, (state) => {
        state.loading = true;
      })
      .addCase(createBroadcast.fulfilled, (state, action) => {
        state.loading = false;
        state.broadcasts.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createBroadcast.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create broadcast';
      })
      // Send broadcast
      .addCase(sendBroadcast.fulfilled, (state, action) => {
        const index = state.broadcasts.findIndex((b) => b._id === action.payload._id);
        if (index !== -1) {
          state.broadcasts[index] = action.payload;
        }
      })
      // Delete broadcast
      .addCase(deleteBroadcast.fulfilled, (state, action) => {
        state.broadcasts = state.broadcasts.filter((b) => b._id !== action.payload);
        state.total -= 1;
      });
  },
});

export const { clearError } = broadcastSlice.actions;
export default broadcastSlice.reducer;
