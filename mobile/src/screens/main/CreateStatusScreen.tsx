import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  ScrollView,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { createStatus } from '../../store/slices/statusSlice';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MediaItem {
  uri: string;
  type?: 'image' | 'video';
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
}

interface CreateStatusScreenProps {
  route: any;
  navigation: any;
}

/**
 * CreateStatusScreen Component
 * Implements: useCallback Pattern for performance optimization
 * SOLID: Single Responsibility - only handles status creation UI
 */
export default function CreateStatusScreen({ route, navigation }: CreateStatusScreenProps) {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { mediaItems = [] } = route.params || {};
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  /**
   * useCallback Pattern - Memoized add media handler
   * Prevents unnecessary re-renders
   */
  const handleAddMoreMedia = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to select photos');
        return;
      }

      if (mediaItems.length >= 10) {
        Alert.alert('Limit Reached', 'You can add up to 10 media items per status');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - mediaItems.length, // Limit based on remaining slots
      });

      if (!result.canceled && result.assets.length > 0) {
        const newMediaItems = [...mediaItems, ...result.assets];
        navigation.setParams({ mediaItems: newMediaItems });
      }
    } catch (error) {
      console.error('Error adding media:', error);
      Alert.alert('Error', 'Failed to select media');
    }
  }, [mediaItems, navigation]);

  /**
   * useCallback Pattern - Memoized publish handler
   * Handles FormData creation and dispatch
   */
  const handlePublish = useCallback(async () => {
    try {
      setUploading(true);

      // Create FormData for file upload
      const formData = new FormData();

      // Append all media files
      mediaItems.forEach((media: MediaItem, index: number) => {
        const fileExtension = media.uri.split('.').pop();
        const fileName = `status-${Date.now()}-${index}.${fileExtension}`;
        const isVideo = media.type === 'video';

        formData.append('media', {
          uri: media.uri,
          name: fileName,
          type: isVideo ? 'video/mp4' : 'image/jpeg',
        } as any);
      });

      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      // Dispatch create status action
      await dispatch(createStatus(formData)).unwrap();

      Alert.alert('Success', 'Status published successfully!');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error creating status:', error);
      Alert.alert('Error', error.message || 'Failed to publish status');
    } finally {
      setUploading(false);
    }
  }, [mediaItems, caption, dispatch, navigation]);

  /**
   * useCallback Pattern - Memoized render function
   * Prevents unnecessary re-renders of FlatList items
   */
  const renderMediaItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => {
    const isVideo = item.type === 'video';

    return (
      <View style={styles.mediaSlide}>
        {isVideo ? (
          <Video
            source={{ uri: item.uri }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay={index === currentIndex}
            isLooping
            isMuted
          />
        ) : (
          <Image
            source={{ uri: item.uri }}
            style={styles.media}
            resizeMode="contain"
          />
        )}
      </View>
    );
  }, [currentIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  /**
   * useCallback Pattern - Memoized remove handler
   * Handles media removal with confirmation
   */
  const handleRemoveMedia = useCallback((index: number) => {
    if (mediaItems.length === 1) {
      Alert.alert('Cannot Remove', 'You must have at least one media item');
      return;
    }

    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newMediaItems = mediaItems.filter((_: any, i: number) => i !== index);
            navigation.setParams({ mediaItems: newMediaItems });
            if (currentIndex >= newMediaItems.length) {
              setCurrentIndex(newMediaItems.length - 1);
              flatListRef.current?.scrollToIndex({ index: newMediaItems.length - 1 });
            }
          },
        },
      ]
    );
  }, [mediaItems, currentIndex, navigation, flatListRef]);

  if (!mediaItems || mediaItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>No media selected</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.primary, marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: '#000' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Media Carousel */}
      <FlatList
        ref={flatListRef}
        data={mediaItems}
        renderItem={renderMediaItem}
        keyExtractor={(item, index) => `${item.uri}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.mediaContainer}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Status</Text>
        <View style={styles.headerRightButtons}>
          {mediaItems.length < 10 && (
            <TouchableOpacity
              onPress={handleAddMoreMedia}
              style={[styles.headerButton, { marginRight: 8 }]}
            >
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handleRemoveMedia(currentIndex)}
            style={styles.headerButton}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Media Counter & Pagination */}
      {mediaItems.length > 1 && (
        <>
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {mediaItems.length}
            </Text>
          </View>

          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paginationDots}
            >
              {mediaItems.map((_: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.paginationDot,
                    { backgroundColor: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.3)' },
                  ]}
                  onPress={() => {
                    setCurrentIndex(index);
                    flatListRef.current?.scrollToIndex({ index });
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </>
      )}

      {/* Caption Input */}
      <View style={styles.captionContainer}>
        <TextInput
          style={styles.captionInput}
          placeholder="Add a caption..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={200}
        />
      </View>

      {/* Publish Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.publishButton, { backgroundColor: theme.primary }]}
          onPress={handlePublish}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.publishButtonText}>Publish {mediaItems.length > 1 ? `(${mediaItems.length} items)` : ''}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mediaContainer: {
    flex: 1,
  },
  mediaSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationContainer: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 12,
  },
  captionInput: {
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
