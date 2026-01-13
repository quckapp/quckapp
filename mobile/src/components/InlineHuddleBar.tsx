import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Huddle, HuddleType } from '../store/slices/huddleSlice';

interface InlineHuddleBarProps {
  huddle: Huddle | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export const InlineHuddleBar: React.FC<InlineHuddleBarProps> = ({
  huddle,
  isMuted,
  onToggleMute,
  onEndCall,
}) => {
  const theme = useTheme();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Wave animations for audio indicator
  const waveAnimations = useRef(Array.from({ length: 4 }, () => new Animated.Value(0.3))).current;

  // Timer for call duration
  useEffect(() => {
    if (!huddle) return;

    const startTime = new Date(huddle.startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [huddle?.startedAt]);

  // Wave animation for audio indicator
  useEffect(() => {
    if (!huddle || isMuted) {
      waveAnimations.forEach(anim => {
        anim.stopAnimation();
        anim.setValue(0.3);
      });
      return;
    }

    const animations = waveAnimations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 300 + index * 80,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 300 + index * 80,
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [huddle, isMuted]);

  if (!huddle) return null;

  // Format elapsed time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isAudio = huddle.type === HuddleType.AUDIO;
  const participantCount = huddle.participants.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {/* Left side - Call info */}
      <View style={styles.leftSection}>
        {/* Wave animation indicator */}
        <View style={styles.waveContainer}>
          {waveAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.wave,
                {
                  backgroundColor: '#fff',
                  opacity: isMuted ? 0.3 : 0.9,
                  transform: [{ scaleY: isMuted ? 0.3 : anim }],
                },
              ]}
            />
          ))}
        </View>

        {/* Call info text */}
        <View style={styles.infoContainer}>
          <View style={styles.callInfoRow}>
            <Ionicons
              name={isAudio ? 'call' : 'videocam'}
              size={14}
              color="#fff"
              style={styles.callIcon}
            />
            <Text style={styles.callTypeText}>
              {isAudio ? 'Huddle' : 'Video Huddle'}
            </Text>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            </View>
          </View>
          {participantCount > 1 && (
            <Text style={styles.participantsText}>
              {participantCount} in call
            </Text>
          )}
        </View>
      </View>

      {/* Right side - Controls */}
      <View style={styles.rightSection}>
        {/* Mute button */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            isMuted && styles.controlButtonActive,
          ]}
          onPress={onToggleMute}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        {/* End call button */}
        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={onEndCall}
          activeOpacity={0.7}
        >
          <Ionicons
            name="call"
            size={18}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 3,
    marginRight: 10,
  },
  wave: {
    width: 3,
    height: 18,
    borderRadius: 1.5,
  },
  infoContainer: {
    flex: 1,
  },
  callInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIcon: {
    marginRight: 4,
  },
  callTypeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  participantsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
  },
});
