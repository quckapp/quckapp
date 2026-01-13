import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { getPhoneNumber, getFlag } from '../../utils/phoneUtils';
import { getFullImageUrl } from '../../utils/imageUtils';

export default function ContactInfoScreen({ route, navigation }: any) {
  console.log('=== ContactInfoScreen Mounted ===');
  console.log('Route params:', route.params);
  const { contact } = route.params;
  console.log('Contact data:', contact);
  const theme = useTheme();

  const handleBlock = () => {
    Alert.alert(
      'Block Contact',
      'Are you sure you want to block this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            // Block logic will be implemented
            navigation.goBack();
          },
        },
      ]
    );
  };

  const phoneNumber = contact.phoneNumber || '';
  const displayName = contact.displayName || '';
  const flag = phoneNumber ? getFlag(phoneNumber) : '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: theme.backgroundSecondary }]}>
        {getFullImageUrl(contact.avatar) ? (
          <Image source={{ uri: getFullImageUrl(contact.avatar)! }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {phoneNumber.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <Text style={[styles.phoneNumber, { color: theme.text }]}>
          {getPhoneNumber(phoneNumber)} <Text style={styles.flag}>{flag}</Text>
        </Text>

        {displayName && displayName.trim() !== '' && (
          <Text style={[styles.displayName, { color: theme.textSecondary }]}>
            {displayName}
          </Text>
        )}
      </View>

      {/* Info Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>About</Text>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={24} color={theme.text} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            {getPhoneNumber(phoneNumber)}
          </Text>
        </View>
      </View>

      {/* Actions Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: theme.border }]}
          onPress={() => {
            // Media, Links, and Docs
          }}
        >
          <Ionicons name="images-outline" size={24} color={theme.text} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            Media, Links, and Docs
          </Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, { borderBottomWidth: 0 }]}
          onPress={() => {
            // Starred messages
          }}
        >
          <Ionicons name="star-outline" size={24} color={theme.text} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            Starred Messages
          </Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Danger Section */}
      <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: theme.border }]}
          onPress={handleBlock}
        >
          <Ionicons name="ban-outline" size={24} color="#FF3B30" />
          <Text style={[styles.actionText, { color: '#FF3B30' }]}>
            Block Contact
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, { borderBottomWidth: 0 }]}
          onPress={() => {
            // Report contact
          }}
        >
          <Ionicons name="warning-outline" size={24} color="#FF3B30" />
          <Text style={[styles.actionText, { color: '#FF3B30' }]}>
            Report Contact
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
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
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '600',
  },
  phoneNumber: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  flag: {
    fontSize: 18,
  },
  displayName: {
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  infoText: {
    fontSize: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 16,
  },
  actionText: {
    fontSize: 16,
    flex: 1,
  },
});
