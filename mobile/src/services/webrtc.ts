import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { store } from '../store';
import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, MediaStream, webrtcAvailable } from '../utils/webrtcCompat';
import {
  incomingCall,
  callConnected,
  endCall,
  setLocalStream,
  addRemoteStream,
  removeRemoteStream,
  participantJoined,
  participantLeft,
  updateParticipant,
  initiateCall as initiateCallAction,
} from '../store/slices/callSlice';
import { SOCKET_URL } from '../config/api.config';
import { createCall, updateCall } from '../store/slices/callsHistorySlice';
import { stopOutgoingRingtone, stopIncomingRingtone, resetAudioMode, setSpeakerMode } from './callSounds';
import {
  initializeCallKeep,
  displayIncomingCall,
  endCallKeep,
  setCallKeepCallbacks,
  reportCallConnected,
  isCallKeepAvailable,
  checkForPendingCall,
  clearPendingCall,
  markPendingCallAnswered,
} from './callkeep';

// Safe import of InCallManager - may not be available if native module not linked
let InCallManager: any = null;
try {
  const incallModule = require('react-native-incall-manager');
  InCallManager = incallModule?.default;
  // Verify the module is actually usable (has the start method)
  if (InCallManager && typeof InCallManager.start !== 'function') {
    console.warn('InCallManager module exists but native methods not available');
    InCallManager = null;
  }
} catch (e) {
  console.warn('InCallManager not available:', e);
}

let webrtcSocket: Socket | null = null;
let peerConnections: Map<string, RTCPeerConnection> = new Map();
let iceServers: RTCIceServer[] = [];
let localStreamRef: MediaStream | null = null;
let remoteStreamsRef: Map<string, MediaStream> = new Map();
// Store pending offers to process after call is answered
let pendingOffers: Map<string, { from: string; offer: any }> = new Map();
// Track call record ID for history
let currentCallRecordId: string | null = null;
// Track if InCallManager is started
let isInCallManagerStarted: boolean = false;

// Enhanced audio constraints for HD quality with noise cancellation
const getAudioConstraints = () => ({
  // Enable noise suppression (noise cancellation)
  noiseSuppression: true,
  // Enable echo cancellation
  echoCancellation: true,
  // Enable automatic gain control for consistent volume
  autoGainControl: true,
  // High sample rate for HD audio (48kHz is standard for HD voice)
  sampleRate: 48000,
  // Higher sample size for better audio quality
  sampleSize: 16,
  // Mono channel is sufficient for voice and more bandwidth efficient
  channelCount: 1,
});

// HD video constraints - 720p default, can be adjusted based on network
const getVideoConstraints = (quality: 'hd' | 'fullhd' | 'standard' = 'hd') => {
  const constraints: any = {
    facingMode: 'user',
    // Frame rate for smooth video
    frameRate: { ideal: 30, max: 30 },
  };

  switch (quality) {
    case 'fullhd': // 1080p
      constraints.width = { ideal: 1920, min: 1280 };
      constraints.height = { ideal: 1080, min: 720 };
      break;
    case 'hd': // 720p (default - good balance of quality and bandwidth)
      constraints.width = { ideal: 1280, min: 640 };
      constraints.height = { ideal: 720, min: 480 };
      break;
    case 'standard': // 480p (fallback for poor network)
      constraints.width = { ideal: 640, min: 320 };
      constraints.height = { ideal: 480, min: 240 };
      break;
  }

  return constraints;
};

// Preferred codecs for HD quality
// Opus is the best codec for voice with built-in noise suppression
// VP9 and H.264 provide good video quality with efficient compression
const preferredAudioCodecs = ['opus'];
const preferredVideoCodecs = ['VP9', 'H264', 'VP8'];

// Function to modify SDP to prefer HD codecs and set bitrate
const enhanceSdpForHD = (sdp: string, isVideo: boolean): string => {
  let modifiedSdp = sdp;

  // Set higher audio bitrate for HD voice (up to 128kbps for Opus)
  // Opus default is 32kbps, we increase to 64-128kbps for HD
  if (modifiedSdp.includes('opus')) {
    modifiedSdp = modifiedSdp.replace(
      /a=fmtp:111 /g,
      'a=fmtp:111 maxaveragebitrate=128000;stereo=0;sprop-stereo=0;useinbandfec=1;'
    );
  }

  // Set video bitrate for HD (2-4 Mbps for 720p, 4-8 Mbps for 1080p)
  if (isVideo) {
    // Add bandwidth limit for video - 2500 kbps for HD
    const videoSection = modifiedSdp.match(/m=video[\s\S]*?(?=m=|$)/);
    if (videoSection && !videoSection[0].includes('b=AS:')) {
      modifiedSdp = modifiedSdp.replace(
        /m=video/,
        'm=video\r\nb=AS:2500'
      );
    }
  }

  return modifiedSdp;
};

// Getter functions to access streams
export const getLocalStream = (): MediaStream | null => localStreamRef;
export const getRemoteStreams = (): Record<string, MediaStream> => {
  const streams: Record<string, MediaStream> = {};
  remoteStreamsRef.forEach((stream, userId) => {
    streams[userId] = stream;
  });
  return streams;
};

// Helper function to process WebRTC offer
const processOffer = async (callId: string, from: string, offer: any) => {
  console.log('📥 Processing WebRTC offer from:', from);
  const pc = await createPeerConnection(from);
  const remoteDesc = offer;
  await pc.setRemoteDescription(remoteDesc);
  const answer = await pc.createAnswer();

  // Enhance SDP for HD quality (higher bitrates, better codecs)
  const callType = store.getState().call.callType;
  const enhancedSdp = enhanceSdpForHD(answer.sdp || '', callType === 'video');
  const enhancedAnswer = { ...answer, sdp: enhancedSdp };

  await pc.setLocalDescription(enhancedAnswer);
  console.log('📤 Sending HD-enhanced answer to:', from);

  webrtcSocket?.emit('webrtc:answer', {
    callId,
    targetUserId: from,
    answer: pc.localDescription,
  });
  console.log('📤 Sent WebRTC answer to:', from);
};

// Process pending offers after call is answered
export const processPendingOffers = async (callId: string) => {
  const pendingOffer = pendingOffers.get(callId);
  if (pendingOffer) {
    console.log('📞 Processing pending offer for call:', callId);
    await processOffer(callId, pendingOffer.from, pendingOffer.offer);
    pendingOffers.delete(callId);
  }
};

export const initializeWebRTC = async () => {
  const state = store.getState();
  const token = state.auth.accessToken;

  console.log('🎥 Initializing WebRTC socket...');
  console.log('📍 WebRTC Socket URL:', SOCKET_URL);
  console.log('🔑 Token exists:', !!token);
  console.log('🔗 Already connected:', !!webrtcSocket?.connected);

  if (!token) {
    console.log('⚠️ No token, skipping WebRTC initialization');
    return;
  }

  // Initialize CallKeep for native call UI (Android ConnectionService / iOS CallKit)
  if (Platform.OS !== 'web') {
    try {
      await initializeCallKeep();

      // Set up CallKeep callbacks for answer/reject from native UI
      setCallKeepCallbacks(
        // onAnswer callback - user answered from native call UI
        (callId: string) => {
          console.log('📞 CallKeep: User answered call from native UI:', callId);
          answerCall(callId).catch(err => {
            console.error('Failed to answer call from CallKeep:', err);
          });
        },
        // onReject callback - user rejected from native call UI
        (callId: string) => {
          console.log('📞 CallKeep: User rejected call from native UI:', callId);
          rejectCall(callId);
        }
      );
      console.log('✅ CallKeep initialized with callbacks');
    } catch (error) {
      console.warn('⚠️ CallKeep initialization failed:', error);
    }
  }

  if (webrtcSocket?.connected) {
    console.log('✅ WebRTC socket already connected');
    return;
  }

  webrtcSocket = io(`${SOCKET_URL}/webrtc`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    reconnectionAttempts: 10,
    timeout: 10000,
    forceNew: false,
    upgrade: false,
  });

  webrtcSocket.on('connect', () => {
    console.log('Connected to WebRTC socket');
  });

  webrtcSocket.on('disconnect', () => {
    console.log('Disconnected from WebRTC socket');
  });

  webrtcSocket.on('call:incoming', async (data) => {
    console.log('📞 Incoming call received!', data);
    try {
      console.log('Dispatching incomingCall action with:', {
        callId: data.callId,
        conversationId: data.conversationId,
        callType: data.callType,
        from: data.from,
      });

      // Try to use CallKeep for native incoming call UI (works even when app is killed)
      if (isCallKeepAvailable() && Platform.OS !== 'web') {
        console.log('📞 Using CallKeep for incoming call');
        displayIncomingCall(
          data.callId,
          data.from.displayName || 'Unknown Caller',
          data.callType,
          data.conversationId,
        );
      }

      // Also dispatch to Redux for app-based UI
      store.dispatch(incomingCall({
        callId: data.callId,
        conversationId: data.conversationId,
        callType: data.callType,
        caller: {
          id: data.from.id,
          displayName: data.from.displayName,
          avatar: data.from.avatar,
          audioEnabled: true,
          videoEnabled: data.callType === 'video',
        },
      }));

      console.log('✅ incomingCall action dispatched successfully');
    } catch (error) {
      console.error('❌ Error handling incoming call:', error);
    }
  });

  webrtcSocket.on('call:participant:joined', ({ userId }) => {
    // Participant joined, we'll receive an offer from them
  });

  webrtcSocket.on('call:rejected', ({ callId, userId }) => {
    const currentCallId = store.getState().call.callId;
    console.log('📞 Call rejected event received:', { callId, userId, currentCallId });

    // Only cleanup if this is the current active call
    if (callId === currentCallId) {
      console.log('✅ Call rejected - cleaning up current call');
      pendingOffers.delete(callId);

      // End CallKeep call UI if active
      if (Platform.OS !== 'web' && callId) {
        endCallKeep(callId);
      }

      cleanupCall();
      store.dispatch(endCall());
    } else {
      console.log('⚠️ Call rejected event for different call - ignoring');
    }
  });

  webrtcSocket.on('call:ended', ({ callId, endedBy }) => {
    const callState = store.getState().call;
    const { callId: currentCallId, status: callStatus, isIncoming } = callState;
    console.log('📞 Call ended event received:', { callId, endedBy, currentCallId, callStatus, isIncoming });

    // End call if:
    // 1. The callId matches the current call, OR
    // 2. We're in ringing state with an incoming call (caller hung up before we answered)
    const shouldEndCall = callId === currentCallId ||
                          (callStatus === 'ringing' && isIncoming);

    if (shouldEndCall) {
      console.log('✅ Call ended - cleaning up call');
      pendingOffers.delete(callId);
      pendingOffers.delete(currentCallId || '');

      // End CallKeep call UI if active
      if (Platform.OS !== 'web' && callId) {
        endCallKeep(callId);
      }

      cleanupCall();
      store.dispatch(endCall());
    } else {
      console.log('⚠️ Call ended event for different call - ignoring', {
        eventCallId: callId,
        currentCallId,
        callStatus
      });
    }
  });

  webrtcSocket.on('webrtc:offer', async ({ callId, from, offer }) => {
    try {
      console.log('📥 Received WebRTC offer from:', from);
      const callState = store.getState().call;

      // Check if this is an incoming call that hasn't been answered yet
      if (callState.status === 'ringing' && callState.isIncoming) {
        console.log('📞 Call is still ringing - storing offer for later processing');
        pendingOffers.set(callId, { from, offer });
        return;
      }

      // Process offer immediately if call is already answered/connecting
      await processOffer(callId, from, offer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  });

  webrtcSocket.on('webrtc:answer', async ({ from, answer }) => {
    try {
      console.log('📥 Received WebRTC answer from:', from);
      const pc = peerConnections.get(from);
      if (pc) {
        // Create RTCSessionDescription if the class is available, otherwise pass plain object
        // Always pass plain object - react-native-webrtc handles this internally
        const remoteDesc = answer;

        await pc.setRemoteDescription(remoteDesc);
        console.log('✅ Remote description set successfully');
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  });

  webrtcSocket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
    try {
      const pc = peerConnections.get(from);
      if (pc && candidate) {
        // Create RTCIceCandidate if the class is available, otherwise pass plain object
        // Always pass plain object - react-native-webrtc handles this internally
        const iceCandidate = candidate;

        await pc.addIceCandidate(iceCandidate);
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  });

  webrtcSocket.on('call:participant:audio-toggled', ({ userId, enabled }) => {
    store.dispatch(updateParticipant({
      userId,
      updates: { audioEnabled: enabled },
    }));
  });

  webrtcSocket.on('call:participant:video-toggled', ({ userId, enabled }) => {
    store.dispatch(updateParticipant({
      userId,
      updates: { videoEnabled: enabled },
    }));
  });

  // Check for pending calls from background handler (when app was killed/closed)
  await handlePendingCallFromBackground();

  return webrtcSocket;
};

/**
 * Handle pending call from background handler
 * This is called when the app launches after user answered a call from native UI
 * while the app was killed/closed
 */
export const handlePendingCallFromBackground = async (): Promise<void> => {
  try {
    const pendingCall = await checkForPendingCall();

    if (!pendingCall) {
      console.log('📞 No pending call from background');
      return;
    }

    console.log('📞 Found pending call from background handler:', pendingCall);

    // Dispatch incoming call to Redux so the UI shows the call screen
    store.dispatch(incomingCall({
      callId: pendingCall.callId,
      conversationId: pendingCall.conversationId,
      callType: pendingCall.callType,
      caller: {
        id: 'unknown', // Will be filled when socket connects
        displayName: pendingCall.callerName,
        audioEnabled: true,
        videoEnabled: pendingCall.callType === 'video',
      },
    }));

    // If the call was already answered from native UI, auto-answer it
    if (pendingCall.status === 'answered') {
      console.log('📞 Pending call was already answered from native UI, auto-answering...');
      try {
        await answerCall(pendingCall.callId);
        await markPendingCallAnswered(pendingCall.callId);
        console.log('✅ Successfully auto-answered pending call');
      } catch (error) {
        console.error('❌ Failed to auto-answer pending call:', error);
        // Clear the pending call to prevent repeated attempts
        await clearPendingCall();
      }
    } else {
      console.log('📞 Pending call is still ringing, showing incoming call UI');
      // The user will see the incoming call screen and can answer/reject
    }
  } catch (error) {
    console.error('❌ Error handling pending call from background:', error);
  }
};

const createPeerConnection = async (userId: string): Promise<RTCPeerConnection> => {
  const pc = new RTCPeerConnection({ iceServers });

  if (localStreamRef) {
    localStreamRef.getTracks().forEach((track: any) => {
      pc.addTrack(track, localStreamRef);
    });
  }

  pc.onicecandidate = (event) => {
    if (event.candidate && webrtcSocket) {
      const callId = store.getState().call.callId;
      webrtcSocket.emit('webrtc:ice-candidate', {
        callId,
        targetUserId: userId,
        candidate: event.candidate,
      });
    }
  };

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      remoteStreamsRef.set(userId, event.streams[0]);
      store.dispatch(addRemoteStream({
        userId,
        stream: event.streams[0],
      }));
    }
  };

  pc.onconnectionstatechange = async () => {
    if (pc.connectionState === 'connected') {
      const callId = store.getState().call.callId;
      if (callId) {
        // Stop ringtones first and wait for them to complete
        await stopOutgoingRingtone();
        await stopIncomingRingtone();

        // Report call connected to CallKeep for call logs and audio routing
        if (Platform.OS !== 'web') {
          reportCallConnected(callId);
        }

        // Set speaker mode for call audio (speaker ON by default)
        // Only use InCallManager if available - don't use expo-av as it interferes with WebRTC audio
        if (InCallManager) {
          try {
            InCallManager.start({ media: 'audio' });
            InCallManager.setForceSpeakerphoneOn(true); // Speaker ON by default
            isInCallManagerStarted = true;
            console.log('🔊 InCallManager started with speaker ON');
          } catch (e) {
            console.warn('InCallManager.start failed (native module not linked):', e);
          }
        }
        // Note: Without InCallManager, WebRTC will use its default audio routing (usually speaker)
        store.dispatch(callConnected({ callId }));
      }
    } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      remoteStreamsRef.delete(userId);
      store.dispatch(removeRemoteStream(userId));
    }
  };

  peerConnections.set(userId, pc);
  return pc;
};

export const isWebRTCAvailable = (): boolean => webrtcAvailable;

export const initiateCall = async (
  conversationId: string,
  participants: string[],
  callType: 'audio' | 'video'
): Promise<void> => {
  if (!webrtcAvailable) {
    throw new Error('WebRTC is not available in Expo Go. Please use a development build for video/audio calls.');
  }
  try {
    // Use enhanced constraints for HD audio with noise cancellation and HD video
    const mediaConstraints = {
      audio: getAudioConstraints(),
      video: callType === 'video' ? getVideoConstraints('hd') : false,
    };
    console.log('📹 Requesting media with HD constraints:', JSON.stringify(mediaConstraints, null, 2));

    const stream = await mediaDevices.getUserMedia(mediaConstraints);

    localStreamRef = stream;
    store.dispatch(setLocalStream(stream));

    return new Promise((resolve, reject) => {
      if (!webrtcSocket) {
        reject(new Error('WebRTC socket not connected'));
        return;
      }

      webrtcSocket.emit(
        'call:initiate',
        { conversationId, participants, callType },
        async (response: any) => {
          if (response.success) {
            iceServers = response.iceServers;

            // Update Redux with the callId from backend
            store.dispatch(initiateCallAction({
              conversationId,
              callType,
              participants: participants.map(id => ({
                id,
                displayName: 'User',
                avatar: null,
                audioEnabled: true,
                videoEnabled: callType === 'video',
              })),
              callId: response.callId,
            }));

            // Create call record in history
            currentCallRecordId = response.callId;
            try {
              await store.dispatch(createCall({
                conversationId,
                type: callType,
                participantIds: participants,
              }));
              console.log('📞 Call record created:', response.callId);
            } catch (err) {
              console.error('Failed to create call record:', err);
            }

            for (const participantId of participants) {
              const pc = await createPeerConnection(participantId);
              const offer = await pc.createOffer();

              // Enhance SDP for HD quality (higher bitrates, better codecs)
              const enhancedSdp = enhanceSdpForHD(offer.sdp || '', callType === 'video');
              const enhancedOffer = { ...offer, sdp: enhancedSdp };

              await pc.setLocalDescription(enhancedOffer);
              console.log('📤 Sending HD-enhanced offer to:', participantId);

              webrtcSocket?.emit('webrtc:offer', {
                callId: response.callId,
                targetUserId: participantId,
                offer: pc.localDescription,
              });
            }

            resolve();
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    throw error;
  }
};

export const answerCall = async (callId: string): Promise<void> => {
  if (!webrtcAvailable) {
    throw new Error('WebRTC is not available in Expo Go. Please use a development build for video/audio calls.');
  }
  try {
    const callType = store.getState().call.callType;
    // Use enhanced constraints for HD audio with noise cancellation and HD video
    const mediaConstraints = {
      audio: getAudioConstraints(),
      video: callType === 'video' ? getVideoConstraints('hd') : false,
    };
    console.log('📹 Answering call with HD constraints:', JSON.stringify(mediaConstraints, null, 2));

    const stream = await mediaDevices.getUserMedia(mediaConstraints);

    localStreamRef = stream;
    store.dispatch(setLocalStream(stream));

    return new Promise((resolve, reject) => {
      if (!webrtcSocket) {
        reject(new Error('WebRTC socket not connected'));
        return;
      }

      webrtcSocket.emit('call:answer', { callId }, async (response: any) => {
        if (response.success) {
          iceServers = response.iceServers;

          // Track call record ID for history updates
          currentCallRecordId = callId;

          // Clear pending call data since we've successfully answered
          await clearPendingCall();

          // Process any pending offers now that call is answered
          await processPendingOffers(callId);

          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  } catch (error) {
    console.error('Error answering call:', error);
    throw error;
  }
};

export const rejectCall = async (callId: string): Promise<void> => {
  console.log('📞 Rejecting call:', callId);

  // Clear any pending offers for this call
  pendingOffers.delete(callId);

  // Clear pending call data from background handler
  await clearPendingCall();

  // End CallKeep call UI
  if (Platform.OS !== 'web') {
    endCallKeep(callId);
  }

  if (webrtcSocket) {
    webrtcSocket.emit('call:reject', { callId });
  }

  // Save call record as rejected
  saveCallRecord('rejected');

  // Cleanup and dispatch after short delay to ensure socket event is sent
  setTimeout(() => {
    cleanupCall();
    store.dispatch(endCall());
  }, 100);
};

export const endCallWebRTC = (): void => {
  const callId = store.getState().call.callId;
  console.log('📞 Ending call:', callId);

  // Clear any pending offers
  if (callId) {
    pendingOffers.delete(callId);

    // End CallKeep call UI
    if (Platform.OS !== 'web') {
      endCallKeep(callId);
    }
  }

  if (webrtcSocket && callId) {
    webrtcSocket.emit('call:end', { callId });
  }

  // Save call record as completed
  saveCallRecord('completed');

  // Cleanup and dispatch after short delay to ensure socket event is sent
  setTimeout(() => {
    cleanupCall();
    store.dispatch(endCall());
  }, 100);
};

export const toggleAudioWebRTC = (enabled: boolean): void => {
  const callId = store.getState().call.callId;

  if (localStreamRef) {
    localStreamRef.getAudioTracks().forEach((track: any) => {
      track.enabled = enabled;
    });
  }

  if (webrtcSocket && callId) {
    webrtcSocket.emit('call:toggle-audio', { callId, enabled });
  }
};

export const toggleVideoWebRTC = (enabled: boolean): void => {
  const callId = store.getState().call.callId;

  if (localStreamRef) {
    localStreamRef.getVideoTracks().forEach((track: any) => {
      track.enabled = enabled;
    });
  }

  if (webrtcSocket && callId) {
    webrtcSocket.emit('call:toggle-video', { callId, enabled });
  }
};

// Save call record to history with duration
const saveCallRecord = async (status: 'completed' | 'missed' | 'rejected') => {
  const callState = store.getState().call;
  const callId = callState.callId || currentCallRecordId;

  if (!callId) {
    console.log('📞 No call ID to save record');
    return;
  }

  const duration = callState.duration || 0;

  try {
    await store.dispatch(updateCall({
      callId,
      data: { status, duration },
    }));
    console.log('📞 Call record updated:', { callId, status, duration });
  } catch (err) {
    console.error('Failed to update call record:', err);
  }

  currentCallRecordId = null;
};

const cleanupCall = () => {
  console.log('🧹 Cleaning up call resources');

  // Stop any playing ringtones first
  stopOutgoingRingtone();
  stopIncomingRingtone();

  // Stop InCallManager only if it was started
  if (isInCallManagerStarted && InCallManager) {
    try {
      InCallManager.stop();
    } catch (e) {
      console.warn('InCallManager.stop failed:', e);
    }
    isInCallManagerStarted = false;
  }

  // Clear pending offers
  pendingOffers.clear();

  // Stop all local tracks
  if (localStreamRef) {
    try {
      localStreamRef.getTracks().forEach((track: any) => {
        console.log('🛑 Stopping track:', track.kind);
        track.stop();
      });
      localStreamRef = null;
    } catch (error) {
      console.error('Error stopping local tracks:', error);
    }
  }

  // Close all peer connections
  try {
    peerConnections.forEach((pc, userId) => {
      console.log('🔌 Closing peer connection for user:', userId);
      pc.close();
    });
    peerConnections.clear();
  } catch (error) {
    console.error('Error closing peer connections:', error);
  }

  // Clear remote streams
  remoteStreamsRef.clear();

  // Clear Redux streams
  store.dispatch(setLocalStream(null));

  console.log('✅ Call cleanup complete');
};

export const disconnectWebRTC = () => {
  cleanupCall();
  if (webrtcSocket) {
    webrtcSocket.disconnect();
    webrtcSocket = null;
  }
};

export { webrtcSocket };
