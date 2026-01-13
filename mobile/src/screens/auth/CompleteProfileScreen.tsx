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
  ScrollView,
} from 'react-native';
import api from '../../services/api';
import { useDispatch } from 'react-redux';
import { setTokens, updateUser } from '../../store/slices/authSlice';
import { useTheme } from '../../hooks/useTheme';
import { SocketManager } from '../../managers/SocketManager';

export default function CompleteProfileScreen({ route, navigation }: any) {
  const { phoneNumber, tempToken } = route.params;
  const dispatch = useDispatch();
  const theme = useTheme();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCompleteProfile = async () => {
    if (!username || !displayName) {
      Alert.alert('Error', 'Please fill in username and display name');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/complete-profile', {
        phoneNumber,
        username,
        displayName,
        email: email || undefined,
      });

      dispatch(updateUser(response.data.user));
      dispatch(setTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      }));
      // Reinitialize socket connection after successful profile completion
      await SocketManager.reinitialize();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to complete profile';
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.primary }]}>Complete Your Profile</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            You're almost there! Just a few more details
          </Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Display Name *"
              placeholderTextColor={theme.placeholder}
              value={displayName}
              onChangeText={setDisplayName}
              editable={!loading}
              autoFocus
            />

            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Username *"
              placeholderTextColor={theme.placeholder}
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              editable={!loading}
            />

            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Email (Optional)"
              placeholderTextColor={theme.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <Text style={[styles.phoneInfo, { color: theme.textSecondary }]}>
              Phone: <Text style={[styles.phoneNumber, { color: theme.primary }]}>{phoneNumber}</Text>
            </Text>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
              onPress={handleCompleteProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Complete Profile</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.requiredText, { color: theme.textTertiary }]}>* Required fields</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
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
  form: {
    width: '100%',
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
  phoneInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#007AFF',
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
  requiredText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 15,
  },
});
