import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, TextInput, Text, KeyboardAvoidingView, Platform, Modal, Pressable, ScrollView, Image, Alert, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { RootState } from '../../store';
import { fetchMessages, clearConversationMessages } from '../../store/slices/messagesSlice';
import { setCurrentConversation, fetchConversations } from '../../store/slices/conversationsSlice';
import { sendMessage, joinConversation, leaveConversation, startTyping, stopTyping, addMessageReaction, removeMessageReaction, markMessageAsRead } from '../../services/socket';
import { initiateCall } from '../../services/webrtc';
import { initiateCall as initiateCallAction } from '../../store/slices/callSlice';
import { useTheme } from '../../hooks/useTheme';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { HuddleType, toggleLocalMute } from '../../store/slices/huddleSlice';
import { useHuddle } from '../../hooks/huddle';
import { format } from 'date-fns';
import { formatLastSeen } from '../../utils/formatLastSeen';
import api from '../../services/api';
import { getPhoneNumber, getFlag } from '../../utils/phoneUtils';
import { getFullImageUrl } from '../../utils/imageUtils';
import { InlineHuddleBar } from '../../components/InlineHuddleBar';
import { LinkPreviewComponent, extractUrls } from '../../components/chat/LinkPreview';
import { GifStickerPicker } from '../../components/chat/GifStickerPicker';
import { GiphyGif } from '../../services/giphy';

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId } = route.params;
  const dispatch = useDispatch();
  const theme = useTheme();

  const currentUser = useSelector((state: RootState) => state.auth.user, shallowEqual);
  const messagesState = useSelector((state: RootState) => state.messages.messagesByConversation[conversationId], shallowEqual) || [];
  const conversations = useSelector((state: RootState) => state.conversations.conversations, shallowEqual);
  const conversation = useSelector((state: RootState) => state.conversations.currentConversation, shallowEqual);
  const typingUsers = useSelector((state: RootState) => state.messages.typingUsers[conversationId], shallowEqual) || [];
  // Use the huddle hook for WebRTC and socket connection
  const {
    activeHuddle,
    isInCall,
    localMuted: huddleMuted,
    startHuddle,
    leaveHuddle: leaveHuddleCall,
    toggleMute: toggleHuddleMuteAction,
  } = useHuddle();

  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isHuddleMode, setIsHuddleMode] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showDateNavigation, setShowDateNavigation] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(new Set());
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [expandedCallGroups, setExpandedCallGroups] = useState<Set<string>>(new Set());

  // Reply and Forward
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  // Audio recording
  const { recordingState, startRecording, stopRecording, cancelRecording, formatDuration } = useAudioRecorder();
  const waveAnimations = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.3))).current;

  // Huddle wave animations
  const huddleWaveAnimations = useRef(Array.from({ length: 4 }, () => new Animated.Value(0.3))).current;

  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPositions, setAudioPositions] = useState<{ [key: string]: number }>({});
  const soundObjects = useRef<{ [key: string]: Audio.Sound }>({});
  const [audioDurations, setAudioDurations] = useState<{ [key: string]: number }>({});

  // Double-tap to star
  const lastTapRef = useRef<{ [key: string]: number }>({});
  const [justStarredId, setJustStarredId] = useState<string | null>(null);

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Get organized dates from messages
  const getOrganizedDates = () => {
    const dates: { [key: string]: Date[] } = {
      days: [],
      months: [],
      years: []
    };

    const seenDays = new Set<string>();
    const seenMonths = new Set<string>();
    const seenYears = new Set<string>();

    messagesState.forEach((msg) => {
      const date = new Date(msg.createdAt);
      const dayKey = format(date, 'yyyy-MM-dd');
      const monthKey = format(date, 'yyyy-MM');
      const yearKey = format(date, 'yyyy');

      if (!seenDays.has(dayKey)) {
        seenDays.add(dayKey);
        dates.days.push(date);
      }

      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        dates.months.push(date);
      }

      if (!seenYears.has(yearKey)) {
        seenYears.add(yearKey);
        dates.years.push(date);
      }
    });

    // Sort in reverse chronological order
    dates.days.sort((a, b) => b.getTime() - a.getTime());
    dates.months.sort((a, b) => b.getTime() - a.getTime());
    dates.years.sort((a, b) => b.getTime() - a.getTime());

    return dates;
  };

  const scrollToDate = (targetDate: Date) => {
    setShowDateNavigation(false);
    // Implementation would require FlatList ref to scroll to specific date
    // For now, we'll use search functionality
    setShowSearch(true);
    setSearchQuery(format(targetDate, 'MMM dd'));
  };

  const toggleDateCollapse = (dateKey: string) => {
    setCollapsedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const collapseAllDates = () => {
    const allDates = new Set<string>();
    messagesState.forEach((msg) => {
      const dateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      allDates.add(dateKey);
    });
    setCollapsedDates(allDates);
  };

  const expandAllDates = () => {
    setCollapsedDates(new Set());
  };

  const handleImagePress = (attachments: any[], startIndex: number) => {
    const imageUrls = attachments.map(att => att.url);
    setGalleryImages(imageUrls);
    setCurrentImageIndex(startIndex);
    setShowGallery(true);
  };

  const handleNextImage = () => {
    if (currentImageIndex < galleryImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Format date for separators
  const formatDateSeparator = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(date);

    // Check if same day as today
    if (
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }

    // Check if same day as yesterday
    if (
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }

    // Otherwise format as date
    return format(messageDate, 'MMMM d, yyyy');
  };

  // Process messages to insert date separators and group consecutive calls/huddles
  const getMessagesWithDateSeparators = (messages: any[]) => {
    const result: any[] = [];
    let lastDate: string | null = null;

    // First pass: group consecutive call and huddle messages
    const groupedMessages: any[] = [];
    let currentCallGroup: any[] = [];

    messages.forEach((message, index) => {
      // Group both 'call' and 'huddle' types together
      if (message.type === 'call' || message.type === 'huddle') {
        currentCallGroup.push(message);
      } else {
        // If we have accumulated call/huddle messages, process them
        if (currentCallGroup.length > 0) {
          if (currentCallGroup.length > 5) {
            // Create a summary for more than 5 consecutive calls/huddles
            const missedCount = currentCallGroup.filter(c =>
              c.metadata?.status === 'missed' || c.metadata?.status === 'rejected' || c.metadata?.status === 'failed'
            ).length;
            const completedCount = currentCallGroup.length - missedCount;
            const huddleCount = currentCallGroup.filter(c => c.type === 'huddle').length;
            const callCount = currentCallGroup.length - huddleCount;

            groupedMessages.push({
              type: 'call-group',
              _id: `call-group-${currentCallGroup[0]._id}`,
              calls: currentCallGroup,
              totalCount: currentCallGroup.length,
              missedCount,
              completedCount,
              huddleCount,
              callCount,
              createdAt: currentCallGroup[currentCallGroup.length - 1].createdAt,
              firstCallDate: currentCallGroup[0].createdAt,
              lastCallDate: currentCallGroup[currentCallGroup.length - 1].createdAt,
            });
          } else {
            // Less than or equal to 5, show them individually
            groupedMessages.push(...currentCallGroup);
          }
          currentCallGroup = [];
        }
        groupedMessages.push(message);
      }
    });

    // Don't forget remaining call group at the end
    if (currentCallGroup.length > 0) {
      if (currentCallGroup.length > 5) {
        const missedCount = currentCallGroup.filter(c =>
          c.metadata?.status === 'missed' || c.metadata?.status === 'rejected' || c.metadata?.status === 'failed'
        ).length;
        const completedCount = currentCallGroup.length - missedCount;
        const huddleCount = currentCallGroup.filter(c => c.type === 'huddle').length;
        const callCount = currentCallGroup.length - huddleCount;

        groupedMessages.push({
          type: 'call-group',
          _id: `call-group-${currentCallGroup[0]._id}`,
          calls: currentCallGroup,
          totalCount: currentCallGroup.length,
          missedCount,
          completedCount,
          huddleCount,
          callCount,
          createdAt: currentCallGroup[currentCallGroup.length - 1].createdAt,
          firstCallDate: currentCallGroup[0].createdAt,
          lastCallDate: currentCallGroup[currentCallGroup.length - 1].createdAt,
        });
      } else {
        groupedMessages.push(...currentCallGroup);
      }
    }

    // Second pass: add date separators
    groupedMessages.forEach((message, index) => {
      const messageDate = format(new Date(message.createdAt), 'yyyy-MM-dd');

      if (messageDate !== lastDate) {
        result.push({
          type: 'date-separator',
          id: `separator-${messageDate}`,
          date: message.createdAt,
        });
        lastDate = messageDate;
      }

      result.push({
        type: message.type === 'call-group' ? 'call-group' : 'message',
        ...message,
      });
    });

    return result;
  };

  useEffect(() => {
    // Find and set the current conversation
    const currentConv = conversations.find(c => c._id === conversationId);
    if (currentConv) {
      dispatch(setCurrentConversation(currentConv));
    }

    dispatch(fetchMessages({ conversationId }) as any);
    joinConversation(conversationId);

    // Fetch starred messages for this conversation
    fetchStarredMessages();

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, conversations]);

  const fetchStarredMessages = async () => {
    try {
      const response = await api.get(`/starred?conversationId=${conversationId}`);
      const starredIds = new Set(
        response.data.map((item: any) => item.messageId?._id || item.messageId).filter(Boolean)
      );
      setStarredMessageIds(starredIds);
    } catch (error) {
      console.error('Error fetching starred messages:', error);
    }
  };

  // Mark unread messages as read when viewing the conversation
  useEffect(() => {
    if (messagesState.length > 0 && currentUser?._id) {
      const unreadMessages = messagesState.filter(msg => {
        // Only mark received messages (not own messages) as read
        const isOwnMessage = msg.senderId?._id === currentUser._id;
        const hasBeenRead = msg.readReceipts?.some((r: any) => r.userId === currentUser._id);
        return !isOwnMessage && !hasBeenRead;
      });

      // Mark each unread message as read
      unreadMessages.forEach(msg => {
        markMessageAsRead(msg._id, conversationId).catch(err =>
          console.error('Error marking message as read:', err)
        );
      });
    }
  }, [messagesState, currentUser]);

  useEffect(() => {
    if (conversation) {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.userId._id !== currentUser?._id
      );
      const displayName = otherParticipant?.userId?.displayName;
      const phoneNumber = otherParticipant?.userId?.phoneNumber;

      // For groups, use group name with clickable header
      if (conversation.type === 'group') {
        const groupAvatar = conversation.avatar;
        const groupName = conversation.name || 'Group Chat';

        const groupHeaderTitle = () => (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.navigate('ChatProfile', { conversation })}
            activeOpacity={0.7}
          >
            {/* Group Avatar */}
            {getFullImageUrl(groupAvatar) ? (
              <Image
                source={{ uri: getFullImageUrl(groupAvatar)! }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  marginRight: 10
                }}
              />
            ) : (
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  {groupName.charAt(0).toUpperCase() || 'G'}
                </Text>
              </View>
            )}

            {/* Group Name */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600' }}>
                {groupName}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {conversation.participants.length} participants
              </Text>
            </View>
          </TouchableOpacity>
        );

        navigation.setOptions({
          title: undefined,
          headerTitle: groupHeaderTitle,
        });
        return;
      }

      // For direct conversations, always show phone number with flag at end as primary
      const primaryTitle = phoneNumber ? getPhoneNumber(phoneNumber) : 'Unknown';
      const flag = phoneNumber ? getFlag(phoneNumber) : null;
      const secondaryTitle = displayName && displayName.trim() !== '' ? displayName : null;
      const avatar = otherParticipant?.userId?.avatar;

      // Get last seen status for direct conversations
      let headerTitle;
      if (conversation.type === 'direct' && otherParticipant) {
        const lastSeenText = formatLastSeen(
          otherParticipant.userId.status,
          otherParticipant.userId.lastSeen
        );
        headerTitle = () => (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.navigate('ChatProfile', { conversation })}
            activeOpacity={0.7}
          >
            {/* Profile Picture */}
            {getFullImageUrl(avatar) ? (
              <Image
                source={{ uri: getFullImageUrl(avatar)! }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  marginRight: 10
                }}
              />
            ) : (
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  {primaryTitle.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}

            {/* Text Content */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600' }}>
                  {primaryTitle}
                </Text>
                {flag && (
                  <Text style={{ color: theme.text, fontSize: 12, marginLeft: 4 }}>
                    {flag}
                  </Text>
                )}
                {secondaryTitle && (
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 6 }}>
                    ({secondaryTitle})
                  </Text>
                )}
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {lastSeenText}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }

      navigation.setOptions({
        title: undefined,
        headerTitle: headerTitle || primaryTitle,
      });
    }
  }, [conversation, theme]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    try {
      const messageData: any = {
        conversationId,
        type: 'text',
        content: inputText.trim(),
      };

      // Add reply reference if replying
      if (replyToMessage) {
        messageData.replyTo = replyToMessage._id;
      }

      await sendMessage(messageData);
      setInputText('');
      setReplyToMessage(null);
      stopTyping(conversationId);
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [conversationId, inputText, replyToMessage]);

  const handleInputTextChanged = (text: string) => {
    setInputText(text);
    if (text.length > 0 && !isTyping) {
      startTyping(conversationId);
      setIsTyping(true);
    } else if (text.length === 0 && isTyping) {
      stopTyping(conversationId);
      setIsTyping(false);
    }
  };

  // Handle GIF/Sticker selection
  const handleGifSelect = async (gif: GiphyGif, type: 'gif' | 'sticker') => {
    try {
      const gifUrl = gif.images.fixed_height?.url || gif.images.original?.url;

      const messageData: any = {
        conversationId,
        type: 'image',
        content: type === 'gif' ? 'GIF' : 'Sticker',
        attachments: [{
          type: 'image',
          url: gifUrl,
          mimeType: 'image/gif',
          fileName: `${type}_${gif.id}.gif`,
        }],
      };

      await sendMessage(messageData);
      setShowGifPicker(false);
    } catch (error) {
      console.error('Error sending GIF:', error);
    }
  };

  // Message selection and actions
  const handleMessageLongPress = (message: any) => {
    setSelectedMessages(new Set([message._id]));
  };

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
  };

  const handleReply = () => {
    const messageId = Array.from(selectedMessages)[0];
    const message = messagesState.find(m => m._id === messageId);
    if (message) {
      setReplyToMessage(message);
      clearSelection();
    }
  };

  const handleAddReaction = () => {
    const messageId = Array.from(selectedMessages)[0];
    setSelectedMessageId(messageId);
    clearSelection();
    setShowEmojiPicker(true);
  };

  const handleForward = () => {
    const messagesToForward = messagesState.filter(m => selectedMessages.has(m._id));
    navigation.navigate('Forward' as never, { messagesToForward } as never);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAndSendImage(result.assets[0].uri);
    }
  };

  const uploadAndSendImage = async (uri: string) => {
    try {
      setIsUploading(true);
      const formData = new FormData();

      // @ts-ignore
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'image.jpg',
      });

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Send message with image attachment
      await sendMessage({
        conversationId,
        type: 'image',
        attachments: [{
          type: 'image',
          url: response.data.url,
          fileName: response.data.fileName,
          fileSize: response.data.fileSize,
          mimeType: response.data.mimeType,
        }],
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to send image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRecordAudio = async () => {
    const success = await startRecording();
    if (success) {
      // Start waveform animation
      animateWaveform();
    }
  };

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    if (uri) {
      uploadAndSendAudio(uri);
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
    // Stop waveform animation
    waveAnimations.forEach(anim => anim.stopAnimation());
  };

  const uploadAndSendAudio = async (uri: string) => {
    try {
      setIsUploading(true);
      const formData = new FormData();

      // @ts-ignore
      formData.append('file', {
        uri,
        type: 'audio/mp4',
        name: 'audio.m4a',
      });

      const response = await api.post('/upload/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds for audio uploads
      });

      // Send message with audio attachment
      await sendMessage({
        conversationId,
        type: 'audio',
        attachments: [{
          type: 'audio',
          url: response.data.url,
          fileName: response.data.fileName,
          fileSize: response.data.fileSize,
          mimeType: response.data.mimeType,
          duration: recordingState.duration,
        }],
      });
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      console.error('Error details:', {
        message: error.message,
        isOffline: error.isOffline,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage = error.isOffline
        ? 'Device is offline. Please check your connection.'
        : error.response?.data?.message || 'Failed to send audio message';

      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAudioPlayPause = async (messageId: string, audioUrl: string, duration?: number) => {
    try {
      // If this audio is already playing, pause it
      if (playingAudioId === messageId) {
        const sound = soundObjects.current[messageId];
        if (sound) {
          await sound.pauseAsync();
          setPlayingAudioId(null);
        }
        return;
      }

      // Stop any currently playing audio
      if (playingAudioId && soundObjects.current[playingAudioId]) {
        await soundObjects.current[playingAudioId].stopAsync();
        await soundObjects.current[playingAudioId].unloadAsync();
        delete soundObjects.current[playingAudioId];
      }

      // Load and play new audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.isPlaying) {
              setAudioPositions(prev => ({
                ...prev,
                [messageId]: status.positionMillis / 1000
              }));
            }
            if (status.didJustFinish) {
              setPlayingAudioId(null);
              setAudioPositions(prev => ({ ...prev, [messageId]: 0 }));
            }
          }
        }
      );

      soundObjects.current[messageId] = sound;
      setPlayingAudioId(messageId);

      // Get duration if not provided
      if (duration) {
        setAudioDurations(prev => ({ ...prev, [messageId]: duration }));
      } else {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setAudioDurations(prev => ({ ...prev, [messageId]: status.durationMillis / 1000 }));
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(soundObjects.current).forEach(async (sound) => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (error) {
          // Ignore cleanup errors
        }
      });
    };
  }, []);

  const animateWaveform = () => {
    const animations = waveAnimations.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 300 + Math.random() * 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 300 + Math.random() * 200,
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach((anim, index) => {
      setTimeout(() => anim.start(), index * 100);
    });
  };

  // Stop waveform animation when recording stops
  useEffect(() => {
    if (!recordingState.isRecording) {
      waveAnimations.forEach(anim => anim.stopAnimation());
      waveAnimations.forEach(anim => anim.setValue(0.3));
    }
  }, [recordingState.isRecording]);

  // Call handlers (supports both Regular and Huddle modes)
  const handleAudioCall = async () => {
    console.log('[ChatScreen] Starting audio call, mode:', isHuddleMode ? 'Huddle' : 'Regular');
    console.log('[ChatScreen] conversationId:', conversationId, 'HuddleType.AUDIO:', HuddleType.AUDIO);
    try {
      if (isHuddleMode) {
        // Start Huddle call with WebRTC via useHuddle hook
        // This initializes local stream, socket connection, and WebRTC
        console.log('[ChatScreen] Calling startHuddle with chatId:', conversationId, 'type:', HuddleType.AUDIO);
        await startHuddle(conversationId, HuddleType.AUDIO);
        // Huddle stays inline - no navigation
      } else {
        // Start Regular call - get participant IDs for WebRTC
        const participantIds = conversation?.participants
          ?.filter((p: any) => p.userId._id !== currentUser?._id)
          .map((p: any) => p.userId._id) || [];

        // Navigate first, then initiate the call via WebRTC service
        navigation.navigate('Call');
        await initiateCall(conversationId, participantIds, 'audio');
      }
    } catch (error) {
      console.error('[ChatScreen] Error starting audio call:', error);
      Alert.alert('Error', 'Failed to start audio call');
    }
  };

  const handleVideoCall = async () => {
    console.log('[ChatScreen] Starting video call, mode:', isHuddleMode ? 'Huddle' : 'Regular');
    try {
      if (isHuddleMode) {
        // Start Huddle call with WebRTC via useHuddle hook
        // This initializes local stream, socket connection, and WebRTC
        await startHuddle(conversationId, HuddleType.VIDEO);
        // Huddle stays inline - no navigation
      } else {
        // Start Regular call - get participant IDs for WebRTC
        const participantIds = conversation?.participants
          ?.filter((p: any) => p.userId._id !== currentUser?._id)
          .map((p: any) => p.userId._id) || [];

        // Navigate first, then initiate the call via WebRTC service
        navigation.navigate('Call');
        await initiateCall(conversationId, participantIds, 'video');
      }
    } catch (error) {
      console.error('[ChatScreen] Error starting video call:', error);
      Alert.alert('Error', 'Failed to start video call');
    }
  };

  // Inline Huddle Handlers - use the hook's methods for proper WebRTC cleanup
  const handleEndHuddle = async () => {
    try {
      await leaveHuddleCall();
    } catch (error) {
      console.error('[ChatScreen] Error ending huddle:', error);
      Alert.alert('Error', 'Failed to end huddle');
    }
  };

  const handleToggleHuddleMute = () => {
    toggleHuddleMuteAction();
  };

  const handleReactionPress = async (messageId: string, emoji: string) => {
    try {
      const message = messagesState.find(m => m._id === messageId);
      const userReaction = message?.reactions?.find(
        (r: any) => r.userId === currentUser?._id && r.emoji === emoji
      );

      if (userReaction) {
        await removeMessageReaction(messageId, emoji);
      } else {
        await addMessageReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (selectedMessageId) {
      await handleReactionPress(selectedMessageId, emoji);
      setShowEmojiPicker(false);
      setSelectedMessageId(null);
    }
  };

  const handleStarMessage = async (messageId: string) => {
    try {
      const isStarred = starredMessageIds.has(messageId);

      if (isStarred) {
        // Unstar the message
        await api.delete(`/starred/${messageId}`);
        setStarredMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      } else {
        // Star the message
        await api.post(`/starred/${messageId}?conversationId=${conversationId}`);
        setStarredMessageIds(prev => new Set([...prev, messageId]));
      }

      setShowEmojiPicker(false);
      setSelectedMessageId(null);
    } catch (error: any) {
      console.error('Error starring message:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to star message');
    }
  };

  // Handle double-tap on message to star/unstar
  const handleMessageDoubleTap = (messageId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // milliseconds

    if (lastTapRef.current[messageId] && now - lastTapRef.current[messageId] < DOUBLE_TAP_DELAY) {
      // Double tap detected
      handleStarMessage(messageId);
      setJustStarredId(messageId);
      setTimeout(() => setJustStarredId(null), 1500);
      lastTapRef.current[messageId] = 0; // Reset
    } else {
      // First tap
      lastTapRef.current[messageId] = now;
    }
  };

  // Check initial mute status when conversation loads
  useEffect(() => {
    if (conversation && currentUser?._id) {
      const currentParticipant = conversation.participants.find(
        (p: any) => p.userId._id === currentUser._id
      );
      if (currentParticipant) {
        setIsMuted(currentParticipant.isMuted || false);
      }
    }
  }, [conversation, currentUser]);

  const handleToggleMute = async () => {
    try {
      const newMutedState = !isMuted;
      await api.put(`/conversations/${conversationId}/mute`, { isMuted: newMutedState });
      setIsMuted(newMutedState);
      Alert.alert(
        'Success',
        newMutedState ? 'Notifications muted' : 'Notifications unmuted'
      );
    } catch (error) {
      console.error('Error toggling mute:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/conversations/${conversationId}/messages`);
              dispatch(clearConversationMessages({ conversationId }));
              // Refresh conversations list to update lastMessage
              dispatch(fetchConversations() as any);
              Alert.alert('Success', 'Chat cleared successfully');
            } catch (error) {
              console.error('Error clearing chat:', error);
              Alert.alert('Error', 'Failed to clear chat');
            }
          },
        },
      ]
    );
  };

  const handleBlockContact = () => {
    const otherParticipant = conversation?.participants.find(
      (p: any) => p.userId._id !== currentUser?._id
    );

    if (!otherParticipant) {
      Alert.alert('Error', 'Cannot find contact to block');
      return;
    }

    const contactName = otherParticipant.userId.displayName || otherParticipant.userId.phoneNumber || 'this contact';

    Alert.alert(
      'Block Contact',
      `Are you sure you want to block ${contactName}? You will no longer receive messages from this contact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/users/me/blocked-users', { userId: otherParticipant.userId._id });
              Alert.alert('Success', 'Contact blocked successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              console.error('Error blocking contact:', error);
              Alert.alert('Error', 'Failed to block contact');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    // Show action bar in header when messages are selected
    if (selectedMessages.size > 0) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity onPress={clearSelection} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
        headerTitle: () => (
          <Text style={[styles.headerTitleText, { color: theme.text }]}>
            {selectedMessages.size} selected
          </Text>
        ),
        headerRight: () => (
          <View style={styles.headerButtons}>
            {selectedMessages.size === 1 && (
              <>
                <TouchableOpacity onPress={handleAddReaction} style={styles.headerButton}>
                  <Ionicons name="happy-outline" size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleReply} style={styles.headerButton}>
                  <Ionicons name="arrow-undo" size={24} color={theme.text} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={handleForward} style={styles.headerButton}>
              <Ionicons name="arrow-redo" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        ),
      });
    } else {
      navigation.setOptions({
        headerLeft: undefined,
        headerRight: () => (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => {
                const newMode = !isHuddleMode;
                setIsHuddleMode(newMode);
                console.log(`[ChatScreen] Huddle mode ${newMode ? 'ENABLED' : 'DISABLED'}`);
                Alert.alert(
                  newMode ? 'Huddle Mode ON' : 'Huddle Mode OFF',
                  newMode
                    ? 'Next call will be a huddle (group call)'
                    : 'Next call will be a regular 1:1 call',
                  [{ text: 'OK' }],
                  { cancelable: true }
                );
              }}
              style={[
                styles.huddleToggle,
                { backgroundColor: isHuddleMode ? theme.primary : theme.backgroundSecondary }
              ]}
            >
              <Ionicons
                name={isHuddleMode ? "flash" : "flash-outline"}
                size={16}
                color={isHuddleMode ? "#fff" : theme.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAudioCall} style={styles.headerButton}>
              <Ionicons name="call-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleVideoCall} style={styles.headerButton}>
              <Ionicons name="videocam-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowOptionsMenu(true)} style={styles.headerButton}>
              <Ionicons name="ellipsis-vertical" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [conversation, theme, selectedMessages, handleAudioCall, handleVideoCall, isHuddleMode]);

  // Clear selection when returning from Forward screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Clear selection when screen comes back into focus
      if (selectedMessages.size > 0) {
        clearSelection();
      }
    });

    return unsubscribe;
  }, [navigation]);

  const renderMessage = ({ item }: any) => {
    // Render date separator
    if (item.type === 'date-separator') {
      const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
      const isCollapsed = collapsedDates.has(dateKey);

      // Count messages for this date
      const messageCount = messagesState.filter(msg => {
        const msgDateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
        return msgDateKey === dateKey;
      }).length;

      return (
        <TouchableOpacity
          style={styles.dateSeparatorContainer}
          onPress={() => toggleDateCollapse(dateKey)}
          onLongPress={() => setShowTimestamps(!showTimestamps)}
          activeOpacity={0.7}
        >
          <View style={[styles.dateSeparatorLine, { backgroundColor: theme.border }]} />
          <View style={[
            styles.dateSeparatorTextContainer,
            { backgroundColor: theme.background },
            isCollapsed && { backgroundColor: theme.backgroundSecondary }
          ]}>
            <Ionicons
              name={isCollapsed ? "chevron-down-circle" : "chevron-up-circle"}
              size={16}
              color={isCollapsed ? theme.textTertiary : theme.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[
              styles.dateSeparatorText,
              { color: theme.textSecondary },
              isCollapsed && { color: theme.textTertiary }
            ]}>
              {formatDateSeparator(item.date)}
            </Text>
            {isCollapsed && (
              <Text style={[styles.collapsedCount, { color: theme.textTertiary }]}>
                ({messageCount} message{messageCount !== 1 ? 's' : ''} hidden)
              </Text>
            )}
          </View>
          <View style={[styles.dateSeparatorLine, { backgroundColor: theme.border }]} />
        </TouchableOpacity>
      );
    }

    // Render call message as centered system message
    if (item.type === 'call') {
      const isMissedOrFailed = item.metadata?.status === 'missed' || item.metadata?.status === 'rejected' || item.metadata?.status === 'failed';
      const callColor = isMissedOrFailed ? '#EF4444' : '#22C55E';
      const callTime = format(new Date(item.createdAt), 'HH:mm');
      return (
        <View style={styles.systemMessageContainer}>
          <View style={[styles.systemMessageBubble, { backgroundColor: callColor + '15' }]}>
            <Ionicons
              name={item.metadata?.type === 'video' ? 'videocam' : 'call'}
              size={16}
              color={callColor}
            />
            <Text style={[styles.systemMessageText, { color: theme.text }]}>
              {item.metadata?.status === 'missed'
                ? `Missed ${item.metadata?.type === 'video' ? 'video' : 'voice'} call`
                : item.metadata?.status === 'rejected'
                ? `${item.metadata?.type === 'video' ? 'Video' : 'Voice'} call declined`
                : item.metadata?.status === 'failed'
                ? `${item.metadata?.type === 'video' ? 'Video' : 'Voice'} call failed`
                : item.metadata?.duration
                ? `${item.metadata?.type === 'video' ? 'Video' : 'Voice'} call • ${item.metadata.duration >= 60 ? `${Math.floor(item.metadata.duration / 60)}m ${item.metadata.duration % 60}s` : `${item.metadata.duration}s`}`
                : `${item.metadata?.type === 'video' ? 'Video' : 'Voice'} call ended`}
            </Text>
            <Text style={[styles.systemMessageTime, { color: theme.textTertiary }]}>
              {callTime}
            </Text>
          </View>
        </View>
      );
    }

    // Render grouped call/huddle messages (more than 5 consecutive)
    if (item.type === 'call-group') {
      const isExpanded = expandedCallGroups.has(item._id);
      const hasMissed = item.missedCount > 0;
      const hasHuddles = item.huddleCount > 0;
      const groupColor = '#6B7280'; // Gray for collapsed/expanded header
      const callTime = format(new Date(item.createdAt), 'HH:mm');

      const toggleExpand = () => {
        setExpandedCallGroups(prev => {
          const newSet = new Set(prev);
          if (newSet.has(item._id)) {
            newSet.delete(item._id);
          } else {
            newSet.add(item._id);
          }
          return newSet;
        });
      };

      if (isExpanded) {
        // Show all individual calls/huddles when expanded
        return (
          <View>
            {/* Collapse header */}
            <TouchableOpacity onPress={toggleExpand} style={styles.systemMessageContainer}>
              <View style={[styles.systemMessageBubble, { backgroundColor: groupColor + '15' }]}>
                <Ionicons name="chevron-up" size={16} color={groupColor} />
                <Text style={[styles.systemMessageText, { color: theme.text }]}>
                  Hide {item.totalCount} items
                </Text>
              </View>
            </TouchableOpacity>
            {/* Individual calls/huddles */}
            {item.calls.map((call: any) => {
              const isHuddle = call.type === 'huddle';
              const isMissedOrFailed = call.metadata?.status === 'missed' || call.metadata?.status === 'rejected' || call.metadata?.status === 'failed';
              const callColor = isHuddle ? '#8B5CF6' : (isMissedOrFailed ? '#EF4444' : '#22C55E');
              const individualCallTime = format(new Date(call.createdAt), 'HH:mm');

              if (isHuddle) {
                return (
                  <View key={call._id} style={styles.systemMessageContainer}>
                    <View style={[styles.systemMessageBubble, { backgroundColor: callColor + '15' }]}>
                      <Ionicons name="people" size={16} color={callColor} />
                      <Text style={[styles.systemMessageText, { color: theme.text }]}>
                        Huddle{call.metadata?.duration
                          ? ` • ${call.metadata.duration >= 60 ? `${Math.floor(call.metadata.duration / 60)}m ${call.metadata.duration % 60}s` : `${call.metadata.duration}s`}`
                          : ''}
                      </Text>
                      <Text style={[styles.systemMessageTime, { color: theme.textTertiary }]}>
                        {individualCallTime}
                      </Text>
                    </View>
                  </View>
                );
              }

              return (
                <View key={call._id} style={styles.systemMessageContainer}>
                  <View style={[styles.systemMessageBubble, { backgroundColor: callColor + '15' }]}>
                    <Ionicons
                      name={call.metadata?.type === 'video' ? 'videocam' : 'call'}
                      size={16}
                      color={callColor}
                    />
                    <Text style={[styles.systemMessageText, { color: theme.text }]}>
                      {call.metadata?.status === 'missed'
                        ? `Missed ${call.metadata?.type === 'video' ? 'video' : 'voice'} call`
                        : call.metadata?.status === 'rejected'
                        ? `${call.metadata?.type === 'video' ? 'Video' : 'Voice'} call declined`
                        : call.metadata?.status === 'failed'
                        ? `${call.metadata?.type === 'video' ? 'Video' : 'Voice'} call failed`
                        : call.metadata?.duration
                        ? `${call.metadata?.type === 'video' ? 'Video' : 'Voice'} call • ${call.metadata.duration >= 60 ? `${Math.floor(call.metadata.duration / 60)}m ${call.metadata.duration % 60}s` : `${call.metadata.duration}s`}`
                        : `${call.metadata?.type === 'video' ? 'Video' : 'Voice'} call ended`}
                    </Text>
                    <Text style={[styles.systemMessageTime, { color: theme.textTertiary }]}>
                      {individualCallTime}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      }

      // Collapsed view - show icons with counts
      return (
        <TouchableOpacity onPress={toggleExpand} style={styles.systemMessageContainer}>
          <View style={[styles.systemMessageBubble, { backgroundColor: groupColor + '15' }]}>
            {item.callCount > 0 && (
              <>
                <Ionicons name="call" size={16} color="#22C55E" />
                <Text style={[styles.systemMessageText, { color: theme.text }]}>{item.callCount}</Text>
              </>
            )}
            {item.huddleCount > 0 && (
              <>
                <Ionicons name="people" size={16} color="#8B5CF6" style={{ marginLeft: item.callCount > 0 ? 8 : 0 }} />
                <Text style={[styles.systemMessageText, { color: theme.text }]}>{item.huddleCount}</Text>
              </>
            )}
            {hasMissed && (
              <>
                <Ionicons name="call" size={16} color="#EF4444" style={{ marginLeft: 8, transform: [{ rotate: '135deg' }] }} />
                <Text style={[styles.systemMessageText, { color: '#EF4444' }]}>{item.missedCount}</Text>
              </>
            )}
            <Ionicons name="chevron-down" size={14} color={theme.textTertiary} style={{ marginLeft: 4 }} />
            <Text style={[styles.systemMessageTime, { color: theme.textTertiary }]}>
              {callTime}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Render huddle message as centered system message
    if (item.type === 'huddle') {
      const huddleColor = '#8B5CF6';
      return (
        <View style={styles.systemMessageContainer}>
          <View style={[styles.systemMessageBubble, { backgroundColor: huddleColor + '15' }]}>
            <Ionicons
              name="people"
              size={16}
              color={huddleColor}
            />
            <Text style={[styles.systemMessageText, { color: theme.text }]}>
              Huddle {item.metadata?.type === 'video' ? 'video' : 'voice'} call{item.metadata?.duration
                ? ` • ${item.metadata.duration >= 60 ? `${Math.floor(item.metadata.duration / 60)}m ${item.metadata.duration % 60}s` : `${item.metadata.duration}s`}`
                : ''}{item.metadata?.participantCount ? ` • ${item.metadata.participantCount}` : ''}
            </Text>
          </View>
        </View>
      );
    }

    // Render regular message
    const isOwnMessage = item.senderId?._id === currentUser?._id;
    const reactions = item.reactions || [];
    const isStarred = starredMessageIds.has(item._id);

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc: any, reaction: any) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction.userId);
      return acc;
    }, {});

    // Calculate read receipts status for own messages
    let readReceiptIcon = null;
    if (isOwnMessage && conversation) {
      const readReceipts = item.readReceipts || [];
      const otherParticipants = conversation.participants.filter(
        (p: any) => p.userId._id !== currentUser?._id
      );

      // All recipients have read the message
      // Check if message has been read (readReceipts exist)
      const hasReadReceipts = readReceipts.length > 0;

      if (hasReadReceipts) {
        // Double green checkmarks - message has been read/seen
        readReceiptIcon = (
          <View style={styles.readReceiptContainer}>
            <Ionicons name="checkmark-done" size={16} color="#25D366" />
          </View>
        );
      } else {
        // Single green checkmark - message delivered but not read yet
        readReceiptIcon = (
          <View style={styles.readReceiptContainer}>
            <Ionicons name="checkmark" size={16} color="#25D366" />
          </View>
        );
      }
    }

    const isSelected = selectedMessages.has(item._id);

    return (
      <View style={[
        styles.messageRow,
        isSelected && styles.selectedMessageRow
      ]}>
        {/* Selection Indicator on Left */}
        {selectedMessages.size > 0 && (
          <TouchableOpacity
            onPress={() => handleMessageSelect(item._id)}
            style={styles.selectionIndicatorLeft}
          >
            <View style={[
              styles.selectionCircle,
              { borderColor: theme.primary },
              isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}>
              {isSelected && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        )}

        <Pressable
          onLongPress={() => handleMessageLongPress(item)}
          onPress={() => {
            if (selectedMessages.size > 0) {
              handleMessageSelect(item._id);
            } else {
              handleMessageDoubleTap(item._id);
            }
          }}
          style={{ flex: 1 }}
        >
          <View style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
          ]}>
        {!isOwnMessage && (
          <Text style={[styles.senderName, { color: theme.textSecondary }]}>
            {item.senderId?.displayName}
          </Text>
        )}
        <View>
          <View style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
            isOwnMessage
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.backgroundSecondary }
          ]}>
            {/* Display replied message */}
            {item.replyTo && (
              <View style={[
                styles.repliedMessageContainer,
                { backgroundColor: isOwnMessage ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)' }
              ]}>
                <View style={[styles.repliedMessageBar, { backgroundColor: theme.primary }]} />
                <View style={styles.repliedMessageContent}>
                  <Text style={[
                    styles.repliedMessageSender,
                    { color: theme.primary }
                  ]}>
                    {item.replyTo.senderId?.displayName || 'User'}
                  </Text>
                  <Text
                    style={[
                      styles.repliedMessageText,
                      { color: isOwnMessage ? 'rgba(255, 255, 255, 0.8)' : theme.textSecondary }
                    ]}
                    numberOfLines={1}
                  >
                    {item.replyTo.content || '📎 Attachment'}
                  </Text>
                </View>
              </View>
            )}

            {/* Display forwarded indicator */}
            {item.isForwarded && (
              <View style={styles.forwardedIndicator}>
                <Ionicons
                  name="arrow-redo"
                  size={14}
                  color={isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : theme.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[
                  styles.forwardedText,
                  { color: isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : theme.textSecondary }
                ]}>
                  Forwarded
                </Text>
              </View>
            )}

            {/* Display image attachments */}
            {item.attachments && item.attachments.length > 0 && item.attachments[0].type === 'image' && (
              item.attachments.length === 1 ? (
                // Single image
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handleImagePress(item.attachments, 0)}
                >
                  <Image
                    source={{ uri: item.attachments[0].url }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                // Multiple images grid
                <View style={styles.multiImageGrid}>
                  {item.attachments.slice(0, 4).map((attachment: any, index: number) => {
                    const totalImages = Math.min(item.attachments.length, 4);
                    let imageContainerStyle = styles.gridImageItem;
                    let imageStyle = styles.gridImage;

                    // Dynamic sizing based on image count
                    if (totalImages === 2) {
                      imageContainerStyle = styles.gridImageItem2;
                      imageStyle = styles.gridImage2;
                    } else if (totalImages === 3) {
                      imageContainerStyle = index === 0 ? styles.gridImageItem3First : styles.gridImageItem3Rest;
                      imageStyle = index === 0 ? styles.gridImage3First : styles.gridImage3Rest;
                    }

                    return (
                      <TouchableOpacity
                        key={index}
                        style={imageContainerStyle}
                        onPress={() => handleImagePress(item.attachments, index)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: attachment.thumbnailUrl || attachment.url }}
                          style={imageStyle}
                          resizeMode="cover"
                        />
                        {index === 3 && item.attachments.length > 4 && (
                          <View style={styles.moreImagesOverlay}>
                            <Text style={styles.moreImagesText}>+{item.attachments.length - 4}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}

            {/* Display audio attachments */}
            {item.attachments && item.attachments.length > 0 && item.attachments[0].type === 'audio' && (
              <View style={styles.audioMessageContainer}>
                <TouchableOpacity
                  style={[
                    styles.audioPlayButton,
                    { backgroundColor: isOwnMessage ? 'rgba(255, 255, 255, 0.3)' : theme.primary }
                  ]}
                  onPress={() => handleAudioPlayPause(
                    item._id,
                    item.attachments[0].url,
                    item.attachments[0].duration
                  )}
                >
                  <Ionicons
                    name={playingAudioId === item._id ? "pause" : "play"}
                    size={20}
                    color={isOwnMessage ? '#fff' : '#fff'}
                  />
                </TouchableOpacity>
                <View style={styles.audioInfoContainer}>
                  <View style={styles.audioWaveform}>
                    {Array.from({ length: 20 }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.audioBar,
                          {
                            height: Math.random() * 20 + 10,
                            backgroundColor: isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : theme.primary + '88',
                            opacity: playingAudioId === item._id && (audioPositions[item._id] || 0) / (audioDurations[item._id] || 1) > index / 20 ? 1 : 0.5,
                          }
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[
                    styles.audioDuration,
                    { color: isOwnMessage ? 'rgba(255, 255, 255, 0.9)' : theme.textSecondary }
                  ]}>
                    {playingAudioId === item._id && audioPositions[item._id]
                      ? formatDuration(Math.floor(audioPositions[item._id]))
                      : formatDuration(item.attachments[0].duration || audioDurations[item._id] || 0)}
                  </Text>
                </View>
              </View>
            )}

            {/* Display text content if exists */}
            {item.content && (
              <Text style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : { color: theme.text },
                item.attachments && item.attachments.length > 0 && { marginTop: 8 }
              ]}>
                {item.content}
              </Text>
            )}
            {/* Display link previews for URLs in message */}
            {item.content && extractUrls(item.content).slice(0, 1).map((url: string, index: number) => (
              <LinkPreviewComponent
                key={`${item._id}-link-${index}`}
                url={url}
                isOwnMessage={isOwnMessage}
              />
            ))}
            {showTimestamps && (
              <View style={styles.messageFooter}>
                {isStarred && (
                  <Ionicons
                    name="star"
                    size={12}
                    color={isOwnMessage ? 'rgba(255, 255, 255, 0.9)' : '#FFD700'}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[
                  styles.messageTime,
                  isOwnMessage ? styles.ownMessageTime : { color: theme.textTertiary }
                ]}>
                  {format(new Date(item.createdAt), 'HH:mm')}
                </Text>
                {readReceiptIcon}
              </View>
            )}
          </View>
          {/* Double-tap star animation */}
          {justStarredId === item._id && (
            <View style={styles.starAnimationContainer}>
              <Ionicons
                name={isStarred ? "star" : "star-outline"}
                size={48}
                color="#FFD700"
                style={styles.starAnimationIcon}
              />
            </View>
          )}

          {Object.keys(groupedReactions).length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(groupedReactions).map(([emoji, userIds]: [string, any]) => {
                const hasUserReacted = userIds.includes(currentUser?._id);
                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReactionPress(item._id, emoji)}
                    style={[
                      styles.reactionBubble,
                      { backgroundColor: theme.backgroundSecondary },
                      hasUserReacted && { backgroundColor: theme.primary + '33' }
                    ]}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={[styles.reactionCount, { color: theme.text }]}>
                      {userIds.length}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
        </View>
        </Pressable>
      </View>
    );
  };

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim() !== ''
    ? messagesState.filter(msg =>
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messagesState;

  // Process messages with date separators
  const messagesWithSeparators = getMessagesWithDateSeparators(filteredMessages);

  // Filter out messages under collapsed dates
  const visibleMessages = messagesWithSeparators.filter(item => {
    if (item.type === 'date-separator') {
      return true; // Always show date separators
    }
    // Check if this message's date is collapsed
    const messageDate = format(new Date(item.createdAt), 'yyyy-MM-dd');
    return !collapsedDates.has(messageDate);
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search in conversation..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={[...visibleMessages].reverse()}
        renderItem={renderMessage}
        keyExtractor={(item) => item.type === 'date-separator' ? item.id : (item.type === 'call-group' ? item._id : item._id)}
        inverted
        contentContainerStyle={[
          styles.messagesList,
          visibleMessages.length === 0 && { flexGrow: 1, justifyContent: 'flex-end' }
        ]}
      />
      {typingUsers.length > 0 && (
        <BlurView
          intensity={theme.blur.intensity}
          tint={theme.blur.tint}
          style={styles.typingIndicator}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.cardBackground }]} />
          <View style={styles.typingContent}>
            <View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
            <View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
            <View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.typingText, { color: theme.text, marginLeft: 8 }]}>
              {typingUsers[0]} is typing
            </Text>
          </View>
        </BlurView>
      )}

      {/* Inline Huddle Bar */}
      {isInCall && activeHuddle && (
        <InlineHuddleBar
          huddle={activeHuddle}
          isMuted={huddleMuted}
          onToggleMute={handleToggleHuddleMute}
          onEndCall={handleEndHuddle}
        />
      )}

      {/* Reply preview bar */}
      {replyToMessage && !recordingState.isRecording && (
        <BlurView
          intensity={theme.blur.intensity}
          tint={theme.blur.tint}
          style={[styles.replyPreviewContainer, { borderTopColor: theme.border }]}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.cardBackground }]} />
          <View style={[styles.replyPreviewBar, { backgroundColor: theme.primary }]} />
          <View style={styles.replyPreviewContent}>
            <Text style={[styles.replyPreviewName, { color: theme.primary }]}>
              {replyToMessage.senderId?.displayName || 'User'}
            </Text>
            <Text style={[styles.replyPreviewText, { color: theme.textSecondary }]} numberOfLines={1}>
              {replyToMessage.content || (replyToMessage.attachments?.[0]?.type === 'image' ? '📷 Photo' : '🎵 Audio')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyToMessage(null)} style={styles.replyPreviewClose}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </BlurView>
      )}

      {recordingState.isRecording ? (
        // Recording UI
        <BlurView
          intensity={theme.blur.intensity}
          tint={theme.blur.tint}
          style={styles.recordingContainer}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.inputBackground }]} />
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.error + '20' }]}
            onPress={handleCancelRecording}
          >
            <Ionicons name="close" size={24} color={theme.error} />
          </TouchableOpacity>

          <View style={styles.waveformContainer}>
            {waveAnimations.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBar,
                  { backgroundColor: theme.primary },
                  {
                    transform: [{ scaleY: anim }],
                  },
                ]}
              />
            ))}
          </View>

          <Text style={[styles.recordingTime, { color: theme.text }]}>
            {formatDuration(recordingState.duration)}
          </Text>

          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: theme.primary }]}
            onPress={handleStopRecording}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </BlurView>
      ) : (
        // Normal input UI
        <BlurView
          intensity={theme.blur.intensity}
          tint={theme.blur.tint}
          style={[styles.inputContainer, { borderTopColor: theme.border }]}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.inputBackground }]} />
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={pickImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="image-outline" size={24} color={theme.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gifButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={() => setShowGifPicker(true)}
            disabled={isUploading}
          >
            <Text style={[styles.gifButtonText, { color: theme.primary }]}>GIF</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary }]}
            value={inputText}
            onChangeText={handleInputTextChanged}
            placeholder="Type a message..."
            placeholderTextColor={theme.textTertiary}
            multiline
            editable={!isUploading}
          />
          {inputText.trim() ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={handleSend}
              disabled={isUploading}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={handleRecordAudio}
              disabled={isUploading}
            >
              <Ionicons name="mic" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </BlurView>
      )}

      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEmojiPicker(false)}
        >
          <BlurView
            intensity={theme.blur.intensity}
            tint={theme.blur.tint}
            style={styles.emojiPickerContainer}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.modalBackground, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }]} />
            <Text style={[styles.emojiPickerTitle, { color: theme.text }]}>
              Message Actions
            </Text>

            {/* Star Message Button */}
            {selectedMessageId && (
              <TouchableOpacity
                style={[styles.starMessageButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                onPress={() => handleStarMessage(selectedMessageId)}
              >
                <Ionicons
                  name={starredMessageIds.has(selectedMessageId) ? "star" : "star-outline"}
                  size={24}
                  color={starredMessageIds.has(selectedMessageId) ? '#FFD700' : theme.text}
                />
                <Text style={[styles.starMessageText, { color: theme.text }]}>
                  {starredMessageIds.has(selectedMessageId) ? 'Unstar Message' : 'Star Message'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.emojiPickerSubtitle, { color: theme.textSecondary }]}>
              React with an emoji
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.emojiGrid}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.emojiButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => handleEmojiSelect(emoji)}
                  >
                    <Text style={styles.emojiButtonText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </BlurView>
        </Pressable>
      </Modal>

      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowOptionsMenu(false)}
        >
          <BlurView
            intensity={theme.blur.intensity}
            tint={theme.blur.tint}
            style={styles.optionsMenuContainer}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.modalBackground, borderRadius: 12 }]} />
            <ScrollView
              showsVerticalScrollIndicator={true}
              bounces={false}
              style={{ borderRadius: 12 }}
            >
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  if (conversation) {
                    navigation.navigate('ChatProfile', { conversation });
                  }
                }}
              >
                <Ionicons name="person-outline" size={24} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>View {conversation?.type === 'group' ? 'group' : 'contact'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowSearch(true);
                }}
              >
                <Ionicons name="search-outline" size={24} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Search</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowTimestamps(!showTimestamps);
                }}
              >
                <Ionicons name={showTimestamps ? "time-outline" : "time"} size={24} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>
                  {showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowDateNavigation(true);
                }}
              >
                <Ionicons name="calendar-outline" size={24} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Jump to date</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  handleToggleMute();
                }}
              >
                <Ionicons
                  name={isMuted ? "notifications-outline" : "notifications-off-outline"}
                  size={24}
                  color={theme.text}
                />
                <Text style={[styles.optionText, { color: theme.text }]}>
                  {isMuted ? 'Unmute notifications' : 'Mute notifications'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  collapseAllDates();
                }}
              >
                <Ionicons name="contract-outline" size={24} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Collapse all dates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  expandAllDates();
                }}
              >
                <Ionicons name="expand-outline" size={24} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Expand all dates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  handleClearChat();
                }}
              >
                <Ionicons name="trash-outline" size={24} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Clear chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  navigation.navigate('Profile', {
                    screen: 'Settings'
                  });
                }}
              >
                <Ionicons name="settings-outline" size={24} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  handleBlockContact();
                }}
              >
                <Ionicons name="ban-outline" size={24} color="#FF3B30" />
                <Text style={[styles.optionText, { color: '#FF3B30' }]}>Block</Text>
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </Pressable>
      </Modal>

      {/* Date Navigation Modal */}
      <Modal
        visible={showDateNavigation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateNavigation(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDateNavigation(false)}
        >
          <BlurView
            intensity={theme.blur.intensity}
            tint={theme.blur.tint}
            style={styles.dateNavigationContainer}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.modalBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20 }]} />
            <View style={[styles.dateNavigationHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dateNavigationTitle, { color: theme.text }]}>Jump to Date</Text>
              <TouchableOpacity onPress={() => setShowDateNavigation(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dateNavigationScroll}>
              {(() => {
                const organizedDates = getOrganizedDates();

                return (
                  <>
                    {/* Days Section */}
                    {organizedDates.days.length > 0 && (
                      <View style={styles.dateSection}>
                        <Text style={[styles.dateSectionTitle, { color: theme.textSecondary }]}>
                          Recent Days
                        </Text>
                        {organizedDates.days.slice(0, 7).map((date, index) => (
                          <TouchableOpacity
                            key={`day-${index}`}
                            style={[styles.dateItem, { borderBottomColor: theme.border }]}
                            onPress={() => scrollToDate(date)}
                          >
                            <Ionicons name="calendar" size={20} color={theme.primary} />
                            <Text style={[styles.dateItemText, { color: theme.text }]}>
                              {formatDateSeparator(date)}
                            </Text>
                            <Text style={[styles.dateItemSubtext, { color: theme.textSecondary }]}>
                              {format(date, 'EEEE')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Months Section */}
                    {organizedDates.months.length > 0 && (
                      <View style={styles.dateSection}>
                        <Text style={[styles.dateSectionTitle, { color: theme.textSecondary }]}>
                          Months
                        </Text>
                        {organizedDates.months.map((date, index) => (
                          <TouchableOpacity
                            key={`month-${index}`}
                            style={[styles.dateItem, { borderBottomColor: theme.border }]}
                            onPress={() => scrollToDate(date)}
                          >
                            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                            <Text style={[styles.dateItemText, { color: theme.text }]}>
                              {format(date, 'MMMM yyyy')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Years Section */}
                    {organizedDates.years.length > 0 && (
                      <View style={styles.dateSection}>
                        <Text style={[styles.dateSectionTitle, { color: theme.textSecondary }]}>
                          Years
                        </Text>
                        {organizedDates.years.map((date, index) => (
                          <TouchableOpacity
                            key={`year-${index}`}
                            style={[styles.dateItem, { borderBottomColor: theme.border }]}
                            onPress={() => scrollToDate(date)}
                          >
                            <Ionicons name="time-outline" size={20} color={theme.primary} />
                            <Text style={[styles.dateItemText, { color: theme.text }]}>
                              {format(date, 'yyyy')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </BlurView>
        </Pressable>
      </Modal>

      {/* Image Gallery Modal */}
      <Modal
        visible={showGallery}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGallery(false)}
      >
        <View style={styles.galleryContainer}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryCounter}>
              {currentImageIndex + 1} / {galleryImages.length}
            </Text>
            <TouchableOpacity
              style={styles.galleryCloseButton}
              onPress={() => setShowGallery(false)}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / screenWidth);
              setCurrentImageIndex(index);
            }}
            contentOffset={{ x: currentImageIndex * screenWidth, y: 0 }}
            style={styles.galleryScrollView}
          >
            {galleryImages.map((imageUrl, index) => (
              <View key={index} style={{ width: screenWidth, height: screenHeight }}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.galleryImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Navigation Arrows */}
          {currentImageIndex > 0 && (
            <TouchableOpacity
              style={[styles.galleryArrow, styles.galleryArrowLeft]}
              onPress={handlePrevImage}
            >
              <Ionicons name="chevron-back" size={36} color="#fff" />
            </TouchableOpacity>
          )}

          {currentImageIndex < galleryImages.length - 1 && (
            <TouchableOpacity
              style={[styles.galleryArrow, styles.galleryArrowRight]}
              onPress={handleNextImage}
            >
              <Ionicons name="chevron-forward" size={36} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* GIF/Sticker Picker */}
      <GifStickerPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={handleGifSelect}
      />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageContainer: {
    maxWidth: '80%',
  },
  ownMessageContainer: {
    marginLeft: 'auto',
  },
  otherMessageContainer: {
    marginRight: 'auto',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  ownMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#fff',
  },
  systemMessageContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  systemMessageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  systemMessageText: {
    fontSize: 13,
  },
  systemMessageTime: {
    fontSize: 11,
    marginLeft: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readReceiptContainer: {
    marginLeft: 4,
  },
  starAnimationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    zIndex: 10,
  },
  starAnimationIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  typingIndicator: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  typingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  typingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  gifButton: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  gifButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  huddleToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerButton: {
    marginLeft: 20,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '600',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginLeft: 12,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  emojiPickerContainer: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    maxHeight: 280,
    marginTop: 60,
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emojiPickerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 12,
  },
  starMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  starMessageText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emojiGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  emojiButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonText: {
    fontSize: 32,
  },
  optionsMenuContainer: {
    position: 'absolute',
    top: 60,
    right: 10,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  multiImageGrid: {
    width: 200,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  gridImageItem: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  gridImageItem2: {
    width: 100,
    height: 200,
  },
  gridImageItem3First: {
    width: 200,
    height: 100,
  },
  gridImageItem3Rest: {
    width: 100,
    height: 100,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImage2: {
    width: '100%',
    height: '100%',
  },
  gridImage3First: {
    width: '100%',
    height: '100%',
  },
  gridImage3Rest: {
    width: '100%',
    height: '100%',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  galleryHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  galleryCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryCloseButton: {
    padding: 5,
  },
  galleryScrollView: {
    flex: 1,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryArrow: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  galleryArrowLeft: {
    left: 20,
  },
  galleryArrowRight: {
    right: 20,
  },
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  collapsedCount: {
    fontSize: 11,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  dateNavigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dateNavigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dateNavigationTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateNavigationScroll: {
    maxHeight: 500,
  },
  dateSection: {
    paddingVertical: 12,
  },
  dateSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  dateItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dateItemSubtext: {
    fontSize: 14,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 4,
  },
  waveBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  recordingTime: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Audio player styles
  audioMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 200,
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioInfoContainer: {
    flex: 1,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    gap: 2,
    marginBottom: 4,
  },
  audioBar: {
    width: 3,
    borderRadius: 1.5,
  },
  audioDuration: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Selected message styles
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingHorizontal: 0,
  },
  selectedMessageRow: {
    backgroundColor: 'rgba(100, 150, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 4,
  },
  selectionIndicatorLeft: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    marginRight: 4,
  },
  selectionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Replied message display in bubble
  repliedMessageContainer: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  repliedMessageBar: {
    width: 3,
    borderRadius: 1.5,
    marginRight: 8,
  },
  repliedMessageContent: {
    flex: 1,
  },
  repliedMessageSender: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  repliedMessageText: {
    fontSize: 13,
  },
  // Reply preview styles
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  replyPreviewBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 13,
  },
  replyPreviewClose: {
    padding: 8,
  },
  // Forwarded message indicator
  forwardedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  forwardedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
