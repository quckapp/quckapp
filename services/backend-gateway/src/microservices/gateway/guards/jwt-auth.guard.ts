import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { SERVICES } from '../../../shared/constants/services';
import { AUTH_PATTERNS } from '../../../shared/contracts/message-patterns';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * JWT Authentication Guard for API Gateway
 * Validates JWT tokens and attaches user to request
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    @Inject(SERVICES.AUTH_SERVICE) private authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // First, do a quick local validation
      const payload = this.jwtService.verify(token);

      // Then validate with auth service (checks blacklist, session, etc.)
      const result = await firstValueFrom(
        this.authClient.send(AUTH_PATTERNS.VALIDATE_TOKEN, { token }).pipe(
          timeout(5000),
          catchError((err) => {
            console.error('Auth service validation error:', err);
            return of({ success: false, error: { message: 'Auth service unavailable' } });
          }),
        ),
      );

      if (!result.success) {
        throw new UnauthorizedException(result.error?.message || 'Invalid token');
      }

      // Attach user info to request
      request.user = {
        userId: payload.userId,
        phoneNumber: payload.phoneNumber,
        sessionId: payload.sessionId,
      };

      return true;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException(error.message || 'Authentication failed');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

/**
 * Public decorator - marks routes that don't require authentication
 */
import { SetMetadata } from '@nestjs/common';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Current User decorator - gets the authenticated user from request
 */
import { createParamDecorator } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  phoneNumber: string;
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
