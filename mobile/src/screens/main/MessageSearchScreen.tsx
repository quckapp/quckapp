/**
 * Message Search Screen
 * Global search across all messages with filters
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../hooks/useTheme';
import { messagesApi } from '../../services/api';
import { getFullImageUrl } from '../../utils/imageUtils';

interface SearchResult {
  _id: string;
  content: string;
  type: string;
  createdAt: string;
  senderId: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  conversationId: {
    _id: string;
    name?: string;
    type: 'individual' | 'group';
    participants?: Array<{
      userId: {
        displayName: string;
        avatar?: string;
      };
    }>;
  };
}

type MessageFilter = 'all' | 'text' | 'image' | 'audio' | 'video' | 'file';

export default function MessageSearchScreen({ navigation }: any) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('all');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const filters: { key: MessageFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'text', label: 'Text', icon: 'text' },
    { key: 'image', label: 'Photos', icon: 'image' },
    { key: 'audio', label: 'Audio', icon: 'mic' },
    { key: 'video', label: 'Videos', icon: 'videocam' },
    { key: 'file', label: 'Files', icon: 'document' },
  ];

  const handleSearch = useCallback(async (query: string, filter: MessageFilter) => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params: any = {
        q: query.trim(),
        limit: 50,
      };

      if (filter !== 'all') {
        params.type = filter;
      }

      const response = await messagesApi.searchMessages(params);
      setResults(response.data?.items || response.data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      handleSearch(query, activeFilter);
    }, 500);

    setSearchTimeout(timeout);
  }, [activeFilter, searchTimeout, handleSearch]);

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleFilterChange = (filter: MessageFilter) => {
    setActiveFilter(filter);
    if (searchQuery.trim()) {
      handleSearch(searchQuery, filter);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    navigation.navigate('Chat', {
      conversationId: result.conversationId._id,
      highlightMessageId: result._id,
    });
  };

  const getConversationName = (result: SearchResult): string => {
    const conv = result.conversationId;
    if (conv.name) return conv.name;
    if (conv.type === 'individual' && conv.participants) {
      const otherParticipant = conv.participants.find(
        (p) => p.userId._id !== result.senderId._id
      );
      return otherParticipant?.userId.displayName || result.senderId.displayName;
    }
    return 'Conversation';
  };

  const getMessagePreview = (result: SearchResult): string => {
    switch (result.type) {
      case 'image':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio message';
      case 'file':
        return 'File';
      case 'location':
        return 'Location';
      default:
        return result.content || '';
    }
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim() || !text) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <Text key={index} style={{ backgroundColor: theme.primary + '40', fontWeight: '600' }}>
          {part}
        </Text>
      ) : (
        <Text key={index}>{part}</Text>
      )
    );
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: theme.border }]}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarContainer, { backgroundColor: theme.backgroundSecondary }]}>
        {item.senderId.avatar ? (
          <Image
            source={{ uri: getFullImageUrl(item.senderId.avatar) }}
            style={styles.avatar}
          />
        ) : (
          <Ionicons name="person" size={24} color={theme.textSecondary} />
        )}
      </View>

      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={[styles.senderName, { color: theme.text }]} numberOfLines={1}>
            {item.senderId.displayName}
          </Text>
          <Text style={[styles.resultTime, { color: theme.textTertiary }]}>
            {format(new Date(item.createdAt), 'MMM d, yyyy')}
          </Text>
        </View>

        <Text style={[styles.conversationName, { color: theme.textSecondary }]} numberOfLines={1}>
          in {getConversationName(item)}
        </Text>

        <Text style={[styles.messagePreview, { color: theme.text }]} numberOfLines={2}>
          {item.type === 'text' ? highlightText(item.content, searchQuery) : getMessagePreview(item)}
        </Text>
      </View>

      {item.type !== 'text' && (
        <View style={[styles.typeIndicator, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons
            name={
              item.type === 'image' ? 'image' :
              item.type === 'video' ? 'videocam' :
              item.type === 'audio' ? 'mic' : 'document'
            }
            size={16}
            color={theme.primary}
          />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Header */}
      <View style={[styles.searchHeader, { backgroundColor: theme.backgroundSecondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={[styles.searchInputContainer, { backgroundColor: theme.background }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search messages..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={handleQueryChange}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { borderBottomColor: theme.border }]}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: activeFilter === item.key ? theme.primary : theme.backgroundSecondary },
              ]}
              onPress={() => handleFilterChange(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={activeFilter === item.key ? '#fff' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.filterText,
                  { color: activeFilter === item.key ? '#fff' : theme.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Searching...
          </Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.resultsList}
        />
      ) : hasSearched ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No results found</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Try a different search term or filter
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Search Messages</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Find messages across all your conversations
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  filtersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  resultsList: {
    paddingVertical: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 48,
    height: 48,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  resultTime: {
    fontSize: 12,
  },
  conversationName: {
    fontSize: 12,
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  typeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
