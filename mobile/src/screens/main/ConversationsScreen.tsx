import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../../store';
import { fetchConversations, setCurrentConversation } from '../../store/slices/conversationsSlice';
import { format } from 'date-fns';
import { useTheme } from '../../hooks/useTheme';
import { getPhoneNumber, getFlag } from '../../utils/phoneUtils';
import { getFullImageUrl } from '../../utils/imageUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ConversationsScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { conversations, loading } = useSelector((state: RootState) => state.conversations);
  const currentUserId = useSelector((state: RootState) => state.auth.user?._id);
  const typingUsers = useSelector((state: RootState) => state.messages.typingUsers);
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<any[]>([]);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchConversations());
  }, []);

  const getConversationName = (conversation: any) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }

    const otherParticipant = conversation.participants.find(
      (p: any) => p.userId._id !== currentUserId
    );

    const phoneNumber = otherParticipant?.userId?.phoneNumber;

    // Return phone number without flag
    if (phoneNumber && phoneNumber.trim() !== '') {
      return getPhoneNumber(phoneNumber);
    }

    return 'Unknown';
  };

  const getConversationFlag = (conversation: any) => {
    if (conversation.type === 'group') {
      return null;
    }

    const otherParticipant = conversation.participants.find(
      (p: any) => p.userId._id !== currentUserId
    );

    const phoneNumber = otherParticipant?.userId?.phoneNumber;

    if (phoneNumber && phoneNumber.trim() !== '') {
      return getFlag(phoneNumber);
    }

    return null;
  };

  const getDisplayName = (conversation: any) => {
    if (conversation.type === 'group') {
      return null;
    }

    const otherParticipant = conversation.participants.find(
      (p: any) => p.userId._id !== currentUserId
    );

    const displayName = otherParticipant?.userId?.displayName;

    // Return display name if it exists
    if (displayName && displayName.trim() !== '') {
      return displayName;
    }

    return null;
  };

  const getGroupParticipants = (conversation: any) => {
    if (conversation.type !== 'group') {
      return null;
    }

    const participantNames = conversation.participants
      .filter((p: any) => p.userId._id !== currentUserId)
      .map((p: any) => {
        const displayName = p.userId?.displayName;
        const phoneNumber = p.userId?.phoneNumber;

        if (displayName && displayName.trim() !== '') {
          return displayName;
        } else if (phoneNumber && phoneNumber.trim() !== '') {
          return getPhoneNumber(phoneNumber);
        }
        return 'Unknown';
      });

    return participantNames.length > 0 ? participantNames.join(', ') : null;
  };

  const getConversationAvatar = (conversation: any) => {
    let avatarUrl;

    if (conversation.type === 'group') {
      avatarUrl = conversation.avatar;
    } else {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.userId._id !== currentUserId
      );
      avatarUrl = otherParticipant?.userId.avatar;
    }

    const fullUrl = getFullImageUrl(avatarUrl);
    console.log('🖼️ Avatar URL:', { original: avatarUrl, full: fullUrl });
    return fullUrl;
  };

  const formatLastMessageTime = (date: string) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return format(messageDate, 'HH:mm');
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(messageDate, 'MMM dd');
    }
  };

  const handleConversationPress = (conversation: any) => {
    dispatch(setCurrentConversation(conversation));
    navigation.navigate('Chat', { conversationId: conversation._id });
  };

  const handleReadAll = async () => {
    try {
      await api.put('/conversations/read-all');
      dispatch(fetchConversations());
      Alert.alert('Success', 'All conversations marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const getReadReceiptIcon = (conversation: any) => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) return null;

    // Only show read receipts for own messages
    const isOwnMessage = lastMessage.senderId?._id === currentUserId || lastMessage.senderId === currentUserId;
    if (!isOwnMessage) return null;

    const readReceipts = lastMessage.readReceipts || [];

    // Check if message has been read (readReceipts exist)
    const hasReadReceipts = readReceipts.length > 0;

    if (hasReadReceipts) {
      // Double green checkmarks - message has been read/seen
      return <Ionicons name="checkmark-done" size={16} color="#25D366" style={{ marginRight: 4 }} />;
    } else {
      // Single green checkmark - message delivered but not read yet
      return <Ionicons name="checkmark" size={16} color="#25D366" style={{ marginRight: 4 }} />;
    }
  };

  const handleProfilePress = (conversation: any, event: any) => {
    // Stop propagation to prevent the conversation press handler
    event.stopPropagation();
    navigation.navigate('ChatProfile', { conversation });
  };

  const renderConversation = ({ item }: any) => {
    const avatar = getConversationAvatar(item);
    const currentParticipant = item.participants.find((p: any) => p.userId._id === currentUserId);
    const unreadCount = currentParticipant?.unreadCount || 0;
    const isMuted = currentParticipant?.isMuted || false;

    // Get typing users excluding current user
    const typingUserIds = (typingUsers[item._id] || []).filter((id: string) => id !== currentUserId);
    const isTyping = typingUserIds.length > 0;

    // AI relevance info
    const aiRelevance = item.aiRelevance;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, { borderBottomColor: theme.borderLight }]}
        onPress={() => handleConversationPress(item)}
      >
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={(event) => handleProfilePress(item, event)}
          activeOpacity={0.7}
        >
          {avatar && avatar.trim() !== '' ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatar}
              onError={(e) => console.log('Image load error:', avatar, e.nativeEvent.error)}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {getConversationName(item).charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <View style={styles.nameContainer}>
              <Text style={[
                styles.conversationName,
                { color: theme.text },
                unreadCount > 0 && { fontWeight: '700' }
              ]} numberOfLines={1}>
                {getConversationName(item)}
              </Text>
              {getConversationFlag(item) && (
                <Text style={[
                  styles.flagEmoji,
                  { color: theme.text }
                ]}>
                  {' '}{getConversationFlag(item)}
                </Text>
              )}
              {getDisplayName(item) && (
                <Text style={[
                  styles.displayName,
                  { color: theme.textSecondary },
                  unreadCount > 0 && { fontWeight: '600' }
                ]} numberOfLines={1}>
                  {' '}({getDisplayName(item)})
                </Text>
              )}
              {getGroupParticipants(item) && (
                <Text style={[
                  styles.groupParticipants,
                  { color: theme.textSecondary },
                  unreadCount > 0 && { fontWeight: '600' }
                ]} numberOfLines={1}>
                  {' '}({getGroupParticipants(item)})
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {isMuted && (
                <Ionicons
                  name="notifications-off"
                  size={14}
                  color={theme.textTertiary}
                />
              )}
              {item.lastMessageAt && (
                <Text style={[
                  styles.timestamp,
                  { color: theme.textTertiary },
                  unreadCount > 0 && { fontWeight: '600', color: theme.primary }
                ]}>
                  {formatLastMessageTime(item.lastMessageAt)}
                </Text>
              )}
            </View>
          </View>

          {aiRelevance && (
            <View style={styles.aiRelevanceContainer}>
              <Ionicons name="sparkles" size={12} color={theme.primary} />
              <Text style={[styles.aiRelevanceText, { color: theme.textSecondary }]} numberOfLines={2}>
                {aiRelevance.reason}
              </Text>
            </View>
          )}

          <View style={styles.conversationFooter}>
            {isTyping ? (
              <Text style={[styles.lastMessage, { color: theme.primary, fontStyle: 'italic' }]} numberOfLines={1}>
                typing...
              </Text>
            ) : item.lastMessage?.type === 'image' && item.lastMessage?.attachments?.[0]?.url ? (
              <View style={styles.imageMessageContainer}>
                {getReadReceiptIcon(item)}
                {item.lastMessage.attachments.length === 1 ? (
                  // Single image
                  <TouchableOpacity
                    onPress={() => setSelectedImage(item.lastMessage.attachments[0].url)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: item.lastMessage.attachments[0].thumbnailUrl || item.lastMessage.attachments[0].url }}
                      style={styles.messageThumbnail}
                    />
                  </TouchableOpacity>
                ) : (
                  // Multiple images grid
                  <View style={styles.imageGrid}>
                    {item.lastMessage.attachments.slice(0, 4).map((attachment: any, index: number) => {
                      const totalImages = Math.min(item.lastMessage.attachments.length, 4);
                      let imageStyle = styles.gridThumbnail;

                      // Dynamic sizing based on image count
                      if (totalImages === 2) {
                        imageStyle = styles.gridThumbnail2;
                      } else if (totalImages === 3) {
                        imageStyle = index === 0 ? styles.gridThumbnail3First : styles.gridThumbnail3Rest;
                      }

                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setSelectedImage(attachment.url)}
                          activeOpacity={0.8}
                          style={[
                            styles.gridImageContainer,
                            totalImages === 2 && styles.gridImageContainer2,
                            totalImages === 3 && (index === 0 ? styles.gridImageContainer3First : styles.gridImageContainer3Rest),
                          ]}
                        >
                          <Image
                            source={{ uri: attachment.thumbnailUrl || attachment.url }}
                            style={imageStyle}
                          />
                          {index === 3 && item.lastMessage.attachments.length > 4 && (
                            <View style={styles.moreImagesOverlay}>
                              <Text style={styles.moreImagesText}>+{item.lastMessage.attachments.length - 4}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <Ionicons name="image-outline" size={14} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                <Text style={[
                  styles.lastMessage,
                  { color: theme.textSecondary, marginLeft: 4 },
                  unreadCount > 0 && { fontWeight: '600', color: theme.text }
                ]} numberOfLines={1}>
                  {item.lastMessage.attachments.length === 1 ? 'Photo' : `${item.lastMessage.attachments.length} Photos`}
                </Text>
              </View>
            ) : item.lastMessage?.type === 'video' && item.lastMessage?.attachments?.[0]?.url ? (
              <View style={styles.imageMessageContainer}>
                {getReadReceiptIcon(item)}
                {item.lastMessage.attachments.length === 1 ? (
                  // Single video
                  <TouchableOpacity
                    onPress={() => setSelectedImage(item.lastMessage.attachments[0].thumbnailUrl || item.lastMessage.attachments[0].url)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: item.lastMessage.attachments[0].thumbnailUrl || item.lastMessage.attachments[0].url }}
                      style={styles.messageThumbnail}
                    />
                  </TouchableOpacity>
                ) : (
                  // Multiple videos grid
                  <View style={styles.imageGrid}>
                    {item.lastMessage.attachments.slice(0, 4).map((attachment: any, index: number) => {
                      const totalImages = Math.min(item.lastMessage.attachments.length, 4);
                      let imageStyle = styles.gridThumbnail;

                      // Dynamic sizing based on image count
                      if (totalImages === 2) {
                        imageStyle = styles.gridThumbnail2;
                      } else if (totalImages === 3) {
                        imageStyle = index === 0 ? styles.gridThumbnail3First : styles.gridThumbnail3Rest;
                      }

                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setSelectedImage(attachment.thumbnailUrl || attachment.url)}
                          activeOpacity={0.8}
                          style={[
                            styles.gridImageContainer,
                            totalImages === 2 && styles.gridImageContainer2,
                            totalImages === 3 && (index === 0 ? styles.gridImageContainer3First : styles.gridImageContainer3Rest),
                          ]}
                        >
                          <Image
                            source={{ uri: attachment.thumbnailUrl || attachment.url }}
                            style={imageStyle}
                          />
                          {index === 3 && item.lastMessage.attachments.length > 4 && (
                            <View style={styles.moreImagesOverlay}>
                              <Text style={styles.moreImagesText}>+{item.lastMessage.attachments.length - 4}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <Ionicons name="videocam-outline" size={14} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                <Text style={[
                  styles.lastMessage,
                  { color: theme.textSecondary, marginLeft: 4 },
                  unreadCount > 0 && { fontWeight: '600', color: theme.text }
                ]} numberOfLines={1}>
                  {item.lastMessage.attachments.length === 1 ? 'Video' : `${item.lastMessage.attachments.length} Videos`}
                </Text>
              </View>
            ) : item.lastMessage?.type === 'audio' ? (
              <View style={styles.imageMessageContainer}>
                {getReadReceiptIcon(item)}
                <Ionicons name="mic-outline" size={16} color={theme.textSecondary} />
                <Text style={[
                  styles.lastMessage,
                  { color: theme.textSecondary, marginLeft: 4 },
                  unreadCount > 0 && { fontWeight: '600', color: theme.text }
                ]} numberOfLines={1}>
                  Voice message
                </Text>
              </View>
            ) : item.lastMessage?.type === 'file' ? (
              <View style={styles.imageMessageContainer}>
                {getReadReceiptIcon(item)}
                <Ionicons name="document-outline" size={16} color={theme.textSecondary} />
                <Text style={[
                  styles.lastMessage,
                  { color: theme.textSecondary, marginLeft: 4 },
                  unreadCount > 0 && { fontWeight: '600', color: theme.text }
                ]} numberOfLines={1}>
                  {item.lastMessage.attachments?.[0]?.fileName || 'File'}
                </Text>
              </View>
            ) : (
              <View style={styles.imageMessageContainer}>
                {getReadReceiptIcon(item)}
                <Text style={[
                  styles.lastMessage,
                  { color: theme.textSecondary },
                  unreadCount > 0 && { fontWeight: '600', color: theme.text }
                ]} numberOfLines={1}>
                  {item.lastMessage?.content || 'No messages yet'}
                </Text>
              </View>
            )}
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Check if there are any unread conversations
  const hasUnread = conversations.some(conv => {
    const currentParticipant = conv.participants.find((p: any) => p.userId._id === currentUserId);
    return currentParticipant?.unreadCount > 0;
  });

  // AI Search
  const handleAiSearch = async (query: string) => {
    if (!query.trim()) {
      setAiSearchResults([]);
      return;
    }

    setAiSearchLoading(true);
    try {
      const response = await api.get(`/conversations/ai-search?query=${encodeURIComponent(query)}`);
      setAiSearchResults(response.data.results || []);
    } catch (error: any) {
      console.error('AI search error:', error);
      Alert.alert('AI Search Error', error.response?.data?.message || 'AI search is not available. Please try basic search.');
      setIsAiSearch(false);
    } finally {
      setAiSearchLoading(false);
    }
  };

  // Filter conversations based on search query
  const filteredConversations = isAiSearch
    ? aiSearchResults
    : conversations.filter(conv => {
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase();
        const name = getConversationName(conv).toLowerCase();
        const displayName = getDisplayName(conv)?.toLowerCase() || '';
        const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';

        return name.includes(query) || displayName.includes(query) || lastMessage.includes(query);
      });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {hasUnread && (
        <BlurView intensity={theme.blur.intensity} tint={theme.blur.tint} style={[styles.readAllButton, { borderBottomColor: theme.border }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.cardBackground }]} />
          <TouchableOpacity
            style={styles.readAllButtonContent}
            onPress={handleReadAll}
          >
            <Ionicons name="checkmark-done-outline" size={20} color={theme.primary} />
            <Text style={[styles.readAllText, { color: theme.primary }]}>Mark all as read</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Search Bar */}
      <BlurView intensity={theme.blur.intensity} tint={theme.blur.tint} style={styles.searchContainer}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.inputBackground, borderRadius: 25 }]} />
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={isAiSearch ? "AI Search: Ask anything..." : "Search conversations..."}
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (isAiSearch && text.length > 2) {
              // Debounce AI search
              const timeoutId = setTimeout(() => handleAiSearch(text), 800);
              return () => clearTimeout(timeoutId);
            }
          }}
          onSubmitEditing={() => {
            if (isAiSearch && searchQuery.trim()) {
              handleAiSearch(searchQuery);
            }
          }}
        />
        {aiSearchLoading && (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
        )}
        {searchQuery.length > 0 && !aiSearchLoading && (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setAiSearchResults([]);
          }}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.aiToggle,
            { backgroundColor: isAiSearch ? theme.primary : theme.border }
          ]}
          onPress={() => {
            setIsAiSearch(!isAiSearch);
            if (!isAiSearch && searchQuery.trim()) {
              handleAiSearch(searchQuery);
            } else {
              setAiSearchResults([]);
            }
          }}
        >
          <Ionicons
            name={isAiSearch ? "sparkles" : "sparkles-outline"}
            size={16}
            color={isAiSearch ? "#fff" : theme.textSecondary}
          />
          <Text style={[styles.aiToggleText, { color: isAiSearch ? "#fff" : theme.textSecondary }]}>
            AI
          </Text>
        </TouchableOpacity>
      </BlurView>

      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.disabled} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No conversations yet</Text>
            <TouchableOpacity
              style={[styles.newChatButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('NewConversation')}
            >
              <Text style={styles.newChatButtonText}>Start a New Chat</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Image Viewer Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable
          style={styles.imageViewerOverlay}
          onPress={() => setSelectedImage(null)}
        >
          <BlurView intensity={theme.blur.intensity} tint={theme.blur.tint} style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.backgroundColor }]}>
              <View style={styles.imageViewerContainer}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>
                {selectedImage && (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </View>
          </BlurView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  flagEmoji: {
    fontSize: 12,
    flexShrink: 0,
  },
  displayName: {
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 4,
    flexShrink: 0,
  },
  groupParticipants: {
    fontSize: 11,
    fontWeight: '400',
    marginLeft: 2,
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  imageMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messageThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  imageGrid: {
    width: 48,
    height: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridImageContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  gridImageContainer2: {
    width: 24,
    height: 48,
  },
  gridImageContainer3First: {
    width: 48,
    height: 24,
  },
  gridImageContainer3Rest: {
    width: 24,
    height: 24,
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridThumbnail2: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridThumbnail3First: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridThumbnail3Rest: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 20,
    marginBottom: 30,
  },
  newChatButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  readAllButton: {
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  readAllButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  readAllText: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 25,
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
  },
  aiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    gap: 4,
  },
  aiToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiRelevanceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    gap: 4,
  },
  aiRelevanceText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
});
