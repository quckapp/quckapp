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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { fetchCommunities } from '../../store/slices/communitiesSlice';

export default function CommunitiesScreen({ navigation }: any) {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { communities, loading } = useSelector((state: RootState) => state.communities);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      await dispatch(fetchCommunities()).unwrap();
    } catch (error: any) {
      console.error('Error fetching communities:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to load communities. Make sure the backend is running.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommunities();
  };

  const renderCommunity = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.communityItem, { borderBottomColor: theme.border }]}
      onPress={() => navigation.navigate('CommunityDetails', { community: item })}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
          <Ionicons name="people" size={28} color="#fff" />
        </View>
      )}
      <View style={styles.communityInfo}>
        <Text style={[styles.communityName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.memberCount, { color: theme.textSecondary }]}>
          {item.members.length} member{item.members.length !== 1 ? 's' : ''} · {item.groups.length} group{item.groups.length !== 1 ? 's' : ''}
        </Text>
        {item.description && (
          <Text style={[styles.description, { color: theme.textTertiary }]} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
    </TouchableOpacity>
  );

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
        data={communities}
        renderItem={renderCommunity}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.disabled} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              No communities yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
              Create or join a community to organize groups and announcements
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
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
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
