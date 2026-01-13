import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { hasOverlayPermission, requestOverlayPermission as requestOverlayPermissionNative } from './floatingWidget';

// Permission types that need runtime request
const ANDROID_PERMISSIONS = {
  // Camera
  CAMERA: PermissionsAndroid.PERMISSIONS.CAMERA,

  // Audio
  RECORD_AUDIO: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,

  // Phone
  CALL_PHONE: PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  READ_PHONE_STATE: PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  READ_CALL_LOG: PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  WRITE_CALL_LOG: PermissionsAndroid.PERMISSIONS.WRITE_CALL_LOG,
  READ_PHONE_NUMBERS: PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
  ANSWER_PHONE_CALLS: PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,

  // Contacts
  READ_CONTACTS: PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  WRITE_CONTACTS: PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS,

  // Storage (for older Android versions)
  READ_EXTERNAL_STORAGE: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  WRITE_EXTERNAL_STORAGE: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,

  // Notifications (Android 13+)
  POST_NOTIFICATIONS: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,

  // Bluetooth
  BLUETOOTH_CONNECT: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
};

interface PermissionResult {
  granted: boolean;
  permission: string;
  status: string;
}

/**
 * Request all required runtime permissions
 */
export async function requestAllPermissions(): Promise<PermissionResult[]> {
  if (Platform.OS !== 'android') {
    return [];
  }

  console.log('📱 Requesting all permissions...');

  const results: PermissionResult[] = [];

  // Get Android version
  const sdkVersion = Platform.Version as number;

  // Permissions to request based on Android version
  const permissionsToRequest: string[] = [
    ANDROID_PERMISSIONS.CAMERA,
    ANDROID_PERMISSIONS.RECORD_AUDIO,
    ANDROID_PERMISSIONS.READ_CONTACTS,
    ANDROID_PERMISSIONS.READ_PHONE_STATE,
    ANDROID_PERMISSIONS.READ_CALL_LOG,
    ANDROID_PERMISSIONS.CALL_PHONE,
  ];

  // Android 13+ specific permissions
  if (sdkVersion >= 33) {
    permissionsToRequest.push(ANDROID_PERMISSIONS.POST_NOTIFICATIONS);
    permissionsToRequest.push(ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);
    permissionsToRequest.push(ANDROID_PERMISSIONS.READ_PHONE_NUMBERS);
  }

  // Android 12+ specific
  if (sdkVersion >= 31) {
    permissionsToRequest.push(ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);
  }

  // Older Android versions need storage permissions
  if (sdkVersion < 33) {
    permissionsToRequest.push(ANDROID_PERMISSIONS.READ_EXTERNAL_STORAGE);
    permissionsToRequest.push(ANDROID_PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  }

  try {
    // Request all permissions at once
    const grantResults = await PermissionsAndroid.requestMultiple(
      permissionsToRequest.filter(p => p) as any[]
    );

    for (const [permission, status] of Object.entries(grantResults)) {
      const granted = status === PermissionsAndroid.RESULTS.GRANTED;
      results.push({
        permission,
        granted,
        status,
      });

      if (granted) {
        console.log(`✅ Permission granted: ${permission}`);
      } else {
        console.log(`❌ Permission denied: ${permission} (${status})`);
      }
    }
  } catch (error) {
    console.error('❌ Error requesting permissions:', error);
  }

  return results;
}

/**
 * Check if a specific permission is granted
 */
export async function checkPermission(permission: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const result = await PermissionsAndroid.check(permission as any);
    return result;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if overlay permission (display over other apps) is granted
 */
export async function checkOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    return await hasOverlayPermission();
  } catch (error) {
    console.error('Error checking overlay permission:', error);
    return false;
  }
}

/**
 * Open overlay permission settings
 */
export async function requestOverlayPermission(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  // Check if already granted
  const hasPermission = await checkOverlayPermission();
  if (hasPermission) {
    console.log('✅ Overlay permission already granted');
    return;
  }

  Alert.alert(
    'Display Over Other Apps',
    'QuckChat needs permission to display floating call widget over other apps. Please enable "Display over other apps" in settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: async () => {
          try {
            await requestOverlayPermissionNative();
          } catch (error) {
            // Fallback to expo intent launcher
            try {
              await IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION
              );
            } catch (e) {
              // Final fallback to app settings
              Linking.openSettings();
            }
          }
        },
      },
    ]
  );
}

/**
 * Request battery optimization exemption
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  Alert.alert(
    'Battery Optimization',
    'To receive calls and messages reliably, please disable battery optimization for QuckChat.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: async () => {
          try {
            await IntentLauncher.startActivityAsync(
              IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
              { data: 'package:com.quckchat.app' }
            );
          } catch (error) {
            // Fallback to battery settings
            try {
              await IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
              );
            } catch (e) {
              Linking.openSettings();
            }
          }
        },
      },
    ]
  );
}

/**
 * Check and request all special permissions that require settings pages
 */
export async function requestSpecialPermissions(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  // Check overlay permission status
  const hasOverlay = await checkOverlayPermission();

  if (hasOverlay) {
    // Only battery optimization needed
    requestBatteryOptimizationExemption();
  } else {
    // Show a single dialog explaining all special permissions needed
    Alert.alert(
      'Additional Permissions Needed',
      'For the best experience with calls and notifications, QuckChat needs:\n\n' +
      '1. Display over other apps - for floating call widget\n' +
      '2. Battery optimization disabled - for reliable notifications\n\n' +
      'Would you like to set these up now?',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Set Up',
          onPress: async () => {
            // First request overlay permission
            await requestOverlayPermission();

            // Then battery optimization
            setTimeout(() => {
              requestBatteryOptimizationExemption();
            }, 1000);
          },
        },
      ]
    );
  }
}

/**
 * Check if all critical permissions are granted
 */
export async function checkCriticalPermissions(): Promise<{
  allGranted: boolean;
  missing: string[];
}> {
  if (Platform.OS !== 'android') {
    return { allGranted: true, missing: [] };
  }

  const criticalPermissions = [
    { name: 'Camera', permission: ANDROID_PERMISSIONS.CAMERA },
    { name: 'Microphone', permission: ANDROID_PERMISSIONS.RECORD_AUDIO },
    { name: 'Phone', permission: ANDROID_PERMISSIONS.READ_PHONE_STATE },
    { name: 'Contacts', permission: ANDROID_PERMISSIONS.READ_CONTACTS },
  ];

  const missing: string[] = [];

  for (const { name, permission } of criticalPermissions) {
    if (permission) {
      const granted = await checkPermission(permission);
      if (!granted) {
        missing.push(name);
      }
    }
  }

  return {
    allGranted: missing.length === 0,
    missing,
  };
}

/**
 * Show dialog for missing permissions and redirect to settings
 */
export async function promptForMissingPermissions(): Promise<void> {
  const { allGranted, missing } = await checkCriticalPermissions();

  if (allGranted) {
    return;
  }

  Alert.alert(
    'Permissions Required',
    `QuckChat needs the following permissions to work properly:\n\n${missing.map(p => `• ${p}`).join('\n')}\n\nPlease grant these permissions in Settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ]
  );
}

/**
 * Initialize all permissions on app start
 * Call this from App.tsx on first launch
 */
export async function initializePermissions(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  console.log('📱 Initializing permissions...');

  // Request runtime permissions
  const results = await requestAllPermissions();

  // Check if any critical permissions were denied
  const deniedCritical = results.filter(
    r => !r.granted &&
    (r.permission.includes('CAMERA') ||
     r.permission.includes('RECORD_AUDIO') ||
     r.permission.includes('READ_CONTACTS'))
  );

  if (deniedCritical.length > 0) {
    // Don't immediately prompt - let user use app first
    console.log('⚠️ Some critical permissions were denied:', deniedCritical.map(d => d.permission));
  }

  // Check and request overlay permission for floating widget
  const hasOverlay = await checkOverlayPermission();
  if (!hasOverlay) {
    console.log('⚠️ Overlay permission not granted, requesting...');
    // Request overlay permission with a slight delay to avoid permission overload
    setTimeout(() => {
      requestOverlayPermission();
    }, 500);
  } else {
    console.log('✅ Overlay permission already granted');
  }

  console.log('✅ Permission initialization complete');
}
