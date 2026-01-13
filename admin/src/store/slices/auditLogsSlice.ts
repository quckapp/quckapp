import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { adminApi } from '../../services/adminApi';
import type { AuditLog } from '../../types';

interface AuditLogsState {
  logs: AuditLog[];
  selectedLog: AuditLog | null;
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
}

const initialState: AuditLogsState = {
  logs: [],
  selectedLog: null,
  total: 0,
  page: 1,
  pages: 0,
  loading: false,
  error: null,
};

export const fetchAuditLogs = createAsyncThunk(
  'auditLogs/fetchAuditLogs',
  async (params: Parameters<typeof adminApi.getAuditLogs>[0], { rejectWithValue }) => {
    try {
      return await adminApi.getAuditLogs(params);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch audit logs');
    }
  }
);

const auditLogsSlice = createSlice({
  name: 'auditLogs',
  initialState,
  reducers: {
    setSelectedLog: (state, action: PayloadAction<AuditLog | null>) => {
      state.selectedLog = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedLog } = auditLogsSlice.actions;
export default auditLogsSlice.reducer;
