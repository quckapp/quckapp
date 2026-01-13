import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi } from '../../services/adminApi';
import type { SystemHealth } from '../../types';

interface SystemState {
  health: SystemHealth | null;
  settings: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
}

const initialState: SystemState = {
  health: null,
  settings: null,
  loading: false,
  error: null,
};

export const fetchSystemHealth = createAsyncThunk(
  'system/fetchHealth',
  async (_, { rejectWithValue }) => {
    try {
      return await adminApi.getSystemHealth();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch system health');
    }
  }
);

export const updateSystemSettings = createAsyncThunk(
  'system/updateSettings',
  async (settings: Record<string, unknown>, { rejectWithValue }) => {
    try {
      return await adminApi.updateSystemSettings(settings);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update settings');
    }
  }
);

export const clearCache = createAsyncThunk(
  'system/clearCache',
  async (_, { rejectWithValue }) => {
    try {
      return await adminApi.clearCache();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to clear cache');
    }
  }
);

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSystemHealth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemHealth.fulfilled, (state, action) => {
        state.loading = false;
        state.health = action.payload;
      })
      .addCase(fetchSystemHealth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateSystemSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(clearCache.fulfilled, () => {
        // Cache cleared successfully
      });
  },
});

export default systemSlice.reducer;
