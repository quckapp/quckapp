import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store';
import { incomingCall, endCall, answerCall as answerCallAction } from '../store/slices/callSlice';

// Storage key must match the one in index.js
const PENDING_CALL_KEY = '@quckchat_pending_call';

// Interface for pending call data stored by background handler
interface PendingCallData {
  callUUID: string;
  callId: string;
  callerName: string;
  callType: 'audio' | 'video';
  conversationId: string;
  timestamp: number;
  status: 'pending' | 'answered' | 'rejected';
}

// Lazy load RNCallKeep to handle New Architecture compatibility
let RNCallKeep: any = null;
let callKeepAvailable = false;

try {
  RNCallKeep = require('react-native-callkeep').default;
  callKeepAvailable = true;
} catch (error) {
  console.warn('react-native-callkeep not available (New Architecture incompatibility):', error);
  callKeepAvailable = false;
}

interface CallKeepOptions {
  ios: {
    appName: string;
    supportsVideo: boolean;
  };
  android: {
    alertTitle: string;
    alertDescription: string;
    cancelButton: string;
    okButton: string;
    additionalPermissions: string[];
    selfManaged: boolean;
  };
}

class CallKeepService {
  private static instance: CallKeepService;
  private isInitialized: boolean = false;
  private activeCallUUID: string | null = null;
  private pendingCalls: Map<string, { callId: string; callerName: string; callType: 'audio' | 'video'; conversationId: string }> = new Map();

  private constructor() {}

  static getInstance(): CallKeepService {
    if (!CallKeepService.instance) {
      CallKeepService.instance = new CallKeepService();
    }
    return CallKeepService.instance;
  }

  async initialize(): Promise<void> {
    if (!callKeepAvailable || !RNCallKeep) {
      console.warn('CallKeep not available, skipping initialization');
      return;
    }

    if (this.isInitialized) {
      console.log('CallKeep already initialized');
      return;
    }

    try {
      const options: CallKeepOptions = {
        ios: {
          appName: 'QuckChat',
          supportsVideo: true,
        },
        android: {
          alertTitle: 'Permissions Required',
          alertDescription: 'QuckChat needs to access your phone accounts for incoming calls',
          cancelButton: 'Cancel',
          okButton: 'OK',
          additionalPermissions: [],
          selfManaged: true, // Use self-managed calls for better control
        },
      };

      await RNCallKeep.setup(options);

      // Register event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('CallKeep initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CallKeep:', error);
      callKeepAvailable = false;
    }
  }

  private setupEventListeners(): void {
    if (!RNCallKeep) return;

    // Called when user answers the call from the native UI
    RNCallKeep.addEventListener('answerCall', this.onAnswerCall.bind(this));

    // Called when user rejects the call from the native UI
    RNCallKeep.addEventListener('endCall', this.onEndCall.bind(this));

    // Called when the audio route changes
    RNCallKeep.addEventListener('didActivateAudioSession', this.onAudioSessionActivated.bind(this));

    // Called when call is displayed to the user
    RNCallKeep.addEventListener('didDisplayIncomingCall', this.onIncomingCallDisplayed.bind(this));

    // Called when user toggles mute
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', this.onMuteToggled.bind(this));

    console.log('CallKeep event listeners registered');
  }

  private onAnswerCall({ callUUID }: { callUUID: string }): void {
    console.log('CallKeep: User answered call', callUUID);

    const pendingCall = this.pendingCalls.get(callUUID);
    if (pendingCall) {
      // Dispatch Redux action to answer the call
      store.dispatch(answerCallAction({ callId: pendingCall.callId }));

      // The webrtc.ts will handle the actual WebRTC connection
      // We need to emit a custom event or call a callback
      if (this.onAnswerCallback) {
        this.onAnswerCallback(pendingCall.callId);
      }
    }

    this.activeCallUUID = callUUID;
  }

  private onEndCall({ callUUID }: { callUUID: string }): void {
    console.log('CallKeep: User ended/rejected call', callUUID);

    const pendingCall = this.pendingCalls.get(callUUID);
    if (pendingCall) {
      // Dispatch Redux action to end the call
      store.dispatch(endCall());

      // Call the reject callback if provided
      if (this.onRejectCallback) {
        this.onRejectCallback(pendingCall.callId);
      }
    }

    this.pendingCalls.delete(callUUID);
    if (this.activeCallUUID === callUUID) {
      this.activeCallUUID = null;
    }
  }

  private onAudioSessionActivated(): void {
    console.log('CallKeep: Audio session activated');
  }

  private onIncomingCallDisplayed({ callUUID, handle, fromPushKit }: { callUUID: string; handle: string; fromPushKit: boolean }): void {
    console.log('CallKeep: Incoming call displayed', { callUUID, handle, fromPushKit });
  }

  private onMuteToggled({ callUUID, muted }: { callUUID: string; muted: boolean }): void {
    console.log('CallKeep: Mute toggled', { callUUID, muted });
    // Handle mute toggle - can dispatch action to toggle audio
  }

  // Callbacks for webrtc integration
  private onAnswerCallback: ((callId: string) => void) | null = null;
  private onRejectCallback: ((callId: string) => void) | null = null;

  setCallbacks(onAnswer: (callId: string) => void, onReject: (callId: string) => void): void {
    this.onAnswerCallback = onAnswer;
    this.onRejectCallback = onReject;
  }

  /**
   * Display incoming call using native call UI
   * This will show the call even when the app is in background or killed
   */
  displayIncomingCall(
    callId: string,
    callerName: string,
    callType: 'audio' | 'video',
    conversationId: string,
  ): void {
    // Always dispatch to Redux for app-based UI as fallback
    const dispatchIncomingCall = () => {
      store.dispatch(incomingCall({
        callId,
        conversationId,
        callType,
        caller: {
          id: 'unknown',
          displayName: callerName,
          audioEnabled: true,
          videoEnabled: callType === 'video',
        },
      }));
    };

    if (!this.isInitialized || !callKeepAvailable || !RNCallKeep) {
      console.warn('CallKeep not available, using app UI');
      dispatchIncomingCall();
      return;
    }

    try {
      // Generate a UUID for CallKeep
      const callUUID = this.generateUUID();

      // Store the mapping
      this.pendingCalls.set(callUUID, {
        callId,
        callerName,
        callType,
        conversationId,
      });

      // Display the native incoming call UI
      RNCallKeep.displayIncomingCall(
        callUUID,
        callerName, // handle (shown as caller ID)
        callerName, // localizedCallerName
        'generic', // handleType
        callType === 'video', // hasVideo
      );

      console.log('CallKeep: Displaying incoming call', { callUUID, callId, callerName });
    } catch (error) {
      console.error('Failed to display incoming call via CallKeep:', error);
      dispatchIncomingCall();
    }
  }

  /**
   * Report that the call has connected (for call logs and audio routing)
   */
  reportCallConnected(callId: string): void {
    if (!callKeepAvailable || !RNCallKeep) return;

    const entry = Array.from(this.pendingCalls.entries()).find(([_, v]) => v.callId === callId);
    if (entry) {
      const [callUUID] = entry;
      try {
        RNCallKeep.setCurrentCallActive(callUUID);
        this.activeCallUUID = callUUID;
        console.log('CallKeep: Reported call connected', callUUID);
      } catch (error) {
        console.error('CallKeep: Failed to report call connected:', error);
      }
    }
  }

  /**
   * End the call (remove from native UI)
   */
  endCall(callId: string): void {
    if (!callKeepAvailable || !RNCallKeep) return;

    const entry = Array.from(this.pendingCalls.entries()).find(([_, v]) => v.callId === callId);
    if (entry) {
      const [callUUID] = entry;
      try {
        RNCallKeep.endCall(callUUID);
        RNCallKeep.reportEndCallWithUUID(callUUID, 2); // 2 = remote ended
        this.pendingCalls.delete(callUUID);

        if (this.activeCallUUID === callUUID) {
          this.activeCallUUID = null;
        }
        console.log('CallKeep: Ended call', callUUID);
      } catch (error) {
        console.error('CallKeep: Failed to end call:', error);
      }
    }
  }

  /**
   * End all calls
   */
  endAllCalls(): void {
    if (!callKeepAvailable || !RNCallKeep) return;

    try {
      RNCallKeep.endAllCalls();
      this.pendingCalls.clear();
      this.activeCallUUID = null;
      console.log('CallKeep: Ended all calls');
    } catch (error) {
      console.error('CallKeep: Failed to end all calls:', error);
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Check if CallKeep is available on this device
   */
  isAvailable(): boolean {
    return this.isInitialized && callKeepAvailable && Platform.OS !== 'web';
  }

  /**
   * Check for pending call data from background handler
   * This is called when app launches after user answered a call from native UI
   */
  async checkForPendingCall(): Promise<PendingCallData | null> {
    try {
      const storedData = await AsyncStorage.getItem(PENDING_CALL_KEY);
      if (!storedData) {
        return null;
      }

      const pendingCall: PendingCallData = JSON.parse(storedData);

      // Check if the call is still valid (within 60 seconds)
      const now = Date.now();
      const callAge = now - pendingCall.timestamp;
      const MAX_CALL_AGE = 60000; // 60 seconds

      if (callAge > MAX_CALL_AGE) {
        console.log('CallKeep: Pending call expired, clearing:', pendingCall);
        await this.clearPendingCall();
        return null;
      }

      console.log('CallKeep: Found pending call from background:', pendingCall);

      // Register this call in our pendingCalls map for proper handling
      this.pendingCalls.set(pendingCall.callUUID, {
        callId: pendingCall.callId,
        callerName: pendingCall.callerName,
        callType: pendingCall.callType,
        conversationId: pendingCall.conversationId,
      });

      return pendingCall;
    } catch (error) {
      console.error('CallKeep: Error checking for pending call:', error);
      return null;
    }
  }

  /**
   * Mark pending call as answered and clear from storage
   */
  async markPendingCallAnswered(callId: string): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(PENDING_CALL_KEY);
      if (storedData) {
        const pendingCall: PendingCallData = JSON.parse(storedData);
        if (pendingCall.callId === callId) {
          pendingCall.status = 'answered';
          await AsyncStorage.setItem(PENDING_CALL_KEY, JSON.stringify(pendingCall));
          console.log('CallKeep: Marked pending call as answered:', callId);
        }
      }
    } catch (error) {
      console.error('CallKeep: Error marking pending call as answered:', error);
    }
  }

  /**
   * Mark pending call as rejected and clear from storage
   */
  async markPendingCallRejected(callId: string): Promise<void> {
    try {
      await this.clearPendingCall();
      console.log('CallKeep: Cleared rejected pending call:', callId);
    } catch (error) {
      console.error('CallKeep: Error marking pending call as rejected:', error);
    }
  }

  /**
   * Clear pending call data from storage
   */
  async clearPendingCall(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_CALL_KEY);
      console.log('CallKeep: Cleared pending call data');
    } catch (error) {
      console.error('CallKeep: Error clearing pending call:', error);
    }
  }

  /**
   * Get pending call data without clearing it
   */
  async getPendingCallData(): Promise<PendingCallData | null> {
    try {
      const storedData = await AsyncStorage.getItem(PENDING_CALL_KEY);
      if (storedData) {
        return JSON.parse(storedData);
      }
      return null;
    } catch (error) {
      console.error('CallKeep: Error getting pending call data:', error);
      return null;
    }
  }

  cleanup(): void {
    if (this.isInitialized && callKeepAvailable && RNCallKeep) {
      try {
        RNCallKeep.removeEventListener('answerCall');
        RNCallKeep.removeEventListener('endCall');
        RNCallKeep.removeEventListener('didActivateAudioSession');
        RNCallKeep.removeEventListener('didDisplayIncomingCall');
        RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
      } catch (error) {
        console.error('CallKeep: Failed to cleanup:', error);
      }
      this.isInitialized = false;
      console.log('CallKeep cleaned up');
    }
  }
}

// Export singleton instance
export const callKeepService = CallKeepService.getInstance();

// Export convenience functions
export const initializeCallKeep = () => callKeepService.initialize();
export const displayIncomingCall = (callId: string, callerName: string, callType: 'audio' | 'video', conversationId: string) =>
  callKeepService.displayIncomingCall(callId, callerName, callType, conversationId);
export const reportCallConnected = (callId: string) => callKeepService.reportCallConnected(callId);
export const endCallKeep = (callId: string) => callKeepService.endCall(callId);
export const endAllCallKeepCalls = () => callKeepService.endAllCalls();
export const setCallKeepCallbacks = (onAnswer: (callId: string) => void, onReject: (callId: string) => void) =>
  callKeepService.setCallbacks(onAnswer, onReject);
export const isCallKeepAvailable = () => callKeepService.isAvailable();

// Export pending call management functions
export const checkForPendingCall = () => callKeepService.checkForPendingCall();
export const markPendingCallAnswered = (callId: string) => callKeepService.markPendingCallAnswered(callId);
export const markPendingCallRejected = (callId: string) => callKeepService.markPendingCallRejected(callId);
export const clearPendingCall = () => callKeepService.clearPendingCall();
export const getPendingCallData = () => callKeepService.getPendingCallData();
