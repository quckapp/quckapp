import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer, DefaultTheme, DarkTheme, NavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { store, persistor, RootState } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { initializeSocket } from './src/services/socket';
import { initializeWebRTC } from './src/services/webrtc';
import { notificationService, NotificationData } from './src/services/notifications';
import { startNetworkMonitoring, stopNetworkMonitoring } from './src/services/networkMonitor';
import { initializeCallSounds } from './src/services/callSounds';
import { initializeCallKeep } from './src/services/callkeep';
import { OfflineIndicator } from './src/components/OfflineIndicator';
import { useTheme } from './src/hooks/useTheme';
import api, { setStoreForApi, markStoreRehydrated } from './src/services/api';
import LockScreen from './src/screens/auth/LockScreen';
import { isBiometricLockEnabled, lockApp } from './src/services/biometric';
import { initializePermissions, requestSpecialPermissions } from './src/services/permissions';

// Initialize store for API interceptors to break circular dependency
setStoreForApi(store);

function AppContent() {
  const darkMode = useSelector((state: RootState) => state.settings.settings?.darkMode);
  const theme = useTheme();
  const navigationRef = useRef<any>();
  const routeNameRef = useRef<string>();
  const appState = useRef(AppState.currentState);
  const [isLocked, setIsLocked] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const isNavigationReadyRef = useRef(false);
  const pendingNotificationRef = useRef<NotificationData | null>(null);

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // Function to actually perform the navigation (called when navigation is ready)
  const performNotificationNavigation = useCallback((data: NotificationData) => {
    const notificationType = (data as any).type;
    console.log('📱 Performing navigation for type:', notificationType);

    try {
      // Navigate based on notification type
      if ((notificationType === 'message' || notificationType === 'new_message') && data.conversationId) {
        console.log('📱 Navigating to conversation:', data.conversationId);
        // Navigate to Chats tab, then to Chat screen within the stack
        navigationRef.current?.navigate('Main', {
          screen: 'Chats',
          params: {
            screen: 'Chat',
            params: { conversationId: data.conversationId }
          }
        });
      } else if ((notificationType === 'call' || notificationType === 'incoming_call') && data.callId) {
        console.log('📞 Call notification tapped - triggering in-app call UI');
        // Dispatch incoming call action to Redux so the call UI shows
        const { incomingCall } = require('./src/store/slices/callSlice');
        store.dispatch(incomingCall({
          callId: data.callId,
          conversationId: data.conversationId || '',
          callType: (data.callType as 'audio' | 'video') || 'audio',
          caller: {
            id: 'unknown',
            displayName: data.callerName || data.senderName || 'Unknown',
            audioEnabled: true,
            videoEnabled: data.callType === 'video',
          },
        }));
      } else {
        console.log('📱 Unknown notification type or missing required data');
      }
    } catch (error) {
      console.error('❌ Error in notification navigation:', error);
    }
  }, []);

  // Function to handle navigation from notification - uses ref for navigation ready state
  const handleNotificationNavigation = useCallback((data: NotificationData) => {
    console.log('📱 handleNotificationNavigation called');
    console.log('📱 Navigation ready (ref):', isNavigationReadyRef.current);
    console.log('📱 Data:', JSON.stringify(data, null, 2));

    // Safety check
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ Invalid notification data - skipping navigation');
      return;
    }

    // If navigation isn't ready, store for later
    if (!isNavigationReadyRef.current || !navigationRef.current) {
      console.log('📱 Navigation not ready, storing pending notification');
      pendingNotificationRef.current = data;
      return;
    }

    performNotificationNavigation(data);
  }, [performNotificationNavigation]);

  // Process pending notification when navigation becomes ready
  useEffect(() => {
    isNavigationReadyRef.current = isNavigationReady;

    if (isNavigationReady && pendingNotificationRef.current) {
      console.log('📱 Processing pending notification after navigation ready');
      const pendingData = pendingNotificationRef.current;
      pendingNotificationRef.current = null;
      // Small delay to ensure navigation stack is fully mounted
      setTimeout(() => {
        performNotificationNavigation(pendingData);
      }, 300);
    }
  }, [isNavigationReady, performNotificationNavigation]);

  // Check if biometric lock is enabled and lock app when coming from background
  useEffect(() => {
    const checkLockStatus = async () => {
      if (isAuthenticated) {
        const biometricEnabled = await isBiometricLockEnabled();
        if (biometricEnabled) {
          setIsLocked(true);
        }
      }
    };
    checkLockStatus();
  }, [isAuthenticated]);

  useEffect(() => {
    // Initialize permissions first (Android only)
    if (Platform.OS === 'android') {
      initializePermissions().then(() => {
        console.log('✅ Permissions initialized');
        // Request special permissions (overlay, battery) after a delay
        setTimeout(() => {
          requestSpecialPermissions();
        }, 3000);
      });
    }

    // Initialize non-auth services
    initializeCallSounds();
    startNetworkMonitoring();

    // Initialize CallKeep early for native VoIP support (must be done before calls come in)
    if (Platform.OS !== 'web') {
      initializeCallKeep().then(() => {
        console.log('✅ CallKeep initialized for native call UI');
      }).catch((err) => {
        console.warn('⚠️ CallKeep initialization failed:', err);
      });
    }

    // Initialize notification service
    notificationService.initialize().then(() => {
      console.log('✅ Notification service ready');
    });

    // Set up navigation callback for notifications
    notificationService.setNavigationCallback((data: NotificationData) => {
      console.log('📱 Notification service callback triggered');
      handleNotificationNavigation(data);
    });

    // Handle app state changes (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground - set status to online and reconnect sockets
        api.put('/users/me/status', { status: 'online' })
          .catch(err => console.log('Failed to update status:', err));
        // Re-initialize sockets when coming back to foreground
        if (isAuthenticated) {
          initializeSocket();
          initializeWebRTC();
          // Check if biometric lock is enabled and lock app when returning
          const biometricEnabled = await isBiometricLockEnabled();
          if (biometricEnabled) {
            setIsLocked(true);
          }
        }
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App has gone to background - set status to offline
        api.put('/users/me/status', { status: 'offline' })
          .catch(err => console.log('Failed to update status:', err));
        // Lock app when going to background (if biometric is enabled)
        if (isAuthenticated) {
          const biometricEnabled = await isBiometricLockEnabled();
          if (biometricEnabled) {
            await lockApp();
          }
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      appStateSubscription.remove();
      notificationService.cleanup();
      stopNetworkMonitoring();
    };
  }, [isAuthenticated]);

  // Initialize sockets and register FCM token when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔐 User authenticated, initializing sockets...');
      // Initialize sockets when user is authenticated
      initializeSocket();
      initializeWebRTC();

      console.log('🔐 Registering FCM token...');
      notificationService.registerTokenIfAvailable().catch((error) => {
        console.error('❌ Failed to register FCM token:', error);
      });
    }
  }, [isAuthenticated]);

  const navigationTheme = darkMode ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  // Show lock screen if authenticated and locked
  if (isAuthenticated && isLocked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style={darkMode ? 'light' : 'dark'} />
          <LockScreen onUnlock={() => setIsLocked(false)} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          onReady={() => {
            routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
            console.log('✅ Navigation container ready');
            setIsNavigationReady(true);
          }}
          onStateChange={() => {
            routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
          }}
        >
          <StatusBar style={darkMode ? 'light' : 'dark'} />
          <RootNavigator />
          <OfflineIndicator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate
        loading={null}
        persistor={persistor}
        onBeforeLift={() => {
          console.log('✅ Redux store rehydrated');
          markStoreRehydrated();
        }}
      >
        <AppContent />
      </PersistGate>
    </Provider>
  );
}
