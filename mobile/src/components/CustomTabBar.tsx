import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  onCenterButtonPress?: () => void;
}

const TabButton: React.FC<{
  route: any;
  isFocused: boolean;
  options: any;
  onPress: () => void;
  theme: any;
}> = ({ route, isFocused, options, onPress, theme }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.1 : 1,
        useNativeDriver: true,
        friction: 7,
        tension: 100,
      }),
      Animated.spring(translateY, {
        toValue: isFocused ? -2 : 0,
        useNativeDriver: true,
        friction: 7,
        tension: 100,
      }),
    ]).start();
  }, [isFocused]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: isFocused ? 1.1 : 1,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      activeOpacity={1}
    >
      <Animated.View
        style={{
          transform: [{ scale }, { translateY }],
        }}
      >
        {options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? theme.primary : theme.textTertiary,
          size: 24,
        })}
      </Animated.View>
    </TouchableOpacity>
  );
};

const CenterButton: React.FC<{
  onPress?: () => void;
  theme: any;
}> = ({ onPress, theme }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.85,
        useNativeDriver: true,
        friction: 7,
      }),
      Animated.timing(rotate, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 100,
      }),
      Animated.timing(rotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.centerButton,
          {
            backgroundColor: theme.primary,
            transform: [{ scale }, { rotate: rotation }],
          },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Animated.View>
    </TouchableOpacity>
  );
};

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
  state,
  descriptors,
  navigation,
  onCenterButtonPress,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <BlurView
        intensity={theme.blur.intensity}
        tint={theme.blur.tint}
        style={StyleSheet.absoluteFill}
      >
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.blur.headerBackground }} />
      </BlurView>

      <View style={styles.tabBarContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Insert center button after 2nd tab (between Updates and Communities)
          if (index === 2) {
            return (
              <React.Fragment key="center-button">
                <CenterButton onPress={onCenterButtonPress} theme={theme} />
                <TabButton
                  key={route.key}
                  route={route}
                  isFocused={isFocused}
                  options={options}
                  onPress={onPress}
                  theme={theme}
                />
              </React.Fragment>
            );
          }

          return (
            <TabButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              options={options}
              onPress={onPress}
              theme={theme}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
