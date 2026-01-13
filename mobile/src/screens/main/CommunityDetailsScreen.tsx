import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import api from '../../services/api';

export default function CommunityDetailsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { community: initialCommunity } = route.params;
  const currentUserId = useSelector((state: RootState) => state.auth.user?._id);

  const [community, setCommunity] = useState(initialCommunity);
  const [loading, setLoading] = useState(false);

  const isAdmin = community?.members?.some(
    (m: any) => m.userId?._id === currentUserId && m.role === 'admin'
  );
  const isCreator = community?.createdBy === currentUserId;

  useEffect(() => {
    fetchCommunityDetails();
  }, []);

  const fetchCommunityDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/communities/${initialCommunity._id}`);
      setCommunity(response.data);
    } catch (error) {
      console.error('Error fetching community details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveCommunity = () => {
    Alert.alert(
      'Leave Community',
      'Are you sure you want to leave this community?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/communities/${community._id}/members/${currentUserId}`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave community');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCommunity = () => {
    Alert.alert(
      'Delete Community',
      'Are you sure you want to delete this community? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/communities/${community._id}`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete community');
            }
          },
        },
      ]
    );
  };

  if (loading && !community) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}>
        {community.avatar ? (
          <Image source={{ uri: community.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Ionicons name="people" size={48} color="#fff" />
          </View>
        )}
        <Text style={[styles.name, { color: theme.text }]}>{community.name}</Text>
        {community.description && (
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {community.description}
          </Text>
        )}
      </View>

      {/* Stats Section */}
      <View style={[styles.statsContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={24} color={theme.primary} />
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {community.members?.length || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Members</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="chatbubbles" size={24} color={theme.primary} />
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {community.groups?.length || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Groups</Text>
        </View>
      </View>

      {/* Members Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Members</Text>
          {isAdmin && (
            <TouchableOpacity onPress={() => {
              // Navigate to add members screen (to be implemented)
              Alert.alert('Coming Soon', 'Add members functionality');
            }}>
              <Ionicons name="add-circle" size={24} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        {community.members?.map((member: any, index: number) => (
          <View
            key={member.userId?._id || index}
            style={[styles.memberItem, { borderBottomColor: theme.border }]}
          >
            {member.userId?.avatar ? (
              <Image source={{ uri: member.userId.avatar }} style={styles.memberAvatar} />
            ) : (
              <View style={[styles.memberAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>
                  {member.userId?.displayName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: theme.text }]}>
                {member.userId?.displayName || 'Unknown'}
              </Text>
              <Text style={[styles.memberRole, { color: theme.textSecondary }]}>
                {member.role === 'admin' ? 'Admin' : 'Member'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Groups Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Groups</Text>
          {isAdmin && (
            <TouchableOpacity onPress={() => {
              // Navigate to add groups screen (to be implemented)
              Alert.alert('Coming Soon', 'Add groups functionality');
            }}>
              <Ionicons name="add-circle" size={24} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        {community.groups && community.groups.length > 0 ? (
          community.groups.map((group: any, index: number) => (
            <TouchableOpacity
              key={group._id || index}
              style={[styles.groupItem, { borderBottomColor: theme.border }]}
            >
              <Ionicons name="chatbubbles" size={24} color={theme.primary} />
              <Text style={[styles.groupName, { color: theme.text }]}>
                {group.name || 'Group'}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
            No groups added yet
          </Text>
        )}
      </View>

      {/* Actions Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        {!isCreator && (
          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: theme.border }]}
            onPress={handleLeaveCommunity}
          >
            <Ionicons name="exit-outline" size={24} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>Leave Community</Text>
          </TouchableOpacity>
        )}
        {isCreator && (
          <TouchableOpacity
            style={[styles.actionButton, { borderBottomWidth: 0 }]}
            onPress={handleDeleteCommunity}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>Delete Community</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
