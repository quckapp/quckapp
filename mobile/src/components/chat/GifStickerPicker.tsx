/**
 * GIF/Sticker Picker Component
 * Allows users to search and send GIFs and Stickers from GIPHY
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';
import {
  GiphyGif,
  searchGifs,
  getTrendingGifs,
  searchStickers,
  getTrendingStickers,
} from '../../services/giphy';

interface GifStickerPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gif: GiphyGif, type: 'gif' | 'sticker') => void;
}

type TabType = 'gifs' | 'stickers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const GIF_SIZE = (SCREEN_WIDTH - 48) / NUM_COLUMNS;

export const GifStickerPicker: React.FC<GifStickerPickerProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('gifs');
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [stickers, setStickers] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load trending content on mount
  useEffect(() => {
    if (visible) {
      loadTrending();
    }
  }, [visible]);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const [trendingGifs, trendingStickers] = await Promise.all([
        getTrendingGifs(25),
        getTrendingStickers(25),
      ]);
      setGifs(trendingGifs);
      setStickers(trendingStickers);
    } catch (error) {
      console.error('Error loading trending:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query.trim()) {
      loadTrending();
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        if (activeTab === 'gifs') {
          const results = await searchGifs(query, 25);
          setGifs(results);
        } else {
          const results = await searchStickers(query, 25);
          setStickers(results);
        }
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    setSearchTimeout(timeout);
  }, [activeTab, searchTimeout]);

  // Re-search when tab changes
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  }, [activeTab]);

  const handleSelect = (item: GiphyGif) => {
    onSelect(item, activeTab === 'gifs' ? 'gif' : 'sticker');
    onClose();
  };

  const renderItem = ({ item }: { item: GiphyGif }) => (
    <TouchableOpacity
      style={styles.gifItem}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.images.fixed_height_small?.url || item.images.fixed_height?.url }}
        style={[
          styles.gifImage,
          activeTab === 'stickers' && styles.stickerImage,
        ]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const currentData = activeTab === 'gifs' ? gifs : stickers;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView
          intensity={theme.blur.intensity}
          tint={theme.blur.tint}
          style={styles.container}
        >
          <View style={[styles.contentContainer, { backgroundColor: theme.blur.modalBackground }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>
                {activeTab === 'gifs' ? 'GIFs' : 'Stickers'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'gifs' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setActiveTab('gifs')}
              >
                <Ionicons
                  name="images"
                  size={18}
                  color={activeTab === 'gifs' ? '#fff' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'gifs' ? '#fff' : theme.textSecondary },
                  ]}
                >
                  GIFs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'stickers' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setActiveTab('stickers')}
              >
                <Ionicons
                  name="happy"
                  size={18}
                  color={activeTab === 'stickers' ? '#fff' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'stickers' ? '#fff' : theme.textSecondary },
                  ]}
                >
                  Stickers
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <Ionicons name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder={`Search ${activeTab}...`}
                placeholderTextColor={theme.textTertiary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading {activeTab}...
                </Text>
              </View>
            ) : currentData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={activeTab === 'gifs' ? 'images-outline' : 'happy-outline'}
                  size={48}
                  color={theme.textTertiary}
                />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchQuery ? `No ${activeTab} found` : `Loading trending ${activeTab}...`}
                </Text>
              </View>
            ) : (
              <FlatList
                data={currentData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* GIPHY Attribution */}
            <View style={styles.attribution}>
              <Text style={[styles.attributionText, { color: theme.textTertiary }]}>
                Powered by GIPHY
              </Text>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  contentContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  gifItem: {
    width: GIF_SIZE,
    height: GIF_SIZE * 0.75,
    padding: 4,
  },
  gifImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  stickerImage: {
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  attribution: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  attributionText: {
    fontSize: 12,
  },
});

export default GifStickerPicker;
