import { API_URL } from '../config/api.config';

// Base URL for images (without /api/v1)
const BASE_URL = API_URL.replace('/api/v1', '');

// Pattern to match local development URLs that need to be replaced
const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)(:\d+)?/;

/**
 * Converts a relative image URL to an absolute URL
 * Also fixes URLs that point to old local development servers
 * @param url - The image URL (can be relative or absolute)
 * @returns Full URL to the image
 */
export const getFullImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url.trim() === '') {
    return null;
  }

  // If it's a local development URL, replace with current base URL
  if (LOCAL_URL_PATTERN.test(url)) {
    // Extract the path after the host:port
    const pathMatch = url.match(/^https?:\/\/[^\/]+(\/.*)?$/);
    const path = pathMatch?.[1] || '';
    return `${BASE_URL}${path}`;
  }

  // If already a full URL (starts with http:// or https://), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a relative URL, prepend the base URL
  // Remove leading slash from url if present to avoid double slashes
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;

  return `${BASE_URL}/${cleanUrl}`;
};
