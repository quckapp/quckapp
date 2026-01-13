import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum OAuthProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

export class OAuthUserDto {
  @IsString()
  providerId: string;

  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;
}

export class LinkOAuthAccountDto {
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @IsString()
  providerId: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

export class OAuthMobileLoginDto {
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @IsString()
  accessToken: string;

  @IsString()
  @IsOptional()
  idToken?: string; // Required for Apple Sign In
}
