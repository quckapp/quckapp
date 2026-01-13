import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import * as ImagePicker from 'expo-image-picker';
import { formatDistanceToNow } from 'date-fns';
import { fetchStatuses, fetchMyStatuses, createStatus, viewStatus, deleteStatus } from '../../store/slices/statusSlice';
import { SegmentedRing } from '../../components/status';
import { useStatusGrouping, useStatusViewers } from '../../hooks/status';

interface Status {
  _id: string;
  userId: {
    _id: string;
    phoneNumber: string;
    displayName?: string;
    avatar?: string;
  };
  media: {
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
  };
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewedBy: string[];
}

/**
 * UpdatesScreen Component
 * Implements: Container Pattern, Custom Hooks Pattern
 * Optimization: useMemo, useCallback for performance
 * SOLID: Single Responsibility - only renders and delegates
 */
export default function UpdatesScreen({ navigation }: any) {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { statuses, myStatuses, loading, uploading } = useSelector((state: RootState) => state.status);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Custom Hooks - Separation of Concerns
   * useStatusGrouping: O(n) grouping with memoization
   * useStatusViewers: Set-based operations for viewer tracking
   */
  const { groupedStatuses } = useStatusGrouping(statuses, currentUser?._id);
  const { allUniqueViewers } = useStatusViewers(myStatuses);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      await Promise.all([
        dispatch(fetchStatuses()).unwrap(),
        currentUser?._id && dispatch(fetchMyStatuses(currentUser._id)).unwrap(),
      ]);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStatuses();
  };

  const handleAddStatus = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false, // Disable editing to allow multiple selection
        allowsMultipleSelection: true, // Enable multiple selection
        quality: 0.8,
        selectionLimit: 10, // Limit to 10 items
      });

      if (!result.canceled && result.assets.length > 0) {
        navigation.navigate('CreateStatus', {
          mediaItems: result.assets, // Send array of media items
        });
      }
    } catch (error) {
      console.error('Error adding status:', error);
      Alert.alert('Error', 'Failed to select media');
    }
  };

  /**
   * useCallback Pattern - Memoized functions
   * Prevents unnecessary re-renders of child components
   */
  const handleStatusPress = useCallback((statusOrArray: any) => {
    // Handle both single status and array of statuses
    const statuses = Array.isArray(statusOrArray) ? statusOrArray : [statusOrArray];
    navigation.navigate('StatusViewer', {
      statuses,
      initialIndex: 0
    });
  }, [navigation]);

  const getTimeAgo = useCallback((date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  }, []);

  const renderMyStatus = useCallback(() => {
    const hasStatuses = myStatuses.length > 0;
    const latestStatus = myStatuses[0];

    /**
     * Use custom hook result instead of inline calculation
     * Performance: O(1) access to pre-computed value
     */
    const uniqueViewersCount = allUniqueViewers.length;

    return (
      <TouchableOpacity
        style={[styles.statusItem, { borderBottomColor: theme.border }]}
        onPress={hasStatuses ? () => handleStatusPress(myStatuses) : handleAddStatus}
      >
        <View style={styles.statusAvatarContainer}>
          {hasStatuses && myStatuses.length > 1 ? (
            // Multiple statuses - show segmented ring
            <View style={styles.statusRing}>
              <SegmentedRing segments={myStatuses.length} color={theme.primary} size={64} />
              <View style={styles.avatarWrapper}>
                {currentUser?.avatar ? (
                  <Image
                    source={{ uri: currentUser.avatar }}
                    style={styles.statusAvatar}
                  />
                ) : (
                  <View style={[styles.statusAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarText}>
                      {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : hasStatuses ? (
            // Single status - show solid ring
            <View style={[styles.statusRing, { borderColor: theme.primary }]}>
              <View style={styles.avatarWrapper}>
                {currentUser?.avatar ? (
                  <Image
                    source={{ uri: currentUser.avatar }}
                    style={styles.statusAvatar}
                  />
                ) : (
                  <View style={[styles.statusAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarText}>
                      {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            // No status - no ring
            <View style={styles.avatarWrapper}>
              {currentUser?.avatar ? (
                <Image
                  source={{ uri: currentUser.avatar }}
                  style={styles.statusAvatar}
                />
              ) : (
                <View style={[styles.statusAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>
                    {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
          )}
          {/* Add button badge on avatar - always show */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleAddStatus();
            }}
            style={[styles.addStatusButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusInfo}>
          <Text style={[styles.statusName, { color: theme.text }]}>My Status</Text>
          <Text style={[styles.statusTime, { color: theme.textSecondary }]}>
            {hasStatuses ? getTimeAgo(latestStatus.createdAt) : 'Tap to add status update'}
          </Text>
        </View>

        {/* Views Badge */}
        {hasStatuses && (
          <View style={styles.viewsContainer}>
            <Ionicons name="eye" size={16} color={theme.textSecondary} />
            <Text style={[styles.viewsText, { color: theme.textSecondary }]}>
              {uniqueViewersCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [myStatuses, currentUser, handleAddStatus, handleStatusPress, getTimeAgo, allUniqueViewers, theme]);

  const renderContactStatus = ({ item }: any) => {
    const user = item.userId;
    const displayName = user?.displayName || user?.phoneNumber || 'Unknown';
    const statusCount = item.statuses.length;

    // Check if any status has been viewed
    const hasViewedAny = item.statuses.some((status: any) =>
      status.viewers?.some((v: any) => v.userId === currentUser?._id)
    );
    const ringColor = hasViewedAny ? theme.border : theme.primary;

    return (
      <TouchableOpacity
        style={[styles.statusItem, { borderBottomColor: theme.border }]}
        onPress={() => handleStatusPress(item.statuses)}
      >
        <View style={styles.statusAvatarContainer}>
          {statusCount > 1 ? (
            // Multiple statuses - show segmented ring
            <View style={styles.statusRing}>
              <SegmentedRing segments={statusCount} color={ringColor} size={64} />
              <View style={styles.avatarWrapper}>
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.statusAvatar}
                  />
                ) : (
                  <View style={[styles.statusAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            // Single status - show solid ring
            <View style={[
              styles.statusRing,
              { borderColor: ringColor }
            ]}>
              <View style={styles.avatarWrapper}>
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.statusAvatar}
                  />
                ) : (
                  <View style={[styles.statusAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.statusInfo}>
          <Text style={[styles.statusName, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.statusTime, { color: theme.textSecondary }]}>
            {getTimeAgo(item.latestCreatedAt)}
          </Text>
        </View>

        {/* Count Badge for multiple statuses */}
        {statusCount > 1 && (
          <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.countText}>{statusCount}</Text>
          </View>
        )}
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

  /**
   * Use custom hook for grouping - already memoized and optimized
   * Algorithm: O(n) grouping, O(u log u) sorting (u = unique users)
   * Data Structure: Pre-computed from useStatusGrouping hook
   */
  const otherUserStatuses = groupedStatuses;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={otherUserStatuses}
        renderItem={renderContactStatus}
        keyExtractor={(item) => item.userId?._id || item.userId}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListHeaderComponent={
          <View>
            {renderMyStatus()}
            {otherUserStatuses.length > 0 && (
              <View style={[styles.sectionHeader, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.sectionHeaderText, { color: theme.textSecondary }]}>
                  Recent updates
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color={theme.disabled} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              No updates yet
            </Text>
            <Text style={[styles.emptySubText, { color: theme.textTertiary }]}>
              Status updates from your contacts will appear here
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
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
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  statusAvatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  statusAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  addStatusButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  statusName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusTime: {
    fontSize: 14,
  },
  sectionHeader: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
  statusRing: {
    borderWidth: 3,
    borderRadius: 32,
    padding: 3,
  },
  avatarWrapper: {
    borderRadius: 29,
    overflow: 'hidden',
  },
  countBadge: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mediaTypeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    gap: 2,
  },
  mediaCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
