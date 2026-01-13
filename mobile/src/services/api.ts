import axios from 'axios';
import { API_URL } from '../config/api.config';

// Store will be set from the app initialization
let storeInstance: any = null;
let isLoggingOut: boolean = false;
let isStoreRehydrated: boolean = false;
let rehydrationPromise: Promise<void> | null = null;
let resolveRehydration: (() => void) | null = null;

// Create the rehydration promise
rehydrationPromise = new Promise((resolve) => {
  resolveRehydration = resolve;
});

export const setStoreForApi = (store: any) => {
  storeInstance = store;
};

// Call this when redux-persist has finished rehydrating
export const markStoreRehydrated = () => {
  isStoreRehydrated = true;
  if (resolveRehydration) {
    resolveRehydration();
  }
};

// Wait for store to be rehydrated (with timeout)
const waitForRehydration = async (timeoutMs: number = 5000): Promise<boolean> => {
  if (isStoreRehydrated) return true;

  const timeoutPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), timeoutMs);
  });

  const rehydratedPromise = rehydrationPromise!.then(() => true);

  return Promise.race([rehydratedPromise, timeoutPromise]);
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    // Wait for store rehydration before making authenticated requests
    // Skip waiting for auth endpoints (login, register, etc.)
    const isAuthEndpoint = config.url?.includes('/auth/login') ||
                           config.url?.includes('/auth/register') ||
                           config.url?.includes('/auth/refresh');

    if (!isAuthEndpoint && !isStoreRehydrated) {
      console.log('⏳ Waiting for store rehydration before API call:', config.url);
      const rehydrated = await waitForRehydration(5000);
      if (rehydrated) {
        console.log('✅ Store rehydrated, proceeding with API call:', config.url);
      } else {
        console.log('⚠️ Rehydration timeout, proceeding anyway:', config.url);
      }
    }

    if (!storeInstance) return config;

    const state = storeInstance.getState();
    const token = state.auth.accessToken;
    const isConnected = state.network.isConnected;

    // Check if device is offline
    if (!isConnected) {
      // Only queue mutation requests (POST, PUT, DELETE, PATCH)
      const method = (config.method || 'get').toUpperCase();
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        // Dynamically import to avoid circular dependency
        import('../store/slices/networkSlice').then(({ addPendingRequest }) => {
          storeInstance.dispatch(addPendingRequest({
            id: `${Date.now()}_${Math.random()}`,
            url: config.url || '',
            method: config.method || 'get',
            data: config.data,
            headers: config.headers,
            timestamp: Date.now(),
          }));
        });

        // Return a custom error for offline requests
        return Promise.reject({
          message: 'Device is offline. Request queued for retry.',
          isOffline: true,
          config,
        });
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && storeInstance && !isLoggingOut) {
      originalRequest._retry = true;

      try {
        const state = storeInstance.getState();
        const refreshToken = state.auth.refreshToken;

        if (!refreshToken) {
          // Dynamically import to avoid circular dependency
          const { logout } = await import('../store/slices/authSlice');
          isLoggingOut = true;
          storeInstance.dispatch(logout());
          setTimeout(() => { isLoggingOut = false; }, 1000);
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Dynamically import to avoid circular dependency
        const { setTokens } = await import('../store/slices/authSlice');
        storeInstance.dispatch(setTokens({ accessToken, refreshToken: newRefreshToken }));

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Dynamically import to avoid circular dependency
        const { logout } = await import('../store/slices/authSlice');
        isLoggingOut = true;
        storeInstance.dispatch(logout());
        setTimeout(() => { isLoggingOut = false; }, 1000);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
