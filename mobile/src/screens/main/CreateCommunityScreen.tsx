import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';

export default function CreateCommunityScreen({ navigation }: any) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/communities', {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      console.log('Community created:', response.data);
      Alert.alert('Success', 'Community created successfully', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating community:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.form}>
        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Community Name *</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Enter community name"
            placeholderTextColor={theme.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
          <Text style={[styles.charCount, { color: theme.textTertiary }]}>
            {name.length}/50
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
            placeholder="Describe your community"
            placeholderTextColor={theme.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={[styles.charCount, { color: theme.textTertiary }]}>
            {description.length}/200
          </Text>
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="information-circle" size={24} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Communities help you organize related groups. After creating, you can add members and
            link groups to this community.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: theme.primary },
            (!name.trim() || loading) && { opacity: 0.5 },
          ]}
          onPress={handleCreate}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Create Community</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
