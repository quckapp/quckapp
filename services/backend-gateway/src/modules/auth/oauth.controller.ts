import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { OAuthMobileLoginDto, OAuthProvider } from './dto/oauth.dto';

interface AuthRequest extends Request {
  user: {
    userId: string;
    phoneNumber: string;
    providerId?: string;
    provider?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatar?: string;
  };
}

@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private oauthService: OAuthService,
    private configService: ConfigService,
  ) {}

  // ==================== Google OAuth ====================

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Request() req: AuthRequest, @Res() res: Response) {
    const result = await this.oauthService.validateOAuthUser({
      providerId: req.user.providerId!,
      provider: OAuthProvider.GOOGLE,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
    });

    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&isNewUser=${result.isNewUser}`;

    return res.redirect(redirectUrl);
  }

  // ==================== Facebook OAuth ====================

  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth() {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookAuthCallback(@Request() req: AuthRequest, @Res() res: Response) {
    const result = await this.oauthService.validateOAuthUser({
      providerId: req.user.providerId!,
      provider: OAuthProvider.FACEBOOK,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
    });

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&isNewUser=${result.isNewUser}`;

    return res.redirect(redirectUrl);
  }

  // ==================== Apple OAuth ====================

  @Get('apple')
  @UseGuards(AppleAuthGuard)
  async appleAuth() {
    // Guard redirects to Apple
  }

  @Post('apple/callback')
  @UseGuards(AppleAuthGuard)
  async appleAuthCallback(@Request() req: AuthRequest, @Res() res: Response) {
    const result = await this.oauthService.validateOAuthUser({
      providerId: req.user.providerId!,
      provider: OAuthProvider.APPLE,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      displayName: req.user.displayName,
    });

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&isNewUser=${result.isNewUser}`;

    return res.redirect(redirectUrl);
  }

  // ==================== Mobile OAuth (Token-based) ====================

  @Post('mobile')
  @HttpCode(HttpStatus.OK)
  async mobileOAuthLogin(@Body() mobileLoginDto: OAuthMobileLoginDto) {
    return this.oauthService.handleMobileOAuthLogin(mobileLoginDto);
  }

  // ==================== Account Linking ====================

  @Get('linked-accounts')
  @UseGuards(JwtAuthGuard)
  async getLinkedAccounts(@Request() req: AuthRequest) {
    return this.oauthService.getLinkedAccounts(req.user.userId);
  }

  @Post('link/:provider')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async linkAccount(
    @Request() req: AuthRequest,
    @Param('provider') provider: OAuthProvider,
    @Body('accessToken') accessToken: string,
    @Body('idToken') idToken?: string,
  ) {
    // Verify the token and get the provider ID
    const mobileLoginDto: OAuthMobileLoginDto = {
      provider,
      accessToken,
      idToken,
    };

    // Validate the token to get provider info
    const oauthUser = await this.oauthService.handleMobileOAuthLogin(mobileLoginDto);

    // Link the account
    return this.oauthService.linkOAuthAccount(
      req.user.userId,
      provider,
      oauthUser.user._id.toString(),
    );
  }

  @Delete('unlink/:provider')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkAccount(@Request() req: AuthRequest, @Param('provider') provider: OAuthProvider) {
    return this.oauthService.unlinkOAuthAccount(req.user.userId, provider);
  }
}
