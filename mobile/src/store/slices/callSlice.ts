import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface CallParticipant {
  id: string;
  displayName: string;
  avatar?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface CallState {
  callId: string | null;
  conversationId: string | null;
  callType: 'audio' | 'video' | null;
  status: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';
  isIncoming: boolean;
  caller: CallParticipant | null;
  participants: CallParticipant[];
  localStream: any;
  remoteStreams: Record<string, any>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  speakerEnabled: boolean;
  // Call duration tracking
  connectedAt: number | null;
  duration: number;
}

const initialState: CallState = {
  callId: null,
  conversationId: null,
  callType: null,
  status: 'idle',
  isIncoming: false,
  caller: null,
  participants: [],
  localStream: null,
  remoteStreams: {},
  audioEnabled: true,
  videoEnabled: true,
  speakerEnabled: false,
  connectedAt: null,
  duration: 0,
};

/**
 * Async thunk to invite users to an active call
 */
export const inviteToCall = createAsyncThunk(
  'call/invite',
  async (data: { callId: string; userIds: string[] }, { rejectWithValue }) => {
    try {
      console.log('[callSlice] Inviting users to call:', data);
      const response = await api.post(`/calls/${data.callId}/invite`, { userIds: data.userIds });
      return response.data;
    } catch (error: any) {
      console.error('[callSlice] Invite error:', error.response?.data);
      return rejectWithValue(error.response?.data?.message || 'Failed to invite users');
    }
  }
);

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    initiateCall: (state, action: PayloadAction<{ conversationId: string; callType: 'audio' | 'video'; participants: CallParticipant[]; callId?: string }>) => {
      // Don't override if this is already an incoming call
      if (state.isIncoming && state.status === 'ringing') {
        console.log('⚠️ Ignoring initiateCall - already have incoming call');
        return;
      }
      state.conversationId = action.payload.conversationId;
      state.callType = action.payload.callType;
      state.participants = action.payload.participants;
      state.status = 'ringing';
      state.isIncoming = false;
      state.videoEnabled = action.payload.callType === 'video';
      if (action.payload.callId) {
        state.callId = action.payload.callId;
      }
    },
    incomingCall: (state, action: PayloadAction<{ callId: string; conversationId: string; callType: 'audio' | 'video'; caller: CallParticipant }>) => {
      console.log('🔔 Redux: incomingCall reducer called with:', action.payload);
      state.callId = action.payload.callId;
      state.conversationId = action.payload.conversationId;
      state.callType = action.payload.callType;
      state.caller = action.payload.caller;
      state.status = 'ringing';
      state.isIncoming = true;
      console.log('🔔 Redux: Call state updated to:', {
        callId: state.callId,
        status: state.status,
        isIncoming: state.isIncoming,
      });
    },
    answerCall: (state, action: PayloadAction<{ callId: string }>) => {
      state.callId = action.payload.callId;
      state.status = 'connecting';
      // Preserve isIncoming flag when answering
      // state.isIncoming should remain true
    },
    callConnected: (state, action: PayloadAction<{ callId: string }>) => {
      state.callId = action.payload.callId;
      state.status = 'active';
      state.connectedAt = Date.now();
      // WebRTC defaults to speaker without InCallManager
      state.speakerEnabled = true;
    },
    rejectCall: (state) => {
      return initialState;
    },
    endCall: (state) => {
      state.status = 'ended';
      // Calculate duration in seconds if call was connected
      if (state.connectedAt) {
        state.duration = Math.floor((Date.now() - state.connectedAt) / 1000);
      }
    },
    resetCall: (state) => {
      return initialState;
    },
    setLocalStream: (state, action: PayloadAction<any>) => {
      state.localStream = action.payload;
    },
    addRemoteStream: (state, action: PayloadAction<{ userId: string; stream: any }>) => {
      state.remoteStreams[action.payload.userId] = action.payload.stream;
    },
    removeRemoteStream: (state, action: PayloadAction<string>) => {
      delete state.remoteStreams[action.payload];
    },
    toggleAudio: (state) => {
      state.audioEnabled = !state.audioEnabled;
    },
    toggleVideo: (state) => {
      state.videoEnabled = !state.videoEnabled;
    },
    toggleSpeaker: (state) => {
      state.speakerEnabled = !state.speakerEnabled;
    },
    participantJoined: (state, action: PayloadAction<CallParticipant>) => {
      state.participants.push(action.payload);
    },
    participantLeft: (state, action: PayloadAction<string>) => {
      state.participants = state.participants.filter(p => p.id !== action.payload);
    },
    updateParticipant: (state, action: PayloadAction<{ userId: string; updates: Partial<CallParticipant> }>) => {
      const participant = state.participants.find(p => p.id === action.payload.userId);
      if (participant) {
        Object.assign(participant, action.payload.updates);
      }
    },
  },
});

export const {
  initiateCall,
  incomingCall,
  answerCall,
  callConnected,
  rejectCall,
  endCall,
  resetCall,
  setLocalStream,
  addRemoteStream,
  removeRemoteStream,
  toggleAudio,
  toggleVideo,
  toggleSpeaker,
  participantJoined,
  participantLeft,
  updateParticipant,
} = callSlice.actions;

export default callSlice.reducer;
