/**
 * Floating Call Widget
 * Draggable floating widget for ongoing huddle calls
 * Can be positioned anywhere on screen
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingCallWidgetProps {
  participantCount: number;
  callDuration: number;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onExpand: () => void;
  onToggleAudio: () => void;
  onEndCall: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const WIDGET_WIDTH = 120;
const WIDGET_HEIGHT = 140;

export const FloatingCallWidget: React.FC<FloatingCallWidgetProps> = ({
  participantCount,
  callDuration,
  isAudioEnabled,
  isVideoEnabled,
  onExpand,
  onToggleAudio,
  onEndCall,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - WIDGET_WIDTH - 20, y: 100 })).current;
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();

        // Check if it's a tap (minimal movement)
        const isTap = Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5;

        if (isTap) {
          // Expand to full screen
          onExpand();
        } else {
          // Snap to nearest edge
          const currentX = (pan.x as any)._value;
          const currentY = (pan.y as any)._value;

          // Constrain to screen bounds
          const maxX = SCREEN_WIDTH - WIDGET_WIDTH;
          const maxY = SCREEN_HEIGHT - WIDGET_HEIGHT - 100;

          const finalX = currentX < SCREEN_WIDTH / 2 ? 20 : maxX - 20;
          const finalY = Math.max(50, Math.min(currentY, maxY));

          Animated.spring(pan, {
            toValue: { x: finalX, y: finalY },
            useNativeDriver: false,
            friction: 7,
            tension: 40,
          }).start();
        }

        setIsDragging(false);
      },
    })
  ).current;

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: pan.getTranslateTransform(),
        },
        isDragging && styles.dragging,
      ]}
      {...panResponder.panHandlers}
    >
      {/* Call Info */}
      <View style={styles.header}>
        <View style={styles.pulseIndicator} />
        <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
      </View>

      {/* Avatar Circle */}
      <View style={styles.avatarContainer}>
        <Ionicons name="people" size={32} color="#fff" />
        <View style={styles.participantBadge}>
          <Text style={styles.participantCount}>{participantCount}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, !isAudioEnabled && styles.actionButtonMuted]}
          onPress={onToggleAudio}
        >
          <Ionicons
            name={isAudioEnabled ? 'mic' : 'mic-off'}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.endCallButton]}
          onPress={onEndCall}
        >
          <Ionicons name="call" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Expand Hint */}
      <Text style={styles.tapHint}>Tap to expand</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#25D366',
    zIndex: 9999,
  },
  dragging: {
    opacity: 0.9,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#25D366',
    marginRight: 6,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  participantBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonMuted: {
    backgroundColor: '#d32f2f',
  },
  endCallButton: {
    backgroundColor: '#d32f2f',
  },
  tapHint: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
