import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import api from '../../services/api';
import { useDispatch } from 'react-redux';
import { setTokens, updateUser } from '../../store/slices/authSlice';
import { useTheme } from '../../hooks/useTheme';
import { SocketManager } from '../../managers/SocketManager';

export default function VerifyOtpScreen({ route, navigation }: any) {
  const { phoneNumber } = route.params;
  const dispatch = useDispatch();
  const theme = useTheme();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    // Send OTP when screen loads
    sendOtp();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOtp = async () => {
    try {
      setResendLoading(true);
      const response = await api.post('/auth/send-otp', { phoneNumber });

      // In development, show OTP in alert
      if (response.data.otp) {
        Alert.alert('OTP Sent', `Your OTP is: ${response.data.otp}`, [{ text: 'OK' }]);
      } else {
        Alert.alert('Success', 'OTP sent to your phone number');
      }

      setCountdown(60);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send OTP';
      const message = Array.isArray(errorMessage) ? errorMessage.join(', ') : String(errorMessage);
      Alert.alert('Error', message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/verify-otp', { phoneNumber, otp });

      if (response.data.isNewUser) {
        // New user - navigate to complete profile
        navigation.navigate('CompleteProfile', {
          phoneNumber,
          tempToken: response.data.tempToken,
        });
      } else {
        // Existing user - login
        dispatch(updateUser(response.data.user));
        dispatch(setTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        }));
        // Reinitialize socket connection after successful login
        await SocketManager.reinitialize();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Invalid OTP';
      const message = Array.isArray(errorMessage) ? errorMessage.join(', ') : String(errorMessage);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.primary }]}>Verify OTP</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={[styles.phoneNumber, { color: theme.text }]}>{phoneNumber}</Text>
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.otpInput, { borderColor: theme.primary, color: theme.text, backgroundColor: theme.background }]}
            placeholder="Enter OTP"
            placeholderTextColor={theme.placeholder}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            {countdown > 0 ? (
              <Text style={[styles.resendText, { color: theme.textTertiary }]}>
                Resend OTP in {countdown}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={sendOtp}
                disabled={resendLoading}
              >
                <Text style={[styles.resendButton, { color: theme.primary }]}>
                  {resendLoading ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>Change Number</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#333',
  },
  form: {
    width: '100%',
  },
  otpInput: {
    height: 60,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 10,
  },
  button: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: '#999',
    fontSize: 14,
  },
  resendButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
