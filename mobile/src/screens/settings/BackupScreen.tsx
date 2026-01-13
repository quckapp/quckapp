import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getBackupStatus,
  runFullBackup,
  listBackups,
  getBackupDetails,
  backupMessages,
  backupMedia,
  BackupStatus,
  BackupListItem,
  BackupDetails,
} from '../../services/api/backup.api';

const BackupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [backups, setBackups] = useState<BackupListItem[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupType, setBackupType] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statusData, backupsData] = await Promise.all([
        getBackupStatus(),
        listBackups(),
      ]);
      setStatus(statusData);
      setBackups(backupsData);
    } catch (error) {
      console.error('Failed to load backup data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleFullBackup = async () => {
    Alert.alert(
      'Full Backup',
      'This will backup all your messages, media, and profile data to Google Cloud Storage. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Backup',
          onPress: async () => {
            setBackingUp(true);
            setBackupType('full');
            try {
              const result = await runFullBackup();
              if (result.success) {
                Alert.alert(
                  'Backup Complete',
                  `Successfully backed up:\n• ${result.stats.messages} messages\n• ${result.stats.conversations} conversations\n• ${result.stats.mediaFiles} media files`,
                );
                loadData();
              } else {
                Alert.alert('Backup Failed', result.error || 'Unknown error');
              }
            } catch (error: any) {
              Alert.alert('Backup Failed', error.message || 'Failed to create backup');
            } finally {
              setBackingUp(false);
              setBackupType(null);
            }
          },
        },
      ],
    );
  };

  const handleBackupMessages = async () => {
    setBackingUp(true);
    setBackupType('messages');
    try {
      const result = await backupMessages();
      Alert.alert('Messages Backed Up', `${result.count} messages saved to cloud`);
      loadData();
    } catch (error: any) {
      Alert.alert('Backup Failed', error.message);
    } finally {
      setBackingUp(false);
      setBackupType(null);
    }
  };

  const handleBackupMedia = async () => {
    setBackingUp(true);
    setBackupType('media');
    try {
      const result = await backupMedia();
      Alert.alert(
        'Media Backed Up',
        `${result.backedUp} of ${result.totalFiles} files saved\n${result.failed} failed`,
      );
      loadData();
    } catch (error: any) {
      Alert.alert('Backup Failed', error.message);
    } finally {
      setBackingUp(false);
      setBackupType(null);
    }
  };

  const handleViewBackupDetails = async (backupId: string) => {
    try {
      const details = await getBackupDetails(backupId);
      setSelectedBackup(details);
    } catch (error) {
      console.error('Failed to load backup details:', error);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A884" />
          <Text style={styles.loadingText}>Loading backup info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Backup</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-outline" size={24} color="#00A884" />
            <Text style={styles.cardTitle}>Google Cloud Storage</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: status?.gcsConfigured ? '#00A884' : '#FF6B6B' },
                ]}
              />
              <Text style={styles.statusText}>
                {status?.gcsConfigured ? 'Connected' : 'Not Configured'}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Auto Backup:</Text>
            <Text style={styles.statusValue}>
              {status?.enabled ? 'Daily at 2:00 AM' : 'Disabled'}
            </Text>
          </View>
        </View>

        {/* Backup Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Backup Options</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleFullBackup}
            disabled={backingUp}
          >
            {backingUp && backupType === 'full' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload" size={22} color="#fff" />
            )}
            <Text style={styles.primaryButtonText}>
              {backingUp && backupType === 'full' ? 'Backing up...' : 'Full Backup'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton, { flex: 1, marginRight: 8 }]}
              onPress={handleBackupMessages}
              disabled={backingUp}
            >
              {backingUp && backupType === 'messages' ? (
                <ActivityIndicator size="small" color="#00A884" />
              ) : (
                <Ionicons name="chatbubbles-outline" size={20} color="#00A884" />
              )}
              <Text style={styles.secondaryButtonText}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton, { flex: 1, marginLeft: 8 }]}
              onPress={handleBackupMedia}
              disabled={backingUp}
            >
              {backingUp && backupType === 'media' ? (
                <ActivityIndicator size="small" color="#00A884" />
              ) : (
                <Ionicons name="images-outline" size={20} color="#00A884" />
              )}
              <Text style={styles.secondaryButtonText}>Media</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backup History */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Backup History</Text>

          {backups.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={48} color="#8696A0" />
              <Text style={styles.emptyText}>No backups yet</Text>
              <Text style={styles.emptySubtext}>
                Your backups will appear here after you create one
              </Text>
            </View>
          ) : (
            backups.slice(0, 5).map((backup) => (
              <TouchableOpacity
                key={backup.backupId}
                style={styles.backupItem}
                onPress={() => handleViewBackupDetails(backup.backupId)}
              >
                <View style={styles.backupIcon}>
                  <Ionicons name="folder-outline" size={24} color="#00A884" />
                </View>
                <View style={styles.backupInfo}>
                  <Text style={styles.backupDate}>{formatDate(backup.timestamp)}</Text>
                  <Text style={styles.backupId}>{backup.backupId}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8696A0" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Backup Details Modal */}
        {selectedBackup && (
          <View style={styles.card}>
            <View style={styles.detailsHeader}>
              <Text style={styles.sectionTitle}>Backup Details</Text>
              <TouchableOpacity onPress={() => setSelectedBackup(null)}>
                <Ionicons name="close" size={24} color="#8696A0" />
              </TouchableOpacity>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Backup ID</Text>
              <Text style={styles.detailValue}>{selectedBackup.backupId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formatDate(selectedBackup.timestamp)}</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{selectedBackup.stats.messages}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{selectedBackup.stats.conversations}</Text>
                <Text style={styles.statLabel}>Chats</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{selectedBackup.stats.users}</Text>
                <Text style={styles.statLabel}>Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{selectedBackup.stats.mediaFiles}</Text>
                <Text style={styles.statLabel}>Media</Text>
              </View>
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#8696A0" />
          <Text style={styles.infoText}>
            Backups are encrypted and stored securely in Google Cloud Storage. Your data is
            protected and can be restored at any time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111B21',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8696A0',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F2C34',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1F2C34',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    color: '#8696A0',
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
  },
  statusValue: {
    color: '#fff',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#00A884',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00A884',
  },
  secondaryButtonText: {
    color: '#00A884',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#8696A0',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
  },
  backupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A3942',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  backupDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  backupId: {
    color: '#8696A0',
    fontSize: 12,
    marginTop: 2,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
  },
  detailLabel: {
    color: '#8696A0',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#00A884',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: '#8696A0',
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2C34',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    color: '#8696A0',
    fontSize: 13,
    marginLeft: 12,
    lineHeight: 18,
  },
});

export default BackupScreen;
