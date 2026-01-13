import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Settings {
  // Appearance Settings
  darkMode: boolean;

  // Media & Storage Settings
  autoDownloadMedia: boolean;
  saveToGallery: boolean;

  // Notification Settings
  pushNotifications: boolean;
  messageNotifications: boolean;
  groupNotifications: boolean;
  callNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showPreview: boolean;
  inAppNotifications: boolean;
  notificationLight: boolean;

  // Privacy Settings
  readReceipts: boolean;
  lastSeen: boolean;
  profilePhotoVisibility: string;
  statusVisibility: string;

  // Security Settings
  twoFactorAuth: boolean;
  fingerprintLock: boolean;

  blockedUsers?: string[];
}

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: null,
  loading: false,
  error: null,
};

export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async () => {
    const response = await api.get('/users/me/settings');
    return response.data;
  }
);

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (updates: Partial<Settings>) => {
    const response = await api.put('/users/me/settings', updates);
    return response.data;
  }
);

export const blockUser = createAsyncThunk(
  'settings/blockUser',
  async (userId: string) => {
    const response = await api.post('/users/me/blocked-users', { userId });
    return response.data;
  }
);

export const unblockUser = createAsyncThunk(
  'settings/unblockUser',
  async (userId: string) => {
    const response = await api.delete(`/users/me/blocked-users/${userId}`);
    return response.data;
  }
);

export const fetchBlockedUsers = createAsyncThunk(
  'settings/fetchBlockedUsers',
  async () => {
    const response = await api.get('/users/me/blocked-users');
    return response.data;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Settings>) => {
      state.settings = action.payload;
    },
    clearSettings: (state) => {
      state.settings = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch settings';
      })
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update settings';
      })
      .addCase(blockUser.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(unblockUser.fulfilled, (state, action) => {
        state.settings = action.payload;
      });
  },
});

export const { setSettings, clearSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
