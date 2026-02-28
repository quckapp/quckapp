import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  Environment,
  ServiceUrlConfig,
  InfrastructureConfig,
  FirebaseConfig,
  EnvironmentSummary,
  ServiceCategory,
} from '../../types';

interface ServiceUrlsState {
  services: ServiceUrlConfig[];
  infrastructure: InfrastructureConfig[];
  firebase: FirebaseConfig | null;
  summaries: EnvironmentSummary[];
  loading: boolean;
  saveLoading: boolean;
  error: string | null;
}

const initialState: ServiceUrlsState = {
  services: [],
  infrastructure: [],
  firebase: null,
  summaries: [],
  loading: false,
  saveLoading: false,
  error: null,
};

const BASE = '/admin/service-urls';

// ── Environment Summaries ──

export const fetchSummaries = createAsyncThunk(
  'serviceUrls/fetchSummaries',
  async () => {
    const response = await api.get(`${BASE}/summary`);
    return response.data.data;
  }
);

// ── Service URLs ──

export const fetchServices = createAsyncThunk(
  'serviceUrls/fetchServices',
  async ({ env, category }: { env: Environment; category?: ServiceCategory }) => {
    const params = category ? { category } : {};
    const response = await api.get(`${BASE}/${env}/services`, { params });
    return response.data.data;
  }
);

export const createService = createAsyncThunk(
  'serviceUrls/createService',
  async ({ env, data }: { env: Environment; data: Partial<ServiceUrlConfig> }) => {
    const response = await api.post(`${BASE}/${env}/services`, data);
    return response.data.data;
  }
);

export const updateService = createAsyncThunk(
  'serviceUrls/updateService',
  async ({ env, serviceKey, data }: { env: Environment; serviceKey: string; data: Partial<ServiceUrlConfig> }) => {
    const response = await api.put(`${BASE}/${env}/services/${serviceKey}`, data);
    return response.data.data;
  }
);

export const deleteService = createAsyncThunk(
  'serviceUrls/deleteService',
  async ({ env, serviceKey }: { env: Environment; serviceKey: string }) => {
    await api.delete(`${BASE}/${env}/services/${serviceKey}`);
    return serviceKey;
  }
);

// ── Infrastructure ──

export const fetchInfrastructure = createAsyncThunk(
  'serviceUrls/fetchInfrastructure',
  async (env: Environment) => {
    const response = await api.get(`${BASE}/${env}/infrastructure`);
    return response.data.data;
  }
);

export const createInfrastructure = createAsyncThunk(
  'serviceUrls/createInfrastructure',
  async ({ env, data }: { env: Environment; data: Partial<InfrastructureConfig> }) => {
    const response = await api.post(`${BASE}/${env}/infrastructure`, data);
    return response.data.data;
  }
);

export const updateInfrastructure = createAsyncThunk(
  'serviceUrls/updateInfrastructure',
  async ({ env, infraKey, data }: { env: Environment; infraKey: string; data: Partial<InfrastructureConfig> }) => {
    const response = await api.put(`${BASE}/${env}/infrastructure/${infraKey}`, data);
    return response.data.data;
  }
);

export const deleteInfrastructure = createAsyncThunk(
  'serviceUrls/deleteInfrastructure',
  async ({ env, infraKey }: { env: Environment; infraKey: string }) => {
    await api.delete(`${BASE}/${env}/infrastructure/${infraKey}`);
    return infraKey;
  }
);

// ── Firebase ──

export const fetchFirebase = createAsyncThunk(
  'serviceUrls/fetchFirebase',
  async (env: Environment) => {
    const response = await api.get(`${BASE}/${env}/firebase`);
    return response.data.data;
  }
);

export const upsertFirebase = createAsyncThunk(
  'serviceUrls/upsertFirebase',
  async ({ env, data }: { env: Environment; data: Partial<FirebaseConfig> & { privateKey?: string } }) => {
    const response = await api.put(`${BASE}/${env}/firebase`, data);
    return response.data.data;
  }
);

// ── Bulk Operations ──

export const bulkExport = createAsyncThunk(
  'serviceUrls/bulkExport',
  async (env: Environment) => {
    const response = await api.get(`${BASE}/${env}/export`);
    const data = response.data.data;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `service-urls-${env}-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return data;
  }
);

export const bulkImport = createAsyncThunk(
  'serviceUrls/bulkImport',
  async ({ env, data }: { env: Environment; data: { services?: Partial<ServiceUrlConfig>[]; infrastructure?: Partial<InfrastructureConfig>[] } }) => {
    const response = await api.post(`${BASE}/${env}/import`, data);
    return response.data.data;
  }
);

export const cloneEnvironment = createAsyncThunk(
  'serviceUrls/cloneEnvironment',
  async ({ sourceEnv, targetEnv, overwrite }: { sourceEnv: Environment; targetEnv: Environment; overwrite: boolean }) => {
    const response = await api.post(`${BASE}/clone`, {
      sourceEnvironment: sourceEnv,
      targetEnvironment: targetEnv,
      overwrite,
    });
    return response.data.data;
  }
);

// ── Slice ──

const serviceUrlsSlice = createSlice({
  name: 'serviceUrls',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearEnvironmentData: (state) => {
      state.services = [];
      state.infrastructure = [];
      state.firebase = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Summaries
      .addCase(fetchSummaries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSummaries.fulfilled, (state, action) => {
        state.loading = false;
        state.summaries = action.payload;
      })
      .addCase(fetchSummaries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch summaries';
      })

      // Services
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false;
        state.services = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch services';
      })

      // Create service
      .addCase(createService.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(createService.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.services.push(action.payload);
      })
      .addCase(createService.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to create service';
      })

      // Update service
      .addCase(updateService.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.saveLoading = false;
        const idx = state.services.findIndex((s) => s.serviceKey === action.payload.serviceKey);
        if (idx !== -1) state.services[idx] = action.payload;
      })
      .addCase(updateService.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to update service';
      })

      // Delete service
      .addCase(deleteService.fulfilled, (state, action) => {
        state.services = state.services.filter((s) => s.serviceKey !== action.payload);
      })

      // Infrastructure
      .addCase(fetchInfrastructure.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInfrastructure.fulfilled, (state, action) => {
        state.loading = false;
        state.infrastructure = action.payload;
      })
      .addCase(fetchInfrastructure.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch infrastructure';
      })

      // Create infra
      .addCase(createInfrastructure.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(createInfrastructure.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.infrastructure.push(action.payload);
      })
      .addCase(createInfrastructure.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to create infrastructure';
      })

      // Update infra
      .addCase(updateInfrastructure.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(updateInfrastructure.fulfilled, (state, action) => {
        state.saveLoading = false;
        const idx = state.infrastructure.findIndex((i) => i.infraKey === action.payload.infraKey);
        if (idx !== -1) state.infrastructure[idx] = action.payload;
      })
      .addCase(updateInfrastructure.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to update infrastructure';
      })

      // Delete infra
      .addCase(deleteInfrastructure.fulfilled, (state, action) => {
        state.infrastructure = state.infrastructure.filter((i) => i.infraKey !== action.payload);
      })

      // Firebase
      .addCase(fetchFirebase.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFirebase.fulfilled, (state, action) => {
        state.loading = false;
        state.firebase = action.payload;
      })
      .addCase(fetchFirebase.rejected, (state, action) => {
        state.loading = false;
        state.firebase = null;
        state.error = action.error.message || 'Failed to fetch firebase config';
      })

      // Upsert Firebase
      .addCase(upsertFirebase.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(upsertFirebase.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.firebase = action.payload;
      })
      .addCase(upsertFirebase.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to update firebase config';
      })

      // Bulk import
      .addCase(bulkImport.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(bulkImport.fulfilled, (state) => {
        state.saveLoading = false;
      })
      .addCase(bulkImport.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to import data';
      })

      // Clone
      .addCase(cloneEnvironment.pending, (state) => {
        state.saveLoading = true;
      })
      .addCase(cloneEnvironment.fulfilled, (state) => {
        state.saveLoading = false;
      })
      .addCase(cloneEnvironment.rejected, (state, action) => {
        state.saveLoading = false;
        state.error = action.error.message || 'Failed to clone environment';
      });
  },
});

export const { clearError, clearEnvironmentData } = serviceUrlsSlice.actions;
export default serviceUrlsSlice.reducer;
