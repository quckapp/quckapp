import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Image,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import { rejectCall as rejectCallAction, inviteToCall } from '../store/slices/callSlice';
import { rejectCall, endCallWebRTC } from '../services/webrtc';
import { useTheme } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import {
  playOutgoingRingtone,
  playButtonPress,
  playCallEnded,
} from '../services/callSounds';
import { formatPhoneWithFlag } from '../utils/phoneUtils';

const { height } = Dimensions.get('window');

export default function OutgoingCallScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const { callId, callType, participants } = useSelector(
    (state: RootState) => state.call,
    shallowEqual
  );

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const conversations = useSelector((state: RootState) => state.conversations.conversations);

  const [dots, setDots] = useState('');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Contact picker state
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Play outgoing call sound and cleanup on unmount
  useEffect(() => {
    playOutgoingRingtone();

    return () => {
      playCallEnded();
    };
  }, []);

  // Animated dots for "Calling..."
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleEndCall = async () => {
    console.log('📱 OutgoingCallScreen: User pressed end call');
    await playButtonPress();
    await playCallEnded();

    if (callId) {
      rejectCall(callId);
    } else {
      endCallWebRTC();
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
      console.log('[OutgoingCallScreen] Inviting users:', userIds);

      await dispatch(inviteToCall({
        callId,
        userIds,
      })).unwrap();

      console.log('[OutgoingCallScreen] Successfully invited users');
      setShowContactPicker(false);
      setSelectedContacts(new Set());
      setSearchQuery('');
    } catch (error) {
      console.error('[OutgoingCallScreen] Error inviting participants:', error);
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

  // Get the first participant (for 1-on-1 calls)
  const recipient = participants && participants[0];
  const isDark = theme.background !== '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Background Gradient */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(59, 130, 246, 0.2)', 'rgba(0, 0, 0, 0.95)']
            : ['rgba(0, 102, 255, 0.15)', 'rgba(0, 0, 0, 0.85)']
        }
        style={styles.gradientOverlay}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.callTypeBadge, { backgroundColor: theme.primary }]}>
            <Ionicons
              name={callType === 'video' ? 'videocam' : 'call'}
              size={18}
              color="#fff"
            />
            <Text style={styles.callTypeText}>
              {callType === 'video' ? 'Video Call' : 'Audio Call'}
            </Text>
          </View>
        </View>

        {/* Recipient Info */}
        <View style={styles.recipientInfo}>
          {/* Avatar */}
          {recipient?.avatar ? (
            <Image source={{ uri: recipient.avatar }} style={styles.avatarCircle} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {recipient?.displayName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}

          {/* Name */}
          <Text style={[styles.recipientName, { color: theme.text }]}>
            {(recipient?.displayName && recipient.displayName.trim() !== '')
              ? recipient.displayName
              : (recipient?.phoneNumber ? formatPhoneWithFlag(recipient.phoneNumber) : recipient?.phoneNumber || '')}
          </Text>

          {/* Calling Status with Animated Dots */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: theme.primary }]} />
            <Text style={[styles.callingStatus, { color: theme.textSecondary }]}>
              Calling{dots}
            </Text>
          </View>
        </View>

        {/* Call Controls */}
        <View style={styles.controls}>
          {/* Mute Button (disabled during ringing) */}
          <View style={styles.controlGroup}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: theme.backgroundTertiary, opacity: 0.5 },
              ]}
              disabled
            >
              <Ionicons name="mic-off" size={28} color={theme.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.controlLabel, { color: theme.textTertiary }]}>
              Mute
            </Text>
          </View>

          {/* Add Participant Button */}
          <View style={styles.controlGroup}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: theme.primary }]}
              onPress={handleAddParticipant}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.controlLabel, { color: theme.primary }]}>
              Add
            </Text>
          </View>

          {/* End Call Button */}
          <View style={styles.controlGroup}>
            <TouchableOpacity
              style={[styles.endCallButton, styles.endCallButtonActive]}
              onPress={handleEndCall}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.controlLabel, { color: '#EF4444' }]}>
              End Call
            </Text>
          </View>

          {/* Speaker Button (disabled during ringing) */}
          <View style={styles.controlGroup}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: theme.backgroundTertiary, opacity: 0.5 },
              ]}
              disabled
            >
              <Ionicons
                name="volume-high"
                size={28}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
            <Text style={[styles.controlLabel, { color: theme.textTertiary }]}>
              Speaker
            </Text>
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.additionalInfo}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={theme.textTertiary}
          />
          <Text style={[styles.infoText, { color: theme.textTertiary }]}>
            Connecting securely...
          </Text>
        </View>
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
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 6,
  },
  callTypeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  recipientInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  recipientName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  callingStatus: {
    fontSize: 17,
    fontWeight: '500',
    minWidth: 90,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 30,
  },
  controlGroup: {
    alignItems: 'center',
    gap: 10,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  endCallButtonActive: {
    backgroundColor: '#EF4444',
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  additionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
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
