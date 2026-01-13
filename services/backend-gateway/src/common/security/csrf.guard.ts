import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Token Configuration
 */
export interface CsrfConfig {
  /** Cookie name for CSRF token */
  cookieName?: string;
  /** Header name for CSRF token */
  headerName?: string;
  /** Token expiry in seconds */
  tokenExpiry?: number;
  /** Secret for token generation */
  secret?: string;
  /** Secure cookie (HTTPS only) */
  secure?: boolean;
  /** SameSite cookie attribute */
  sameSite?: 'strict' | 'lax' | 'none';
  /** HTTP methods that require CSRF validation */
  methods?: string[];
  /** Paths to exclude from CSRF protection */
  excludePaths?: string[];
}

/**
 * Decorator to skip CSRF check for a route
 */
export const SKIP_CSRF_KEY = 'skipCsrf';
import { SetMetadata } from '@nestjs/common';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

/**
 * CSRF Guard - Protects against Cross-Site Request Forgery attacks
 *
 * Uses the Double Submit Cookie pattern:
 * 1. Server sets a CSRF token in a cookie (accessible to JS)
 * 2. Client includes the token in a custom header
 * 3. Server validates that cookie token matches header token
 *
 * This approach works well with:
 * - Single Page Applications (SPAs)
 * - Mobile applications
 * - API-first architectures
 *
 * Note: For JWT-only APIs (no cookies for auth), CSRF protection is optional
 * since the attack vector requires session cookies.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly config: Required<CsrfConfig>;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.config = {
      cookieName: this.configService.get('CSRF_COOKIE_NAME') || 'XSRF-TOKEN',
      headerName: this.configService.get('CSRF_HEADER_NAME') || 'X-XSRF-TOKEN',
      tokenExpiry: parseInt(this.configService.get('CSRF_TOKEN_EXPIRY') || '3600', 10),
      secret: this.configService.get('CSRF_SECRET') || this.configService.get('JWT_SECRET') || 'csrf-secret',
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: (this.configService.get('CSRF_SAME_SITE') || 'lax') as 'strict' | 'lax' | 'none',
      methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
      excludePaths: ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh', '/health', '/metrics'],
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if CSRF should be skipped for this route
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    // Skip CSRF for safe methods
    if (!this.config.methods.includes(request.method)) {
      // Set CSRF token cookie for GET requests
      this.setTokenCookie(response);
      return true;
    }

    // Skip CSRF for excluded paths
    if (this.isExcludedPath(request.path)) {
      return true;
    }

    // Validate CSRF token
    const cookieToken = request.cookies?.[this.config.cookieName];
    const headerToken = request.headers[this.config.headerName.toLowerCase()] as string;

    if (!cookieToken || !headerToken) {
      this.logger.warn(`CSRF token missing for ${request.method} ${request.path}`);
      throw new ForbiddenException('CSRF token missing');
    }

    if (!this.validateToken(cookieToken, headerToken)) {
      this.logger.warn(`CSRF token mismatch for ${request.method} ${request.path}`);
      throw new ForbiddenException('CSRF token invalid');
    }

    // Rotate token after successful validation
    this.setTokenCookie(response);

    return true;
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(32).toString('hex');
    const data = `${timestamp}.${random}`;
    const signature = this.sign(data);
    return `${data}.${signature}`;
  }

  /**
   * Sign data with secret
   */
  private sign(data: string): string {
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Validate CSRF token
   */
  private validateToken(cookieToken: string, headerToken: string): boolean {
    // Tokens must match
    if (cookieToken !== headerToken) {
      return false;
    }

    // Verify token format and signature
    const parts = cookieToken.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [timestamp, random, signature] = parts;
    const data = `${timestamp}.${random}`;

    // Verify signature
    const expectedSignature = this.sign(data);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return false;
    }

    // Check token expiry
    const tokenTime = parseInt(timestamp, 36);
    const now = Date.now();
    if (now - tokenTime > this.config.tokenExpiry * 1000) {
      return false;
    }

    return true;
  }

  /**
   * Set CSRF token cookie
   */
  private setTokenCookie(response: Response): void {
    const token = this.generateToken();

    response.cookie(this.config.cookieName, token, {
      httpOnly: false, // Must be accessible to JS
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      maxAge: this.config.tokenExpiry * 1000,
      path: '/',
    });
  }

  /**
   * Check if path should be excluded from CSRF protection
   */
  private isExcludedPath(path: string): boolean {
    return this.config.excludePaths.some((excludePath) => {
      if (excludePath.endsWith('*')) {
        return path.startsWith(excludePath.slice(0, -1));
      }
      return path === excludePath;
    });
  }
}

/**
 * CSRF Middleware - Alternative to guard, sets token on every response
 */
export function csrfMiddleware(config?: Partial<CsrfConfig>) {
  const cookieName = config?.cookieName || 'XSRF-TOKEN';
  const secret = config?.secret || process.env.JWT_SECRET || 'csrf-secret';
  const secure = config?.secure ?? process.env.NODE_ENV === 'production';
  const sameSite = config?.sameSite || 'lax';
  const tokenExpiry = config?.tokenExpiry || 3600;

  const generateToken = (): string => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(32).toString('hex');
    const data = `${timestamp}.${random}`;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return `${data}.${signature}`;
  };

  return (req: Request, res: Response, next: () => void) => {
    // Only set token if not already present or if it's a GET request
    if (!req.cookies?.[cookieName] || req.method === 'GET') {
      const token = generateToken();
      res.cookie(cookieName, token, {
        httpOnly: false,
        secure,
        sameSite,
        maxAge: tokenExpiry * 1000,
        path: '/',
      });
    }
    next();
  };
}
