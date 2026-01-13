import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get('FACEBOOK_APP_ID');
    const clientSecret = configService.get('FACEBOOK_APP_SECRET');

    // Use dummy values if not configured to prevent startup crash
    super({
      clientID: clientID && !clientID.includes('placeholder') ? clientID : 'disabled',
      clientSecret: clientSecret && !clientSecret.includes('placeholder') ? clientSecret : 'disabled',
      callbackURL: configService.get('FACEBOOK_CALLBACK_URL') || 'http://localhost/callback',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user = {
      providerId: id,
      provider: 'facebook',
      email: emails?.[0]?.value,
      firstName: name?.givenName,
      lastName: name?.familyName,
      displayName: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
      avatar: photos?.[0]?.value,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
