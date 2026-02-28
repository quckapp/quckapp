import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  Environment,
  VersionConfig,
  GlobalVersionConfig,
  VersionProfile,
} from '../../types';

interface VersionState {
  versions: VersionConfig[];
  globalConfig: GlobalVersionConfig | null;
  profiles: VersionProfile[];
  loading: boolean;
  saveLoading: boolean;
  error: string | null;
}

const initialState: VersionState = {
  versions: [],
  globalConfig: null,
  profiles: [],
  loading: false,
  saveLoading: false,
  error: null,
};

const BASE = '/admin/service-urls';

// ── Versions ──

export const fetchVersions = createAsyncThunk(
  'versions/fetchVersions',
  async (env: Environment) => {
    const response = await api.get(`${BASE}/${env}/versions`);
    return response.data.data;
  }
);

export const createVersion = createAsyncThunk(
  'versions/createVersion',
  async ({ env, data }: { env: Environment; data: Partial<VersionConfig> }) => {
    const response = await api.post(`${BASE}/${env}/versions`, data);
    return response.data.data;
  }
);

export const deleteVersion = createAsyncThunk(
  'versions/deleteVersion',
  async ({ env, serviceKey, ver }: { env: Environment; serviceKey: string; ver: string }) => {
    await api.delete(`${BASE}/${env}/versions/${serviceKey}/${ver}`);
    return { serviceKey, ver };
  }
);

export const markReady = createAsyncThunk(
  'versions/markReady',
  async ({ env, serviceKey, ver }: { env: Environment; serviceKey: string; ver: string }) => {
    const response = await api.post(`${BASE}/${env}/versions/${serviceKey}/${ver}/ready`);
    return response.data.data;
  }
);

export const activateVersion = createAsyncThunk(
  'versions/activateVersion',
  async ({ env, serviceKey, ver }: { env: Environment; serviceKey: string; ver: string }) => {
    const response = await api.post(`${BASE}/${env}/versions/${serviceKey}/${ver}/activate`);
    return response.data.data;
  }
);

export const deprecateVersion = createAsyncThunk(
  'versions/deprecateVersion',
  async ({ env, serviceKey, ver }: { env: Environment; serviceKey: string; ver: string }) => {
    const response = await api.post(`${BASE}/${env}/versions/${serviceKey}/${ver}/deprecate`);
    return response.data.data;
  }
);

export const disableVersion = createAsyncThunk(
  'versions/disableVersion',
  async ({ env, serviceKey, ver }: { env: Environment; serviceKey: string; ver: string }) => {
    const response = await api.post(`${BASE}/${env}/versions/${serviceKey}/${ver}/disable`);
    return response.data.data;
  }
);

// ── Bulk Operations ──

export const bulkPlan = createAsyncThunk(
  'versions/bulkPlan',
  async ({ env, apiVersion, serviceKeys, changelog }: { env: Environment; apiVersion: string; serviceKeys: string[]; changelog: string }) => {
    const response = await api.post(`${BASE}/${env}/versions/bulk-plan`, { apiVersion, serviceKeys, changelog });
    return response.data.data;
  }
);

export const bulkActivate = createAsyncThunk(
  'versions/bulkActivate',
  async ({ env, apiVersion }: { env: Environment; apiVersion: string }) => {
    const response = await api.post(`${BASE}/${env}/versions/bulk-activate`, { apiVersion });
    return response.data.data;
  }
);

// ── Global Config ──

export const fetchGlobalConfig = createAsyncThunk(
  'versions/fetchGlobalConfig',
  async (env: Environment) => {
    const response = await api.get(`${BASE}/${env}/global-config`);
    return response.data.data;
  }
);

export const updateGlobalConfig = createAsyncThunk(
  'versions/updateGlobalConfig',
  async ({ env, data }: { env: Environment; data: Partial<GlobalVersionConfig> }) => {
    const response = await api.put(`${BASE}/${env}/global-config`, data);
    return response.data.data;
  }
);

// ── Profiles ──

export const fetchProfiles = createAsyncThunk(
  'versions/fetchProfiles',
  async () => {
    const response = await api.get(`${BASE}/profiles`);
    return response.data.data;
  }
);

export const createProfile = createAsyncThunk(
  'versions/createProfile',
  async (data: { name: string; description: string; entries: { serviceKey: string; apiVersion: string; releaseVersion: string }[] }) => {
    const response = await api.post(`${BASE}/profiles`, data);
    return response.data.data;
  }
);

export const applyProfile = createAsyncThunk(
  'versions/applyProfile',
  async ({ profileId, env }: { profileId: string; env: Environment }) => {
    const response = await api.post(`${BASE}/profiles/${profileId}/apply/${env}`);
    return response.data.data;
  }
);

// ── Export ──

export const exportEnvFile = createAsyncThunk(
  'versions/exportEnvFile',
  async (env: Environment) => {
    const response = await api.get(`${BASE}/${env}/export/env-file`);
    const data = response.data.data;

    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `service-urls-${env}-${Date.now()}.env`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return data;
  }
);

// ── Slice ──

const versionSlice = createSlice({
  name: 'versions',
  initialState,
  reducers: {
    clearVersionError: (state) => {
      state.error = null;
    },
    clearVersionData: (state) => {
      state.versions = [];
      state.globalConfig = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch versions
      .addCase(fetchVersions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVersions.fulfilled, (state, action) => {
        state.loading = false;
        state.versions = action.payload;
      })
      .addCase(fetchVersions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch versions';
      })

      // Create version
      .addCase(createVersion.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(createVersion.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.versions.push(action.payload);
      })
      .addCase(createVersion.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to create version';
      })

      // Delete version
      .addCase(deleteVersion.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(deleteVersion.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.versions = state.versions.filter(
          (v) => !(v.serviceKey === action.payload.serviceKey && v.apiVersion === action.payload.ver)
        );
      })
      .addCase(deleteVersion.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to delete version';
      })

      // Mark ready
      .addCase(markReady.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(markReady.fulfilled, (state, action) => {
        state.saveLoading = false;
        const idx = state.versions.findIndex(
          (v) => v.serviceKey === action.payload.serviceKey && v.apiVersion === action.payload.apiVersion
        );
        if (idx !== -1) state.versions[idx] = action.payload;
      })
      .addCase(markReady.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to mark version ready';
      })

      // Activate version
      .addCase(activateVersion.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(activateVersion.fulfilled, (state, action) => {
        state.saveLoading = false;
        const idx = state.versions.findIndex(
          (v) => v.serviceKey === action.payload.serviceKey && v.apiVersion === action.payload.apiVersion
        );
        if (idx !== -1) state.versions[idx] = action.payload;
      })
      .addCase(activateVersion.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to activate version';
      })

      // Deprecate version
      .addCase(deprecateVersion.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(deprecateVersion.fulfilled, (state, action) => {
        state.saveLoading = false;
        const idx = state.versions.findIndex(
          (v) => v.serviceKey === action.payload.serviceKey && v.apiVersion === action.payload.apiVersion
        );
        if (idx !== -1) state.versions[idx] = action.payload;
      })
      .addCase(deprecateVersion.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to deprecate version';
      })

      // Disable version
      .addCase(disableVersion.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(disableVersion.fulfilled, (state, action) => {
        state.saveLoading = false;
        const idx = state.versions.findIndex(
          (v) => v.serviceKey === action.payload.serviceKey && v.apiVersion === action.payload.apiVersion
        );
        if (idx !== -1) state.versions[idx] = action.payload;
      })
      .addCase(disableVersion.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to disable version';
      })

      // Bulk plan
      .addCase(bulkPlan.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(bulkPlan.fulfilled, (state) => {
        state.saveLoading = false;
      })
      .addCase(bulkPlan.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to bulk plan versions';
      })

      // Bulk activate
      .addCase(bulkActivate.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(bulkActivate.fulfilled, (state) => {
        state.saveLoading = false;
      })
      .addCase(bulkActivate.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to bulk activate versions';
      })

      // Global config
      .addCase(fetchGlobalConfig.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGlobalConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.globalConfig = action.payload;
      })
      .addCase(fetchGlobalConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch global config';
      })

      // Update global config
      .addCase(updateGlobalConfig.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(updateGlobalConfig.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.globalConfig = action.payload;
      })
      .addCase(updateGlobalConfig.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to update global config';
      })

      // Profiles
      .addCase(fetchProfiles.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfiles.fulfilled, (state, action) => {
        state.loading = false;
        state.profiles = action.payload;
      })
      .addCase(fetchProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch profiles';
      })

      // Create profile
      .addCase(createProfile.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(createProfile.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.profiles.push(action.payload);
      })
      .addCase(createProfile.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to create profile';
      })

      // Apply profile
      .addCase(applyProfile.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(applyProfile.fulfilled, (state) => {
        state.saveLoading = false;
      })
      .addCase(applyProfile.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to apply profile';
      })

      // Export env file
      .addCase(exportEnvFile.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(exportEnvFile.fulfilled, (state) => {
        state.saveLoading = false;
      })
      .addCase(exportEnvFile.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to export env file';
      });
  },
});

export const { clearVersionError, clearVersionData } = versionSlice.actions;
export default versionSlice.reducer;
