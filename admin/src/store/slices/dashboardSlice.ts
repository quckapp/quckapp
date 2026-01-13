import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi } from '../../services/adminApi';
import type { DashboardStats, RealTimeStats } from '../../types';

interface DashboardState {
  stats: DashboardStats | null;
  realTimeStats: RealTimeStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: null,
  realTimeStats: null,
  loading: false,
  error: null,
};

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await adminApi.getDashboardStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const fetchRealTimeStats = createAsyncThunk(
  'dashboard/fetchRealTimeStats',
  async (_, { rejectWithValue }) => {
    try {
      return await adminApi.getRealTimeStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch real-time stats');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchRealTimeStats.fulfilled, (state, action) => {
        state.realTimeStats = action.payload;
      });
  },
});

export default dashboardSlice.reducer;
