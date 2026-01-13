import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface User {
  _id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  status: string;
  lastSeen?: string;
}

interface UsersState {
  users: Record<string, User>;
  onlineUsers: string[];
  searchResults: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: {},
  onlineUsers: [],
  searchResults: [],
  loading: false,
  error: null,
};

export const searchUsers = createAsyncThunk(
  'users/search',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/search?q=${query}`);
      return response.data;
    } catch (error: any) {
      console.warn('Failed to search users:', error?.response?.data?.message || error?.message || 'Unknown error');
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to search users');
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      console.warn('Failed to fetch user:', error?.response?.data?.message || error?.message || 'Unknown error');
      return rejectWithValue(error?.response?.data?.message || error?.message || 'User not found');
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser: (state, action: PayloadAction<User>) => {
      state.users[action.payload._id] = action.payload;
    },
    updateUserStatus: (state, action: PayloadAction<{ userId: string; status: string }>) => {
      if (state.users[action.payload.userId]) {
        state.users[action.payload.userId].status = action.payload.status;
      }
    },
    userOnline: (state, action: PayloadAction<string>) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
      if (state.users[action.payload]) {
        state.users[action.payload].status = 'online';
      }
    },
    userOffline: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter(id => id !== action.payload);
      if (state.users[action.payload]) {
        state.users[action.payload].status = 'offline';
      }
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to search users';
      })
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.users[action.payload._id] = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch user';
      });
  },
});

export const {
  addUser,
  updateUserStatus,
  userOnline,
  userOffline,
  clearSearchResults,
} = usersSlice.actions;

export default usersSlice.reducer;
