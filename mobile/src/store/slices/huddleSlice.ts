/**
 * Huddle Redux Slice
 * Pattern: Redux Toolkit with createSlice
 * SOLID: Single Responsibility - manages huddle state only
 * Performance: Immutable state updates with Immer
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export enum HuddleType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum HuddleStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

export interface HuddleParticipant {
  userId: {
    _id: string;
    displayName?: string;
    phoneNumber: string;
    avatar?: string;
  };
  joinedAt: string;
  leftAt?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isMuted: boolean;
}

export interface Huddle {
  _id: string;
  initiatorId: string;
  chatId?: string;
  type: HuddleType;
  status: HuddleStatus;
  participants: HuddleParticipant[];
  startedAt: string;
  endedAt?: string;
  duration: number;
  roomId: string;
  metadata?: Record<string, any>;
}

interface HuddleState {
  activeHuddle: Huddle | null;
  history: Huddle[];
  loading: boolean;
  error: string | null;
  isInCall: boolean;
  isMinimized: boolean;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  localMuted: boolean;
}

const initialState: HuddleState = {
  activeHuddle: null,
  history: [],
  loading: false,
  error: null,
  isInCall: false,
  isMinimized: false,
  localAudioEnabled: true,
  localVideoEnabled: false,
  localMuted: false,
};

/**
 * Async Thunks - API Operations
 * Pattern: Thunk middleware for async logic
 */

export const createHuddle = createAsyncThunk(
  'huddle/create',
  async (data: { type: HuddleType; chatId?: string; isVideoEnabled?: boolean }, { rejectWithValue }) => {
    try {
      console.log('[huddleSlice] Creating huddle with data:', JSON.stringify(data));
      const response = await api.post('/huddle', data);
      return response.data;
    } catch (error: any) {
      console.error('[huddleSlice] Create huddle error:', JSON.stringify(error.response?.data));
      const errorData = error.response?.data;
      const errorMessage = errorData?.errors
        ? `${errorData.message}: ${JSON.stringify(errorData.errors)}`
        : errorData?.message || 'Failed to create huddle';
      return rejectWithValue(errorMessage);
    }
  }
);

export const joinHuddle = createAsyncThunk(
  'huddle/join',
  async (data: { roomId: string; isVideoEnabled?: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.post('/huddle/join', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to join huddle');
    }
  }
);

export const leaveHuddle = createAsyncThunk(
  'huddle/leave',
  async (roomId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/huddle/${roomId}/leave`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to leave huddle');
    }
  }
);

export const updateParticipant = createAsyncThunk(
  'huddle/updateParticipant',
  async (
    data: { roomId: string; isAudioEnabled?: boolean; isVideoEnabled?: boolean; isMuted?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const { roomId, ...updateData } = data;
      const response = await api.put(`/huddle/${roomId}/participant`, updateData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update participant');
    }
  }
);

export const fetchActiveHuddle = createAsyncThunk(
  'huddle/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/huddle/active/me');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch active huddle');
    }
  }
);

export const fetchHuddleHistory = createAsyncThunk(
  'huddle/fetchHistory',
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await api.get('/huddle/history/me', { params: { limit } });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch history');
    }
  }
);

export const forceLeaveAllHuddles = createAsyncThunk(
  'huddle/forceLeaveAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/huddle/force-leave');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to force leave huddles');
    }
  }
);

export const inviteToHuddle = createAsyncThunk(
  'huddle/invite',
  async (data: { roomId: string; userIds: string[] }, { rejectWithValue }) => {
    try {
      console.log('[huddleSlice] Inviting users to huddle:', data);
      const response = await api.post(`/huddle/${data.roomId}/invite`, { userIds: data.userIds });
      return response.data;
    } catch (error: any) {
      console.error('[huddleSlice] Invite error:', error.response?.data);
      return rejectWithValue(error.response?.data?.message || 'Failed to invite users');
    }
  }
);

/**
 * Huddle Slice
 * Pattern: Redux Toolkit slice with reducers and extra reducers
 */
const huddleSlice = createSlice({
  name: 'huddle',
  initialState,
  reducers: {
    /**
     * Set active huddle (from Socket.IO events)
     */
    setActiveHuddle: (state, action: PayloadAction<Huddle | null>) => {
      state.activeHuddle = action.payload;
      state.isInCall = action.payload !== null;
    },

    /**
     * Update participant in active huddle
     */
    updateParticipantInHuddle: (
      state,
      action: PayloadAction<{ userId: string; updates: Partial<HuddleParticipant> }>
    ) => {
      if (state.activeHuddle) {
        const participant = state.activeHuddle.participants.find(
          (p) => p.userId._id === action.payload.userId
        );
        if (participant) {
          Object.assign(participant, action.payload.updates);
        }
      }
    },

    /**
     * Add participant to active huddle
     */
    addParticipantToHuddle: (state, action: PayloadAction<HuddleParticipant>) => {
      if (state.activeHuddle) {
        state.activeHuddle.participants.push(action.payload);
      }
    },

    /**
     * Remove participant from active huddle
     */
    removeParticipantFromHuddle: (state, action: PayloadAction<string>) => {
      if (state.activeHuddle) {
        state.activeHuddle.participants = state.activeHuddle.participants.filter(
          (p) => p.userId._id !== action.payload
        );
      }
    },

    /**
     * Toggle local audio
     */
    toggleLocalAudio: (state) => {
      state.localAudioEnabled = !state.localAudioEnabled;
    },

    /**
     * Toggle local video
     */
    toggleLocalVideo: (state) => {
      state.localVideoEnabled = !state.localVideoEnabled;
    },

    /**
     * Toggle local mute
     */
    toggleLocalMute: (state) => {
      state.localMuted = !state.localMuted;
    },

    /**
     * Set local audio state
     */
    setLocalAudio: (state, action: PayloadAction<boolean>) => {
      state.localAudioEnabled = action.payload;
    },

    /**
     * Set local video state
     */
    setLocalVideo: (state, action: PayloadAction<boolean>) => {
      state.localVideoEnabled = action.payload;
    },

    /**
     * Set local mute state
     */
    setLocalMute: (state, action: PayloadAction<boolean>) => {
      state.localMuted = action.payload;
    },

    /**
     * Minimize huddle (show floating widget)
     */
    minimizeHuddle: (state) => {
      state.isMinimized = true;
    },

    /**
     * Expand huddle (show full screen)
     */
    expandHuddle: (state) => {
      state.isMinimized = false;
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Reset huddle state
     */
    resetHuddleState: (state) => {
      state.activeHuddle = null;
      state.isInCall = false;
      state.isMinimized = false;
      state.localAudioEnabled = true;
      state.localVideoEnabled = false;
      state.localMuted = false;
      state.error = null;
    },
  },

  /**
   * Extra Reducers - Handle async thunk states
   * Pattern: Builder callback for type-safe reducer handling
   */
  extraReducers: (builder) => {
    // Create Huddle
    builder
      .addCase(createHuddle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createHuddle.fulfilled, (state, action) => {
        state.loading = false;
        state.activeHuddle = action.payload;
        state.isInCall = true;
      })
      .addCase(createHuddle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Join Huddle
    builder
      .addCase(joinHuddle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinHuddle.fulfilled, (state, action) => {
        state.loading = false;
        state.activeHuddle = action.payload;
        state.isInCall = true;
      })
      .addCase(joinHuddle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Leave Huddle
    builder
      .addCase(leaveHuddle.pending, (state) => {
        state.loading = true;
      })
      .addCase(leaveHuddle.fulfilled, (state) => {
        state.loading = false;
        state.activeHuddle = null;
        state.isInCall = false;
        state.localAudioEnabled = true;
        state.localVideoEnabled = false;
        state.localMuted = false;
      })
      .addCase(leaveHuddle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Participant
    builder
      .addCase(updateParticipant.fulfilled, (state, action) => {
        state.activeHuddle = action.payload;
      })
      .addCase(updateParticipant.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch Active Huddle
    builder
      .addCase(fetchActiveHuddle.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveHuddle.fulfilled, (state, action) => {
        state.loading = false;
        state.activeHuddle = action.payload;
        state.isInCall = action.payload !== null;
      })
      .addCase(fetchActiveHuddle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch History
    builder
      .addCase(fetchHuddleHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHuddleHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(fetchHuddleHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Force Leave All Huddles
    builder
      .addCase(forceLeaveAllHuddles.pending, (state) => {
        state.loading = true;
      })
      .addCase(forceLeaveAllHuddles.fulfilled, (state) => {
        state.loading = false;
        state.activeHuddle = null;
        state.isInCall = false;
        state.localAudioEnabled = true;
        state.localVideoEnabled = false;
        state.localMuted = false;
        state.error = null;
      })
      .addCase(forceLeaveAllHuddles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setActiveHuddle,
  updateParticipantInHuddle,
  addParticipantToHuddle,
  removeParticipantFromHuddle,
  toggleLocalAudio,
  toggleLocalVideo,
  toggleLocalMute,
  setLocalAudio,
  setLocalVideo,
  setLocalMute,
  minimizeHuddle,
  expandHuddle,
  clearError,
  resetHuddleState,
} = huddleSlice.actions;

export default huddleSlice.reducer;
