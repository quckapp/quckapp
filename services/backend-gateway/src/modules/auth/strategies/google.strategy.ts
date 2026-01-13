import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get('GOOGLE_CLIENT_SECRET');

    // Use dummy values if not configured to prevent startup crash
    super({
      clientID: clientID && !clientID.includes('placeholder') ? clientID : 'disabled',
      clientSecret: clientSecret && !clientSecret.includes('placeholder') ? clientSecret : 'disabled',
      callbackURL: configService.get('GOOGLE_CALLBACK_URL') || 'http://localhost/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user = {
      providerId: id,
      provider: 'google',
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
