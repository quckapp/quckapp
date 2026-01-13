import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';
import { fetchSettings, updateSettings, fetchBlockedUsers } from '../../store/slices/settingsSlice';
import { useTheme } from '../../hooks/useTheme';
import {
  isBiometricAvailable,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  getBiometricTypeName,
} from '../../services/biometric';

export default function PrivacySecurityScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { settings, loading } = useSelector((state: RootState) => state.settings);
  const theme = useTheme();

  const [readReceipts, setReadReceipts] = useState(settings?.readReceipts ?? true);
  const [lastSeen, setLastSeen] = useState(settings?.lastSeen ?? true);
  const [profilePhoto, setProfilePhoto] = useState(settings?.profilePhotoVisibility || 'everyone');
  const [status, setStatus] = useState(settings?.statusVisibility || 'everyone');
  const [twoFactorAuth, setTwoFactorAuth] = useState(settings?.twoFactorAuth || false);
  const [fingerprintLock, setFingerprintLock] = useState(settings?.fingerprintLock || false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Fingerprint');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    dispatch(fetchSettings());
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available);

    if (available) {
      const type = await getBiometricTypeName();
      setBiometricType(type);

      const enabled = await isBiometricLockEnabled();
      setBiometricEnabled(enabled);
    }
  };

  useEffect(() => {
    if (settings) {
      setReadReceipts(settings.readReceipts);
      setLastSeen(settings.lastSeen);
      setProfilePhoto(settings.profilePhotoVisibility);
      setStatus(settings.statusVisibility);
      setTwoFactorAuth(settings.twoFactorAuth);
      setFingerprintLock(settings.fingerprintLock);
    }
  }, [settings]);

  const handleUpdateSetting = async (key: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    try {
      await dispatch(updateSettings({ [key]: value })).unwrap();
    } catch (error) {
      setter(!value);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Please set up fingerprint or face recognition in your device settings first.',
        [{ text: 'OK' }]
      );
      return;
    }

    const success = await setBiometricLockEnabled(value);

    if (success) {
      setBiometricEnabled(value);
      // Also update backend settings
      try {
        await dispatch(updateSettings({ fingerprintLock: value })).unwrap();
      } catch (error) {
        console.error('Failed to sync biometric setting to backend:', error);
      }

      Alert.alert(
        value ? 'Biometric Lock Enabled' : 'Biometric Lock Disabled',
        value
          ? `QuickChat will now require ${biometricType} to unlock.`
          : 'Biometric lock has been disabled.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Authentication Failed',
        'Could not verify your identity. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBlockedContacts = async () => {
    try {
      const blockedUsers = await dispatch(fetchBlockedUsers()).unwrap();
      if (blockedUsers.length === 0) {
        Alert.alert('Blocked Contacts', 'You have no blocked contacts');
      } else {
        const message = blockedUsers.map((u: any) => u.displayName).join('\n');
        Alert.alert('Blocked Contacts', message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch blocked contacts');
    }
  };

  const handleChangePhoneNumber = () => {
    Alert.alert(
      'Change Phone Number',
      'This feature will allow you to change your phone number while keeping your account data.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Please type DELETE to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm',
                  style: 'destructive',
                  onPress: () => {
                    dispatch(logout());
                    Alert.alert('Account Deleted', 'Your account has been deleted');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const SwitchItem = ({ icon, title, subtitle, value, onValueChange }: any) => (
    <View style={[styles.settingItem, { borderBottomColor: theme.borderLight }]}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={theme.primary} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.disabled, true: theme.primary }}
        thumbColor="#fff"
      />
    </View>
  );

  const SettingItem = ({ icon, title, subtitle, onPress, rightText, danger }: any) => (
    <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.borderLight }]} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={danger ? theme.error : theme.primary} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: danger ? theme.error : theme.text }]}>
            {title}
          </Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightText ? (
        <Text style={[styles.rightText, { color: theme.textTertiary }]}>{rightText}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
      )}
    </TouchableOpacity>
  );

  if (loading && !settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Privacy</Text>
        <SwitchItem
          icon="checkmark-done"
          title="Read Receipts"
          subtitle="Let others know when you've read their messages"
          value={readReceipts}
          onValueChange={(val: boolean) => handleUpdateSetting('readReceipts', val, setReadReceipts)}
        />
        <SwitchItem
          icon="time"
          title="Last Seen"
          subtitle="Show when you were last active"
          value={lastSeen}
          onValueChange={(val: boolean) => handleUpdateSetting('lastSeen', val, setLastSeen)}
        />
        <SettingItem
          icon="person-circle"
          title="Profile Photo"
          subtitle="Who can see your profile photo"
          rightText="Everyone"
          onPress={() => Alert.alert('Profile Photo Visibility', 'Feature coming soon')}
        />
        <SettingItem
          icon="information-circle"
          title="Status"
          subtitle="Who can see your status updates"
          rightText="Everyone"
          onPress={() => Alert.alert('Status Visibility', 'Feature coming soon')}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Security</Text>
        <SwitchItem
          icon="shield-checkmark"
          title="Two-Factor Authentication"
          subtitle="Add an extra layer of security"
          value={twoFactorAuth}
          onValueChange={(val: boolean) => handleUpdateSetting('twoFactorAuth', val, setTwoFactorAuth)}
        />
        <SwitchItem
          icon="finger-print"
          title={`${biometricType} Lock`}
          subtitle={biometricAvailable
            ? `Lock app with ${biometricType}`
            : 'Set up biometric in device settings'}
          value={biometricEnabled}
          onValueChange={handleToggleBiometric}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</Text>
        <SettingItem
          icon="ban"
          title="Blocked Contacts"
          subtitle="Manage blocked users"
          onPress={handleBlockedContacts}
        />
        <SettingItem
          icon="call"
          title="Change Phone Number"
          subtitle="Update your phone number"
          onPress={handleChangePhoneNumber}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Data</Text>
        <SettingItem
          icon="download"
          title="Request Account Data"
          subtitle="Download a copy of your data"
          onPress={() => Alert.alert('Request Data', 'Your data will be prepared and sent to your email')}
        />
      </View>

      <View style={[styles.dangerSection, { backgroundColor: theme.background }]}>
        <SettingItem
          icon="trash"
          title="Delete Account"
          subtitle="Permanently delete your account"
          onPress={handleDeleteAccount}
          danger
        />
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={20} color={theme.textTertiary} />
        <Text style={[styles.infoText, { color: theme.textTertiary }]}>
          Your privacy and security are important to us. You have full control over
          who can see your information and how your account is protected.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
  },
  dangerSection: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 15,
    marginTop: 10,
    marginBottom: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  rightText: {
    fontSize: 14,
    color: '#999',
    marginRight: 5,
  },
  dangerText: {
    color: '#FF3B30',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#999',
    marginLeft: 10,
    lineHeight: 18,
  },
});
