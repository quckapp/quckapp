/**
 * Lock Screen Component
 * Shows biometric authentication prompt when app is locked
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import {
  authenticateWithBiometrics,
  getBiometricTypeName,
  unlockApp,
} from '../../services/biometric';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const theme = useTheme();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const shakeAnimation = new Animated.Value(0);

  useEffect(() => {
    loadBiometricType();
    // Auto-prompt for biometric on mount
    handleAuthenticate();
  }, []);

  const loadBiometricType = async () => {
    const type = await getBiometricTypeName();
    setBiometricType(type);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleAuthenticate = async () => {
    if (authenticating) return;

    setAuthenticating(true);
    setError(null);

    const result = await authenticateWithBiometrics('Unlock QuickChat');

    if (result.success) {
      await unlockApp();
      onUnlock();
    } else {
      setError(result.error || 'Authentication failed');
      shake();
    }

    setAuthenticating(false);
  };

  const getBiometricIcon = (): keyof typeof Ionicons.glyphMap => {
    if (biometricType === 'Face ID') {
      return 'scan-outline';
    }
    return 'finger-print';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* App Logo/Icon */}
        <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
          <Ionicons name="chatbubbles" size={60} color="#fff" />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>QuickChat is Locked</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Use {biometricType} to unlock
        </Text>

        {/* Biometric Button */}
        <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
          <TouchableOpacity
            style={[
              styles.biometricButton,
              { backgroundColor: theme.primary },
              authenticating && styles.biometricButtonDisabled,
            ]}
            onPress={handleAuthenticate}
            disabled={authenticating}
          >
            {authenticating ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Ionicons name={getBiometricIcon()} size={48} color="#fff" />
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleAuthenticate}
          disabled={authenticating}
        >
          <Text style={[styles.retryText, { color: theme.primary }]}>
            {authenticating ? 'Authenticating...' : `Tap to use ${biometricType}`}
          </Text>
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.error + '20' }]}>
            <Ionicons name="alert-circle" size={20} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons name="lock-closed" size={16} color={theme.textTertiary} />
        <Text style={[styles.footerText, { color: theme.textTertiary }]}>
          Secured with {biometricType}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  biometricButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  biometricButtonDisabled: {
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 6,
  },
  footerText: {
    fontSize: 14,
  },
});
