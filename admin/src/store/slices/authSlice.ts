import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { adminApi } from '../../services/adminApi';
import type { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('adminUser') || 'null'),
  token: localStorage.getItem('adminToken'),
  isAuthenticated: !!localStorage.getItem('adminToken'),
  isAdmin: false,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ phoneNumber, password }: { phoneNumber: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await adminApi.login(phoneNumber, password);

      const adminRoles = ['admin', 'super_admin', 'moderator'];
      if (!adminRoles.includes(data.user.role)) {
        return rejectWithValue('Access denied. Admin privileges required.');
      }

      localStorage.setItem('adminToken', data.accessToken);
      localStorage.setItem('adminUser', JSON.stringify(data.user));

      return data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const checkAdminProfile = createAsyncThunk(
  'auth/checkAdminProfile',
  async (_, { rejectWithValue }) => {
    try {
      const data = await adminApi.getAdminProfile();
      return data.user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Not authorized');
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        return rejectWithValue('No token found');
      }
      const data = await adminApi.getAdminProfile();
      return data.user;
    } catch (error: unknown) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Authentication failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isAdmin = false;
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isAdmin = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(checkAdminProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAdmin = true;
      })
      .addCase(checkAdminProfile.rejected, (state) => {
        state.isAdmin = false;
      })
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isAdmin = true;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isAdmin = false;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
