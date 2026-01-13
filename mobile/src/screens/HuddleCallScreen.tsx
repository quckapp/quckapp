/**
 * Huddle Call Screen
 * Full-screen call interface for audio/video huddles
 * Features:
 * - First call: Rings normally
 * - Subsequent calls: Auto-connect (no ring)
 * - Individual leave (others stay connected)
 * - Modern gesture-based controls
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeRTCView as RTCView } from '../utils/webrtcCompat';
import { useHuddle } from '../hooks/huddle';
import { useDispatch, useSelector } from 'react-redux';
import { minimizeHuddle, inviteToHuddle } from '../store/slices/huddleSlice';
import { AppDispatch } from '../store';
import { HuddleControls } from '../components/HuddleControls';
import { RootState } from '../store';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export const HuddleCallScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    activeHuddle,
    localStream,
    remoteStreams,
    localAudioEnabled,
    localVideoEnabled,
    toggleAudio,
    toggleVideo,
    leaveHuddle,
  } = useHuddle();

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const conversations = useSelector((state: RootState) => state.conversations.conversations);

  const [callDuration, setCallDuration] = useState(0);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Track call duration
  useEffect(() => {
    if (!activeHuddle) return;

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHuddle]);

  const handleMinimize = () => {
    // Minimize to floating widget
    dispatch(minimizeHuddle());
  };

  const handleEndCall = async () => {
    // Leave the call - others stay connected
    await leaveHuddle();
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
    if (selectedContacts.size === 0 || !activeHuddle) return;

    setIsAdding(true);
    try {
      const userIds = Array.from(selectedContacts);
      console.log('[HuddleCallScreen] Inviting users:', userIds);

      await dispatch(inviteToHuddle({
        roomId: activeHuddle.roomId,
        userIds,
      })).unwrap();

      console.log('[HuddleCallScreen] Successfully invited users');
      setShowContactPicker(false);
      setSelectedContacts(new Set());
      setSearchQuery('');
    } catch (error) {
      console.error('[HuddleCallScreen] Error inviting participants:', error);
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

  const remoteStreamsArray = Array.from(remoteStreams.values());
  const participantCount = remoteStreamsArray.length + 1; // +1 for self

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn} style={styles.header}>
        <Text style={styles.headerTitle}>Huddle Call</Text>
        <Text style={styles.headerSubtitle}>
          {activeHuddle?.type === 'video' ? 'Video' : 'Audio'}
        </Text>
      </Animated.View>

      {/* Remote Participants */}
      <ScrollView style={styles.participantsContainer}>
        {remoteStreamsArray.length === 0 ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.waitingContainer}>
            <View style={styles.pulseCircle} />
            <Ionicons name="people-outline" size={80} color="#666" />
            <Text style={styles.waitingText}>Ready to connect...</Text>
            <Text style={styles.waitingSubtext}>Others can join anytime</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={SlideInDown} style={styles.participantGrid}>
            {remoteStreamsArray.map((stream, index) => (
              <Animated.View
                key={`remote-${index}`}
                entering={FadeIn.delay(index * 100)}
                style={styles.participantTile}
              >
                {localVideoEnabled ? (
                  <RTCView
                    streamURL={stream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                    mirror={false}
                  />
                ) : (
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatarCircle}>
                      <Ionicons name="person" size={60} color="#fff" />
                    </View>
                  </View>
                )}
                <View style={styles.participantInfo}>
                  <Ionicons name="mic" size={16} color="#25D366" />
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Local Preview */}
      {localStream && (
        <View style={styles.localPreviewContainer}>
          {localVideoEnabled ? (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localPreview}
              objectFit="cover"
              mirror={true}
            />
          ) : (
            <View style={[styles.localPreview, styles.avatarContainer]}>
              <Ionicons name="person-circle" size={40} color="#fff" />
            </View>
          )}
        </View>
      )}

      {/* Modern Controls */}
      <Animated.View entering={SlideInDown.delay(300)} exiting={SlideOutDown}>
        <HuddleControls
          localAudioEnabled={localAudioEnabled}
          localVideoEnabled={localVideoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
          onMinimize={handleMinimize}
          onAddParticipant={handleAddParticipant}
          participantCount={participantCount}
          callDuration={callDuration}
        />
      </Animated.View>

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
                  <ActivityIndicator size="small" color="#25D366" />
                ) : (
                  <Ionicons
                    name="checkmark"
                    size={28}
                    color={selectedContacts.size > 0 ? '#25D366' : '#666'}
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
              <View style={styles.selectedCountContainer}>
                <Text style={styles.selectedCountText}>
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
                    <View style={styles.contactAvatar}>
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
                        isSelected && styles.selectionCircleSelected,
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#25D366',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  participantsContainer: {
    flex: 1,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#25D366',
    opacity: 0.1,
  },
  waitingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  participantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  participantTile: {
    width: (width - 40) / 2,
    height: 250,
    margin: 5,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#25D366',
  },
  participantInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(37, 211, 102, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#25D366',
  },
  localPreviewContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#25D366',
    elevation: 10,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  localPreview: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#25D366',
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
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
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D366',
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
    backgroundColor: '#25D366',
    borderColor: '#25D366',
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
