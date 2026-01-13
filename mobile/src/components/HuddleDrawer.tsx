import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Huddle, HuddleType } from '../store/slices/huddleSlice';

interface HuddleDrawerProps {
  huddle: Huddle | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onEndCall: () => void;
  onExpandToFullScreen: () => void;
}

export const HuddleDrawer: React.FC<HuddleDrawerProps> = ({
  huddle,
  expanded,
  onToggleExpand,
  onEndCall,
  onExpandToFullScreen,
}) => {
  const theme = useTheme();

  // Wave animations
  const waveAnimations = useRef(Array.from({ length: 4 }, () => new Animated.Value(0.3))).current;

  // Start wave animations when drawer is visible
  useEffect(() => {
    if (huddle && huddle.type === HuddleType.AUDIO) {
      // Animate waves continuously
      const animations = waveAnimations.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400 + index * 100,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 400 + index * 100,
              useNativeDriver: true,
            }),
          ])
        )
      );

      animations.forEach(anim => anim.start());

      return () => {
        animations.forEach(anim => anim.stop());
      };
    }
  }, [huddle]);

  if (!huddle) return null;

  const participantCount = huddle.participants.length;
  const isAudio = huddle.type === HuddleType.AUDIO;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Ionicons
            name={isAudio ? "call" : "videocam"}
            size={20}
            color={theme.primary}
          />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.text }]}>
              {isAudio ? 'Audio Huddle' : 'Video Huddle'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-up"}
          size={20}
          color={theme.textSecondary}
        />
      </TouchableOpacity>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.content}>
          {/* Wave Animation for Audio Calls */}
          {isAudio && (
            <View style={styles.wavesContainer}>
              {waveAnimations.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.wave,
                    {
                      backgroundColor: theme.primary,
                      transform: [{
                        scaleY: anim
                      }]
                    }
                  ]}
                />
              ))}
            </View>
          )}

          {/* Video Preview Placeholder for Video Calls */}
          {!isAudio && (
            <View style={[styles.videoPlaceholder, { backgroundColor: theme.background }]}>
              <Ionicons name="videocam-off" size={40} color={theme.textTertiary} />
              <Text style={[styles.videoText, { color: theme.textTertiary }]}>
                Video preview
              </Text>
            </View>
          )}

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: theme.error }]}
              onPress={onEndCall}
            >
              <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: theme.primary }]}
              onPress={onExpandToFullScreen}
            >
              <Ionicons name="expand" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  wavesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 8,
  },
  wave: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  videoPlaceholder: {
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoText: {
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
