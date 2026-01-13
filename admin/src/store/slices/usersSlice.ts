import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { adminApi } from '../../services/adminApi';
import type { User } from '../../types';

interface UsersState {
  users: User[];
  selectedUser: User | null;
  userDetails: unknown | null;
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  selectedUser: null,
  userDetails: null,
  total: 0,
  page: 1,
  pages: 0,
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params: Parameters<typeof adminApi.getUsers>[0], { rejectWithValue }) => {
    try {
      return await adminApi.getUsers(params);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const fetchUserDetails = createAsyncThunk(
  'users/fetchUserDetails',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await adminApi.getUserDetails(userId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch user details');
    }
  }
);

export const banUser = createAsyncThunk(
  'users/banUser',
  async ({ userId, reason, expiresAt }: { userId: string; reason: string; expiresAt?: string }, { rejectWithValue }) => {
    try {
      return await adminApi.banUser(userId, reason, expiresAt);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to ban user');
    }
  }
);

export const unbanUser = createAsyncThunk(
  'users/unbanUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await adminApi.unbanUser(userId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to unban user');
    }
  }
);

export const verifyUser = createAsyncThunk(
  'users/verifyUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await adminApi.verifyUser(userId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to verify user');
    }
  }
);

export const updateUserRole = createAsyncThunk(
  'users/updateUserRole',
  async ({ userId, role }: { userId: string; role: string }, { rejectWithValue }) => {
    try {
      return await adminApi.updateUserRole(userId, role);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update role');
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload;
    },
    clearUserDetails: (state) => {
      state.userDetails = null;
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.userDetails = action.payload;
        state.selectedUser = action.payload.user;
      })
      .addCase(banUser.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) state.users[index] = action.payload;
        if (state.selectedUser?._id === action.payload._id) state.selectedUser = action.payload;
      })
      .addCase(unbanUser.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) state.users[index] = action.payload;
        if (state.selectedUser?._id === action.payload._id) state.selectedUser = action.payload;
      })
      .addCase(verifyUser.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) state.users[index] = action.payload;
        if (state.selectedUser?._id === action.payload._id) state.selectedUser = action.payload;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) state.users[index] = action.payload;
        if (state.selectedUser?._id === action.payload._id) state.selectedUser = action.payload;
      });
  },
});

export const { setSelectedUser, clearUserDetails } = usersSlice.actions;
export default usersSlice.reducer;
