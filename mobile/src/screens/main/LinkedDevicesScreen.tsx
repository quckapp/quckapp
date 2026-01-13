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
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';

export default function LinkedDevicesScreen({ navigation }: any) {
  const theme = useTheme();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinkedDevices();
  }, []);

  const fetchLinkedDevices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me/linked-devices');
      console.log('Linked devices response:', response.data);
      setDevices(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching linked devices:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load linked devices. Make sure the backend is running.'
      );
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkDevice = async (deviceId: string, deviceName: string) => {
    Alert.alert(
      'Unlink Device',
      `Are you sure you want to unlink "${deviceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/users/me/linked-devices/${deviceId}`);
              fetchLinkedDevices();
              Alert.alert('Success', 'Device unlinked successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to unlink device');
            }
          },
        },
      ]
    );
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'phone-portrait';
      case 'web':
        return 'globe';
      case 'desktop':
        return 'desktop';
      default:
        return 'hardware-chip';
    }
  };

  const renderDevice = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.deviceItem, { borderBottomColor: theme.border }]}
      onLongPress={() => handleUnlinkDevice(item.deviceId, item.deviceName)}
    >
      <View style={[styles.deviceIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name={getDeviceIcon(item.deviceType)} size={28} color={theme.primary} />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, { color: theme.text }]}>{item.deviceName}</Text>
        <Text style={[styles.deviceType, { color: theme.textSecondary }]}>
          {item.deviceType.charAt(0).toUpperCase() + item.deviceType.slice(1)}
        </Text>
        <Text style={[styles.lastActive, { color: theme.textTertiary }]}>
          Last active {formatDistanceToNow(new Date(item.lastActive), { addSuffix: true })}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleUnlinkDevice(item.deviceId, item.deviceName)}
        style={styles.unlinkButton}
      >
        <Ionicons name="close-circle" size={24} color="#FF3B30" />
      </TouchableOpacity>
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
      <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name="information-circle" size={24} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Use QuickChat on multiple devices. All messages will sync automatically.
        </Text>
      </View>

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.deviceId}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="phone-portrait-outline" size={64} color={theme.disabled} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              No linked devices
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
              Link a new device to use QuickChat on multiple platforms
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.linkButton, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('LinkNewDevice')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.linkButtonText}>Link New Device</Text>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 14,
    marginBottom: 2,
  },
  lastActive: {
    fontSize: 13,
  },
  unlinkButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
