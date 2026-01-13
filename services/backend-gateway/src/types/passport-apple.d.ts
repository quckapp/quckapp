declare module 'passport-apple' {
  import { Strategy as PassportStrategy } from 'passport';

  interface AppleStrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKeyString?: string;
    privateKeyLocation?: string;
    callbackURL: string;
    scope?: string[];
    passReqToCallback?: boolean;
  }

  interface AppleProfile {
    id: string;
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  }

  type VerifyCallback = (err?: Error | null, user?: any, info?: any) => void;

  type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: AppleProfile,
    done: VerifyCallback,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: AppleStrategyOptions, verify: VerifyFunction);
    name: string;
  }
}
