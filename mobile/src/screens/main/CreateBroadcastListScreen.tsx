import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';

export default function CreateBroadcastListScreen({ navigation }: any) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setSearching(true);
      const response = await api.get(`/users/search?q=${searchQuery}`);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const toggleRecipient = (user: any) => {
    const isSelected = selectedRecipients.some((r) => r._id === user._id);
    if (isSelected) {
      setSelectedRecipients(selectedRecipients.filter((r) => r._id !== user._id));
    } else {
      setSelectedRecipients([...selectedRecipients, user]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a broadcast list name');
      return;
    }

    if (selectedRecipients.length === 0) {
      Alert.alert('Error', 'Please select at least one recipient');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/broadcast', {
        name: name.trim(),
        description: description.trim() || undefined,
        recipients: selectedRecipients.map((r) => r._id),
      });

      console.log('Broadcast list created:', response.data);
      Alert.alert('Success', 'Broadcast list created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating broadcast list:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create broadcast list');
    } finally {
      setLoading(false);
    }
  };

  const renderRecipientChip = ({ item }: any) => (
    <View style={[styles.chip, { backgroundColor: theme.primary }]}>
      <Text style={styles.chipText}>{item.displayName}</Text>
      <TouchableOpacity onPress={() => toggleRecipient(item)}>
        <Ionicons name="close-circle" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderUserItem = ({ item }: any) => {
    const isSelected = selectedRecipients.some((r) => r._id === item._id);

    return (
      <TouchableOpacity
        style={[styles.userItem, { borderBottomColor: theme.border }]}
        onPress={() => toggleRecipient(item)}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
        ) : (
          <View style={[styles.userAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {item.displayName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.displayName}</Text>
          <Text style={[styles.userPhone, { color: theme.textSecondary }]}>{item.phoneNumber}</Text>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.form, { backgroundColor: theme.backgroundSecondary }]}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Broadcast list name *"
          placeholderTextColor={theme.textTertiary}
          value={name}
          onChangeText={setName}
          maxLength={50}
        />

        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Description (optional)"
          placeholderTextColor={theme.textTertiary}
          value={description}
          onChangeText={setDescription}
          maxLength={100}
        />

        {selectedRecipients.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={[styles.selectedLabel, { color: theme.textSecondary }]}>
              Selected ({selectedRecipients.length})
            </Text>
            <FlatList
              data={selectedRecipients}
              renderItem={renderRecipientChip}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipList}
            />
          </View>
        )}
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search contacts..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searching && <ActivityIndicator size="small" color={theme.primary} />}
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        style={styles.userList}
        ListEmptyComponent={
          searchQuery.length >= 2 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={48} color={theme.disabled} />
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                {searching ? 'Searching...' : 'No contacts found'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={theme.disabled} />
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                Search for contacts to add to broadcast list
              </Text>
            </View>
          )
        }
      />

      <TouchableOpacity
        style={[
          styles.createButton,
          { backgroundColor: theme.primary },
          (!name.trim() || selectedRecipients.length === 0 || loading) && { opacity: 0.5 },
        ]}
        onPress={handleCreate}
        disabled={!name.trim() || selectedRecipients.length === 0 || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark" size={24} color="#fff" />
            <Text style={styles.createButtonText}>
              Create Broadcast List ({selectedRecipients.length})
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  selectedContainer: {
    marginTop: 8,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipList: {
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
