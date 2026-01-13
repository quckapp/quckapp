import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { format } from 'date-fns';
import api from '../../services/api';

export default function StarredMessagesScreen({ navigation }: any) {
  const theme = useTheme();
  const [starredMessages, setStarredMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStarredMessages();
  }, []);

  const fetchStarredMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/starred');
      console.log('Starred messages response:', response.data);
      setStarredMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching starred messages:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load starred messages. Make sure the backend is running.'
      );
      setStarredMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (messageId: string) => {
    try {
      await api.delete(`/starred/${messageId}`);
      fetchStarredMessages();
    } catch (error) {
      Alert.alert('Error', 'Failed to unstar message');
    }
  };

  const renderMessage = ({ item }: any) => {
    const message = item.messageId;
    if (!message) return null;

    const conversation = item.conversationId;
    const sender = message.senderId;

    return (
      <TouchableOpacity
        style={[styles.messageItem, { borderBottomColor: theme.border }]}
        onPress={() => {
          // Navigate to the conversation and scroll to this message
          navigation.navigate('Chat', {
            conversationId: conversation._id,
            highlightMessageId: message._id,
          });
        }}
        onLongPress={() => {
          Alert.alert(
            'Unstar Message',
            'Remove this message from starred?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unstar',
                onPress: () => handleUnstar(message._id),
              },
            ]
          );
        }}
      >
        <View style={styles.messageHeader}>
          {sender?.avatar ? (
            <Image source={{ uri: sender.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {sender?.displayName?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.senderInfo}>
            <Text style={[styles.senderName, { color: theme.text }]}>
              {sender?.displayName || 'Unknown'}
            </Text>
            <Text style={[styles.conversationName, { color: theme.textSecondary }]}>
              {conversation?.name || conversation?.type}
            </Text>
          </View>
          <View style={styles.dateContainer}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {format(new Date(item.starredAt), 'MMM dd')}
            </Text>
          </View>
        </View>

        <View style={[styles.messageContent, { backgroundColor: theme.backgroundSecondary }]}>
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentIndicator}>
              <Ionicons
                name={message.type === 'image' ? 'image' : message.type === 'video' ? 'videocam' : 'document'}
                size={16}
                color={theme.textSecondary}
              />
            </View>
          )}
          <Text style={[styles.messageText, { color: theme.text }]} numberOfLines={3}>
            {message.content || `[${message.type}]`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={starredMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={64} color={theme.disabled} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              No starred messages
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
              Star important messages to find them quickly
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  conversationName: {
    fontSize: 13,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  messageContent: {
    padding: 12,
    borderRadius: 12,
  },
  attachmentIndicator: {
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
