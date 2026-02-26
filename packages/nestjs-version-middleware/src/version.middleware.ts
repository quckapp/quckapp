import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { VersionConfig } from './version.config';

/**
 * Extend the Express Request type so we can attach `apiVersion`.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}

/** Matches versioned API paths like `/api/v1/resource` or `/api/v1.2/resource`. */
const VERSION_PATTERN = /^\/api\/(v\d+(?:\.\d+)?)(\/.*)?$/;

/**
 * NestJS middleware for API version routing, validation, deprecation headers,
 * and sunset enforcement.
 *
 * In local mode it sets `req.apiVersion` and passes through without validation.
 * In deployed mode it enforces version checks:
 *
 * - Sunset versions past their date return **410 Gone**
 * - Unsupported versions return **404 Not Found**
 * - Deprecated versions pass through with `Deprecation` and `Sunset` headers
 * - Active versions pass through normally
 *
 * @example
 * ```ts
 * import { VersionMiddleware, configFromEnv } from '@quckapp/nestjs-version-middleware';
 *
 * const config = configFromEnv('backend-gateway');
 *
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(createVersionMiddleware(config)).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class VersionMiddleware implements NestMiddleware {
  private readonly activeSet: Set<string>;
  private readonly deprecatedSet: Set<string>;

  constructor(private readonly config: VersionConfig) {
    this.activeSet = new Set(config.activeVersions);
    this.deprecatedSet = new Set(config.deprecatedVersions);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path;

    // --- Local mode: extract version if present and pass through ---
    if (this.config.versionMode === 'local') {
      const match = VERSION_PATTERN.exec(path);
      req.apiVersion = match ? match[1] : this.config.defaultVersion;
      next();
      return;
    }

    // --- Non-versioned paths (health, metrics, etc.) pass through ---
    const match = VERSION_PATTERN.exec(path);
    if (!match) {
      next();
      return;
    }

    const version = match[1];

    // --- Sunset check ---
    const sunsetDateStr = this.config.sunsetConfig[version];
    if (sunsetDateStr) {
      const sunsetDate = new Date(sunsetDateStr + 'T00:00:00Z');
      if (!isNaN(sunsetDate.getTime()) && new Date() > sunsetDate) {
        res.status(410).json({
          error: 'API version has been sunset',
          version,
          sunset: sunsetDateStr,
          message: `API ${version} was sunset on ${sunsetDateStr}. Please migrate to ${this.config.defaultVersion}.`,
        });
        return;
      }
    }

    // --- Unsupported version check ---
    const isActive = this.activeSet.has(version);
    const isDeprecated = this.deprecatedSet.has(version);

    if (!isActive && !isDeprecated) {
      res.status(404).json({
        error: 'API version not found',
        version,
        supported_versions: this.config.activeVersions,
      });
      return;
    }

    // --- Deprecated version: set headers ---
    if (isDeprecated) {
      res.setHeader('Deprecation', 'true');
      if (sunsetDateStr) {
        res.setHeader('Sunset', sunsetDateStr);
      }
      res.setHeader(
        'Link',
        `</api/${this.config.defaultVersion}>; rel="successor-version"`,
      );
    }

    // --- Set version on request and continue ---
    req.apiVersion = version;
    next();
  }
}

/**
 * Factory function to create a middleware function from a {@link VersionConfig}.
 *
 * Use this when you need a plain Express middleware function instead of the
 * NestJS `@Injectable()` class (e.g. for `app.use()` in a bootstrap file).
 */
export function createVersionMiddleware(
  config: VersionConfig,
): (req: Request, res: Response, next: NextFunction) => void {
  const middleware = new VersionMiddleware(config);
  return (req: Request, res: Response, next: NextFunction) => {
    middleware.use(req, res, next);
  };
}
