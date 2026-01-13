import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { sendMessage } from '../../services/socket';

export default function ForwardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const { messagesToForward } = route.params as any;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [isForwarding, setIsForwarding] = useState(false);

  const conversations = useSelector((state: RootState) => state.conversations.conversations);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv: any) => {
    if (!searchQuery.trim()) return true;

    const isGroup = conv.type === 'group';
    if (isGroup) {
      return conv.name?.toLowerCase().includes(searchQuery.toLowerCase());
    }

    const otherParticipant = conv.participants.find(
      (p: any) => p.userId?._id !== currentUser?._id
    );
    const displayName = otherParticipant?.userId?.displayName || '';
    const phoneNumber = otherParticipant?.userId?.phoneNumber || '';

    return (
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phoneNumber.includes(searchQuery)
    );
  });

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const handleForward = async () => {
    if (selectedConversations.size === 0) {
      Alert.alert('Error', 'Please select at least one conversation');
      return;
    }

    setIsForwarding(true);

    try {
      for (const conversationId of selectedConversations) {
        for (const message of messagesToForward) {
          const forwardData: any = {
            conversationId,
            type: message.type,
            content: message.content,
            isForwarded: true,
            forwardedFrom: message._id,
          };

          if (message.attachments && message.attachments.length > 0) {
            forwardData.attachments = message.attachments;
          }

          await sendMessage(forwardData);
        }
      }

      Alert.alert(
        'Success',
        `Forwarded ${messagesToForward.length} message(s) to ${selectedConversations.size} conversation(s)`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error forwarding messages:', error);
      Alert.alert('Error', 'Failed to forward messages');
    } finally {
      setIsForwarding(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Forward to',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleForward}
          disabled={isForwarding || selectedConversations.size === 0}
          style={styles.headerButton}
        >
          {isForwarding ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons
              name="send"
              size={24}
              color={selectedConversations.size > 0 ? theme.primary : theme.textTertiary}
            />
          )}
        </TouchableOpacity>
      ),
    });
  }, [selectedConversations, isForwarding, theme]);

  const renderConversation = ({ item }: any) => {
    const isGroup = item.type === 'group';
    const otherParticipant = !isGroup && item.participants.find(
      (p: any) => p.userId?._id !== currentUser?._id
    );
    const displayName = isGroup
      ? item.name
      : otherParticipant?.userId?.displayName || otherParticipant?.userId?.phoneNumber || 'Unknown';

    const isSelected = selectedConversations.has(item._id);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { borderBottomColor: theme.border },
          isSelected && { backgroundColor: theme.primary + '15' },
        ]}
        onPress={() => handleConversationSelect(item._id)}
      >
        <View style={styles.conversationContent}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.conversationInfo}>
            <Text style={[styles.conversationName, { color: theme.text }]}>
              {displayName}
            </Text>
            {isGroup && (
              <Text style={[styles.groupInfo, { color: theme.textSecondary }]}>
                {item.participants.length} participants
              </Text>
            )}
          </View>
        </View>
        <View
          style={[
            styles.selectionCircle,
            { borderColor: theme.primary },
            isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Count */}
      {selectedConversations.size > 0 && (
        <View style={[styles.selectedCountContainer, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.selectedCountText, { color: theme.primary }]}>
            {selectedConversations.size} conversation(s) selected
          </Text>
        </View>
      )}

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item: any) => item._id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery ? 'No conversations found' : 'No conversations available'}
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
  headerButton: {
    marginRight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  selectedCountContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  groupInfo: {
    fontSize: 13,
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
