import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { disconnectSocket } from '../../services/socket';
import { disconnectWebRTC } from '../../services/webrtc';
import { useTheme } from '../../hooks/useTheme';
import { getFullImageUrl } from '../../utils/imageUtils';

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const theme = useTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            disconnectSocket();
            disconnectWebRTC();
            dispatch(logout());
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        {getFullImageUrl(user?.avatar) ? (
          <Image source={{ uri: getFullImageUrl(user.avatar)! }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.displayName, { color: theme.text }]}>{user?.displayName}</Text>
        <Text style={[styles.username, { color: theme.textSecondary }]}>@{user?.username}</Text>
        {user?.bio && <Text style={[styles.bio, { color: theme.textTertiary }]}>{user.bio}</Text>}
      </View>

      <View style={[styles.section, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
          <Ionicons name="mail-outline" size={24} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.text }]}>{user?.email}</Text>
        </View>

        {user?.phoneNumber && (
          <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
            <Ionicons name="call-outline" size={24} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.text }]}>{user.phoneNumber}</Text>
          </View>
        )}

        <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
          <Ionicons name="ellipse" size={12} color={user?.status === 'online' ? theme.success : theme.textTertiary} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            {user?.status === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="person-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Settings</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Notifications</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}
          onPress={() => navigation.navigate('PrivacySecurity')}
        >
          <Ionicons name="lock-closed-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Privacy & Security</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={theme.error} />
          <Text style={[styles.menuText, { color: theme.error }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, { color: theme.textTertiary }]}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
    color: '#333',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#ff3b30',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 20,
  },
});
