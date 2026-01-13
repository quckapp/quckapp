import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface CommunityMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  user?: {
    _id: string;
    displayName: string;
    phoneNumber: string;
    avatar?: string;
  };
}

interface Community {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdBy: string;
  members: CommunityMember[];
  groups: string[];
  announcementGroupId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CommunitiesState {
  communities: Community[];
  currentCommunity: Community | null;
  loading: boolean;
  error: string | null;
}

const initialState: CommunitiesState = {
  communities: [],
  currentCommunity: null,
  loading: false,
  error: null,
};

// Fetch all user communities
export const fetchCommunities = createAsyncThunk(
  'communities/fetchAll',
  async () => {
    const response = await api.get('/communities');
    return response.data;
  }
);

// Fetch single community
export const fetchCommunity = createAsyncThunk(
  'communities/fetchOne',
  async (communityId: string) => {
    const response = await api.get(`/communities/${communityId}`);
    return response.data;
  }
);

// Create a community
export const createCommunity = createAsyncThunk(
  'communities/create',
  async (data: { name: string; description?: string; avatar?: string }) => {
    const response = await api.post('/communities', data);
    return response.data;
  }
);

// Update community
export const updateCommunity = createAsyncThunk(
  'communities/update',
  async ({ communityId, updates }: { communityId: string; updates: any }) => {
    const response = await api.put(`/communities/${communityId}`, updates);
    return response.data;
  }
);

// Delete community
export const deleteCommunity = createAsyncThunk(
  'communities/delete',
  async (communityId: string) => {
    await api.delete(`/communities/${communityId}`);
    return communityId;
  }
);

// Add members to community
export const addMembers = createAsyncThunk(
  'communities/addMembers',
  async ({ communityId, memberIds }: { communityId: string; memberIds: string[] }) => {
    const response = await api.post(`/communities/${communityId}/members`, { memberIds });
    return response.data;
  }
);

// Remove member from community
export const removeMember = createAsyncThunk(
  'communities/removeMember',
  async ({ communityId, memberId }: { communityId: string; memberId: string }) => {
    await api.delete(`/communities/${communityId}/members/${memberId}`);
    return { communityId, memberId };
  }
);

// Add group to community
export const addGroup = createAsyncThunk(
  'communities/addGroup',
  async ({ communityId, groupId }: { communityId: string; groupId: string }) => {
    const response = await api.post(`/communities/${communityId}/groups`, { groupId });
    return response.data;
  }
);

// Remove group from community
export const removeGroup = createAsyncThunk(
  'communities/removeGroup',
  async ({ communityId, groupId }: { communityId: string; groupId: string }) => {
    await api.delete(`/communities/${communityId}/groups/${groupId}`);
    return { communityId, groupId };
  }
);

const communitiesSlice = createSlice({
  name: 'communities',
  initialState,
  reducers: {
    setCurrentCommunity: (state, action: PayloadAction<Community | null>) => {
      state.currentCommunity = action.payload;
    },
    clearCommunitiesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all communities
      .addCase(fetchCommunities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommunities.fulfilled, (state, action) => {
        state.loading = false;
        state.communities = action.payload;
      })
      .addCase(fetchCommunities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch communities';
      })
      // Fetch single community
      .addCase(fetchCommunity.fulfilled, (state, action) => {
        const index = state.communities.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.communities[index] = action.payload;
        } else {
          state.communities.push(action.payload);
        }
        state.currentCommunity = action.payload;
      })
      // Create community
      .addCase(createCommunity.fulfilled, (state, action) => {
        state.communities.unshift(action.payload);
        state.currentCommunity = action.payload;
      })
      .addCase(createCommunity.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create community';
      })
      // Update community
      .addCase(updateCommunity.fulfilled, (state, action) => {
        const index = state.communities.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.communities[index] = action.payload;
        }
        if (state.currentCommunity?._id === action.payload._id) {
          state.currentCommunity = action.payload;
        }
      })
      .addCase(updateCommunity.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update community';
      })
      // Delete community
      .addCase(deleteCommunity.fulfilled, (state, action) => {
        state.communities = state.communities.filter((c) => c._id !== action.payload);
        if (state.currentCommunity?._id === action.payload) {
          state.currentCommunity = null;
        }
      })
      .addCase(deleteCommunity.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete community';
      })
      // Add members
      .addCase(addMembers.fulfilled, (state, action) => {
        const index = state.communities.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.communities[index] = action.payload;
        }
        if (state.currentCommunity?._id === action.payload._id) {
          state.currentCommunity = action.payload;
        }
      })
      // Remove member
      .addCase(removeMember.fulfilled, (state, action) => {
        const community = state.communities.find((c) => c._id === action.payload.communityId);
        if (community) {
          community.members = community.members.filter((m) => m.userId !== action.payload.memberId);
        }
        if (state.currentCommunity?._id === action.payload.communityId) {
          state.currentCommunity.members = state.currentCommunity.members.filter(
            (m) => m.userId !== action.payload.memberId
          );
        }
      })
      // Add group
      .addCase(addGroup.fulfilled, (state, action) => {
        const index = state.communities.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.communities[index] = action.payload;
        }
        if (state.currentCommunity?._id === action.payload._id) {
          state.currentCommunity = action.payload;
        }
      })
      // Remove group
      .addCase(removeGroup.fulfilled, (state, action) => {
        const community = state.communities.find((c) => c._id === action.payload.communityId);
        if (community) {
          community.groups = community.groups.filter((g) => g !== action.payload.groupId);
        }
        if (state.currentCommunity?._id === action.payload.communityId) {
          state.currentCommunity.groups = state.currentCommunity.groups.filter(
            (g) => g !== action.payload.groupId
          );
        }
      });
  },
});

export const { setCurrentCommunity, clearCommunitiesError } = communitiesSlice.actions;

export default communitiesSlice.reducer;
