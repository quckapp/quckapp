/**
 * Huddle Hook
 * Custom hook for managing huddle calls with auto-connect feature
 * First call: rings, Second call onwards: auto-connect
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  createHuddle,
  joinHuddle,
  leaveHuddle as leaveHuddleAction,
  updateParticipant,
  setLocalAudio,
  setLocalVideo,
  setLocalMute,
  forceLeaveAllHuddles,
  HuddleType,
} from '../store/slices/huddleSlice';

// Using any for MediaStream to avoid import issues
type MediaStreamType = any;

export interface UseHuddleReturn {
  // State
  activeHuddle: any;
  isInCall: boolean;
  localStream: MediaStreamType | null;
  remoteStreams: Map<string, MediaStreamType>;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  localMuted: boolean;
  isConnecting: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  startHuddle: (chatId: string, type: HuddleType) => Promise<void>;
  joinExistingHuddle: (roomId: string) => Promise<void>;
  leaveHuddle: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleMute: () => void;

  // Auto-connect tracking
  hasRungBefore: (chatId: string) => boolean;
  shouldAutoConnect: (chatId: string) => boolean;
}

export const useHuddle = (): UseHuddleReturn => {
  const dispatch = useDispatch<AppDispatch>();

  const { activeHuddle, isInCall, localAudioEnabled, localVideoEnabled, localMuted, loading, error } = useSelector(
    (state: RootState) => state.huddle
  );

  const [localStream, setLocalStream] = useState<MediaStreamType | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStreamType>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);

  // Track which chats have been called before (for auto-connect logic)
  const [callHistory, setCallHistory] = useState<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStreamType | null>(null);

  /**
   * Check if this chat has been called before
   */
  const hasRungBefore = useCallback((chatId: string): boolean => {
    return callHistory.has(chatId);
  }, [callHistory]);

  /**
   * Determine if should auto-connect (skip ring)
   */
  const shouldAutoConnect = useCallback((chatId: string): boolean => {
    return callHistory.has(chatId);
  }, [callHistory]);

  /**
   * Start a new huddle
   * If user is already in a huddle, auto-clear and retry once
   */
  const startHuddle = useCallback(async (chatId: string, type: HuddleType) => {
    try {
      setIsConnecting(true);

      // Check if should auto-connect (after second call)
      const autoConnect = callHistory.has(chatId);

      // Mark this chat as having been called
      setCallHistory(prev => new Set(prev).add(chatId));

      await dispatch(createHuddle({
        type,
        chatId,
        isVideoEnabled: type === HuddleType.VIDEO,
      })).unwrap();

    } catch (error: any) {
      console.error('Failed to start huddle:', error);

      // If user is already in a huddle, try force leave and retry once
      const errorMessage = typeof error === 'string' ? error : error?.message || '';
      if (errorMessage.includes('already in an active huddle')) {
        console.log('[Huddle] User in stuck huddle, attempting force leave...');
        try {
          await dispatch(forceLeaveAllHuddles()).unwrap();
          // Retry creating the huddle
          await dispatch(createHuddle({
            type,
            chatId,
            isVideoEnabled: type === HuddleType.VIDEO,
          })).unwrap();
          console.log('[Huddle] Successfully created huddle after force leave');
        } catch (retryError: any) {
          const retryErrorMsg = typeof retryError === 'string' ? retryError : retryError?.message || '';
          // If force-leave endpoint doesn't exist (backend not updated), show original error
          if (retryErrorMsg.includes('Cannot POST') || retryErrorMsg.includes('404')) {
            console.error('[Huddle] Force-leave endpoint not available, backend needs update');
            throw new Error('You have a stuck huddle session. Please ask admin to redeploy backend or wait.');
          }
          console.error('[Huddle] Failed to create huddle after force leave:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    } finally {
      setIsConnecting(false);
    }
  }, [dispatch, callHistory]);

  /**
   * Join an existing huddle
   */
  const joinExistingHuddle = useCallback(async (roomId: string) => {
    try {
      setIsConnecting(true);

      await dispatch(joinHuddle({
        roomId,
        isVideoEnabled: false,
      })).unwrap();

    } catch (error) {
      console.error('Failed to join huddle:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [dispatch]);

  /**
   * Leave huddle (only affects current user, others stay connected)
   */
  const leaveHuddle = useCallback(async () => {
    if (!activeHuddle) return;

    try {
      // Stop local media
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }

      // Clear remote streams
      remoteStreams.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      setRemoteStreams(new Map());

      // Leave the huddle (server-side, doesn't end call for others)
      await dispatch(leaveHuddleAction(activeHuddle.roomId)).unwrap();

    } catch (error) {
      console.error('Failed to leave huddle:', error);
    }
  }, [activeHuddle, dispatch, remoteStreams]);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      dispatch(setLocalAudio(audioTrack.enabled));

      // Update on server
      if (activeHuddle) {
        dispatch(updateParticipant({
          roomId: activeHuddle.roomId,
          isAudioEnabled: audioTrack.enabled,
        }));
      }
    }
  }, [dispatch, activeHuddle]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      dispatch(setLocalVideo(videoTrack.enabled));

      // Update on server
      if (activeHuddle) {
        dispatch(updateParticipant({
          roomId: activeHuddle.roomId,
          isVideoEnabled: videoTrack.enabled,
        }));
      }
    }
  }, [dispatch, activeHuddle]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    dispatch(setLocalMute(!localMuted));

    // Update on server
    if (activeHuddle) {
      dispatch(updateParticipant({
        roomId: activeHuddle.roomId,
        isMuted: !localMuted,
      }));
    }
  }, [dispatch, activeHuddle, localMuted]);

  // Initialize media stream when huddle becomes active
  useEffect(() => {
    if (activeHuddle && !localStreamRef.current) {
      // Initialize media stream (this would be handled by WebRTC)
      // For now, this is a placeholder
      console.log('Huddle active, media stream should be initialized via WebRTC');
    }
  }, [activeHuddle]);

  return {
    // State
    activeHuddle,
    isInCall,
    localStream,
    remoteStreams,
    localAudioEnabled,
    localVideoEnabled,
    localMuted,
    isConnecting,
    loading,
    error,

    // Actions
    startHuddle,
    joinExistingHuddle,
    leaveHuddle,
    toggleAudio,
    toggleVideo,
    toggleMute,

    // Auto-connect tracking
    hasRungBefore,
    shouldAutoConnect,
  };
};
