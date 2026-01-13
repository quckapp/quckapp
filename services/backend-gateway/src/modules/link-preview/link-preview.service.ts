import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  type?: string;
}

@Injectable()
export class LinkPreviewService {
  private cache: Map<string, { preview: LinkPreview; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private configService: ConfigService) {}

  async generatePreview(url: string): Promise<LinkPreview> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new BadRequestException('Invalid URL');
    }

    // Check cache
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.preview;
    }

    try {
      const html = await this.fetchUrl(url);
      const preview = this.parseHtml(url, html);

      // Cache the result
      this.cache.set(url, { preview, timestamp: Date.now() });

      return preview;
    } catch (error) {
      // Return basic preview on error
      return {
        url,
        title: new URL(url).hostname,
      };
    }
  }

  async generatePreviews(urls: string[]): Promise<LinkPreview[]> {
    const previews = await Promise.all(
      urls.map(async (url) => {
        try {
          return await this.generatePreview(url);
        } catch {
          return { url };
        }
      }),
    );
    return previews;
  }

  extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    const matches = text.match(urlRegex);
    return matches ? [...new Set(matches)] : [];
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; QuckChatBot/1.0; +https://quckchat.app)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000,
      };

      const request = protocol.get(url, options, (response) => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.fetchUrl(redirectUrl).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
          // Limit response size to prevent memory issues
          if (data.length > 500000) {
            request.destroy();
            resolve(data);
          }
        });
        response.on('end', () => resolve(data));
        response.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  private parseHtml(url: string, html: string): LinkPreview {
    const preview: LinkPreview = { url };
    const parsedUrl = new URL(url);

    // Extract Open Graph tags
    const ogTitle = this.getMetaContent(html, 'og:title');
    const ogDescription = this.getMetaContent(html, 'og:description');
    const ogImage = this.getMetaContent(html, 'og:image');
    const ogSiteName = this.getMetaContent(html, 'og:site_name');
    const ogType = this.getMetaContent(html, 'og:type');

    // Extract Twitter Card tags as fallback
    const twitterTitle = this.getMetaContent(html, 'twitter:title');
    const twitterDescription = this.getMetaContent(html, 'twitter:description');
    const twitterImage = this.getMetaContent(html, 'twitter:image');

    // Extract standard meta tags as fallback
    const metaDescription = this.getMetaContent(html, 'description', 'name');

    // Extract title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const titleTag = titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : null;

    // Set preview values with priority
    preview.title = ogTitle || twitterTitle || titleTag || parsedUrl.hostname;
    preview.description = ogDescription || twitterDescription || metaDescription;
    preview.siteName = ogSiteName || parsedUrl.hostname;
    preview.type = ogType;

    // Handle image URL
    const imageUrl = ogImage || twitterImage;
    if (imageUrl) {
      preview.image = this.resolveUrl(imageUrl, url);
    }

    // Extract favicon
    const faviconMatch =
      html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    if (faviconMatch) {
      preview.favicon = this.resolveUrl(faviconMatch[1], url);
    } else {
      preview.favicon = `${parsedUrl.protocol}//${parsedUrl.host}/favicon.ico`;
    }

    return preview;
  }

  private getMetaContent(
    html: string,
    property: string,
    attribute: string = 'property',
  ): string | undefined {
    // Try property attribute
    const propertyRegex = new RegExp(
      `<meta[^>]*${attribute}=["']${property}["'][^>]*content=["']([^"']+)["']`,
      'i',
    );
    const propertyMatch = html.match(propertyRegex);
    if (propertyMatch) {
      return this.decodeHtmlEntities(propertyMatch[1].trim());
    }

    // Try content before property
    const reverseRegex = new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${property}["']`,
      'i',
    );
    const reverseMatch = html.match(reverseRegex);
    if (reverseMatch) {
      return this.decodeHtmlEntities(reverseMatch[1].trim());
    }

    return undefined;
  }

  private resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return relativeUrl;
    }
  }

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null;

    this.cache.forEach((value) => {
      if (!oldestTimestamp || value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
      }
    });

    return {
      size: this.cache.size,
      oldestEntry: oldestTimestamp,
    };
  }
}
