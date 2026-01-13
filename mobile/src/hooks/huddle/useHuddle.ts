/**
 * useHuddle Hook
 * Main hook combining Socket.IO, WebRTC, and Redux for huddle functionality
 * Pattern: Facade pattern - provides unified interface
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  createHuddle,
  joinHuddle as joinHuddleAction,
  leaveHuddle as leaveHuddleAction,
  updateParticipant,
  toggleLocalAudio,
  toggleLocalVideo,
  toggleLocalMute,
  resetHuddleState,
  HuddleType,
} from '../../store/slices/huddleSlice';
import { useHuddleSocket } from './useHuddleSocket';
import { useWebRTC } from './useWebRTC';
import { MediaStream } from '../../utils/webrtcCompat';

export interface UseHuddleReturn {
  // State
  activeHuddle: any | null;
  isInCall: boolean;
  loading: boolean;
  error: string | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  localMuted: boolean;

  // Actions
  startHuddle: (type: HuddleType, chatId?: string) => Promise<void>;
  joinHuddle: (roomId: string, isVideo?: boolean) => Promise<void>;
  leaveHuddle: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleMute: () => void;
}

export const useHuddle = (): UseHuddleReturn => {
  const dispatch = useDispatch<AppDispatch>();

  const {
    activeHuddle,
    isInCall,
    loading,
    error,
    localAudioEnabled,
    localVideoEnabled,
    localMuted,
  } = useSelector((state: RootState) => state.huddle);

  const roomId = activeHuddle?.roomId || null;

  // Use refs to break circular dependency between socket and callbacks
  const socketRef = useRef<ReturnType<typeof useHuddleSocket> | null>(null);

  /**
   * WebRTC callbacks - use ref to access socket
   */
  const handleIceCandidate = useCallback(
    (userId: string, candidate: RTCIceCandidateInit) => {
      console.log('[Huddle] Sending ICE candidate to:', userId);
      socketRef.current?.sendIceCandidate(userId, candidate);
    },
    [],
  );

  // Initialize WebRTC
  const webrtc = useWebRTC(handleIceCandidate);

  /**
   * Socket.IO callbacks - use ref to access socket
   */
  const handleOffer = useCallback(
    async (data: { from: string; to: string; offer: RTCSessionDescriptionInit }) => {
      console.log('[Huddle] Received offer from:', data.from);
      try {
        const answer = await webrtc.handleOffer(data.from, data.offer);
        socketRef.current?.sendAnswer(data.from, answer);
      } catch (error) {
        console.error('[Huddle] Error handling offer:', error);
      }
    },
    [webrtc],
  );

  const handleAnswer = useCallback(
    async (data: { from: string; to: string; answer: RTCSessionDescriptionInit }) => {
      console.log('[Huddle] Received answer from:', data.from);
      try {
        await webrtc.handleAnswer(data.from, data.answer);
      } catch (error) {
        console.error('[Huddle] Error handling answer:', error);
      }
    },
    [webrtc],
  );

  const handleRemoteIceCandidate = useCallback(
    async (data: { from: string; to: string; candidate: RTCIceCandidateInit }) => {
      console.log('[Huddle] Received ICE candidate from:', data.from);
      try {
        await webrtc.handleIceCandidate(data.from, data.candidate);
      } catch (error) {
        console.error('[Huddle] Error handling ICE candidate:', error);
      }
    },
    [webrtc],
  );

  // Initialize Socket.IO
  const socket = useHuddleSocket(roomId, handleOffer, handleAnswer, handleRemoteIceCandidate);

  // Keep ref updated with latest socket
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  /**
   * Start a new huddle
   */
  const startHuddle = useCallback(
    async (type: HuddleType, chatId?: string) => {
      try {
        console.log('[Huddle] Starting huddle, type:', type, 'chatId:', chatId);

        // Get local media stream
        const isVideo = type === HuddleType.VIDEO;
        console.log('[Huddle] Getting local stream, isVideo:', isVideo);
        await webrtc.getLocalStream(isVideo);
        console.log('[Huddle] Local stream obtained');

        // Create huddle via API
        console.log('[Huddle] Creating huddle via API with data:', { type, chatId, isVideoEnabled: isVideo });
        const result = await dispatch(
          createHuddle({ type, chatId, isVideoEnabled: isVideo }),
        ).unwrap();

        console.log('[Huddle] Huddle created:', result.roomId);
      } catch (error: any) {
        console.error('[Huddle] Error starting huddle:', error);
        console.error('[Huddle] Error details:', error?.message, error?.response?.data);
        webrtc.stopLocalStream();
        throw error;
      }
    },
    [dispatch, webrtc],
  );

  /**
   * Join an existing huddle
   */
  const joinHuddle = useCallback(
    async (roomId: string, isVideo: boolean = false) => {
      try {
        console.log('[Huddle] Joining huddle:', roomId);

        // Get local media stream
        await webrtc.getLocalStream(isVideo);

        // Join huddle via API
        const result = await dispatch(
          joinHuddleAction({ roomId, isVideoEnabled: isVideo }),
        ).unwrap();

        console.log('[Huddle] Joined huddle:', result.roomId);

        // Get list of participants and initiate WebRTC connections
        if (result.participants && result.participants.length > 0) {
          for (const participant of result.participants) {
            const participantId = participant.userId._id;
            // Don't create connection to yourself
            if (participantId !== result.participants.find((p: any) => p.userId._id)?.userId._id) {
              console.log('[Huddle] Creating offer for participant:', participantId);
              const offer = await webrtc.createOffer(participantId);
              socketRef.current?.sendOffer(participantId, offer);
            }
          }
        }
      } catch (error) {
        console.error('[Huddle] Error joining huddle:', error);
        webrtc.stopLocalStream();
        throw error;
      }
    },
    [dispatch, webrtc],
  );

  /**
   * Leave the current huddle
   */
  const leaveHuddle = useCallback(async () => {
    try {
      if (activeHuddle) {
        console.log('[Huddle] Leaving huddle:', activeHuddle.roomId);

        // Leave huddle via API
        await dispatch(leaveHuddleAction(activeHuddle.roomId)).unwrap();

        // Stop media streams
        webrtc.stopLocalStream();

        // Close all peer connections
        webrtc.closeAllConnections();

        // Reset state
        dispatch(resetHuddleState());

        console.log('[Huddle] Left huddle successfully');
      }
    } catch (error) {
      console.error('[Huddle] Error leaving huddle:', error);
      // Force cleanup even on error
      webrtc.stopLocalStream();
      webrtc.closeAllConnections();
      dispatch(resetHuddleState());
    }
  }, [activeHuddle, dispatch, webrtc]);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(() => {
    console.log('[Huddle] Toggling audio');
    webrtc.toggleAudio();
    dispatch(toggleLocalAudio());

    // Notify other participants via socket
    if (roomId) {
      socketRef.current?.toggleAudio(!localAudioEnabled);

      // Also update participant state in backend
      dispatch(
        updateParticipant({
          roomId,
          isAudioEnabled: !localAudioEnabled,
        }),
      );
    }
  }, [dispatch, webrtc, roomId, localAudioEnabled]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    console.log('[Huddle] Toggling video');
    webrtc.toggleVideo();
    dispatch(toggleLocalVideo());

    // Notify other participants via socket
    if (roomId) {
      socketRef.current?.toggleVideo(!localVideoEnabled);

      // Also update participant state in backend
      dispatch(
        updateParticipant({
          roomId,
          isVideoEnabled: !localVideoEnabled,
        }),
      );
    }
  }, [dispatch, webrtc, roomId, localVideoEnabled]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    console.log('[Huddle] Toggling mute');
    dispatch(toggleLocalMute());

    // Update participant state in backend
    if (roomId) {
      dispatch(
        updateParticipant({
          roomId,
          isMuted: !localMuted,
        }),
      );
    }
  }, [dispatch, roomId, localMuted]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('[Huddle] Cleaning up useHuddle');
      webrtc.stopLocalStream();
      webrtc.closeAllConnections();
    };
  }, [webrtc]);

  return {
    // State
    activeHuddle,
    isInCall,
    loading,
    error,
    localStream: webrtc.localStream,
    remoteStreams: webrtc.remoteStreams,
    localAudioEnabled,
    localVideoEnabled,
    localMuted,

    // Actions
    startHuddle,
    joinHuddle,
    leaveHuddle,
    toggleAudio,
    toggleVideo,
    toggleMute,
  };
};
