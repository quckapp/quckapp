import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

interface AppleProfile {
  id: string;
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get('APPLE_CLIENT_ID');
    const teamID = configService.get('APPLE_TEAM_ID');

    // Use dummy values if not configured to prevent startup crash
    super({
      clientID: clientID && !clientID.includes('placeholder') ? clientID : 'disabled',
      teamID: teamID && !teamID.includes('placeholder') ? teamID : 'disabled',
      keyID: configService.get('APPLE_KEY_ID') || 'disabled',
      privateKeyString: configService.get('APPLE_PRIVATE_KEY') || 'disabled',
      callbackURL: configService.get('APPLE_CALLBACK_URL') || 'http://localhost/callback',
      scope: ['name', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: AppleProfile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    // Apple only sends user info on the first login
    // After that, you only get the user ID
    const user = {
      providerId: profile.id || idToken?.sub,
      provider: 'apple',
      email: profile.email || idToken?.email,
      firstName: profile.name?.firstName,
      lastName: profile.name?.lastName,
      displayName: profile.name
        ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim()
        : undefined,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
