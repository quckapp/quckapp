/**
 * Modern Huddle Controls
 * Gesture-based controls for huddle calls with smooth animations
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface HuddleControlsProps {
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onMinimize: () => void;
  onAddParticipant?: () => void;
  participantCount: number;
  callDuration?: number;
}

export const HuddleControls: React.FC<HuddleControlsProps> = ({
  localAudioEnabled,
  localVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onMinimize,
  onAddParticipant,
  participantCount,
  callDuration = 0,
}) => {
  // Animated values for button interactions
  const audioScale = useSharedValue(1);
  const videoScale = useSharedValue(1);
  const endCallScale = useSharedValue(1);
  const pulseAnimation = useSharedValue(0);

  // Pulsing animation for active call indicator
  useEffect(() => {
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnimation.value, [0, 1], [0.3, 1]),
    transform: [
      { scale: interpolate(pulseAnimation.value, [0, 1], [0.9, 1.1]) },
    ],
  }));

  const audioAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: audioScale.value }],
  }));

  const videoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: videoScale.value }],
  }));

  const endCallAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: endCallScale.value }],
  }));

  // Simple touch handlers instead of complex gestures
  const handleAudioPress = () => {
    audioScale.value = withSpring(0.85);
    Vibration.vibrate(10);
    setTimeout(() => {
      audioScale.value = withSpring(1);
      onToggleAudio();
    }, 100);
  };

  const handleVideoPress = () => {
    videoScale.value = withSpring(0.85);
    Vibration.vibrate(10);
    setTimeout(() => {
      videoScale.value = withSpring(1);
      onToggleVideo();
    }, 100);
  };

  const handleEndCallPress = () => {
    endCallScale.value = withSpring(0.85);
    Vibration.vibrate(50);
    setTimeout(() => {
      endCallScale.value = withSpring(1);
      onEndCall();
    }, 100);
  };

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Active Call Indicator & Info */}
      <View style={styles.infoContainer}>
        <Animated.View style={[styles.activeIndicator, pulseStyle]} />
        <View style={styles.textContainer}>
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
          <Text style={styles.participantsText}>
            {participantCount} {participantCount === 1 ? 'person' : 'people'} in call
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsRow}>
        <View style={styles.leftActions}>
          {/* Minimize Button */}
          <TouchableOpacity style={styles.actionButton} onPress={onMinimize}>
            <Ionicons name="chevron-down-circle-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Minimize</Text>
          </TouchableOpacity>

          {/* Add Participant Button */}
          {onAddParticipant && (
            <TouchableOpacity style={styles.actionButton} onPress={onAddParticipant}>
              <Ionicons name="person-add-outline" size={24} color="#25D366" />
              <Text style={[styles.actionText, { color: '#25D366' }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main Controls */}
        <View style={styles.mainControls}>
          {/* Audio Toggle */}
          <TouchableOpacity onPress={handleAudioPress} activeOpacity={0.8}>
            <Animated.View
              style={[
                styles.controlButton,
                !localAudioEnabled && styles.controlButtonDisabled,
                audioAnimatedStyle,
              ]}
            >
              <Ionicons
                name={localAudioEnabled ? 'mic' : 'mic-off'}
                size={32}
                color="#fff"
              />
            </Animated.View>
          </TouchableOpacity>

          {/* End Call */}
          <TouchableOpacity onPress={handleEndCallPress} activeOpacity={0.8} onLongPress={handleEndCallPress}>
            <Animated.View style={[styles.endCallButton, endCallAnimatedStyle]}>
              <Ionicons name="call" size={32} color="#fff" />
              <Text style={styles.holdText}>Tap to end</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Video Toggle */}
          <TouchableOpacity onPress={handleVideoPress} activeOpacity={0.8}>
            <Animated.View
              style={[
                styles.controlButton,
                !localVideoEnabled && styles.controlButtonDisabled,
                videoAnimatedStyle,
              ]}
            >
              <Ionicons
                name={localVideoEnabled ? 'videocam' : 'videocam-off'}
                size={32}
                color="#fff"
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 30,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  activeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#25D366',
    marginRight: 10,
  },
  textContainer: {
    alignItems: 'center',
  },
  durationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  participantsText: {
    fontSize: 13,
    color: '#999',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  controlButtonDisabled: {
    backgroundColor: '#d32f2f',
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    position: 'relative',
  },
  holdText: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
});
