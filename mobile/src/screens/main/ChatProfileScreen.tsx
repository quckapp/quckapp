import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { getPhoneNumber, getFlag } from '../../utils/phoneUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function ChatProfileScreen({ route, navigation }: any) {
  const { conversation } = route.params;
  const theme = useTheme();
  const currentUserId = useSelector((state: RootState) => state.auth.user?._id);

  const isGroup = conversation.type === 'group';

  // Get other participant info for individual chats
  const otherParticipant = !isGroup
    ? conversation.participants.find((p: any) => p.userId._id !== currentUserId)
    : null;

  const getName = () => {
    if (isGroup) {
      return conversation.name || 'Group Chat';
    }
    const phoneNumber = otherParticipant?.userId?.phoneNumber;
    if (phoneNumber && phoneNumber.trim() !== '') {
      return getPhoneNumber(phoneNumber);
    }
    return 'Unknown';
  };

  const getDisplayName = () => {
    if (isGroup) return null;
    const displayName = otherParticipant?.userId?.displayName;
    if (displayName && displayName.trim() !== '') {
      return displayName;
    }
    return null;
  };

  const getParticipantFlag = () => {
    if (isGroup) return null;
    const phoneNumber = otherParticipant?.userId?.phoneNumber;
    if (phoneNumber && phoneNumber.trim() !== '') {
      return getFlag(phoneNumber);
    }
    return null;
  };

  const getAvatar = () => {
    if (isGroup) {
      return conversation.avatar;
    }
    return otherParticipant?.userId?.avatar;
  };

  const handleMute = () => {
    Alert.alert(
      'Mute Notifications',
      'How long would you like to mute notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '8 Hours', onPress: () => console.log('Mute for 8 hours') },
        { text: '1 Week', onPress: () => console.log('Mute for 1 week') },
        { text: 'Always', onPress: () => console.log('Mute always') },
      ]
    );
  };

  const handleBlock = () => {
    Alert.alert(
      'Block Contact',
      'Are you sure you want to block this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            // Block logic will be implemented
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDeleteChat = () => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Delete logic will be implemented
            navigation.navigate('ConversationsList');
          },
        },
      ]
    );
  };

  const avatar = getAvatar();
  const name = getName();
  const displayName = getDisplayName();
  const flag = getParticipantFlag();
  const currentParticipant = conversation.participants.find((p: any) => p.userId._id === currentUserId);
  const isMuted = currentParticipant?.isMuted || false;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: theme.backgroundSecondary }]}>
        {avatar && avatar.trim() !== '' ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <Text style={[styles.name, { color: theme.text }]}>
          {name} {flag && <Text style={styles.flag}>{flag}</Text>}
        </Text>

        {displayName && (
          <Text style={[styles.displayName, { color: theme.textSecondary }]}>
            {displayName}
          </Text>
        )}

        {isGroup && (
          <Text style={[styles.groupInfo, { color: theme.textSecondary }]}>
            Group · {conversation.participants.length} participants
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={[styles.quickActions, { backgroundColor: theme.backgroundSecondary }]}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => {
            // Audio call action
          }}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="call" size={24} color="#fff" />
          </View>
          <Text style={[styles.quickActionText, { color: theme.text }]}>Audio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => {
            // Video call action
          }}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="videocam" size={24} color="#fff" />
          </View>
          <Text style={[styles.quickActionText, { color: theme.text }]}>Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Chat', { conversationId: conversation._id })}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="chatbubble" size={24} color="#fff" />
          </View>
          <Text style={[styles.quickActionText, { color: theme.text }]}>Message</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Info Section */}
      {!isGroup && (
        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>About</Text>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={24} color={theme.text} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {otherParticipant?.userId?.phoneNumber ? getPhoneNumber(otherParticipant.userId.phoneNumber) : 'Unknown'}
            </Text>
          </View>
        </View>
      )}

      {/* Media Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: theme.border }]}
          onPress={() => {
            // Media, Links, and Docs
          }}
        >
          <Ionicons name="images-outline" size={24} color={theme.text} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            Media, Links, and Docs
          </Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, { borderBottomWidth: 0 }]}
          onPress={() => {
            // Starred messages
          }}
        >
          <Ionicons name="star-outline" size={24} color={theme.text} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            Starred Messages
          </Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: theme.border }]}
          onPress={handleMute}
        >
          <Ionicons name={isMuted ? "notifications" : "notifications-off-outline"} size={24} color={theme.text} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, { borderBottomWidth: 0 }]}
          onPress={() => {
            // Custom notifications
          }}
        >
          <Ionicons name="musical-notes-outline" size={24} color={theme.text} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            Custom Notifications
          </Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Group Actions (only for groups) */}
      {isGroup && (
        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.actionItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              // View participants
            }}
          >
            <Ionicons name="people-outline" size={24} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>
              {conversation.participants.length} Participants
            </Text>
            <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, { borderBottomWidth: 0 }]}
            onPress={() => {
              // Exit group
            }}
          >
            <Ionicons name="exit-outline" size={24} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>
              Exit Group
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Danger Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        {!isGroup && (
          <TouchableOpacity
            style={[styles.actionItem, { borderBottomColor: theme.border }]}
            onPress={handleBlock}
          >
            <Ionicons name="ban-outline" size={24} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>
              Block Contact
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: theme.border }]}
          onPress={() => {
            // Report
          }}
        >
          <Ionicons name="warning-outline" size={24} color="#FF3B30" />
          <Text style={[styles.actionText, { color: '#FF3B30' }]}>
            Report {isGroup ? 'Group' : 'Contact'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, { borderBottomWidth: 0 }]}
          onPress={handleDeleteChat}
        >
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          <Text style={[styles.actionText, { color: '#FF3B30' }]}>
            Delete Chat
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '600',
  },
  name: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 4,
  },
  flag: {
    fontSize: 20,
  },
  displayName: {
    fontSize: 16,
    marginBottom: 4,
  },
  groupInfo: {
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  infoText: {
    fontSize: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 16,
  },
  actionText: {
    fontSize: 16,
    flex: 1,
  },
});
