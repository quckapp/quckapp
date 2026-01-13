import React, { useState } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';
import CountryCodePicker, { COUNTRIES, Country } from '../../components/CountryCodePicker';
import { useTheme } from '../../hooks/useTheme';

export default function LoginScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();

  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to India
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dial_code}${phoneNumber}`;

    try {
      // Navigate to OTP verification screen with phone number
      navigation.navigate('VerifyOtp', { phoneNumber: fullPhoneNumber });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      const message = Array.isArray(errorMessage) ? errorMessage.join(', ') : String(errorMessage);
      Alert.alert('Error', message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.primary }]}>QuckChat</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sign in to continue</Text>

        <View style={styles.form}>
          <View style={styles.phoneInputContainer}>
            <CountryCodePicker
              selectedCountry={selectedCountry}
              onSelect={setSelectedCountry}
              disabled={loading}
            />
            <TextInput
              style={[styles.phoneInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Phone Number"
              placeholderTextColor={theme.placeholder}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoCapitalize="none"
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue with OTP</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            We'll send you a 6-digit OTP to verify your number
          </Text>
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
    fontSize: 36,
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
  form: {
    width: '100%',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
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
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#666',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 15,
  },
});
