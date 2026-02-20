import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { ConfigAPIKey, CreateAPIKeyRequest, CreateAPIKeyResponse } from '../../types';

interface APIKeysState {
  keys: ConfigAPIKey[];
  loading: boolean;
  saveLoading: boolean;
  error: string | null;
}

const initialState: APIKeysState = {
  keys: [],
  loading: false,
  saveLoading: false,
  error: null,
};

const BASE = '/admin/api-keys';

export const fetchAPIKeys = createAsyncThunk(
  'apiKeys/fetchAPIKeys',
  async () => {
    const response = await api.get(BASE);
    return response.data.data;
  }
);

export const createAPIKey = createAsyncThunk(
  'apiKeys/createAPIKey',
  async (data: CreateAPIKeyRequest) => {
    const response = await api.post(BASE, data);
    return response.data.data as CreateAPIKeyResponse;
  }
);

export const revokeAPIKey = createAsyncThunk(
  'apiKeys/revokeAPIKey',
  async (id: string) => {
    await api.put(`${BASE}/${id}/revoke`);
    return id;
  }
);

export const deleteAPIKey = createAsyncThunk(
  'apiKeys/deleteAPIKey',
  async (id: string) => {
    await api.delete(`${BASE}/${id}`);
    return id;
  }
);

const apiKeysSlice = createSlice({
  name: 'apiKeys',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchAPIKeys.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAPIKeys.fulfilled, (state, action) => {
        state.loading = false;
        state.keys = action.payload;
      })
      .addCase(fetchAPIKeys.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch API keys';
      })

      // Create
      .addCase(createAPIKey.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(createAPIKey.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.keys.push(action.payload.apiKey);
      })
      .addCase(createAPIKey.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to create API key';
      })

      // Revoke
      .addCase(revokeAPIKey.fulfilled, (state, action) => {
        const idx = state.keys.findIndex((k) => k.id === action.payload);
        if (idx !== -1) state.keys[idx].isActive = false;
      })

      // Delete
      .addCase(deleteAPIKey.fulfilled, (state, action) => {
        state.keys = state.keys.filter((k) => k.id !== action.payload);
      });
  },
});

export const { clearError } = apiKeysSlice.actions;
export default apiKeysSlice.reducer;
