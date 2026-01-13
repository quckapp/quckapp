import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';

export default function BroadcastListScreen({ navigation }: any) {
  const theme = useTheme();
  const [broadcastLists, setBroadcastLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBroadcastLists();
  }, []);

  const fetchBroadcastLists = async () => {
    try {
      setLoading(true);
      const response = await api.get('/broadcast');
      console.log('Broadcast lists response:', response.data);
      setBroadcastLists(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching broadcast lists:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load broadcast lists. Make sure the backend is running.'
      );
      setBroadcastLists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Broadcast List',
      'Are you sure you want to delete this broadcast list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/broadcast/${id}`);
              fetchBroadcastLists();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete broadcast list');
            }
          },
        },
      ]
    );
  };

  const renderBroadcastList = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.listItem, { borderBottomColor: theme.border }]}
      onPress={() => navigation.navigate('BroadcastDetails', { broadcastList: item })}
      onLongPress={() => handleDelete(item._id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
        <Ionicons name="megaphone" size={24} color="#fff" />
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.recipientCount, { color: theme.textSecondary }]}>
          {item.recipients.length} recipient{item.recipients.length !== 1 ? 's' : ''}
        </Text>
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
        data={broadcastLists}
        renderItem={renderBroadcastList}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={64} color={theme.disabled} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              No broadcast lists yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
              Create a list to send messages to multiple contacts at once
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('CreateBroadcastList')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipientCount: {
    fontSize: 14,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
