import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { SafeRTCView as RTCView } from '../utils/webrtcCompat';
import { RootState, AppDispatch } from '../store';
import { formatPhoneWithFlag } from '../utils/phoneUtils';
import {
  answerCall as answerCallAction,
  rejectCall as rejectCallAction,
  toggleAudio,
  toggleVideo,
  toggleSpeaker,
  resetCall,
  inviteToCall,
} from '../store/slices/callSlice';
import { answerCall as answerCallWebRTC, rejectCall, endCallWebRTC, toggleAudioWebRTC, toggleVideoWebRTC, getLocalStream, getRemoteStreams } from '../services/webrtc';
import { useTheme } from '../hooks/useTheme';
import {
  playButtonPress,
  playCallEnded,
  playCallConnected,
  setSpeakerMode,
} from '../services/callSounds';

// Safe import of InCallManager
let InCallManager: any = null;
try {
  const incallModule = require('react-native-incall-manager');
  InCallManager = incallModule?.default;
  // Verify the module is actually usable (has the setForceSpeakerphoneOn method)
  if (InCallManager && typeof InCallManager.setForceSpeakerphoneOn !== 'function') {
    console.warn('InCallManager module exists but native methods not available');
    InCallManager = null;
  }
} catch (e) {
  console.warn('InCallManager not available');
}

const { width, height } = Dimensions.get('window');

// Format duration as MM:SS or HH:MM:SS
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function CallScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const {
    callId,
    callType,
    status,
    isIncoming,
    caller,
    audioEnabled,
    videoEnabled,
    speakerEnabled,
    connectedAt,
  } = useSelector((state: RootState) => state.call, shallowEqual);

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const conversations = useSelector((state: RootState) => state.conversations.conversations);

  // Contact picker state
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Call duration timer
  const [displayDuration, setDisplayDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start/stop duration timer based on call status
  useEffect(() => {
    if (status === 'active' && connectedAt) {
      // Calculate initial duration in case we're resuming
      const initialDuration = Math.floor((Date.now() - connectedAt) / 1000);
      setDisplayDuration(initialDuration);

      // Start timer to update every second
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - connectedAt) / 1000);
        setDisplayDuration(elapsed);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, connectedAt]);

  // Reset duration when call ends or resets
  useEffect(() => {
    if (status === 'idle' || status === 'ended') {
      setDisplayDuration(0);
    }
  }, [status]);

  // Toggle between Huddle and Regular call modes
  const [isHuddleMode, setIsHuddleMode] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('📱 CallScreen state:', {
      status,
      isIncoming,
      caller: caller?.displayName,
      callType,
    });
  }, [status, isIncoming, caller, callType]);

  // Use state to hold actual MediaStream objects from webrtc service
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, any>>({});

  // Get streams from Redux just to trigger re-renders when they change
  const localStreamFromRedux = useSelector((state: RootState) => state.call.localStream);
  const remoteStreamsFromRedux = useSelector((state: RootState) => state.call.remoteStreams);

  // Update local state with actual streams from webrtc service (not Proxy-wrapped)
  useEffect(() => {
    setLocalStream(getLocalStream());
    setRemoteStreams(getRemoteStreams());
  }, [localStreamFromRedux, remoteStreamsFromRedux]);

  // Auto-reset call state after call ends
  useEffect(() => {
    if (status === 'ended') {
      playCallEnded();
      const timer = setTimeout(() => {
        dispatch(resetCall());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, dispatch]);

  // Play connected sound when call becomes active
  useEffect(() => {
    if (status === 'active') {
      playCallConnected();
    }
  }, [status]);

  const handleAnswer = async () => {
    try {
      if (callId) {
        dispatch(answerCallAction({ callId }));
        await answerCallWebRTC(callId);
      }
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const handleReject = () => {
    if (callId) {
      rejectCall(callId);
      dispatch(rejectCallAction());
    }
  };

  const handleEndCall = async () => {
    console.log('📱 CallScreen: User pressed end call');
    await playButtonPress();
    await playCallEnded();
    endCallWebRTC();
  };

  const handleToggleAudio = async () => {
    await playButtonPress();
    dispatch(toggleAudio());
    toggleAudioWebRTC(!audioEnabled);
  };

  const handleToggleVideo = async () => {
    await playButtonPress();
    dispatch(toggleVideo());
    toggleVideoWebRTC(!videoEnabled);
  };

  const handleToggleSpeaker = async () => {
    await playButtonPress();
    const newSpeakerState = !speakerEnabled;
    dispatch(toggleSpeaker());

    let inCallManagerWorked = false;
    if (InCallManager) {
      try {
        InCallManager.setForceSpeakerphoneOn(newSpeakerState);
        inCallManagerWorked = true;
      } catch (e) {
        console.warn('InCallManager.setForceSpeakerphoneOn failed:', e);
      }
    }

    // Fallback to expo-av speaker mode
    if (!inCallManagerWorked) {
      setSpeakerMode(newSpeakerState);
    }
  };

  const handleAddParticipant = () => {
    setShowContactPicker(true);
  };

  const handleContactSelect = (userId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleAddSelectedParticipants = async () => {
    if (selectedContacts.size === 0 || !callId) return;

    setIsAdding(true);
    try {
      const userIds = Array.from(selectedContacts);
      console.log('[CallScreen] Inviting users:', userIds);

      await dispatch(inviteToCall({
        callId,
        userIds,
      })).unwrap();

      console.log('[CallScreen] Successfully invited users');
      setShowContactPicker(false);
      setSelectedContacts(new Set());
      setSearchQuery('');
    } catch (error) {
      console.error('[CallScreen] Error inviting participants:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Get available contacts (from conversations)
  const availableContacts = conversations
    .flatMap(conv =>
      conv.participants
        .filter((p: any) => p.userId._id !== currentUser?._id)
        .map((p: any) => p.userId)
    )
    .filter((user, index, self) =>
      // Remove duplicates
      index === self.findIndex(u => u._id === user._id)
    )
    .filter(user =>
      // Filter by search query
      !searchQuery ||
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phoneNumber?.includes(searchQuery)
    );

  const remoteStreamValues = Object.values(remoteStreams);
  const remoteStream = remoteStreamValues.length > 0 ? remoteStreamValues[0] : null;

  // Don't render if we're in an invalid state (incoming call without caller info)
  if (status === 'ringing' && isIncoming && !caller) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background === '#FFFFFF' ? '#1c1c1e' : theme.background }]}>
      {/* Remote Video */}
      {callType === 'video' && remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      )}

      {/* Local Video (Picture-in-Picture) */}
      {callType === 'video' && localStream && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror
          />
        </View>
      )}

      {/* Call Info Overlay */}
      <View style={styles.overlay}>
        {/* Toggle Button for Huddle/Regular Mode */}
        <View style={styles.headerToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: isHuddleMode ? theme.primary : 'rgba(255, 255, 255, 0.2)' }
            ]}
            onPress={() => setIsHuddleMode(!isHuddleMode)}
          >
            <Ionicons
              name={isHuddleMode ? 'flash' : 'call-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.toggleText}>
              {isHuddleMode ? 'Huddle' : 'Regular'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.callInfo}>
          {callType === 'audio' && (
            <>
              {caller?.avatar ? (
                <Image source={{ uri: caller.avatar }} style={styles.callerAvatar} />
              ) : (
                <View style={[styles.callerAvatar, styles.callerAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.callerAvatarText}>
                    {caller?.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </>
          )}
          <Text style={styles.callerName}>
            {(caller?.displayName && caller.displayName.trim() !== '')
              ? caller.displayName
              : (caller?.phoneNumber ? formatPhoneWithFlag(caller.phoneNumber) : caller?.phoneNumber || '')}
          </Text>
          <Text style={[styles.callStatus, { color: theme.textSecondary }]}>
            {status === 'ringing' && isIncoming && `Incoming ${callType} call`}
            {status === 'ringing' && !isIncoming && 'Calling...'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'active' && formatDuration(displayDuration)}
            {status === 'ended' && 'Call ended'}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {(() => {
            const showIncomingControls = status === 'ringing' && isIncoming;
            console.log('🎮 Controls decision:', { status, isIncoming, showIncomingControls });
            return showIncomingControls;
          })() ? (
            <View style={styles.incomingControls}>
              <TouchableOpacity style={[styles.controlButton, styles.rejectButton, { backgroundColor: theme.error }]} onPress={handleReject}>
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, styles.acceptButton, { backgroundColor: theme.success }]} onPress={handleAnswer}>
                <Ionicons name="call" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeControls}>
              <TouchableOpacity
                style={[styles.controlButton, !audioEnabled && [styles.controlButtonOff, { backgroundColor: theme.error }]]}
                onPress={handleToggleAudio}
              >
                <Ionicons name={audioEnabled ? 'mic' : 'mic-off'} size={28} color="#fff" />
              </TouchableOpacity>

              {callType === 'video' && (
                <TouchableOpacity
                  style={[styles.controlButton, !videoEnabled && [styles.controlButtonOff, { backgroundColor: theme.error }]]}
                  onPress={handleToggleVideo}
                >
                  <Ionicons name={videoEnabled ? 'videocam' : 'videocam-off'} size={28} color="#fff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.controlButton, speakerEnabled && [styles.controlButtonActive, { backgroundColor: theme.primary }]]}
                onPress={handleToggleSpeaker}
              >
                <Ionicons name="volume-high" size={28} color="#fff" />
              </TouchableOpacity>

              {/* Add Participant Button */}
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.primary }]}
                onPress={handleAddParticipant}
              >
                <Ionicons name="person-add" size={28} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.controlButton, styles.endButton, { backgroundColor: theme.error }]} onPress={handleEndCall}>
                <Ionicons name="call" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Contact Picker Modal */}
      <Modal
        visible={showContactPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.contactPickerContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Participants</Text>
              <TouchableOpacity
                onPress={handleAddSelectedParticipants}
                disabled={selectedContacts.size === 0 || isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons
                    name="checkmark"
                    size={28}
                    color={selectedContacts.size > 0 ? theme.primary : '#666'}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search contacts..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Selected Count */}
            {selectedContacts.size > 0 && (
              <View style={[styles.selectedCountContainer, { borderColor: theme.primary }]}>
                <Text style={[styles.selectedCountText, { color: theme.primary }]}>
                  {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
                </Text>
              </View>
            )}

            {/* Contacts List */}
            <FlatList
              data={availableContacts}
              keyExtractor={(item: any) => item._id}
              renderItem={({ item }: any) => {
                const isSelected = selectedContacts.has(item._id);
                return (
                  <TouchableOpacity
                    style={[styles.contactItem, isSelected && styles.contactItemSelected]}
                    onPress={() => handleContactSelect(item._id)}
                  >
                    <View style={[styles.contactAvatar, { backgroundColor: theme.primary }]}>
                      <Text style={styles.contactAvatarText}>
                        {(item.displayName || item.phoneNumber || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>
                        {item.displayName || item.phoneNumber || 'Unknown'}
                      </Text>
                      {item.displayName && item.phoneNumber && (
                        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.selectionCircle,
                        isSelected && [styles.selectionCircleSelected, { backgroundColor: theme.primary, borderColor: theme.primary }],
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color="#666" />
                  <Text style={styles.emptyText}>No contacts found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  remoteVideo: {
    width,
    height,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  headerToggle: {
    alignItems: 'center',
    paddingTop: 10,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  toggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  callInfo: {
    alignItems: 'center',
  },
  callerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  callerAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  callerName: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  callStatus: {
    fontSize: 16,
    color: '#aaa',
  },
  controls: {
    paddingHorizontal: 40,
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonOff: {
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
  },
  acceptButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  rejectButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  endButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  // Contact Picker Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  contactPickerContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  selectedCountContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  contactItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: '#999',
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCircleSelected: {
    borderWidth: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});
