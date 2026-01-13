import { HelmetOptions } from 'helmet';

/**
 * Enhanced Helmet Configuration for Enterprise Compliance
 *
 * This configuration provides comprehensive HTTP security headers
 * for compliance with:
 * - OWASP Security Headers
 * - PCI DSS Requirements
 * - HIPAA Technical Safeguards
 * - SOC 2 Security Controls
 */

/**
 * Content Security Policy Directives by compliance level
 */
export const CSP_PRESETS = {
  /**
   * Strict CSP - Maximum security, may break some features
   */
  STRICT: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    childSrc: ["'none'"],
    workerSrc: ["'self'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: [],
    blockAllMixedContent: [],
  },

  /**
   * Standard CSP - Balanced security and functionality
   */
  STANDARD: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Required for some frameworks
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    fontSrc: ["'self'", 'https:', 'data:'],
    connectSrc: ["'self'", 'wss:', 'ws:', 'https:'],
    mediaSrc: ["'self'", 'blob:', 'https:'],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    childSrc: ["'self'", 'blob:'],
    workerSrc: ["'self'", 'blob:'],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: [],
  },

  /**
   * API CSP - For pure API backends
   */
  API: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'none'"],
    baseUri: ["'none'"],
    upgradeInsecureRequests: [],
  },

  /**
   * Report-Only CSP - For testing new policies
   */
  REPORT_ONLY: {
    defaultSrc: ["'self'"],
    reportUri: '/api/v1/csp-report',
  },
};

/**
 * Permissions Policy (formerly Feature-Policy) configurations
 */
export const PERMISSIONS_POLICY_PRESETS = {
  /**
   * Restrictive - Disable most browser features
   */
  RESTRICTIVE: {
    accelerometer: [],
    'ambient-light-sensor': [],
    autoplay: [],
    battery: [],
    camera: [],
    'display-capture': [],
    'document-domain': [],
    'encrypted-media': [],
    fullscreen: ['self'],
    geolocation: [],
    gyroscope: [],
    'layout-animations': ['self'],
    'legacy-image-formats': ['self'],
    magnetometer: [],
    microphone: [],
    midi: [],
    'oversized-images': ['self'],
    payment: [],
    'picture-in-picture': [],
    'publickey-credentials-get': [],
    'sync-xhr': [],
    usb: [],
    'wake-lock': [],
    'xr-spatial-tracking': [],
  },

  /**
   * Chat App - Allow features needed for chat applications
   */
  CHAT_APP: {
    accelerometer: [],
    'ambient-light-sensor': [],
    autoplay: ['self'],
    battery: [],
    camera: ['self'], // For video calls
    'display-capture': ['self'], // For screen sharing
    'document-domain': [],
    'encrypted-media': ['self'],
    fullscreen: ['self'],
    geolocation: ['self'], // For location sharing
    gyroscope: [],
    magnetometer: [],
    microphone: ['self'], // For voice/video calls
    midi: [],
    payment: [],
    'picture-in-picture': ['self'],
    'publickey-credentials-get': ['self'], // For WebAuthn
    usb: [],
    'wake-lock': ['self'], // Keep screen on during calls
    'xr-spatial-tracking': [],
  },
};

/**
 * Enterprise Helmet configuration options
 */
export interface EnterpriseHelmetOptions {
  /** Environment (development, staging, production) */
  environment: 'development' | 'staging' | 'production';
  /** CSP preset to use */
  cspPreset?: keyof typeof CSP_PRESETS;
  /** Custom CSP directives to merge */
  customCspDirectives?: Record<string, string[]>;
  /** Enable CSP report-only mode */
  cspReportOnly?: boolean;
  /** CSP report URI */
  cspReportUri?: string;
  /** Permissions policy preset */
  permissionsPolicyPreset?: keyof typeof PERMISSIONS_POLICY_PRESETS;
  /** Custom allowed domains for various directives */
  allowedDomains?: {
    scripts?: string[];
    styles?: string[];
    images?: string[];
    fonts?: string[];
    connect?: string[];
    media?: string[];
    frames?: string[];
  };
  /** HSTS configuration */
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  /** Expect-CT configuration (deprecated but some compliance requires it) */
  expectCt?: {
    maxAge?: number;
    enforce?: boolean;
    reportUri?: string;
  };
}

/**
 * Build enterprise-grade Helmet configuration
 */
export function buildEnterpriseHelmetConfig(
  options: EnterpriseHelmetOptions,
): HelmetOptions {
  const isDev = options.environment === 'development';
  const isProd = options.environment === 'production';

  // Build CSP directives
  const cspPreset = options.cspPreset || (isProd ? 'STANDARD' : 'API');
  const cspDirectives: Record<string, string[] | string> = { ...CSP_PRESETS[cspPreset] };

  // Merge allowed domains
  if (options.allowedDomains) {
    if (options.allowedDomains.scripts) {
      cspDirectives.scriptSrc = [
        ...((cspDirectives.scriptSrc as string[]) || ["'self'"]),
        ...options.allowedDomains.scripts,
      ];
    }
    if (options.allowedDomains.styles) {
      cspDirectives.styleSrc = [
        ...((cspDirectives.styleSrc as string[]) || ["'self'"]),
        ...options.allowedDomains.styles,
      ];
    }
    if (options.allowedDomains.images) {
      cspDirectives.imgSrc = [
        ...((cspDirectives.imgSrc as string[]) || ["'self'"]),
        ...options.allowedDomains.images,
      ];
    }
    if (options.allowedDomains.fonts) {
      cspDirectives.fontSrc = [
        ...((cspDirectives.fontSrc as string[]) || ["'self'"]),
        ...options.allowedDomains.fonts,
      ];
    }
    if (options.allowedDomains.connect) {
      cspDirectives.connectSrc = [
        ...((cspDirectives.connectSrc as string[]) || ["'self'"]),
        ...options.allowedDomains.connect,
      ];
    }
    if (options.allowedDomains.media) {
      cspDirectives.mediaSrc = [
        ...((cspDirectives.mediaSrc as string[]) || ["'self'"]),
        ...options.allowedDomains.media,
      ];
    }
    if (options.allowedDomains.frames) {
      cspDirectives.frameSrc = [
        ...((cspDirectives.frameSrc as string[]) || ["'none'"]),
        ...options.allowedDomains.frames,
      ];
    }
  }

  // Merge custom directives
  if (options.customCspDirectives) {
    Object.assign(cspDirectives, options.customCspDirectives);
  }

  // Add report URI if specified
  if (options.cspReportUri) {
    (cspDirectives as any).reportUri = options.cspReportUri;
  }

  // Build Permissions-Policy header
  const permissionsPreset =
    options.permissionsPolicyPreset || 'CHAT_APP';
  const permissionsPolicy = PERMISSIONS_POLICY_PRESETS[permissionsPreset];

  const permissionsPolicyHeader = Object.entries(permissionsPolicy)
    .map(([feature, allowlist]) => {
      if (allowlist.length === 0) {
        return `${feature}=()`;
      }
      return `${feature}=(${allowlist.map((v) => (v === 'self' ? 'self' : `"${v}"`)).join(' ')})`;
    })
    .join(', ');

  return {
    // Content Security Policy
    contentSecurityPolicy: isDev
      ? false
      : options.cspReportOnly
        ? {
            reportOnly: true,
            directives: cspDirectives as any,
          }
        : {
            directives: cspDirectives as any,
          },

    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false, // Required for cross-origin resources

    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
      policy: isProd ? 'same-origin' : 'same-origin-allow-popups',
    },

    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin', // Allow API access from different origins
    },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false,
    },

    // X-Frame-Options (Frameguard)
    frameguard: {
      action: 'deny',
    },

    // Remove X-Powered-By
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts: isDev
      ? false
      : {
          maxAge: options.hsts?.maxAge ?? 31536000, // 1 year
          includeSubDomains: options.hsts?.includeSubDomains ?? true,
          preload: options.hsts?.preload ?? true,
        },

    // X-Download-Options (IE)
    ieNoOpen: true,

    // X-Content-Type-Options
    noSniff: true,

    // Origin-Agent-Cluster
    originAgentCluster: true,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },

    // Referrer-Policy
    referrerPolicy: {
      policy: isProd ? 'strict-origin-when-cross-origin' : 'no-referrer-when-downgrade',
    },

    // X-XSS-Protection (legacy but still useful for older browsers)
    xssFilter: true,
  };
}

/**
 * Get default Helmet config for QuckChat
 */
export function getQuckChatHelmetConfig(
  environment: 'development' | 'staging' | 'production',
  customOptions?: Partial<EnterpriseHelmetOptions>,
): HelmetOptions {
  return buildEnterpriseHelmetConfig({
    environment,
    cspPreset: 'API',
    permissionsPolicyPreset: 'CHAT_APP',
    allowedDomains: {
      connect: ['wss:', 'ws:'], // WebSocket connections
      images: ['https:', 'data:', 'blob:'], // Allow various image sources
      media: ['blob:', 'https:'], // For audio/video
    },
    ...customOptions,
  });
}

/**
 * Security headers for compliance reporting
 */
export const COMPLIANCE_HEADERS = {
  // OWASP recommended headers
  OWASP: [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Referrer-Policy',
  ],

  // PCI DSS relevant headers
  PCI_DSS: [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
  ],

  // Modern security headers
  MODERN: [
    'Content-Security-Policy',
    'Permissions-Policy',
    'Cross-Origin-Embedder-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Resource-Policy',
  ],
};

/**
 * Validate that required security headers are present
 */
export function validateSecurityHeaders(
  headers: Record<string, string>,
  complianceLevel: keyof typeof COMPLIANCE_HEADERS = 'OWASP',
): { valid: boolean; missing: string[] } {
  const requiredHeaders = COMPLIANCE_HEADERS[complianceLevel];
  const missing = requiredHeaders.filter(
    (header) => !headers[header.toLowerCase()],
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}
