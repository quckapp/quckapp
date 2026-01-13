import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OAuthMobileLoginDto, OAuthProvider, OAuthUserDto } from './dto/oauth.dto';
import * as https from 'https';

interface TokenPayload {
  sub: string;
  email?: string;
  name?: string;
}

@Injectable()
export class OAuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateOAuthUser(oauthUser: OAuthUserDto) {
    // Check if user already exists with this OAuth provider
    let user = await this.usersService.findByOAuthProvider(
      oauthUser.provider,
      oauthUser.providerId,
    );

    if (user) {
      // Existing OAuth user - update their info if needed
      if (oauthUser.avatar && user.avatar !== oauthUser.avatar) {
        await this.usersService.updateProfile(user._id.toString(), {
          avatar: oauthUser.avatar,
        });
      }
      return this.generateAuthResponse(user);
    }

    // Check if user exists with the same email
    if (oauthUser.email) {
      const existingUser = await this.usersService.findByEmail(oauthUser.email);
      if (existingUser) {
        // Link OAuth account to existing user
        await this.usersService.linkOAuthAccount(
          existingUser._id.toString(),
          oauthUser.provider,
          oauthUser.providerId,
        );
        return this.generateAuthResponse(existingUser);
      }
    }

    // Create new user from OAuth data
    const username = await this.generateUniqueUsername(oauthUser);

    user = await this.usersService.createOAuthUser({
      username,
      displayName: oauthUser.displayName || oauthUser.firstName || username,
      email: oauthUser.email,
      avatar: oauthUser.avatar,
      provider: oauthUser.provider,
      providerId: oauthUser.providerId,
    });

    return this.generateAuthResponse(user, true);
  }

  async handleMobileOAuthLogin(mobileLoginDto: OAuthMobileLoginDto) {
    let oauthUser: OAuthUserDto;

    switch (mobileLoginDto.provider) {
      case OAuthProvider.GOOGLE:
        oauthUser = await this.verifyGoogleToken(mobileLoginDto.accessToken);
        break;
      case OAuthProvider.FACEBOOK:
        oauthUser = await this.verifyFacebookToken(mobileLoginDto.accessToken);
        break;
      case OAuthProvider.APPLE:
        if (!mobileLoginDto.idToken) {
          throw new UnauthorizedException('Apple ID token is required');
        }
        oauthUser = await this.verifyAppleToken(mobileLoginDto.idToken);
        break;
      default:
        throw new UnauthorizedException('Unsupported OAuth provider');
    }

    return this.validateOAuthUser(oauthUser);
  }

  async linkOAuthAccount(userId: string, provider: OAuthProvider, providerId: string) {
    // Check if this OAuth account is already linked to another user
    const existingLink = await this.usersService.findByOAuthProvider(provider, providerId);
    if (existingLink && existingLink._id.toString() !== userId) {
      throw new ConflictException('This account is already linked to another user');
    }

    await this.usersService.linkOAuthAccount(userId, provider, providerId);
    return { success: true, message: `${provider} account linked successfully` };
  }

  async unlinkOAuthAccount(userId: string, provider: OAuthProvider) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Ensure user has another login method before unlinking
    const hasPassword = user.password && user.password !== '';
    const hasOtherProviders = user.oauthProviders?.some((p: any) => p.provider !== provider);

    if (!hasPassword && !hasOtherProviders) {
      throw new ConflictException(
        'Cannot unlink the only login method. Please add a password or link another account first.',
      );
    }

    await this.usersService.unlinkOAuthAccount(userId, provider);
    return { success: true, message: `${provider} account unlinked successfully` };
  }

  async getLinkedAccounts(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      providers:
        user.oauthProviders?.map((p: any) => ({
          provider: p.provider,
          linkedAt: p.linkedAt,
        })) || [],
    };
  }

  private async generateAuthResponse(user: any, isNewUser = false) {
    const tokens = await this.generateTokens(user._id.toString(), user.phoneNumber || user.email);

    return {
      isNewUser,
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  private async generateTokens(userId: string, identifier: string) {
    const payload = { sub: userId, phoneNumber: identifier };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async generateUniqueUsername(oauthUser: OAuthUserDto): Promise<string> {
    let baseUsername = '';

    if (oauthUser.displayName) {
      baseUsername = oauthUser.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else if (oauthUser.firstName) {
      baseUsername = oauthUser.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else if (oauthUser.email) {
      baseUsername = oauthUser.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    } else {
      baseUsername = 'user';
    }

    // Ensure minimum length
    if (baseUsername.length < 3) {
      baseUsername = baseUsername + 'user';
    }

    // Check if username exists and add numbers if needed
    let username = baseUsername;
    let counter = 1;

    while (await this.usersService.findByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  private async verifyGoogleToken(accessToken: string): Promise<OAuthUserDto> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: `/oauth2/v3/userinfo`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const profile = JSON.parse(data);
            if (profile.error) {
              reject(new UnauthorizedException('Invalid Google token'));
              return;
            }
            resolve({
              providerId: profile.sub,
              provider: OAuthProvider.GOOGLE,
              email: profile.email,
              firstName: profile.given_name,
              lastName: profile.family_name,
              displayName: profile.name,
              avatar: profile.picture,
            });
          } catch (e) {
            reject(new UnauthorizedException('Failed to verify Google token'));
          }
        });
      });

      req.on('error', () => reject(new UnauthorizedException('Failed to verify Google token')));
      req.end();
    });
  }

  private async verifyFacebookToken(accessToken: string): Promise<OAuthUserDto> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'graph.facebook.com',
        path: `/me?fields=id,email,first_name,last_name,name,picture&access_token=${accessToken}`,
        method: 'GET',
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const profile = JSON.parse(data);
            if (profile.error) {
              reject(new UnauthorizedException('Invalid Facebook token'));
              return;
            }
            resolve({
              providerId: profile.id,
              provider: OAuthProvider.FACEBOOK,
              email: profile.email,
              firstName: profile.first_name,
              lastName: profile.last_name,
              displayName: profile.name,
              avatar: profile.picture?.data?.url,
            });
          } catch (e) {
            reject(new UnauthorizedException('Failed to verify Facebook token'));
          }
        });
      });

      req.on('error', () => reject(new UnauthorizedException('Failed to verify Facebook token')));
      req.end();
    });
  }

  private async verifyAppleToken(idToken: string): Promise<OAuthUserDto> {
    try {
      // Decode the JWT token (Apple ID tokens are JWTs)
      const decoded = this.jwtService.decode(idToken) as TokenPayload;

      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Invalid Apple ID token');
      }

      return {
        providerId: decoded.sub,
        provider: OAuthProvider.APPLE,
        email: decoded.email,
        displayName: decoded.name,
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to verify Apple token');
    }
  }

  private sanitizeUser(user: any) {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, oauthProviders, ...result } = userObj;
    return result;
  }
}
