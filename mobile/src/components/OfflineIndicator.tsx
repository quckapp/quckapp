import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useTheme } from '../hooks/useTheme';

export const OfflineIndicator = () => {
  const theme = useTheme();
  const { isConnected, pendingRequests } = useSelector((state: RootState) => state.network);
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (!isConnected) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected]);

  if (isConnected) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.error,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.text, { color: '#FFFFFF' }]}>
          No Internet Connection
        </Text>
        {pendingRequests.length > 0 && (
          <Text style={[styles.subText, { color: '#FFFFFF' }]}>
            {pendingRequests.length} message{pendingRequests.length > 1 ? 's' : ''} queued
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  subText: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
});
