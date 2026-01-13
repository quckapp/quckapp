import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface SettingsState {
  settings: Record<string, any> | null;
  loading: boolean;
  saveLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: null,
  loading: false,
  saveLoading: false,
  error: null,
};

export const fetchSettings = createAsyncThunk('settings/fetchSettings', async () => {
  const response = await api.get('/admin/settings');
  return response.data;
});

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settings: Record<string, any>) => {
    const response = await api.patch('/admin/system/settings', settings);
    return response.data;
  }
);

export const exportData = createAsyncThunk(
  'settings/exportData',
  async (type: 'users' | 'messages' | 'all') => {
    const response = await api.get(`/admin/export/${type}`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `quckchat-${type}-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  }
);

export const importData = createAsyncThunk(
  'settings/importData',
  async (formData: FormData) => {
    const response = await api.post('/admin/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch settings
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
        // Set default settings if fetch fails
        state.settings = {
          appName: 'QuckChat',
          supportEmail: '',
          defaultLanguage: 'en',
          timezone: 'UTC',
          maintenanceMode: false,
          sessionTimeout: 60,
          maxLoginAttempts: 5,
          lockoutDuration: 15,
          require2FA: false,
          requireEmailVerification: false,
          pushNotificationsEnabled: true,
          emailNotificationsEnabled: true,
          notificationRateLimit: 100,
          maxMessageLength: 5000,
          maxGroupSize: 256,
          messageRetentionDays: 0,
          messageEditingEnabled: true,
          messageDeletionEnabled: true,
          readReceiptsEnabled: true,
          maxUploadSize: 25,
          maxVideoDuration: 180,
          allowedFileTypes: 'jpg,jpeg,png,gif,mp4,mp3,pdf,doc,docx',
          imageCompressionEnabled: true,
        };
      })
      // Update settings
      .addCase(updateSettings.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.settings = { ...state.settings, ...action.payload };
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to save settings';
      })
      // Export data
      .addCase(exportData.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to export data';
      })
      // Import data
      .addCase(importData.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to import data';
      });
  },
});

export const { clearError } = settingsSlice.actions;
export default settingsSlice.reducer;
