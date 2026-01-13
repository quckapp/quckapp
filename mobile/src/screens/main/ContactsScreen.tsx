import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { fetchUsers } from '../../store/slices/usersSlice';

export default function ContactsScreen({ navigation }: any) {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { users, loading } = useSelector((state: RootState) => state.users);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      await dispatch(fetchUsers()).unwrap();
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleContactPress = (contact: any) => {
    Alert.alert(
      contact.displayName || contact.phoneNumber,
      'Choose an action',
      [
        {
          text: 'Message',
          onPress: () => navigation.navigate('Chats', {
            screen: 'NewConversation',
            params: { contact },
          }),
        },
        {
          text: 'View Profile',
          onPress: () => navigation.navigate('Chats', {
            screen: 'ContactInfo',
            params: { userId: contact._id },
          }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const filteredContacts = users
    .filter((user) => user._id !== currentUser?._id)
    .filter((user) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const displayName = user.displayName?.toLowerCase() || '';
      const phoneNumber = user.phoneNumber?.toLowerCase() || '';
      return displayName.includes(query) || phoneNumber.includes(query);
    });

  const renderContact = ({ item }: any) => {
    const displayName = item.displayName || item.phoneNumber;

    return (
      <TouchableOpacity
        style={[styles.contactItem, { borderBottomColor: theme.border }]}
        onPress={() => handleContactPress(item)}
      >
        <View style={styles.contactAvatar}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {item.displayName && item.phoneNumber && (
            <Text style={[styles.contactPhone, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.phoneNumber}
            </Text>
          )}
          {item.about && (
            <Text style={[styles.contactAbout, { color: theme.textTertiary }]} numberOfLines={1}>
              {item.about}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search contacts..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.disabled} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </Text>
            <Text style={[styles.emptySubText, { color: theme.textTertiary }]}>
              {searchQuery
                ? 'Try a different search term'
                : 'Your contacts will appear here'}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  contactAvatar: {
    marginRight: 12,
  },
  avatar: {
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
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    marginBottom: 2,
  },
  contactAbout: {
    fontSize: 13,
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
});
