import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../../store';
import { searchUsers } from '../../store/slices/usersSlice';
import { createGroupConversation, setCurrentConversation } from '../../store/slices/conversationsSlice';
import { useTheme } from '../../hooks/useTheme';

export default function NewGroupScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { searchResults } = useSelector((state: RootState) => state.users);
  const theme = useTheme();

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      dispatch(searchUsers(query));
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    try {
      const conversation = await dispatch(createGroupConversation({
        name: groupName,
        participantIds: selectedUsers,
        description: groupDescription || undefined,
      })).unwrap();

      dispatch(setCurrentConversation(conversation));
      navigation.navigate('Chat', { conversationId: conversation._id });
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const renderUser = ({ item }: any) => {
    const isSelected = selectedUsers.includes(item._id);

    return (
      <TouchableOpacity
        style={[styles.userItem, { borderBottomColor: theme.borderLight }]}
        onPress={() => toggleUserSelection(item._id)}
      >
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
        </View>

        <View style={[styles.checkbox, { borderColor: theme.disabled }, isSelected && [styles.checkboxSelected, { backgroundColor: theme.primary, borderColor: theme.primary }]]}>
          {isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
        <View style={[styles.inputContainer, { borderBottomColor: theme.borderLight }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Group Name"
            placeholderTextColor={theme.placeholder}
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>

        <View style={[styles.inputContainer, { borderBottomColor: theme.borderLight }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Description (optional)"
            placeholderTextColor={theme.placeholder}
            value={groupDescription}
            onChangeText={setGroupDescription}
            multiline
          />
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search users to add..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {selectedUsers.length > 0 && (
          <View style={[styles.selectedCount, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.selectedCountText, { color: theme.primary }]}>
              {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={searchResults}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.disabled} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Search for users to add to the group</Text>
          </View>
        }
      />

      {selectedUsers.length > 0 && (
        <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.primary }]} onPress={handleCreateGroup}>
          <Text style={styles.createButtonText}>Create Group</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inputContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  input: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  selectedCount: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#e8f4ff',
  },
  selectedCountText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
