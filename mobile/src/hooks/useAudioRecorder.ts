import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  uri: string | null;
}

export const useAudioRecorder = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    uri: null,
  });
  const recording = useRef<Audio.Recording | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
        return false;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recording.current = newRecording;
      setRecordingState({
        isRecording: true,
        duration: 0,
        uri: null,
      });

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      return false;
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording.current) {
        return null;
      }

      // Stop the recording
      await recording.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.current.getURI();
      recording.current = null;

      // Clear duration interval
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        uri,
      }));

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
      return null;
    }
  };

  const cancelRecording = async () => {
    try {
      if (!recording.current) {
        return;
      }

      await recording.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      recording.current = null;

      // Clear duration interval
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setRecordingState({
        isRecording: false,
        duration: 0,
        uri: null,
      });
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  };
};
