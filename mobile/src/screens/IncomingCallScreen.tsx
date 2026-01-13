import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../store';
import { answerCall as answerCallAction, rejectCall as rejectCallAction } from '../store/slices/callSlice';
import {
  answerCall as answerCallWebRTC,
  rejectCall,
} from '../services/webrtc';
import { useTheme } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import {
  playIncomingRingtone,
  stopIncomingRingtone,
  playButtonPress,
  playCallConnected,
} from '../services/callSounds';
import { formatPhoneWithFlag } from '../utils/phoneUtils';

const { width, height } = Dimensions.get('window');

export default function IncomingCallScreen() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { callId, callType, caller, status } = useSelector(
    (state: RootState) => state.call,
    shallowEqual
  );

  // Stop ringtone when call status changes (e.g., caller hung up)
  useEffect(() => {
    if (status !== 'ringing') {
      console.log('📱 IncomingCallScreen: Status changed to', status, '- stopping ringtone');
      stopIncomingRingtone();
    }
  }, [status]);

  // Auto-dismiss incoming call after 30 seconds (caller may have hung up)
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('📱 IncomingCallScreen: Call timeout - auto dismissing');
      stopIncomingRingtone();
      if (callId) {
        dispatch(rejectCallAction());
        rejectCall(callId);
      }
    }, 30000); // 30 seconds timeout

    return () => clearTimeout(timeout);
  }, [callId, dispatch]);

  // Animated values for pulsing effect
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create pulsing animation for incoming call
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  // Play ringtone and vibration when screen mounts
  useEffect(() => {
    playIncomingRingtone();

    return () => {
      stopIncomingRingtone();
    };
  }, []);

  const handleAnswer = async () => {
    try {
      await playButtonPress();
      await stopIncomingRingtone();
      await playCallConnected();

      if (callId) {
        dispatch(answerCallAction({ callId }));
        await answerCallWebRTC(callId);
      }
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const handleReject = async () => {
    console.log('📱 IncomingCallScreen: User rejected call');
    await playButtonPress();
    await stopIncomingRingtone();

    if (callId) {
      dispatch(rejectCallAction());
      rejectCall(callId);
    }
  };

  const isDark = theme.background !== '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Background Gradient Overlay */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(59, 130, 246, 0.3)', 'rgba(0, 0, 0, 0.9)']
            : ['rgba(0, 102, 255, 0.2)', 'rgba(0, 0, 0, 0.8)']
        }
        style={styles.gradientOverlay}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Call Type Badge */}
        <View style={[styles.callTypeBadge, { backgroundColor: theme.primary }]}>
          <Ionicons
            name={callType === 'video' ? 'videocam' : 'call'}
            size={20}
            color="#fff"
          />
          <Text style={styles.callTypeText}>
            {callType === 'video' ? 'Video Call' : 'Audio Call'}
          </Text>
        </View>

        {/* Caller Info */}
        <View style={styles.callerInfo}>
          {/* Avatar Circle with Pulse */}
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {caller?.avatar ? (
              <Image source={{ uri: caller.avatar }} style={styles.avatarCircle} />
            ) : (
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={styles.avatarText}>
                  {caller?.displayName?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Caller Name */}
          <Text style={[styles.callerName, { color: theme.text }]}>
            {(caller?.displayName && caller.displayName.trim() !== '')
              ? caller.displayName
              : (caller?.phoneNumber ? formatPhoneWithFlag(caller.phoneNumber) : caller?.phoneNumber || '')}
          </Text>

          {/* Calling Status */}
          <Text style={[styles.callingStatus, { color: theme.textSecondary }]}>
            Incoming {callType} call...
          </Text>
        </View>

        {/* Call Actions */}
        <View style={styles.actionsContainer}>
          {/* Reject Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleReject}
            activeOpacity={0.8}
          >
            <View style={[styles.actionButtonInner, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="close" size={36} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Decline</Text>
          </TouchableOpacity>

          {/* Answer Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAnswer}
            activeOpacity={0.8}
          >
            <View style={[styles.actionButtonInner, { backgroundColor: '#10B981' }]}>
              <Ionicons name="call" size={36} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Accept</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[
              styles.quickActionButton,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          >
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={theme.textSecondary}
            />
            <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>
              Message
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionButton,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          >
            <Ionicons
              name="alarm-outline"
              size={24}
              color={theme.textSecondary}
            />
            <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>
              Remind Me
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  callTypeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  callerInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60,
  },
  avatarContainer: {
    marginBottom: 32,
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#fff',
  },
  callerName: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  callingStatus: {
    fontSize: 18,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 40,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
