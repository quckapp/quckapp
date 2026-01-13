import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../../store';
import { searchUsers, clearSearchResults } from '../../store/slices/usersSlice';
import { createSingleConversation, setCurrentConversation } from '../../store/slices/conversationsSlice';
import { useTheme } from '../../hooks/useTheme';

export default function NewConversationScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { searchResults, loading } = useSelector((state: RootState) => state.users);
  const theme = useTheme();

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      dispatch(searchUsers(query));
    } else {
      dispatch(clearSearchResults());
    }
  };

  const handleUserPress = async (user: any) => {
    try {
      const conversation = await dispatch(createSingleConversation(user._id)).unwrap();
      dispatch(setCurrentConversation(conversation));
      navigation.navigate('Chat', { conversationId: conversation._id });
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const renderUser = ({ item }: any) => (
    <TouchableOpacity style={[styles.userItem, { borderBottomColor: theme.borderLight }]} onPress={() => handleUserPress(item)}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarText}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.userInfo}>
        <Text style={[styles.displayName, { color: theme.text }]}>{item.displayName}</Text>
        <Text style={[styles.username, { color: theme.textSecondary }]}>@{item.username}</Text>
        {item.phoneNumber && (
          <Text style={[styles.phoneNumber, { color: theme.textTertiary }]}>{item.phoneNumber}</Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={24} color={theme.disabled} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { borderBottomColor: theme.borderLight, backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by name, username, or phone..."
          placeholderTextColor={theme.placeholder}
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.groupButton, { borderBottomColor: theme.borderLight }]}
        onPress={() => navigation.navigate('NewGroup')}
      >
        <View style={[styles.groupIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="people" size={24} color={theme.primary} />
        </View>
        <Text style={[styles.groupText, { color: theme.primary }]}>Create New Group</Text>
        <Ionicons name="chevron-forward" size={24} color={theme.disabled} />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderUser}
          keyExtractor={(item) => item._id}
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={theme.disabled} />
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No users found</Text>
          <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
            This contact hasn't installed QuickChat yet
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-add-outline" size={64} color={theme.disabled} />
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Search for users to start chatting</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  groupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  groupText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#007AFF',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
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
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#666',
  },
  phoneNumber: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
