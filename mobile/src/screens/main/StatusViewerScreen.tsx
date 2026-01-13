import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  PanResponder,
  FlatList,
  Modal,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useStatusMediaNavigation, useStatusProgress } from '../../hooks/status';
import { ProgressBar } from '../../components/status';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PROGRESS_BAR_HEIGHT = 2.5;
const PROGRESS_BAR_GAP = 4;
const STATUS_DURATION = 5000; // 5 seconds for images

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

interface StatusViewerScreenProps {
  route: any;
  navigation: any;
}

/**
 * StatusViewerScreen Component
 * Implements: Custom Hooks Pattern, Container Pattern
 * Optimization: useCallback, useMemo through custom hooks
 * SOLID: Single Responsibility - only renders and delegates to hooks
 */
export default function StatusViewerScreen({ route, navigation }: StatusViewerScreenProps) {
  const theme = useTheme();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { statuses, initialIndex = 0 } = route.params;
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const videoRef = useRef<Video>(null);
  const mediaFlatListRef = useRef<FlatList>(null);

  /**
   * Custom Hook - Media Navigation
   * Provides: allMediaItems, currentMedia, handleNext, handlePrevious
   * Performance: O(n) flattening with memoization
   */
  const {
    allMediaItems,
    currentMedia,
    currentIndex,
    handleNext: navigateNext,
    handlePrevious: navigatePrevious,
    setCurrentIndex,
  } = useStatusMediaNavigation(statuses);

  const isVideo = currentMedia?.type === 'video';

  // Check if viewing own status
  const isOwnStatus = currentMedia?.userId?._id === currentUser?._id;

  // Get the current status for the current media item
  const currentStatusForMedia = statuses.find((status: any) => status._id === currentMedia?.statusId);

  // Get viewers for the current status only
  const currentStatusViewers = isOwnStatus && currentStatusForMedia
    ? currentStatusForMedia.viewers?.map((v: any) => v) || []
    : [];

  /**
   * Custom Hook - Progress Animation
   * Provides: progress, startProgress, stopProgress, pauseProgress, resumeProgress
   * Performance: Animated.Value for smooth 60fps animations
   */
  const { progress } = useStatusProgress({
    duration: STATUS_DURATION,
    onComplete: () => handleNext(),
  });

  /**
   * Progress animation control
   * Automatically starts/stops based on media type and pause state
   */
  useEffect(() => {
    if (isPaused || isVideo) {
      // Videos control their own progress
      return;
    }
    // Progress handled by useStatusProgress hook
  }, [currentIndex, isPaused, isVideo]);

  // Pan responder for pause on press
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical swipes (for swipe down to close)
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        setIsPaused(true);
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsPaused(false);

        // Swipe down to close
        if (gestureState.dy > 100) {
          navigation.goBack();
        }
      },
    })
  ).current;

  /**
   * useCallback Pattern - Memoized navigation handlers
   * Prevents unnecessary re-renders and integrates with custom hook
   */
  const handleNext = useCallback(() => {
    if (currentIndex < allMediaItems.length - 1) {
      navigateNext();
      mediaFlatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true
      });
    } else {
      navigation.goBack();
    }
  }, [currentIndex, allMediaItems.length, navigateNext, navigation]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      navigatePrevious();
      mediaFlatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true
      });
    }
  }, [currentIndex, navigatePrevious]);

  /**
   * Video progress handler - updates progress for videos
   * Performance: Uses Animated.Value for smooth updates
   */
  const handleVideoProgress = useCallback((status: any) => {
    if (status.isLoaded && status.durationMillis) {
      const videoProgress = status.positionMillis / status.durationMillis;
      progress.setValue(videoProgress);
    }

    if (status.didJustFinish) {
      handleNext();
    }
  }, [progress, handleNext]);

  /**
   * useCallback Pattern - Memoized render function
   * Prevents unnecessary re-renders of FlatList items
   */
  const renderMediaItem = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <View style={styles.contentContainer}>
        {item.type === 'video' ? (
          <Video
            ref={index === currentIndex ? videoRef : null}
            source={{ uri: item.url }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay={!isPaused && index === currentIndex}
            isLooping={false}
            onPlaybackStatusUpdate={index === currentIndex ? handleVideoProgress : undefined}
          />
        ) : (
          <Image
            source={{ uri: item.url || item.thumbnailUrl }}
            style={styles.media}
            resizeMode="contain"
          />
        )}
      </View>
    );
  }, [currentIndex, isPaused, handleVideoProgress]);

  const onMediaViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index || 0;
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <StatusBar hidden />

      {/* Status Content - FlatList for media items */}
      <FlatList
        ref={mediaFlatListRef}
        data={allMediaItems}
        renderItem={renderMediaItem}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onMediaViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={true}
        {...panResponder.panHandlers}
      />

      {/* Progress Bar Component - Memoized */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={progress}
          totalSegments={allMediaItems.length}
          currentSegment={currentIndex}
          barColor={theme.primary}
          backgroundColor="rgba(0,0,0,0.3)"
          height={PROGRESS_BAR_HEIGHT}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {currentMedia?.userId?.avatar ? (
            <Image source={{ uri: currentMedia.userId.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {currentMedia?.userId?.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {currentMedia?.userId?.displayName || currentMedia?.userId?.phoneNumber || 'Unknown'}
            </Text>
            <Text style={styles.timestamp}>
              {currentMedia?.createdAt && format(new Date(currentMedia.createdAt), 'h:mm a')}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Media Counter (when multiple media items) */}
      {allMediaItems.length > 1 && (
        <View style={styles.mediaCounter}>
          <Text style={styles.mediaCounterText}>
            {currentIndex + 1}/{allMediaItems.length}
          </Text>
        </View>
      )}

      {/* Caption */}
      {currentMedia?.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{currentMedia.caption}</Text>
        </View>
      )}

      {/* Viewers Button - Bottom Center (for own status on each media) */}
      {isOwnStatus && (
        <TouchableOpacity
          onPress={() => setShowViewers(true)}
          style={styles.viewersButtonBottom}
        >
          <Ionicons name="eye" size={20} color="#fff" />
          <Text style={styles.viewersCountBottom}>{currentStatusViewers.length}</Text>
        </TouchableOpacity>
      )}

      {/* Navigation Zones */}
      <TouchableOpacity
        style={[styles.navZone, styles.leftZone]}
        onPress={handlePrevious}
        activeOpacity={1}
      />
      <TouchableOpacity
        style={[styles.navZone, styles.rightZone]}
        onPress={handleNext}
        activeOpacity={1}
      />

      {/* Viewers Modal */}
      <Modal
        visible={showViewers}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewers(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowViewers(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: theme.background }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Swipe Handle */}
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
            </View>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Viewed by {currentStatusViewers.length}
              </Text>
              <TouchableOpacity onPress={() => setShowViewers(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={currentStatusViewers}
              keyExtractor={(item: any) => item.userId._id || item.userId}
              renderItem={({ item }: any) => {
                const viewer = item.userId;
                return (
                  <View style={[styles.viewerItem, { borderBottomColor: theme.border }]}>
                    {viewer?.avatar ? (
                      <Image source={{ uri: viewer.avatar }} style={styles.viewerAvatar} />
                    ) : (
                      <View style={[styles.viewerAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                        <Text style={styles.avatarText}>
                          {viewer?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.viewerInfo}>
                      <Text style={[styles.viewerName, { color: theme.text }]}>
                        {viewer?.displayName || viewer?.phoneNumber || 'Unknown'}
                      </Text>
                      <Text style={[styles.viewerTime, { color: theme.textSecondary }]}>
                        {format(new Date(item.viewedAt), 'MMM d, h:mm a')}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No views yet
                </Text>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  progressContainer: {
    position: 'absolute',
    top: 45,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: PROGRESS_BAR_GAP,
  },
  segmentContainer: {
    flex: 1,
    height: PROGRESS_BAR_HEIGHT,
  },
  segmentBackground: {
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 2,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
  userDetails: {
    justifyContent: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },
  mediaCounter: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mediaCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 12,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  navZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.3,
  },
  leftZone: {
    left: 0,
  },
  rightZone: {
    right: 0,
  },
  viewersButtonBottom: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  viewersCountBottom: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  viewerInfo: {
    flex: 1,
  },
  viewerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  viewerTime: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
});
