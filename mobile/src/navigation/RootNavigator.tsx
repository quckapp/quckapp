import React, { useEffect, useState, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { RootState } from '../store';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import CallScreen from '../screens/CallScreen';
import IncomingCallScreen from '../screens/IncomingCallScreen';
import OutgoingCallScreen from '../screens/OutgoingCallScreen';
import { FloatingCallWidget } from '../components/FloatingCallWidget';
import { expandHuddle, minimizeHuddle } from '../store/slices/huddleSlice';
import { useNavigation } from '@react-navigation/native';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth, shallowEqual);
  const { status: callStatus, isIncoming } = useSelector(
    (state: RootState) => state.call,
    shallowEqual
  );
  const { activeHuddle, isMinimized, localAudioEnabled } = useSelector(
    (state: RootState) => state.huddle,
    shallowEqual
  );

  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    console.log('📱 RootNavigator: Call status changed to:', callStatus);
  }, [callStatus]);

  // Track huddle call duration
  useEffect(() => {
    if (!activeHuddle) {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHuddle]);

  // Show appropriate call screen based on status and direction
  if (callStatus !== 'idle' && callStatus !== 'ended') {
    console.log('📱 RootNavigator: Showing call screen for status:', callStatus, 'isIncoming:', isIncoming);

    // Incoming call - show IncomingCallScreen
    if (callStatus === 'ringing' && isIncoming) {
      return <IncomingCallScreen />;
    }

    // Outgoing call - show OutgoingCallScreen
    if (callStatus === 'ringing' && !isIncoming) {
      return <OutgoingCallScreen />;
    }

    // Active call or connecting - show main CallScreen
    return <CallScreen />;
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>

      {/* Floating Call Widget - Shown when huddle is active and minimized */}
      {activeHuddle && isMinimized && (
        <FloatingCallWidget
          participantCount={(activeHuddle.participants?.length || 0) + 1}
          callDuration={callDuration}
          isAudioEnabled={localAudioEnabled}
          isVideoEnabled={false}
          onExpand={() => {
            dispatch(expandHuddle());
            // Navigation will be handled by the HuddleCallScreen appearing
          }}
          onToggleAudio={() => {
            // Will be handled by huddle hook
            const { useHuddle } = require('../hooks/huddle');
            const huddle = useHuddle();
            huddle.toggleAudio();
          }}
          onEndCall={() => {
            const { useHuddle } = require('../hooks/huddle');
            const huddle = useHuddle();
            huddle.leaveHuddle();
          }}
        />
      )}
    </>
  );
}
