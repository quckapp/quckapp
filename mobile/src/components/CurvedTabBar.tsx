import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SVG parameters - following Kyle Shevlin's approach
const TAB_BAR_HEIGHT = 60;
const CORNER_RADIUS = 12;
const CUTOUT_RADIUS = 30;

export const CurvedTabBar: React.FC<BottomTabBarProps & { onCenterPress: () => void }> = ({
  state,
  descriptors,
  navigation,
  onCenterPress,
}) => {
  const theme = useTheme();

  // Check if we should hide the tab bar
  const route = state.routes[state.index];
  const routeName = getFocusedRouteNameFromRoute(route);

  // Hide tab bar on these screens
  const screensWithoutTabBar = [
    'Chat',
    'NewConversation',
    'NewGroup',
    'ContactInfo',
    'ChatProfile',
    'BroadcastLists',
    'StarredMessages',
    'CreateBroadcastList',
    'BroadcastDetails',
    'Forward',
    'ProfileView',
    'EditProfile',
    'Settings',
    'NotificationSettings',
    'PrivacySecurity',
    'Analytics',
    'LinkedDevices',
    'CreateCommunity',
    'CommunityDetails',
    'StatusViewer',
    'CreateStatus',
  ];

  if (routeName && screensWithoutTabBar.includes(routeName)) {
    return null;
  }

  const WIDTH = SCREEN_WIDTH;
  const HEIGHT = TAB_BAR_HEIGHT;
  const CUTOUT_LEFT_X = WIDTH / 2 - CUTOUT_RADIUS;
  const CUTOUT_RIGHT_X = WIDTH / 2 + CUTOUT_RADIUS;

  /**
   * Line by line explanation
   * - Start at bottom-left with corner radius offset
   * - Curve the bottom-left corner
   * - Draw a line up the left side to the start of top corner radius
   * - Curve the top-left corner
   * - Draw a line to the left edge of our cutout
   * - Draw an elliptical arc for the center cutout
   * - Draw a line to the top-right corner
   * - Curve the top-right corner
   * - Draw a line down the right side
   * - Curve the bottom-right corner
   * - Close the path
   */
  const generatePath = (): string => {
    return `
      M${CORNER_RADIUS},${HEIGHT}
      Q0,${HEIGHT} 0,${HEIGHT - CORNER_RADIUS}
      L0,${CORNER_RADIUS} Q0,0 ${CORNER_RADIUS},0
      L${CUTOUT_LEFT_X},0
      A${CUTOUT_RADIUS},${CUTOUT_RADIUS} 0 0 0 ${CUTOUT_RIGHT_X},0
      L${WIDTH - CORNER_RADIUS},0 Q${WIDTH},0 ${WIDTH},${CORNER_RADIUS}
      L${WIDTH},${HEIGHT - CORNER_RADIUS}
      Q${WIDTH},${HEIGHT} ${WIDTH - CORNER_RADIUS},${HEIGHT}
      Z
    `.trim().replace(/\s+/g, ' ');
  };

  return (
    <View style={styles.container}>
      {/* SVG Background */}
      <Svg
        width={WIDTH}
        height={HEIGHT}
        style={StyleSheet.absoluteFill}
      >
        <Path
          d={generatePath()}
          fill="#ffffff"
          stroke={theme.border}
          strokeWidth={1}
        />
      </Svg>

      {/* Tab Buttons */}
      <View style={styles.tabsContainer}>
        {/* Left Side Tabs */}
        <View style={styles.leftTabs}>
          {state.routes.slice(0, 2).map((route, index) => {
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

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            // Get icon name
            let iconName: any;
            if (route.name === 'Chats') {
              iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Updates') {
              iconName = isFocused ? 'aperture' : 'aperture-outline';
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                <Ionicons
                  name={iconName}
                  size={36}
                  color={isFocused ? theme.primary : theme.textTertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Spacer for center button */}
        <View style={styles.centerSpacer} />

        {/* Right Side Tabs */}
        <View style={styles.rightTabs}>
          {state.routes.slice(2, 4).map((route, index) => {
            const { options } = descriptors[route.key];
            const actualIndex = index + 2;
            const isFocused = state.index === actualIndex;

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

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            // Get icon name
            let iconName: any;
            if (route.name === 'Communities') {
              iconName = isFocused ? 'people' : 'people-outline';
            } else if (route.name === 'Calls') {
              iconName = isFocused ? 'call' : 'call-outline';
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                <Ionicons
                  name={iconName}
                  size={36}
                  color={isFocused ? theme.primary : theme.textTertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Center Floating Button */}
      <View style={[styles.centerButtonWrapper, { backgroundColor: '#ffffff' }]}>
        <TouchableOpacity
          style={[styles.centerButton, { backgroundColor: theme.primary }]}
          onPress={onCenterPress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
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
    height: TAB_BAR_HEIGHT,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rightTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  centerSpacer: {
    width: 80,
  },
  tab: {
    justifyContent: 'center',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
    minWidth: 50,
  },
  centerButtonWrapper: {
    position: 'absolute',
    top: -20,
    left: SCREEN_WIDTH / 2 - 34,
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
