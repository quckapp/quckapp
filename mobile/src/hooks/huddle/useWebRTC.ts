/**
 * useWebRTC Hook
 * Manages WebRTC RTCPeerConnection and media streams
 * Pattern: Custom Hook with state management for peer connections
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, MediaStream, webrtcAvailable } from '../../utils/webrtcCompat';

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  getLocalStream: (video: boolean) => Promise<MediaStream>;
  stopLocalStream: () => void;
  createOffer: (userId: string) => Promise<RTCSessionDescriptionInit>;
  createAnswer: (userId: string, offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
  handleOffer: (userId: string, offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
  handleAnswer: (userId: string, answer: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (userId: string, candidate: RTCIceCandidateInit) => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  closeAllConnections: () => void;
}

// STUN servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export const useWebRTC = (
  onIceCandidate?: (userId: string, candidate: RTCIceCandidateInit) => void,
): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  /**
   * Get local media stream (audio/video)
   */
  const getLocalStream = useCallback(async (video: boolean = false): Promise<MediaStream> => {
    try {
      console.log('[WebRTC] Getting local stream, video:', video);

      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video
          ? {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              frameRate: { min: 15, ideal: 30, max: 30 },
              facingMode: 'user',
            }
          : false,
      });

      setLocalStream(stream);
      console.log('[WebRTC] Local stream obtained:', stream.id);
      return stream;
    } catch (error) {
      console.error('[WebRTC] Error getting local stream:', error);
      throw error;
    }
  }, []);

  /**
   * Stop local media stream
   */
  const stopLocalStream = useCallback(() => {
    if (localStream) {
      console.log('[WebRTC] Stopping local stream');
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  /**
   * Create peer connection for a user
   */
  const createPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      console.log('[WebRTC] Creating peer connection for user:', userId);

      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
      });

      // Add local tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
          console.log('[WebRTC] Added track to peer connection:', track.kind);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTC] ICE candidate generated for:', userId);
          if (onIceCandidate) {
            onIceCandidate(userId, event.candidate.toJSON());
          }
        }
      };

      // Handle remote track
      pc.ontrack = (event) => {
        console.log('[WebRTC] Remote track received from:', userId);
        if (event.streams && event.streams[0]) {
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.set(userId, event.streams[0]);
            return newMap;
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state changed:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          console.log('[WebRTC] Peer connection disconnected for:', userId);
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
        }
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      };

      peerConnections.current.set(userId, pc);
      return pc;
    },
    [localStream, onIceCandidate],
  );

  /**
   * Get or create peer connection
   */
  const getPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      let pc = peerConnections.current.get(userId);
      if (!pc) {
        pc = createPeerConnection(userId);
      }
      return pc;
    },
    [createPeerConnection],
  );

  /**
   * Create WebRTC offer
   */
  const createOffer = useCallback(
    async (userId: string): Promise<RTCSessionDescriptionInit> => {
      console.log('[WebRTC] Creating offer for:', userId);
      const pc = getPeerConnection(userId);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Offer created and set as local description');

      return offer;
    },
    [getPeerConnection],
  );

  /**
   * Handle received WebRTC offer and create answer
   */
  const handleOffer = useCallback(
    async (userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
      console.log('[WebRTC] Handling offer from:', userId);
      const pc = getPeerConnection(userId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTC] Remote description set from offer');

      // Add any pending ICE candidates
      const candidates = pendingCandidates.current.get(userId) || [];
      for (const candidate of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[WebRTC] Added pending ICE candidate');
      }
      pendingCandidates.current.delete(userId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WebRTC] Answer created and set as local description');

      return answer;
    },
    [getPeerConnection],
  );

  /**
   * Create WebRTC answer
   */
  const createAnswer = useCallback(
    async (userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
      return handleOffer(userId, offer);
    },
    [handleOffer],
  );

  /**
   * Handle received WebRTC answer
   */
  const handleAnswer = useCallback(
    async (userId: string, answer: RTCSessionDescriptionInit): Promise<void> => {
      console.log('[WebRTC] Handling answer from:', userId);
      const pc = peerConnections.current.get(userId);

      if (!pc) {
        console.error('[WebRTC] No peer connection found for:', userId);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[WebRTC] Remote description set from answer');

      // Add any pending ICE candidates
      const candidates = pendingCandidates.current.get(userId) || [];
      for (const candidate of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[WebRTC] Added pending ICE candidate');
      }
      pendingCandidates.current.delete(userId);
    },
    [],
  );

  /**
   * Handle received ICE candidate
   */
  const handleIceCandidate = useCallback(
    async (userId: string, candidate: RTCIceCandidateInit): Promise<void> => {
      console.log('[WebRTC] Handling ICE candidate from:', userId);
      const pc = peerConnections.current.get(userId);

      if (!pc) {
        console.warn('[WebRTC] No peer connection yet, queuing candidate');
        const pending = pendingCandidates.current.get(userId) || [];
        pending.push(candidate);
        pendingCandidates.current.set(userId, pending);
        return;
      }

      if (!pc.remoteDescription) {
        console.warn('[WebRTC] No remote description yet, queuing candidate');
        const pending = pendingCandidates.current.get(userId) || [];
        pending.push(candidate);
        pendingCandidates.current.set(userId, pending);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[WebRTC] ICE candidate added successfully');
      } catch (error) {
        console.error('[WebRTC] Error adding ICE candidate:', error);
      }
    },
    [],
  );

  /**
   * Toggle local audio track
   */
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
        console.log('[WebRTC] Audio track toggled:', track.enabled);
      });
    }
  }, [localStream]);

  /**
   * Toggle local video track
   */
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
        console.log('[WebRTC] Video track toggled:', track.enabled);
      });
    }
  }, [localStream]);

  /**
   * Close all peer connections
   */
  const closeAllConnections = useCallback(() => {
    console.log('[WebRTC] Closing all peer connections');
    peerConnections.current.forEach((pc, userId) => {
      pc.close();
      console.log('[WebRTC] Closed connection for:', userId);
    });
    peerConnections.current.clear();
    pendingCandidates.current.clear();
    setRemoteStreams(new Map());
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('[WebRTC] Cleaning up...');
      stopLocalStream();
      closeAllConnections();
    };
  }, [stopLocalStream, closeAllConnections]);

  return {
    localStream,
    remoteStreams,
    getLocalStream,
    stopLocalStream,
    createOffer,
    createAnswer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    closeAllConnections,
  };
};
