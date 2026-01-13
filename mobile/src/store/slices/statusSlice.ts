import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface StatusViewer {
  userId: string;
  viewedAt: Date;
}

interface Status {
  _id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  font?: string;
  viewers: StatusViewer[];
  expiresAt: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    _id: string;
    displayName: string;
    phoneNumber: string;
    avatar?: string;
  };
}

interface StatusState {
  statuses: Status[];
  myStatuses: Status[];
  loading: boolean;
  error: string | null;
  uploading: boolean;
}

const initialState: StatusState = {
  statuses: [],
  myStatuses: [],
  loading: false,
  error: null,
  uploading: false,
};

// Fetch all active statuses
export const fetchStatuses = createAsyncThunk(
  'status/fetchAll',
  async () => {
    const response = await api.get('/status');
    return response.data;
  }
);

// Fetch user's own statuses
export const fetchMyStatuses = createAsyncThunk(
  'status/fetchMy',
  async (userId: string) => {
    const response = await api.get(`/status/user/${userId}`);
    return response.data;
  }
);

// Create a new status
export const createStatus = createAsyncThunk(
  'status/create',
  async (formData: FormData) => {
    const response = await api.post('/status', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
);

// Mark status as viewed
export const viewStatus = createAsyncThunk(
  'status/view',
  async (statusId: string) => {
    const response = await api.put(`/status/${statusId}/view`);
    return response.data;
  }
);

// Delete a status
export const deleteStatus = createAsyncThunk(
  'status/delete',
  async (statusId: string) => {
    await api.delete(`/status/${statusId}`);
    return statusId;
  }
);

const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    clearStatusError: (state) => {
      state.error = null;
    },
    removeExpiredStatuses: (state) => {
      const now = new Date().getTime();
      state.statuses = state.statuses.filter(
        (status) => new Date(status.expiresAt).getTime() > now
      );
      state.myStatuses = state.myStatuses.filter(
        (status) => new Date(status.expiresAt).getTime() > now
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all statuses
      .addCase(fetchStatuses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatuses.fulfilled, (state, action) => {
        state.loading = false;
        state.statuses = action.payload;
      })
      .addCase(fetchStatuses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch statuses';
      })
      // Fetch my statuses
      .addCase(fetchMyStatuses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyStatuses.fulfilled, (state, action) => {
        state.loading = false;
        state.myStatuses = action.payload;
      })
      .addCase(fetchMyStatuses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch my statuses';
      })
      // Create status
      .addCase(createStatus.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(createStatus.fulfilled, (state, action) => {
        state.uploading = false;
        state.myStatuses.unshift(action.payload);
        // Also add to statuses list
        state.statuses.unshift(action.payload);
      })
      .addCase(createStatus.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.error.message || 'Failed to create status';
      })
      // View status
      .addCase(viewStatus.fulfilled, (state, action) => {
        // Update the status in both lists
        const updateStatus = (statusList: Status[]) => {
          const index = statusList.findIndex((s) => s._id === action.payload._id);
          if (index !== -1) {
            statusList[index] = action.payload;
          }
        };
        updateStatus(state.statuses);
        updateStatus(state.myStatuses);
      })
      // Delete status
      .addCase(deleteStatus.fulfilled, (state, action) => {
        state.statuses = state.statuses.filter((s) => s._id !== action.payload);
        state.myStatuses = state.myStatuses.filter((s) => s._id !== action.payload);
      });
  },
});

export const { clearStatusError, removeExpiredStatuses } = statusSlice.actions;

export default statusSlice.reducer;
