// index.js - Must register background handler BEFORE importing the app
// This is critical for handling FCM messages when the app is killed

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for pending call data
const PENDING_CALL_KEY = '@quckchat_pending_call';

// Import RNCallKeep directly - DON'T import from callkeep service
// because it depends on Redux store which isn't initialized when app is killed
let RNCallKeep = null;
try {
  RNCallKeep = require('react-native-callkeep').default;
} catch (error) {
  console.warn('CallKeep not available in background handler:', error);
}

// Generate a UUID for CallKeep
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Register background message handler - this runs even when app is killed
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔥 Background FCM message received (app killed/background):', JSON.stringify(remoteMessage, null, 2));

  const data = remoteMessage.data;

  if (!data) {
    console.log('⚠️ No data in background message');
    return;
  }

  console.log('📦 Background message data:', JSON.stringify(data, null, 2));

  // Handle incoming call notifications - trigger native call UI
  if (data.type === 'call' || data.type === 'incoming_call') {
    const callId = data.callId;
    const callerName = data.callerName || data.senderName || 'Unknown';
    const callType = data.callType || 'audio';
    const conversationId = data.conversationId || '';

    if (callId) {
      console.log('📞 Background: Incoming call - displaying CallKeep UI:', {
        callId,
        callerName,
        callType,
        conversationId,
      });

      // Generate UUID for this call
      const callUUID = generateUUID();

      // Save pending call data to AsyncStorage BEFORE showing CallKeep UI
      // This is critical - app needs this data when it launches after user answers
      const pendingCallData = {
        callUUID,
        callId,
        callerName,
        callType,
        conversationId,
        timestamp: Date.now(),
        status: 'pending', // Will be updated to 'answered' or 'rejected'
      };

      try {
        await AsyncStorage.setItem(PENDING_CALL_KEY, JSON.stringify(pendingCallData));
        console.log('✅ Background: Pending call data saved to AsyncStorage:', pendingCallData);
      } catch (storageError) {
        console.error('❌ Failed to save pending call data:', storageError);
      }

      // Use RNCallKeep directly to show native incoming call UI
      if (RNCallKeep) {
        try {
          // Setup CallKeep if not already done (required for background)
          await RNCallKeep.setup({
            ios: {
              appName: 'QuckChat',
              supportsVideo: true,
            },
            android: {
              alertTitle: 'Permissions Required',
              alertDescription: 'QuckChat needs to access your phone accounts',
              cancelButton: 'Cancel',
              okButton: 'OK',
              additionalPermissions: [],
              selfManaged: true,
            },
          });

          // Display the native incoming call UI
          RNCallKeep.displayIncomingCall(
            callUUID,
            callerName,
            callerName,
            'generic',
            callType === 'video',
            {
              // Pass call data so it can be retrieved when user answers
              callId,
              conversationId,
              callType,
            }
          );
          console.log('✅ Background: CallKeep incoming call displayed', { callUUID, callId });
        } catch (error) {
          console.error('❌ Error displaying incoming call via CallKeep:', error);
        }
      } else {
        console.warn('⚠️ CallKeep not available - cannot show native call UI in background');
      }
    } else {
      console.warn('⚠️ Background call notification missing callId');
    }
  }

  // For other notification types, they will show as system notifications automatically
  // if the FCM message has a notification payload
});

// Now import the regular Expo entry point
import 'expo/AppEntry';
