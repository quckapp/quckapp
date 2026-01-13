/**
 * GIPHY API Service
 * Fetches GIFs and Stickers from GIPHY
 */

// Note: For production, store this in environment variables
// Get your API key from https://developers.giphy.com/
const GIPHY_API_KEY = 'KOzxvuFrL9rmxoSGOehHtnOPqWgriycz';
const GIPHY_BASE_URL = 'https://api.giphy.com/v1';

export interface GiphyGif {
  id: string;
  title: string;
  url: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    fixed_width: {
      url: string;
      width: string;
      height: string;
    };
    fixed_height_small: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
      width: string;
      height: string;
    };
    preview_gif: {
      url: string;
      width: string;
      height: string;
    };
  };
}

export interface GiphyResponse {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
}

/**
 * Search for GIFs
 */
export const searchGifs = async (
  query: string,
  limit: number = 25,
  offset: number = 0
): Promise<GiphyGif[]> => {
  try {
    const response = await fetch(
      `${GIPHY_BASE_URL}/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g&lang=en`
    );
    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching GIFs:', error);
    return [];
  }
};

/**
 * Get trending GIFs
 */
export const getTrendingGifs = async (
  limit: number = 25,
  offset: number = 0
): Promise<GiphyGif[]> => {
  try {
    const response = await fetch(
      `${GIPHY_BASE_URL}/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=g`
    );
    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching trending GIFs:', error);
    return [];
  }
};

/**
 * Search for Stickers
 */
export const searchStickers = async (
  query: string,
  limit: number = 25,
  offset: number = 0
): Promise<GiphyGif[]> => {
  try {
    const response = await fetch(
      `${GIPHY_BASE_URL}/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g&lang=en`
    );
    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching stickers:', error);
    return [];
  }
};

/**
 * Get trending Stickers
 */
export const getTrendingStickers = async (
  limit: number = 25,
  offset: number = 0
): Promise<GiphyGif[]> => {
  try {
    const response = await fetch(
      `${GIPHY_BASE_URL}/stickers/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=g`
    );
    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching trending stickers:', error);
    return [];
  }
};

/**
 * Get GIF by ID
 */
export const getGifById = async (gifId: string): Promise<GiphyGif | null> => {
  try {
    const response = await fetch(
      `${GIPHY_BASE_URL}/gifs/${gifId}?api_key=${GIPHY_API_KEY}`
    );
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching GIF:', error);
    return null;
  }
};

export default {
  searchGifs,
  getTrendingGifs,
  searchStickers,
  getTrendingStickers,
  getGifById,
};
