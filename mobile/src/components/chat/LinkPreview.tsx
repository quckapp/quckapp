/**
 * Link Preview Component
 * Shows URL preview with title, description and image
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { linkPreviewApi, LinkPreview as LinkPreviewType } from '../../services/api';

interface LinkPreviewProps {
  url: string;
  isOwnMessage?: boolean;
}

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

// Extract URLs from text
export const extractUrls = (text: string): string[] => {
  const matches = text.match(URL_REGEX);
  return matches || [];
};

export const LinkPreviewComponent: React.FC<LinkPreviewProps> = ({ url, isOwnMessage = false }) => {
  const theme = useTheme();
  const [preview, setPreview] = useState<LinkPreviewType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPreview();
  }, [url]);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await linkPreviewApi.getPreview(url);
      if (response.data) {
        setPreview(response.data);
      }
    } catch (err) {
      console.error('Error fetching link preview:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    Linking.openURL(url).catch(err => {
      console.error('Error opening URL:', err);
    });
  };

  const getDomain = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return urlString;
    }
  };

  if (loading) {
    return (
      <View style={[
        styles.container,
        { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.1)' : theme.backgroundSecondary }
      ]}>
        <ActivityIndicator size="small" color={isOwnMessage ? '#fff' : theme.primary} />
      </View>
    );
  }

  if (error || !preview) {
    return (
      <TouchableOpacity
        style={[
          styles.minimalContainer,
          { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.1)' : theme.backgroundSecondary }
        ]}
        onPress={handlePress}
      >
        <Ionicons
          name="link-outline"
          size={16}
          color={isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.primary}
        />
        <Text
          style={[
            styles.urlText,
            { color: isOwnMessage ? 'rgba(255,255,255,0.9)' : theme.primary }
          ]}
          numberOfLines={1}
        >
          {getDomain(url)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.1)' : theme.backgroundSecondary }
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Preview Image */}
      {preview.image && (
        <Image
          source={{ uri: preview.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Site Name */}
        <View style={styles.siteRow}>
          {preview.favicon && (
            <Image
              source={{ uri: preview.favicon }}
              style={styles.favicon}
            />
          )}
          <Text
            style={[
              styles.siteName,
              { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
            ]}
            numberOfLines={1}
          >
            {preview.siteName || getDomain(url)}
          </Text>
        </View>

        {/* Title */}
        {preview.title && (
          <Text
            style={[
              styles.title,
              { color: isOwnMessage ? '#fff' : theme.text }
            ]}
            numberOfLines={2}
          >
            {preview.title}
          </Text>
        )}

        {/* Description */}
        {preview.description && (
          <Text
            style={[
              styles.description,
              { color: isOwnMessage ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
            ]}
            numberOfLines={2}
          >
            {preview.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    maxWidth: 280,
  },
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: 12,
  },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  siteName: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  urlText: {
    fontSize: 13,
    flex: 1,
  },
});

export default LinkPreviewComponent;
