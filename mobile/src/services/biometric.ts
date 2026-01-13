/**
 * Biometric Authentication Service
 * Handles fingerprint/face authentication for app lock
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const APP_LOCKED_KEY = 'app_locked';

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

/**
 * Check if device has biometric hardware and enrolled biometrics
 */
export const getBiometricCapabilities = async (): Promise<BiometricCapabilities> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  return {
    hasHardware,
    isEnrolled,
    supportedTypes,
  };
};

/**
 * Check if biometric authentication is available
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  const { hasHardware, isEnrolled } = await getBiometricCapabilities();
  return hasHardware && isEnrolled;
};

/**
 * Get friendly name for biometric type
 */
export const getBiometricTypeName = async (): Promise<string> => {
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }

  return 'Biometric';
};

/**
 * Authenticate using biometrics
 */
export const authenticateWithBiometrics = async (
  promptMessage?: string
): Promise<BiometricResult> => {
  try {
    const isAvailable = await isBiometricAvailable();

    if (!isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    const biometricType = await getBiometricTypeName();

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || `Authenticate with ${biometricType}`,
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    // Handle different error types
    switch (result.error) {
      case 'user_cancel':
        return { success: false, error: 'Authentication cancelled' };
      case 'user_fallback':
        return { success: false, error: 'Fallback selected' };
      case 'lockout':
        return { success: false, error: 'Too many attempts. Please try again later.' };
      case 'lockout_permanent':
        return { success: false, error: 'Biometric authentication is disabled. Please use passcode.' };
      default:
        return { success: false, error: result.error || 'Authentication failed' };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'An error occurred during authentication',
    };
  }
};

/**
 * Check if biometric lock is enabled in settings
 */
export const isBiometricLockEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch {
    return false;
  }
};

/**
 * Enable or disable biometric lock
 */
export const setBiometricLockEnabled = async (enabled: boolean): Promise<boolean> => {
  try {
    if (enabled) {
      // Verify biometric is available before enabling
      const isAvailable = await isBiometricAvailable();
      if (!isAvailable) {
        return false;
      }

      // Verify user can authenticate before enabling
      const result = await authenticateWithBiometrics('Verify to enable biometric lock');
      if (!result.success) {
        return false;
      }
    }

    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    return true;
  } catch (error) {
    console.error('Error setting biometric lock:', error);
    return false;
  }
};

/**
 * Check if app is currently locked
 */
export const isAppLocked = async (): Promise<boolean> => {
  try {
    const locked = await SecureStore.getItemAsync(APP_LOCKED_KEY);
    return locked === 'true';
  } catch {
    return false;
  }
};

/**
 * Lock the app
 */
export const lockApp = async (): Promise<void> => {
  try {
    await SecureStore.setItemAsync(APP_LOCKED_KEY, 'true');
  } catch (error) {
    console.error('Error locking app:', error);
  }
};

/**
 * Unlock the app
 */
export const unlockApp = async (): Promise<void> => {
  try {
    await SecureStore.setItemAsync(APP_LOCKED_KEY, 'false');
  } catch (error) {
    console.error('Error unlocking app:', error);
  }
};

export default {
  getBiometricCapabilities,
  isBiometricAvailable,
  getBiometricTypeName,
  authenticateWithBiometrics,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  isAppLocked,
  lockApp,
  unlockApp,
};
