import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';

export default function BroadcastDetailsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { broadcastList: initialBroadcastList } = route.params;

  const [broadcastList, setBroadcastList] = useState(initialBroadcastList);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      setSending(true);
      await api.post(`/broadcast/${broadcastList._id}/send`, {
        type: 'text',
        content: messageText.trim(),
      });

      Alert.alert('Success', `Message sent to ${broadcastList.recipients.length} recipient(s)`, [
        {
          text: 'OK',
          onPress: () => {
            setShowMessageModal(false);
            setMessageText('');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error sending broadcast message:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = () => {
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
              await api.delete(`/broadcast/${broadcastList._id}`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete broadcast list');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        {/* Header Section */}
        <View style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
            <Ionicons name="megaphone" size={48} color="#fff" />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{broadcastList.name}</Text>
          {broadcastList.description && (
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {broadcastList.description}
            </Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowMessageModal(true)}
          >
            <Ionicons name="send" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Recipients Section */}
        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Recipients ({broadcastList.recipients?.length || 0})
            </Text>
            <TouchableOpacity onPress={() => {
              Alert.alert('Coming Soon', 'Edit recipients functionality');
            }}>
              <Ionicons name="add-circle" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {broadcastList.recipients?.map((recipient: any, index: number) => (
            <View
              key={recipient._id || index}
              style={[styles.recipientItem, { borderBottomColor: theme.border }]}
            >
              {recipient.avatar ? (
                <Image source={{ uri: recipient.avatar }} style={styles.recipientAvatar} />
              ) : (
                <View style={[styles.recipientAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>
                    {recipient.displayName?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.recipientInfo}>
                <Text style={[styles.recipientName, { color: theme.text }]}>
                  {recipient.displayName}
                </Text>
                <Text style={[styles.recipientPhone, { color: theme.textSecondary }]}>
                  {recipient.phoneNumber}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delete Section */}
        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.deleteButton, { borderBottomWidth: 0 }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.deleteText, { color: '#FF3B30' }]}>Delete Broadcast List</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Send Message Modal */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMessageModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Send Broadcast Message</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.recipientCount, { color: theme.textSecondary }]}>
                Message will be sent to {broadcastList.recipients?.length || 0} recipient(s)
              </Text>

              <TextInput
                style={[styles.messageInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Type your message..."
                placeholderTextColor={theme.textTertiary}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: theme.primary },
                  (!messageText.trim() || sending) && { opacity: 0.5 },
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sending}
              >
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>
                  {sending ? 'Sending...' : 'Send Message'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 16,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  section: {
    padding: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  recipientAvatar: {
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
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  recipientPhone: {
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  recipientCount: {
    fontSize: 14,
    marginBottom: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
