import { ServeStaticModuleOptions } from '@nestjs/serve-static';
import { join } from 'path';

/**
 * Static file serving configuration
 * Secure configuration for serving static assets
 */

export interface StaticFileConfig {
  /** Root directory for static files */
  rootPath: string;
  /** URL prefix for serving files */
  serveRoot?: string;
  /** Excluded routes (API routes) */
  exclude?: string[];
  /** Enable directory listing */
  serveStaticOptions?: {
    index?: boolean | string | string[];
    maxAge?: number | string;
    cacheControl?: boolean;
    etag?: boolean;
    lastModified?: boolean;
    dotfiles?: 'allow' | 'deny' | 'ignore';
    extensions?: string[];
    fallthrough?: boolean;
    immutable?: boolean;
    redirect?: boolean;
    setHeaders?: (res: any, path: string, stat: any) => void;
  };
}

/**
 * Get secure static file configuration
 */
export function getServeStaticConfig(
  rootPath: string,
  options?: Partial<StaticFileConfig>,
): ServeStaticModuleOptions {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    rootPath: rootPath,
    serveRoot: options?.serveRoot || '/',
    exclude: options?.exclude || ['/api/(.*)', '/health', '/metrics', '/socket.io/(.*)'],
    serveStaticOptions: {
      // Don't serve index.html automatically (SPA routing handled separately)
      index: options?.serveStaticOptions?.index ?? false,

      // Cache control
      maxAge: isDevelopment ? 0 : options?.serveStaticOptions?.maxAge ?? '1d',
      cacheControl: options?.serveStaticOptions?.cacheControl ?? true,

      // ETag and Last-Modified for cache validation
      etag: options?.serveStaticOptions?.etag ?? true,
      lastModified: options?.serveStaticOptions?.lastModified ?? true,

      // Security: don't serve dotfiles (.env, .git, etc.)
      dotfiles: options?.serveStaticOptions?.dotfiles ?? 'deny',

      // File extensions to serve
      extensions: options?.serveStaticOptions?.extensions ?? ['html', 'htm'],

      // Don't fall through to next middleware if file not found
      fallthrough: options?.serveStaticOptions?.fallthrough ?? false,

      // Immutable for hashed filenames (better caching)
      immutable: options?.serveStaticOptions?.immutable ?? false,

      // Redirect directories to trailing slash
      redirect: options?.serveStaticOptions?.redirect ?? true,

      // Security headers for static files
      setHeaders: (res, path) => {
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');

        // Cache headers for different file types
        if (path.match(/\.(js|css|woff2?|ttf|eot)$/)) {
          // Long cache for versioned assets
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
          // Cache images for 1 week
          res.setHeader('Cache-Control', 'public, max-age=604800');
        } else if (path.match(/\.html?$/)) {
          // No cache for HTML
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }

        // Custom headers callback
        if (options?.serveStaticOptions?.setHeaders) {
          options.serveStaticOptions.setHeaders(res, path, null);
        }
      },
    },
  };
}

/**
 * Configuration for serving uploaded files
 */
export function getUploadsConfig(uploadDir: string): ServeStaticModuleOptions {
  return {
    rootPath: join(process.cwd(), uploadDir),
    serveRoot: '/uploads',
    exclude: ['/api/(.*)'],
    serveStaticOptions: {
      index: false,
      maxAge: '7d',
      cacheControl: true,
      etag: true,
      lastModified: true,
      dotfiles: 'deny',
      fallthrough: false,
      setHeaders: (res, path) => {
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");

        // Force download for potentially dangerous files
        if (path.match(/\.(html?|js|css|php|py|rb|sh|bat|cmd|exe|msi)$/i)) {
          res.setHeader('Content-Disposition', 'attachment');
        }

        // Cache uploaded media files
        if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|mp4|webm|mp3|ogg|pdf)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
        }
      },
    },
  };
}

/**
 * Configuration for serving API documentation
 */
export function getDocsConfig(docsPath: string): ServeStaticModuleOptions {
  return {
    rootPath: join(process.cwd(), docsPath),
    serveRoot: '/docs',
    exclude: ['/api/(.*)'],
    serveStaticOptions: {
      index: ['index.html'],
      maxAge: '1h',
      cacheControl: true,
      etag: true,
      dotfiles: 'deny',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      },
    },
  };
}

/**
 * Configuration for serving a SPA (Single Page Application)
 */
export function getSpaConfig(
  buildPath: string,
  options?: { serveRoot?: string; indexFile?: string },
): ServeStaticModuleOptions {
  return {
    rootPath: join(process.cwd(), buildPath),
    serveRoot: options?.serveRoot || '/',
    exclude: ['/api/(.*)', '/socket.io/(.*)', '/health', '/metrics'],
    serveStaticOptions: {
      index: options?.indexFile || 'index.html',
      maxAge: 0, // Don't cache index.html
      cacheControl: true,
      etag: true,
      dotfiles: 'deny',
      fallthrough: true, // Fall through for SPA routing
      setHeaders: (res, path) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');

        // Cache static assets but not index.html
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (path.match(/\.(js|css)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    },
  };
}

/**
 * Allowed MIME types for uploads (whitelist approach)
 */
export const ALLOWED_UPLOAD_MIMES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],

  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/ogg': ['.ogg'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.weba'],

  // Video
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/ogg': ['.ogv'],

  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],

  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
};

/**
 * File extension to MIME type mapping
 */
export const EXTENSION_TO_MIME: Record<string, string> = Object.entries(ALLOWED_UPLOAD_MIMES).reduce(
  (acc, [mime, exts]) => {
    exts.forEach((ext) => {
      acc[ext] = mime;
    });
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Validate file type
 */
export function isAllowedFileType(mimeType: string, extension: string): boolean {
  const allowedExts = ALLOWED_UPLOAD_MIMES[mimeType as keyof typeof ALLOWED_UPLOAD_MIMES];
  if (!allowedExts) {
    return false;
  }
  return allowedExts.includes(extension.toLowerCase());
}
