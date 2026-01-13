/**
 * API Configuration for Development and Production
 *
 * Update PRODUCTION_API_URL with your Railway backend URL
 * Format: https://your-service-name.up.railway.app
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect if running on Android emulator
// Constants.isDevice can be undefined in dev builds, so we default to physical device (false)
const isAndroidEmulator = Platform.OS === 'android' && Constants.isDevice === false;
const isIOSSimulator = Platform.OS === 'ios' && Constants.isDevice === false;

// Development API URLs
// Android emulators use 10.0.2.2 to access host machine's localhost
// Android physical devices: Use 'localhost' with ADB reverse (adb reverse tcp:1900 tcp:1900)
// iOS simulator: Use 'localhost' directly
// iOS physical devices: Must use local network IP or production backend
// Update LOCAL_NETWORK_IP with your computer's local IP and allow firewall
const LOCAL_NETWORK_IP = '192.168.29.198'; // Update this with your local IP

// Determine the development host based on platform
const getDevHost = () => {
  if (Platform.OS === 'android') {
    // Android emulator uses special IP, physical device uses localhost via ADB reverse
    return isAndroidEmulator ? '10.0.2.2' : 'localhost';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost, physical device needs network IP
    return isIOSSimulator ? 'localhost' : LOCAL_NETWORK_IP;
  }
  return 'localhost';
};

const DEV_HOST = getDevHost();
const DEV_API_URL = `http://${DEV_HOST}:1900/api/v1`;
const DEV_SOCKET_URL = `http://${DEV_HOST}:1900`;

// Production API URLs (AWS EC2)
const PRODUCTION_API_URL = 'http://13.204.84.192:3000/api/v1';
const PRODUCTION_SOCKET_URL = 'http://13.204.84.192:3000';

// Railway Internal URL (for service-to-service communication)
// This is used when you have multiple services on Railway that need to communicate
const RAILWAY_INTERNAL_URL = 'http://quickchat-backend.railway.internal:1900';

// Platform-specific dev mode settings
// iOS physical devices should use production backend (easier than firewall config)
const USE_PRODUCTION_IN_DEV_IOS_DEVICE = Platform.OS === 'ios' && Constants.isDevice === true;
// Set to true to force all platforms to use production backend in dev mode
const USE_PRODUCTION_IN_DEV = true;

// Export the appropriate URLs based on environment and platform
const shouldUseProduction = !__DEV__ || USE_PRODUCTION_IN_DEV || USE_PRODUCTION_IN_DEV_IOS_DEVICE;
export const API_URL = shouldUseProduction ? PRODUCTION_API_URL : DEV_API_URL;
export const SOCKET_URL = shouldUseProduction ? PRODUCTION_SOCKET_URL : DEV_SOCKET_URL;

// Log the current configuration on startup
console.log('🔧 API Config:', {
  platform: Platform.OS,
  isDevice: Constants.isDevice,
  isAndroidEmulator,
  isIOSSimulator,
  shouldUseProduction,
  API_URL,
  SOCKET_URL,
});

// Export config object for easy access
export const API_CONFIG = {
  dev: {
    apiUrl: DEV_API_URL,
    socketUrl: DEV_SOCKET_URL,
  },
  prod: {
    apiUrl: PRODUCTION_API_URL,
    socketUrl: PRODUCTION_SOCKET_URL,
    railwayInternal: RAILWAY_INTERNAL_URL,
  },
  current: {
    apiUrl: API_URL,
    socketUrl: SOCKET_URL,
    environment: __DEV__ ? 'development' : 'production',
  },
};

export default API_CONFIG;
