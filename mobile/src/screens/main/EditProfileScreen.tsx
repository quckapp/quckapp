import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AppDispatch, RootState } from '../../store';
import { updateProfile } from '../../store/slices/authSlice';
import api from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { getFullImageUrl } from '../../utils/imageUtils';

export default function EditProfileScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const theme = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();

      // @ts-ignore
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAvatar(response.data.url);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload image';
      const message = Array.isArray(errorMessage) ? errorMessage.join(', ') : String(errorMessage);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName || !username) {
      Alert.alert('Error', 'Display name and username are required');
      return;
    }

    try {
      setLoading(true);
      await dispatch(updateProfile({
        displayName,
        username,
        email: email || undefined,
        bio: bio || undefined,
        avatar: avatar || undefined,
      })).unwrap();

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      const message = Array.isArray(errorMessage) ? errorMessage.join(', ') : String(errorMessage);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.avatarSection, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={pickImage} disabled={loading}>
          {getFullImageUrl(avatar) ? (
            <Image source={{ uri: getFullImageUrl(avatar)! }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={[styles.cameraIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.changePhotoText, { color: theme.primary }]}>Tap to change photo</Text>
      </View>

      <View style={[styles.form, { backgroundColor: theme.background }]}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Display Name *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your display name"
            placeholderTextColor={theme.placeholder}
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Username *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="Enter your username"
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, styles.disabledInput, { borderColor: theme.border, color: theme.textTertiary, backgroundColor: theme.backgroundSecondary }]}
            value={user?.phoneNumber}
            editable={false}
          />
          <Text style={[styles.helperText, { color: theme.textTertiary }]}>Phone number cannot be changed</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            placeholderTextColor={theme.placeholder}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
          <Text style={[styles.helperText, { color: theme.textTertiary }]}>{bio.length}/150 characters</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  avatarSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '600',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoText: {
    marginTop: 10,
    color: '#007AFF',
    fontSize: 14,
  },
  form: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
