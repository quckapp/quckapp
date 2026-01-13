import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Local ringtone assets
const INCOMING_RINGTONE = require('../../assets/sounds/incoming_ringtone.mp3');
const OUTGOING_RINGTONE = require('../../assets/sounds/outgoing_ringtone.mp3');

class CallSoundsService {
  private ringtoneSound: Audio.Sound | null = null;
  private outgoingRingtoneSound: Audio.Sound | null = null;
  private callEndSound: Audio.Sound | null = null;
  private callConnectedSound: Audio.Sound | null = null;
  private isRingtonePlaying: boolean = false;
  private isOutgoingRingtonePlaying: boolean = false;
  private isInitialized: boolean = false;

  async initialize() {
    try {
      // Set audio mode for calls - play through earpiece by default
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false, // Set to false for playback only
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true, // Play through earpiece by default
      });
      this.isInitialized = true;
      console.log('✅ Call sounds initialized');
    } catch (error) {
      console.error('Error initializing call sounds:', error);
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async playIncomingRingtone() {
    try {
      if (this.isRingtonePlaying) {
        return;
      }

      // Ensure audio is initialized before playing
      await this.ensureInitialized();

      // Create vibration pattern for incoming call
      this.startIncomingCallVibration();
      this.isRingtonePlaying = true;

      // Set audio mode specifically for ringtone playback - use speaker for incoming calls
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false, // Play through speaker for incoming ringtone
      });

      // Try to load and play ringtone
      try {
        const { sound } = await Audio.Sound.createAsync(
          INCOMING_RINGTONE,
          {
            isLooping: true,
            volume: 1.0,
            shouldPlay: true,
          }
        );

        this.ringtoneSound = sound;

        // Set up playback status listener for debugging
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish && !status.isLooping) {
            console.log('🔊 Ringtone finished playing');
          }
        });

        // Explicitly play for iOS
        const status = await sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await sound.playAsync();
        }

        console.log('🔊 Playing incoming ringtone');
      } catch (audioError) {
        // If audio fails, continue with vibration only
        console.warn('Could not play ringtone audio, using vibration only:', audioError);
      }
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  }

  async stopIncomingRingtone() {
    // Stop vibration first
    this.stopVibration();

    if (!this.ringtoneSound) {
      this.isRingtonePlaying = false;
      return;
    }

    const sound = this.ringtoneSound;
    this.ringtoneSound = null;
    this.isRingtonePlaying = false;

    try {
      const status = await sound.getStatusAsync().catch(() => null);
      if (status?.isLoaded) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
      }
      console.log('🔇 Stopped incoming ringtone');
    } catch (error) {
      // Ignore errors - sound may already be unloaded
    }

    try {
      await this.resetAudioMode();
    } catch (error) {
      // Ignore reset errors
    }
  }

  async playOutgoingRingtone() {
    try {
      if (this.isOutgoingRingtonePlaying) {
        return;
      }

      // Ensure audio is initialized before playing
      await this.ensureInitialized();

      // Light haptic for outgoing call
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      this.isOutgoingRingtonePlaying = true;

      // Set audio mode for ringtone playback - use earpiece by default
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true, // Play through earpiece by default
      });

      try {
        // Load and play outgoing ringback tone
        const { sound } = await Audio.Sound.createAsync(
          OUTGOING_RINGTONE,
          {
            isLooping: true,
            volume: 0.8,
            shouldPlay: true,
          }
        );

        this.outgoingRingtoneSound = sound;

        // Set up playback status listener
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish && !status.isLooping) {
            console.log('🔊 Outgoing ringtone finished');
          }
        });

        // Explicitly play for iOS
        const status = await sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await sound.playAsync();
        }

        console.log('🔊 Playing outgoing ringtone');
      } catch (audioError) {
        console.warn('Could not play outgoing ringtone audio:', audioError);
        this.isOutgoingRingtonePlaying = false;
      }
    } catch (error) {
      console.error('Error playing outgoing ringtone:', error);
      this.isOutgoingRingtonePlaying = false;
    }
  }

  async stopOutgoingRingtone() {
    if (!this.outgoingRingtoneSound) {
      this.isOutgoingRingtonePlaying = false;
      return;
    }

    const sound = this.outgoingRingtoneSound;
    this.outgoingRingtoneSound = null;
    this.isOutgoingRingtonePlaying = false;

    try {
      const status = await sound.getStatusAsync().catch(() => null);
      if (status?.isLoaded) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
      }
      console.log('🔇 Stopped outgoing ringtone');
    } catch (error) {
      // Ignore errors - sound may already be unloaded
    }

    try {
      await this.resetAudioMode();
    } catch (error) {
      // Ignore reset errors
    }
  }

  async playCallConnected() {
    try {
      // Play success haptic
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      // Play a short beep sound (optional)
      // In production, add a custom sound file
      console.log('🔊 Call connected sound');
    } catch (error) {
      console.error('Error playing call connected sound:', error);
    }
  }

  async playCallEnded() {
    try {
      // Stop any playing ringtones
      await this.stopIncomingRingtone();
      await this.stopOutgoingRingtone();

      // Play end call haptic
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log('🔊 Call ended sound');
    } catch (error) {
      console.error('Error playing call ended sound:', error);
    }
  }

  async playButtonPress() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error playing button press haptic:', error);
    }
  }

  private vibrationInterval: NodeJS.Timeout | null = null;

  private startIncomingCallVibration() {
    try {
      // Vibrate with pattern: vibrate for 1s, pause for 1s, repeat
      const vibrate = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 200);
      };

      // Initial vibration
      vibrate();

      // Set up repeating vibration
      this.vibrationInterval = setInterval(vibrate, 2000);
    } catch (error) {
      console.error('Error starting vibration:', error);
    }
  }

  stopVibration() {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
  }

  async setSpeakerMode(enabled: boolean) {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !enabled, // false = speaker, true = earpiece
      });
      console.log(`🔊 Speaker mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error setting speaker mode:', error);
    }
  }

  async resetAudioMode() {
    try {
      // Reset to default audio mode to not interfere with WebRTC
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log('🔊 Audio mode reset to default');
    } catch (error) {
      console.error('Error resetting audio mode:', error);
    }
  }

  async cleanup() {
    try {
      await this.stopIncomingRingtone();
      await this.stopOutgoingRingtone();
      this.stopVibration();

      if (this.callEndSound) {
        await this.callEndSound.unloadAsync();
        this.callEndSound = null;
      }

      if (this.callConnectedSound) {
        await this.callConnectedSound.unloadAsync();
        this.callConnectedSound = null;
      }

      console.log('🧹 Call sounds cleaned up');
    } catch (error) {
      console.error('Error cleaning up call sounds:', error);
    }
  }
}

// Export singleton instance
export const callSoundsService = new CallSoundsService();

// Export methods for convenience (with proper binding to maintain 'this' context)
export const initializeCallSounds = callSoundsService.initialize.bind(callSoundsService);
export const playIncomingRingtone = callSoundsService.playIncomingRingtone.bind(callSoundsService);
export const stopIncomingRingtone = callSoundsService.stopIncomingRingtone.bind(callSoundsService);
export const playOutgoingRingtone = callSoundsService.playOutgoingRingtone.bind(callSoundsService);
export const stopOutgoingRingtone = callSoundsService.stopOutgoingRingtone.bind(callSoundsService);
export const playCallConnected = callSoundsService.playCallConnected.bind(callSoundsService);
export const playCallEnded = callSoundsService.playCallEnded.bind(callSoundsService);
export const playButtonPress = callSoundsService.playButtonPress.bind(callSoundsService);
export const cleanupCallSounds = callSoundsService.cleanup.bind(callSoundsService);
export const setSpeakerMode = callSoundsService.setSpeakerMode.bind(callSoundsService);
export const resetAudioMode = callSoundsService.resetAudioMode.bind(callSoundsService);
