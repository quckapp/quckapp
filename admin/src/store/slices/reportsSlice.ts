import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { adminApi } from '../../services/adminApi';
import type { Report } from '../../types';

interface ReportsState {
  reports: Report[];
  selectedReport: Report | null;
  reportDetails: unknown | null;
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  reports: [],
  selectedReport: null,
  reportDetails: null,
  total: 0,
  page: 1,
  pages: 0,
  loading: false,
  error: null,
};

export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (params: Parameters<typeof adminApi.getReports>[0], { rejectWithValue }) => {
    try {
      return await adminApi.getReports(params);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch reports');
    }
  }
);

export const fetchReportDetails = createAsyncThunk(
  'reports/fetchReportDetails',
  async (reportId: string, { rejectWithValue }) => {
    try {
      return await adminApi.getReportDetails(reportId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch report details');
    }
  }
);

export const updateReport = createAsyncThunk(
  'reports/updateReport',
  async (
    { reportId, data }: { reportId: string; data: Parameters<typeof adminApi.updateReport>[1] },
    { rejectWithValue }
  ) => {
    try {
      return await adminApi.updateReport(reportId, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update report');
    }
  }
);

export const deleteMessage = createAsyncThunk(
  'reports/deleteMessage',
  async ({ messageId, reason }: { messageId: string; reason: string }, { rejectWithValue }) => {
    try {
      await adminApi.deleteMessage(messageId, reason);
      return messageId;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete message');
    }
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setSelectedReport: (state, action: PayloadAction<Report | null>) => {
      state.selectedReport = action.payload;
    },
    clearReportDetails: (state) => {
      state.reportDetails = null;
      state.selectedReport = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.reports;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchReportDetails.fulfilled, (state, action) => {
        state.reportDetails = action.payload;
        state.selectedReport = action.payload.report;
      })
      .addCase(updateReport.fulfilled, (state, action) => {
        const index = state.reports.findIndex((r) => r._id === action.payload._id);
        if (index !== -1) state.reports[index] = action.payload;
        if (state.selectedReport?._id === action.payload._id) state.selectedReport = action.payload;
      });
  },
});

export const { setSelectedReport, clearReportDetails } = reportsSlice.actions;
export default reportsSlice.reducer;
