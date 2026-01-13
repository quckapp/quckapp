import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../../store';
import { fetchSettings, updateSettings } from '../../store/slices/settingsSlice';
import { useTheme } from '../../hooks/useTheme';

export default function NotificationSettingsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { settings, loading } = useSelector((state: RootState) => state.settings);
  const theme = useTheme();

  const [pushNotifications, setPushNotifications] = useState(settings?.pushNotifications ?? true);
  const [messageNotifications, setMessageNotifications] = useState(settings?.messageNotifications ?? true);
  const [groupNotifications, setGroupNotifications] = useState(settings?.groupNotifications ?? true);
  const [callNotifications, setCallNotifications] = useState(settings?.callNotifications ?? true);
  const [soundEnabled, setSoundEnabled] = useState(settings?.soundEnabled ?? true);
  const [vibrationEnabled, setVibrationEnabled] = useState(settings?.vibrationEnabled ?? true);
  const [showPreview, setShowPreview] = useState(settings?.showPreview ?? true);
  const [inAppNotifications, setInAppNotifications] = useState(settings?.inAppNotifications ?? true);
  const [notificationLight, setNotificationLight] = useState(settings?.notificationLight ?? true);

  useEffect(() => {
    dispatch(fetchSettings());
  }, []);

  useEffect(() => {
    if (settings) {
      setPushNotifications(settings.pushNotifications);
      setMessageNotifications(settings.messageNotifications);
      setGroupNotifications(settings.groupNotifications);
      setCallNotifications(settings.callNotifications);
      setSoundEnabled(settings.soundEnabled);
      setVibrationEnabled(settings.vibrationEnabled);
      setShowPreview(settings.showPreview);
      setInAppNotifications(settings.inAppNotifications);
      setNotificationLight(settings.notificationLight);
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

  const SwitchItem = ({ icon, title, subtitle, value, onValueChange, disabled }: any) => (
    <View style={[styles.settingItem, { borderBottomColor: theme.borderLight }, disabled && styles.disabledItem]}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={disabled ? theme.disabled : theme.primary} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.text }, disabled && { color: theme.textTertiary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.disabled, true: theme.primary }}
        thumbColor="#fff"
      />
    </View>
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
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>General</Text>
        <SwitchItem
          icon="notifications"
          title="Push Notifications"
          subtitle="Enable or disable all notifications"
          value={pushNotifications}
          onValueChange={(val: boolean) => handleUpdateSetting('pushNotifications', val, setPushNotifications)}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Message Notifications</Text>
        <SwitchItem
          icon="chatbubble"
          title="Message Notifications"
          subtitle="Get notified for new messages"
          value={messageNotifications}
          onValueChange={(val: boolean) => handleUpdateSetting('messageNotifications', val, setMessageNotifications)}
          disabled={!pushNotifications}
        />
        <SwitchItem
          icon="people"
          title="Group Notifications"
          subtitle="Get notified for group messages"
          value={groupNotifications}
          onValueChange={(val: boolean) => handleUpdateSetting('groupNotifications', val, setGroupNotifications)}
          disabled={!pushNotifications}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Call Notifications</Text>
        <SwitchItem
          icon="call"
          title="Call Notifications"
          subtitle="Get notified for incoming calls"
          value={callNotifications}
          onValueChange={(val: boolean) => handleUpdateSetting('callNotifications', val, setCallNotifications)}
          disabled={!pushNotifications}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Notification Style</Text>
        <SwitchItem
          icon="volume-high"
          title="Sound"
          subtitle="Play sound for notifications"
          value={soundEnabled}
          onValueChange={(val: boolean) => handleUpdateSetting('soundEnabled', val, setSoundEnabled)}
          disabled={!pushNotifications}
        />
        <SwitchItem
          icon="phone-portrait"
          title="Vibration"
          subtitle="Vibrate for notifications"
          value={vibrationEnabled}
          onValueChange={(val: boolean) => handleUpdateSetting('vibrationEnabled', val, setVibrationEnabled)}
          disabled={!pushNotifications}
        />
        <SwitchItem
          icon="bulb"
          title="Notification Light"
          subtitle="Blink LED for notifications"
          value={notificationLight}
          onValueChange={(val: boolean) => handleUpdateSetting('notificationLight', val, setNotificationLight)}
          disabled={!pushNotifications}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Privacy</Text>
        <SwitchItem
          icon="eye"
          title="Show Preview"
          subtitle="Show message preview in notifications"
          value={showPreview}
          onValueChange={(val: boolean) => handleUpdateSetting('showPreview', val, setShowPreview)}
          disabled={!pushNotifications}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>In-App</Text>
        <SwitchItem
          icon="notifications-circle"
          title="In-App Notifications"
          subtitle="Show notifications while using the app"
          value={inAppNotifications}
          onValueChange={(val: boolean) => handleUpdateSetting('inAppNotifications', val, setInAppNotifications)}
        />
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={20} color={theme.textTertiary} />
        <Text style={[styles.infoText, { color: theme.textTertiary }]}>
          Notification settings help you stay updated with your conversations while
          maintaining your privacy preferences.
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
  disabledItem: {
    opacity: 0.5,
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
  disabledText: {
    color: '#ccc',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#999',
    marginLeft: 10,
    lineHeight: 18,
  },
});
