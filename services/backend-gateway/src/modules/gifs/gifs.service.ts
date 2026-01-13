import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface GiphyGif {
  id: string;
  title: string;
  url: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    fixed_width: { url: string; width: string; height: string };
    fixed_height_small: { url: string; width: string; height: string };
    original: { url: string; width: string; height: string };
    preview_gif: { url: string; width: string; height: string };
  };
}

interface GiphyResponse {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
}

@Injectable()
export class GifsService {
  private readonly logger = new Logger(GifsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.giphy.com/v1';
  private readonly cacheTtl = 300000; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiKey = this.configService.get<string>('GIPHY_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GIPHY_API_KEY not configured. GIF features will be limited.');
    }
  }

  /**
   * Search for GIFs
   */
  async searchGifs(
    query: string,
    limit: number = 25,
    offset: number = 0,
  ): Promise<{ gifs: GiphyGif[]; total: number; offset: number }> {
    if (!this.apiKey) {
      return { gifs: [], total: 0, offset: 0 };
    }

    const cacheKey = `gif_search:${query}:${limit}:${offset}`;
    const cached = await this.cacheManager.get<{ gifs: GiphyGif[]; total: number; offset: number }>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/gifs/search?api_key=${this.apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g&lang=en`;
      const response = await fetch(url);
      const data: GiphyResponse = await response.json();

      const result = {
        gifs: data.data || [],
        total: data.pagination?.total_count || 0,
        offset: data.pagination?.offset || 0,
      };

      await this.cacheManager.set(cacheKey, result, this.cacheTtl);
      return result;
    } catch (error) {
      this.logger.error('Error searching GIFs:', error);
      return { gifs: [], total: 0, offset: 0 };
    }
  }

  /**
   * Get trending GIFs
   */
  async getTrendingGifs(
    limit: number = 25,
    offset: number = 0,
  ): Promise<{ gifs: GiphyGif[]; total: number; offset: number }> {
    if (!this.apiKey) {
      return { gifs: [], total: 0, offset: 0 };
    }

    const cacheKey = `gif_trending:${limit}:${offset}`;
    const cached = await this.cacheManager.get<{ gifs: GiphyGif[]; total: number; offset: number }>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/gifs/trending?api_key=${this.apiKey}&limit=${limit}&offset=${offset}&rating=g`;
      const response = await fetch(url);
      const data: GiphyResponse = await response.json();

      const result = {
        gifs: data.data || [],
        total: data.pagination?.total_count || 0,
        offset: data.pagination?.offset || 0,
      };

      await this.cacheManager.set(cacheKey, result, this.cacheTtl);
      return result;
    } catch (error) {
      this.logger.error('Error fetching trending GIFs:', error);
      return { gifs: [], total: 0, offset: 0 };
    }
  }

  /**
   * Search for Stickers
   */
  async searchStickers(
    query: string,
    limit: number = 25,
    offset: number = 0,
  ): Promise<{ stickers: GiphyGif[]; total: number; offset: number }> {
    if (!this.apiKey) {
      return { stickers: [], total: 0, offset: 0 };
    }

    const cacheKey = `sticker_search:${query}:${limit}:${offset}`;
    const cached = await this.cacheManager.get<{
      stickers: GiphyGif[];
      total: number;
      offset: number;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/stickers/search?api_key=${this.apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g&lang=en`;
      const response = await fetch(url);
      const data: GiphyResponse = await response.json();

      const result = {
        stickers: data.data || [],
        total: data.pagination?.total_count || 0,
        offset: data.pagination?.offset || 0,
      };

      await this.cacheManager.set(cacheKey, result, this.cacheTtl);
      return result;
    } catch (error) {
      this.logger.error('Error searching stickers:', error);
      return { stickers: [], total: 0, offset: 0 };
    }
  }

  /**
   * Get trending Stickers
   */
  async getTrendingStickers(
    limit: number = 25,
    offset: number = 0,
  ): Promise<{ stickers: GiphyGif[]; total: number; offset: number }> {
    if (!this.apiKey) {
      return { stickers: [], total: 0, offset: 0 };
    }

    const cacheKey = `sticker_trending:${limit}:${offset}`;
    const cached = await this.cacheManager.get<{
      stickers: GiphyGif[];
      total: number;
      offset: number;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/stickers/trending?api_key=${this.apiKey}&limit=${limit}&offset=${offset}&rating=g`;
      const response = await fetch(url);
      const data: GiphyResponse = await response.json();

      const result = {
        stickers: data.data || [],
        total: data.pagination?.total_count || 0,
        offset: data.pagination?.offset || 0,
      };

      await this.cacheManager.set(cacheKey, result, this.cacheTtl);
      return result;
    } catch (error) {
      this.logger.error('Error fetching trending stickers:', error);
      return { stickers: [], total: 0, offset: 0 };
    }
  }

  /**
   * Get GIF by ID
   */
  async getGifById(gifId: string): Promise<GiphyGif | null> {
    if (!this.apiKey) {
      return null;
    }

    const cacheKey = `gif:${gifId}`;
    const cached = await this.cacheManager.get<GiphyGif>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/gifs/${gifId}?api_key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.data) {
        await this.cacheManager.set(cacheKey, data.data, this.cacheTtl * 12); // Cache longer for single GIFs
        return data.data;
      }
      return null;
    } catch (error) {
      this.logger.error('Error fetching GIF:', error);
      return null;
    }
  }

  /**
   * Check if GIPHY API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
