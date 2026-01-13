import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PendingRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  headers?: any;
  timestamp: number;
}

interface NetworkState {
  isConnected: boolean;
  connectionType: string | null;
  pendingRequests: PendingRequest[];
}

const initialState: NetworkState = {
  isConnected: true,
  connectionType: null,
  pendingRequests: [],
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setNetworkStatus: (state, action: PayloadAction<{ isConnected: boolean; connectionType: string | null }>) => {
      state.isConnected = action.payload.isConnected;
      state.connectionType = action.payload.connectionType;
    },
    addPendingRequest: (state, action: PayloadAction<PendingRequest>) => {
      state.pendingRequests.push(action.payload);
    },
    removePendingRequest: (state, action: PayloadAction<string>) => {
      state.pendingRequests = state.pendingRequests.filter(req => req.id !== action.payload);
    },
    clearPendingRequests: (state) => {
      state.pendingRequests = [];
    },
  },
});

export const {
  setNetworkStatus,
  addPendingRequest,
  removePendingRequest,
  clearPendingRequests,
} = networkSlice.actions;

export default networkSlice.reducer;
