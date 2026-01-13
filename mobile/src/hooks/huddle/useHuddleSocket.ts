/**
 * useHuddleSocket Hook
 * Manages Socket.IO connection to /huddle namespace for WebRTC signaling
 * Pattern: Custom Hook with useEffect for lifecycle management
 */

import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../../config/api.config';
import { RootState } from '../../store';
import {
  setActiveHuddle,
  addParticipantToHuddle,
  removeParticipantFromHuddle,
  updateParticipantInHuddle,
} from '../../store/slices/huddleSlice';

interface UseHuddleSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendOffer: (to: string, offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (to: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (to: string, candidate: RTCIceCandidateInit) => void;
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

interface ParticipantJoinedPayload {
  userId: string;
  timestamp: Date;
}

interface ParticipantLeftPayload {
  userId: string;
  timestamp: Date;
}

interface WebRTCOfferPayload {
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
}

interface WebRTCAnswerPayload {
  from: string;
  to: string;
  answer: RTCSessionDescriptionInit;
}

interface ICECandidatePayload {
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
}

interface AudioTogglePayload {
  userId: string;
  enabled: boolean;
  timestamp: Date;
}

interface VideoTogglePayload {
  userId: string;
  enabled: boolean;
  timestamp: Date;
}

export const useHuddleSocket = (
  roomId: string | null,
  onOffer?: (data: WebRTCOfferPayload) => void,
  onAnswer?: (data: WebRTCAnswerPayload) => void,
  onIceCandidate?: (data: ICECandidatePayload) => void,
): UseHuddleSocketReturn => {
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  /**
   * Handle participant joined event
   */
  const handleParticipantJoined = useCallback(
    (data: ParticipantJoinedPayload) => {
      console.log('[Huddle Socket] Participant joined:', data);
      // Add participant to Redux state
      dispatch(
        addParticipantToHuddle({
          userId: {
            _id: data.userId,
            displayName: '',
            phoneNumber: '',
          },
          joinedAt: new Date(data.timestamp).toISOString(),
          isAudioEnabled: true,
          isVideoEnabled: false,
          isMuted: false,
        }),
      );
    },
    [dispatch],
  );

  /**
   * Handle participant left event
   */
  const handleParticipantLeft = useCallback(
    (data: ParticipantLeftPayload) => {
      console.log('[Huddle Socket] Participant left:', data);
      dispatch(removeParticipantFromHuddle(data.userId));
    },
    [dispatch],
  );

  /**
   * Handle audio toggle event
   */
  const handleAudioToggle = useCallback(
    (data: AudioTogglePayload) => {
      console.log('[Huddle Socket] Audio toggled:', data);
      dispatch(
        updateParticipantInHuddle({
          userId: data.userId,
          updates: { isAudioEnabled: data.enabled },
        }),
      );
    },
    [dispatch],
  );

  /**
   * Handle video toggle event
   */
  const handleVideoToggle = useCallback(
    (data: VideoTogglePayload) => {
      console.log('[Huddle Socket] Video toggled:', data);
      dispatch(
        updateParticipantInHuddle({
          userId: data.userId,
          updates: { isVideoEnabled: data.enabled },
        }),
      );
    },
    [dispatch],
  );

  /**
   * Initialize Socket.IO connection
   */
  useEffect(() => {
    if (!roomId || !accessToken) {
      return;
    }

    console.log('[Huddle Socket] Connecting to /huddle namespace...');

    // Create socket connection
    const socket = io(`${SOCKET_URL}/huddle`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[Huddle Socket] Connected');
      isConnectedRef.current = true;

      // Auto-join room on connection
      if (roomId) {
        socket.emit('join-room', { roomId });
      }
    });

    socket.on('disconnect', () => {
      console.log('[Huddle Socket] Disconnected');
      isConnectedRef.current = false;
    });

    socket.on('connect_error', (error) => {
      console.error('[Huddle Socket] Connection error:', error.message);
    });

    socket.on('room-joined', (data) => {
      console.log('[Huddle Socket] Room joined:', data);
    });

    socket.on('room-left', (data) => {
      console.log('[Huddle Socket] Room left:', data);
    });

    // Participant events
    socket.on('participant-joined', handleParticipantJoined);
    socket.on('participant-left', handleParticipantLeft);
    socket.on('participant-audio-toggled', handleAudioToggle);
    socket.on('participant-video-toggled', handleVideoToggle);

    // WebRTC signaling events
    if (onOffer) {
      socket.on('webrtc-offer', onOffer);
    }

    if (onAnswer) {
      socket.on('webrtc-answer', onAnswer);
    }

    if (onIceCandidate) {
      socket.on('ice-candidate', onIceCandidate);
    }

    // Cleanup
    return () => {
      console.log('[Huddle Socket] Cleaning up...');
      if (roomId) {
        socket.emit('leave-room', { roomId });
      }
      socket.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    };
  }, [
    roomId,
    accessToken,
    handleParticipantJoined,
    handleParticipantLeft,
    handleAudioToggle,
    handleVideoToggle,
    onOffer,
    onAnswer,
    onIceCandidate,
  ]);

  /**
   * Send WebRTC offer to peer
   */
  const sendOffer = useCallback(
    (to: string, offer: RTCSessionDescriptionInit) => {
      if (socketRef.current && roomId) {
        console.log('[Huddle Socket] Sending offer to:', to);
        socketRef.current.emit('webrtc-offer', { to, offer, roomId });
      }
    },
    [roomId],
  );

  /**
   * Send WebRTC answer to peer
   */
  const sendAnswer = useCallback(
    (to: string, answer: RTCSessionDescriptionInit) => {
      if (socketRef.current && roomId) {
        console.log('[Huddle Socket] Sending answer to:', to);
        socketRef.current.emit('webrtc-answer', { to, answer, roomId });
      }
    },
    [roomId],
  );

  /**
   * Send ICE candidate to peer
   */
  const sendIceCandidate = useCallback(
    (to: string, candidate: RTCIceCandidateInit) => {
      if (socketRef.current && roomId) {
        socketRef.current.emit('ice-candidate', { to, candidate, roomId });
      }
    },
    [roomId],
  );

  /**
   * Toggle audio state
   */
  const toggleAudio = useCallback(
    (enabled: boolean) => {
      if (socketRef.current && roomId) {
        console.log('[Huddle Socket] Toggling audio:', enabled);
        socketRef.current.emit('toggle-audio', { roomId, enabled });
      }
    },
    [roomId],
  );

  /**
   * Toggle video state
   */
  const toggleVideo = useCallback(
    (enabled: boolean) => {
      if (socketRef.current && roomId) {
        console.log('[Huddle Socket] Toggling video:', enabled);
        socketRef.current.emit('toggle-video', { roomId, enabled });
      }
    },
    [roomId],
  );

  /**
   * Join a room
   */
  const joinRoom = useCallback((roomId: string) => {
    if (socketRef.current) {
      console.log('[Huddle Socket] Joining room:', roomId);
      socketRef.current.emit('join-room', { roomId });
    }
  }, []);

  /**
   * Leave a room
   */
  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current) {
      console.log('[Huddle Socket] Leaving room:', roomId);
      socketRef.current.emit('leave-room', { roomId });
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    toggleAudio,
    toggleVideo,
    joinRoom,
    leaveRoom,
  };
};
