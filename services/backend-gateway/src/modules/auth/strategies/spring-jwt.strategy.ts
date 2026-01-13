import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { SpringAuthClientService } from '../spring-auth-client.service';
import { Request } from 'express';

@Injectable()
export class SpringJwtStrategy extends PassportStrategy(Strategy, 'spring-jwt') {
  private readonly logger = new Logger(SpringJwtStrategy.name);
  private readonly useSpringAuth: boolean;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private springAuthClient: SpringAuthClientService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: true,
    });
    this.useSpringAuth = this.configService.get('USE_SPRING_AUTH') === 'true';
  }

  async validate(req: Request, payload: any) {
    // If Spring Auth is enabled, validate token with Spring Boot service
    if (this.useSpringAuth) {
      try {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        if (!token) {
          throw new UnauthorizedException('No token provided');
        }

        const validation = await this.springAuthClient.validateToken({ token });

        if (!validation.valid) {
          throw new UnauthorizedException('Invalid token');
        }

        // Use externalId from Spring Auth to find user in MongoDB
        const user = await this.usersService.findById(validation.externalId);

        if (!user) {
          this.logger.warn(`User not found in MongoDB: ${validation.externalId}`);
          // Return Spring Auth user info if MongoDB user not found
          return {
            _id: validation.externalId,
            userId: validation.userId,
            email: validation.email,
            externalId: validation.externalId,
            springAuthId: validation.userId,
            tokenValidatedBy: 'spring-auth',
          };
        }

        return {
          _id: user._id.toString(),
          userId: user._id.toString(),
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          isBanned: user.isBanned,
          isActive: user.isActive,
          springAuthId: validation.userId,
          tokenValidatedBy: 'spring-auth',
        };
      } catch (error) {
        this.logger.error(`Spring Auth token validation failed: ${error.message}`);
        // Fall through to local validation
      }
    }

    // Local JWT validation (fallback)
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      _id: user._id.toString(),
      userId: payload.sub,
      phoneNumber: payload.phoneNumber,
      role: user.role,
      permissions: user.permissions,
      isBanned: user.isBanned,
      isActive: user.isActive,
      tokenValidatedBy: 'local',
    };
  }
}
