import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import { displayIncomingCall } from './callkeep';

// Firebase messaging for proper background FCM handling
let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
  console.log('✅ Firebase Messaging module loaded');
} catch (error) {
  console.warn('⚠️ Firebase Messaging not available:', error);
}

// NOTE: Firebase background message handler is registered in index.js
// It MUST be registered before React Native starts to handle messages when app is killed
// See index.js for the setBackgroundMessageHandler implementation

// Check if running in Expo Go (push notifications don't work in Expo Go since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    try {
      // Check notification type to determine behavior
      const data = notification?.request?.content?.data;

      // Safety check - if no data, show notification by default
      if (!data || typeof data !== 'object') {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        };
      }

      const notificationType = (data as any).type;

      // For call notifications, always show alert with maximum priority
      if (notificationType === 'call' || notificationType === 'incoming_call') {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        };
      }

      // For message notifications, always show (we can't check conversation state without store)
      if (notificationType === 'message' || notificationType === 'new_message') {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        };
      }

      // Default: don't show notification
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    } catch (error) {
      console.error('Error in notification handler:', error);
      // On error, show notification to be safe
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    }
  },
});

interface NotificationData {
  type: 'message' | 'new_message' | 'call' | 'incoming_call' | 'reaction' | 'typing' | 'mention';
  conversationId?: string;
  callId?: string;
  callType?: 'audio' | 'video';
  messageId?: string;
  senderId?: string;
  senderName?: string;
  [key: string]: any;
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private navigationCallback: ((data: NotificationData) => void) | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private pendingNotificationTap: NotificationData | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   * - Request permissions
   * - Get Expo push token
   * - Register token with backend
   * - Set up notification listeners
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Notification service already initialized');
      return;
    }

    // If already initializing, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Store the initialization promise so other callers can wait for it
    this.initializationPromise = (async () => {
      try {
        console.log('📱 Initializing notification service...');

        // Request permissions
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
          console.warn('⚠️ Notification permissions denied - continuing without notifications');
          // Don't return, still set up listeners for when permissions are granted
        }

        // Set up Android notification channels
        if (Platform.OS === 'android') {
          await this.setupAndroidChannels();
        }

        // Get Expo push token
        if (Device.isDevice) {
          const token = await this.getExpoPushToken();
          if (token) {
            this.expoPushToken = token;
            console.log('✅ Push token obtained');
            // Token will be registered with backend when user logs in (via authMiddleware)
          }
        } else {
          console.warn('⚠️ Running on emulator - push notifications will not work');
        }

        // Set up notification listeners
        this.setupNotificationListeners();

        // Handle notification that launched the app
        await this.handleInitialNotification();

        this.isInitialized = true;
        console.log('✅ Notification service initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing notification service:', error);
        // Don't throw, allow app to continue without notifications
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return false;
      }

      // Get current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permissions not granted');
        return false;
      }

      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get Expo/FCM push token
   * For Android with Firebase, this returns the FCM token
   * For iOS, this returns the Expo push token
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      // Skip in Expo Go - push notifications don't work since SDK 53
      if (isExpoGo) {
        console.warn('⚠️ Running in Expo Go - push notifications not supported (SDK 53+). Use a development build.');
        return null;
      }

      if (!Device.isDevice) {
        console.warn('⚠️ Cannot get push token on emulator');
        return null;
      }

      console.log('📱 Getting push notification token...');

      // Prefer Firebase messaging token on Android for proper background handling
      if (Platform.OS === 'android' && messaging) {
        try {
          // Request permission for Firebase messaging
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus?.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus?.PROVISIONAL ||
            authStatus === 1 ||
            authStatus === 2;

          if (enabled) {
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
              console.log('✅ FCM token obtained via Firebase Messaging');
              console.log(`📱 Token type: android (Firebase)`);
              return fcmToken;
            }
          }
        } catch (firebaseError) {
          console.warn('⚠️ Firebase Messaging token error, falling back to expo:', firebaseError);
        }
      }

      // Fallback to Expo's getDevicePushTokenAsync
      const tokenData = await Notifications.getDevicePushTokenAsync();

      console.log('✅ Push token obtained successfully');
      console.log(`📱 Token type: ${tokenData.type}`);

      return tokenData.data;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend
   * This should be called after the user is authenticated
   */
  async registerTokenWithBackend(token: string): Promise<void> {
    try {
      console.log('📤 Registering FCM token with backend...');

      // Try the new endpoint first
      try {
        await api.put('/users/me/fcm-token', { token, action: 'add' });
      } catch (error: any) {
        // If new endpoint doesn't exist, try the old one
        if (error?.response?.status === 404) {
          await api.post('/users/fcm-token', { fcmToken: token });
        } else {
          throw error;
        }
      }

      console.log('✅ FCM token registered successfully');
    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
    }
  }

  /**
   * Unregister FCM token from backend (on logout)
   */
  async unregisterTokenFromBackend(): Promise<void> {
    try {
      if (!this.expoPushToken) {
        return;
      }

      console.log('📤 Unregistering FCM token from backend...');

      // Try the new endpoint first
      try {
        await api.put('/users/me/fcm-token', {
          token: this.expoPushToken,
          action: 'remove'
        });
      } catch (error: any) {
        // If new endpoint doesn't exist, try the old one
        if (error?.response?.status === 404) {
          await api.delete('/users/fcm-token', {
            data: { fcmToken: this.expoPushToken },
          });
        } else {
          throw error;
        }
      }

      console.log('✅ FCM token unregistered successfully');
    } catch (error) {
      console.error('❌ Error unregistering FCM token:', error);
    }
  }

  /**
   * Set up Android notification channels
   */
  async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Chat Messages channel
      await Notifications.setNotificationChannelAsync('chat_messages', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0066FF',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      // Group Messages channel
      await Notifications.setNotificationChannelAsync('group_messages', {
        name: 'Group Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0066FF',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      // Calls channel
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: '#10B981',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      // Mentions channel
      await Notifications.setNotificationChannelAsync('mentions', {
        name: 'Mentions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 300, 300],
        lightColor: '#F59E0B',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      // Reactions channel
      await Notifications.setNotificationChannelAsync('reactions', {
        name: 'Reactions',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        sound: 'default',
      });

      console.log('✅ Android notification channels set up');
    } catch (error) {
      console.error('❌ Error setting up Android channels:', error);
    }
  }

  /**
   * Set up notification listeners for foreground, background, and killed states
   */
  setupNotificationListeners(): void {
    // Set up Firebase messaging listeners if available (for proper background handling)
    if (messaging) {
      try {
        // Handler for when app receives a message while in foreground
        messaging().onMessage(async (remoteMessage: any) => {
          console.log('🔥 Firebase: Foreground message received:', JSON.stringify(remoteMessage, null, 2));
          const data = remoteMessage.data as NotificationData;
          if (data) {
            this.handleNotificationReceived(data);
          }
        });

        // Handler for when notification is pressed and app opens from background
        messaging().onNotificationOpenedApp((remoteMessage: any) => {
          console.log('🔥 Firebase: App opened from background notification:', JSON.stringify(remoteMessage, null, 2));
          const data = remoteMessage.data as NotificationData;
          if (data) {
            // Small delay to ensure navigation is ready
            setTimeout(() => {
              this.handleNotificationTapped(data);
            }, 500);
          }
        });

        // Check if app was opened from a killed state by notification
        messaging()
          .getInitialNotification()
          .then((remoteMessage: any) => {
            if (remoteMessage) {
              console.log('🔥 Firebase: App opened from killed state notification:', JSON.stringify(remoteMessage, null, 2));
              const data = remoteMessage.data as NotificationData;
              if (data) {
                // Handle call notifications - show CallKeep UI
                if (data.type === 'call' || data.type === 'incoming_call') {
                  console.log('📞 App launched from call notification (killed state) - triggering CallKeep');
                  this.handleNotificationReceived(data);
                }
                // Delay navigation to ensure app is ready
                setTimeout(() => {
                  this.handleNotificationTapped(data);
                }, 1500);
              }
            }
          });

        console.log('✅ Firebase messaging listeners set up');
      } catch (error) {
        console.error('❌ Error setting up Firebase messaging listeners:', error);
      }
    }

    // Listener for notifications received while app is in foreground (Expo fallback)
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notification received (foreground):', notification.request.content);
        const data = notification.request.content.data as NotificationData;

        // Handle different notification types
        this.handleNotificationReceived(data);
      }
    );

    // Listener for when user taps on notification (Expo fallback)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped - Full response:', JSON.stringify(response, null, 2));
        console.log('👆 Notification content:', JSON.stringify(response.notification.request.content, null, 2));
        console.log('👆 Notification data:', JSON.stringify(response.notification.request.content.data, null, 2));
        console.log('👆 Data type:', typeof response.notification.request.content.data);

        const data = response.notification.request.content.data as NotificationData;
        console.log('👆 Data after cast:', data);

        // Navigate to appropriate screen
        this.handleNotificationTapped(data);
      }
    );

    console.log('✅ Notification listeners set up');
  }

  /**
   * Handle notification that launched the app (cold start)
   */
  async handleInitialNotification(): Promise<void> {
    try {
      console.log('🔍 Checking for initial notification (cold start)...');
      const response = await Notifications.getLastNotificationResponseAsync();

      if (response) {
        console.log('🚀 App launched from notification - Full response:', JSON.stringify(response, null, 2));
        console.log('🚀 Content:', JSON.stringify(response.notification.request.content, null, 2));
        console.log('🚀 Data:', JSON.stringify(response.notification.request.content.data, null, 2));

        const data = response.notification.request.content.data as NotificationData;
        console.log('🚀 Data after cast:', data);
        console.log('🚀 Data type:', typeof data);

        // Handle call notifications specially - show CallKeep UI
        if (data.type === 'call' || data.type === 'incoming_call') {
          console.log('📞 App launched from call notification - triggering CallKeep');
          this.handleNotificationReceived(data);
        }

        // Small delay to ensure navigation is ready
        setTimeout(() => {
          console.log('🚀 Triggering navigation after 1s delay');
          this.handleNotificationTapped(data);
        }, 1000);
      } else {
        console.log('ℹ️ No initial notification found');
      }
    } catch (error) {
      console.error('❌ Error getting initial notification:', error);
    }
  }

  /**
   * Handle notification received (foreground and background)
   */
  private handleNotificationReceived(data: NotificationData): void {
    console.log('📨 Processing notification:', data.type);

    // Handle incoming call notifications - trigger CallKeep native UI
    if (data.type === 'call' || data.type === 'incoming_call') {
      const callId = data.callId;
      const callerName = data.callerName || data.senderName || 'Unknown';
      const callType = data.callType || 'audio';
      const conversationId = data.conversationId || '';

      if (callId) {
        console.log('📞 Incoming call notification - displaying CallKeep UI:', {
          callId,
          callerName,
          callType,
          conversationId,
        });
        displayIncomingCall(callId, callerName, callType, conversationId);
      } else {
        console.warn('⚠️ Incoming call notification missing callId');
      }
    }
  }

  /**
   * Handle notification tapped
   */
  private handleNotificationTapped(data: NotificationData): void {
    console.log('🔍 handleNotificationTapped called');
    console.log('🔍 Data received:', JSON.stringify(data, null, 2));
    console.log('🔍 Data type:', typeof data);
    console.log('🔍 Navigation callback exists:', !!this.navigationCallback);

    if (this.navigationCallback) {
      console.log('✅ Calling navigation callback with data');
      this.navigationCallback(data);
    } else {
      console.warn('⚠️ Navigation callback not set yet - storing pending notification tap');
      // Store pending notification to process when callback is set
      this.pendingNotificationTap = data;
    }
  }

  /**
   * Register navigation callback for handling notification taps
   */
  setNavigationCallback(callback: (data: NotificationData) => void): void {
    this.navigationCallback = callback;
    console.log('✅ Navigation callback registered');

    // Process any pending notification tap that occurred before callback was set
    if (this.pendingNotificationTap) {
      console.log('📱 Processing pending notification tap');
      const pendingData = this.pendingNotificationTap;
      this.pendingNotificationTap = null;
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        callback(pendingData);
      }, 500);
    }
  }

  /**
   * Send a local notification (for testing or in-app alerts)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<string | null> {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
      return null;
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Register FCM token with backend if available and user is logged in
   * Call this after successful login/authentication
   * This method will wait for initialization to complete before attempting registration
   */
  async registerTokenIfAvailable(): Promise<void> {
    // Skip in Expo Go - push notifications don't work since SDK 53
    if (isExpoGo) {
      console.log('ℹ️ Skipping FCM registration in Expo Go (not supported since SDK 53)');
      return;
    }

    // Wait for initialization to complete if still in progress
    if (this.initializationPromise && !this.isInitialized) {
      console.log('⏳ Waiting for notification service initialization...');
      await this.initializationPromise;
    }

    if (this.expoPushToken) {
      console.log('📤 Registering FCM token after login...');
      await this.registerTokenWithBackend(this.expoPushToken);
    } else {
      console.warn('⚠️ No FCM token available to register');
    }
  }

  /**
   * Cleanup notification listeners
   */
  cleanup(): void {
    try {
      if (this.notificationListener) {
        // Use .remove() method which is available on the subscription object
        this.notificationListener.remove();
        this.notificationListener = null;
      }
      if (this.responseListener) {
        this.responseListener.remove();
        this.responseListener = null;
      }
    } catch (error) {
      console.warn('⚠️ Error cleaning up notification listeners:', error);
    }
    this.navigationCallback = null;
    this.pendingNotificationTap = null;
    this.isInitialized = false;
    console.log('✅ Notification service cleaned up');
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export types
export type { NotificationData };

// Legacy exports for backward compatibility
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  await notificationService.initialize();
  return notificationService.getPushToken() || undefined;
}

export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  const notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    try {
      notificationListener.remove();
      responseListener.remove();
    } catch (error) {
      console.warn('⚠️ Error removing notification listeners:', error);
    }
  };
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<string | null> {
  return await notificationService.sendLocalNotification(title, body, data);
}

export async function setBadgeCount(count: number): Promise<void> {
  await notificationService.setBadgeCount(count);
}

export async function clearAllNotifications(): Promise<void> {
  await notificationService.clearAllNotifications();
}
