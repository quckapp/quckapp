import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../../store';
import { fetchSettings, updateSettings } from '../../store/slices/settingsSlice';
import { useTheme } from '../../hooks/useTheme';
import { useFloatingWidget } from '../../hooks/useFloatingWidget';

export default function SettingsScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { settings, loading } = useSelector((state: RootState) => state.settings);
  const theme = useTheme();

  // Floating Widget hook
  const {
    isRunning: widgetRunning,
    hasPermission: widgetPermission,
    requestPermission: requestWidgetPermission,
    start: startWidget,
    stop: stopWidget,
    updateContent: updateWidgetContent,
  } = useFloatingWidget(
    () => console.log('Widget tapped!'),
    () => console.log('Widget mute pressed!'),
    () => {
      console.log('Widget end call pressed!');
      stopWidget();
    },
    () => console.log('Widget closed!')
  );

  const [darkMode, setDarkMode] = useState(settings?.darkMode || false);
  const [autoDownloadMedia, setAutoDownloadMedia] = useState(settings?.autoDownloadMedia ?? true);
  const [saveToGallery, setSaveToGallery] = useState(settings?.saveToGallery || false);

  useEffect(() => {
    dispatch(fetchSettings());
  }, []);

  useEffect(() => {
    if (settings) {
      setDarkMode(settings.darkMode);
      setAutoDownloadMedia(settings.autoDownloadMedia);
      setSaveToGallery(settings.saveToGallery);
    }
  }, [settings]);

  const handleToggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    try {
      await dispatch(updateSettings({ darkMode: value })).unwrap();
    } catch (error) {
      setDarkMode(!value);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleToggleAutoDownload = async (value: boolean) => {
    setAutoDownloadMedia(value);
    try {
      await dispatch(updateSettings({ autoDownloadMedia: value })).unwrap();
    } catch (error) {
      setAutoDownloadMedia(!value);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleToggleSaveToGallery = async (value: boolean) => {
    setSaveToGallery(value);
    try {
      await dispatch(updateSettings({ saveToGallery: value })).unwrap();
    } catch (error) {
      setSaveToGallery(!value);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightComponent,
  }: any) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.borderLight }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={theme.primary} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || (showArrow && (
        <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
      ))}
    </TouchableOpacity>
  );

  const SwitchItem = ({ icon, title, subtitle, value, onValueChange }: any) => (
    <SettingItem
      icon={icon}
      title={title}
      subtitle={subtitle}
      showArrow={false}
      rightComponent={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.disabled, true: theme.primary }}
          thumbColor="#fff"
        />
      }
    />
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
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Appearance</Text>
        <SwitchItem
          icon="moon"
          title="Dark Mode"
          subtitle="Enable dark theme"
          value={darkMode}
          onValueChange={handleToggleDarkMode}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Media & Storage</Text>
        <SwitchItem
          icon="download"
          title="Auto Download Media"
          subtitle="Automatically download photos and videos"
          value={autoDownloadMedia}
          onValueChange={handleToggleAutoDownload}
        />
        <SwitchItem
          icon="images"
          title="Save to Gallery"
          subtitle="Save received media to your gallery"
          value={saveToGallery}
          onValueChange={handleToggleSaveToGallery}
        />
        <SettingItem
          icon="trash"
          title="Clear Cache"
          subtitle="Free up storage space"
          onPress={handleClearCache}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Notifications</Text>
        <SettingItem
          icon="notifications"
          title="Notification Settings"
          subtitle="Manage notification preferences"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Privacy & Security</Text>
        <SettingItem
          icon="shield-checkmark"
          title="Privacy & Security"
          subtitle="Control your privacy and security settings"
          onPress={() => navigation.navigate('PrivacySecurity')}
        />
        <SettingItem
          icon="phone-portrait"
          title="Linked Devices"
          subtitle="Manage devices connected to your account"
          onPress={() => navigation.navigate('LinkedDevices')}
        />
        <SettingItem
          icon="cloud-upload"
          title="Chat Backup"
          subtitle="Backup chats to Google Cloud Storage"
          onPress={() => navigation.navigate('Backup')}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Analytics</Text>
        <SettingItem
          icon="stats-chart"
          title="Analytics Dashboard"
          subtitle="View app usage statistics and insights"
          onPress={() => navigation.navigate('Analytics')}
        />
      </View>

      {Platform.OS === 'android' && (
        <View style={[styles.section, { backgroundColor: theme.background }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Floating Widget (Test)</Text>
          <SettingItem
            icon="shield-checkmark"
            title="Overlay Permission"
            subtitle={widgetPermission ? 'Granted' : 'Not granted - tap to request'}
            onPress={async () => {
              const granted = await requestWidgetPermission();
              Alert.alert('Permission', granted ? 'Permission granted!' : 'Please enable overlay permission in settings');
            }}
          />
          <SettingItem
            icon={widgetRunning ? 'stop-circle' : 'play-circle'}
            title={widgetRunning ? 'Stop Widget' : 'Start Widget'}
            subtitle={widgetRunning ? 'Widget is currently running' : 'Tap to show floating widget'}
            onPress={async () => {
              if (widgetRunning) {
                await stopWidget();
                Alert.alert('Widget', 'Widget stopped');
              } else {
                if (!widgetPermission) {
                  Alert.alert('Permission Required', 'Please grant overlay permission first');
                  return;
                }
                const started = await startWidget({
                  title: 'Test Call',
                  subtitle: '00:00',
                  iconType: 'call',
                });
                if (started) {
                  Alert.alert('Widget', 'Widget started! Check outside the app.');
                } else {
                  Alert.alert('Error', 'Failed to start widget');
                }
              }
            }}
          />
          {widgetRunning && (
            <SettingItem
              icon="refresh"
              title="Update Widget"
              subtitle="Change widget content"
              onPress={async () => {
                await updateWidgetContent({
                  title: 'Updated!',
                  subtitle: '05:30',
                  iconType: 'video',
                });
                Alert.alert('Widget', 'Widget content updated');
              }}
            />
          )}
        </View>
      )}

      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>About</Text>
        <SettingItem
          icon="information-circle"
          title="App Version"
          subtitle="1.0.0"
          showArrow={false}
        />
        <SettingItem
          icon="document-text"
          title="Terms of Service"
          onPress={() => Alert.alert('Terms of Service', 'Terms of Service content')}
        />
        <SettingItem
          icon="shield"
          title="Privacy Policy"
          onPress={() => Alert.alert('Privacy Policy', 'Privacy Policy content')}
        />
        <SettingItem
          icon="help-circle"
          title="Help & Support"
          onPress={() => Alert.alert('Help & Support', 'Contact support at support@quckchat.com')}
        />
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
});
