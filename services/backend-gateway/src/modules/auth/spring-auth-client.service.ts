import {
  Injectable,
  Logger,
  UnauthorizedException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService, HttpResponse } from '../../common/http/http.service';

// ============================================
// Spring Boot Auth Service Client Interfaces
// ============================================

export interface SpringAuthRegisterRequest {
  email: string;
  password: string;
  externalId?: string;
}

export interface SpringAuthLoginRequest {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
}

export interface SpringAuth2FALoginRequest {
  tempToken: string;
  code: string;
  deviceId?: string;
  deviceName?: string;
}

export interface SpringAuthRefreshRequest {
  refreshToken: string;
}

export interface SpringAuthTokenValidationRequest {
  token: string;
}

export interface SpringAuthRevokeRequest {
  token: string;
  reason?: string;
}

export interface SpringAuthPasswordResetRequest {
  token: string;
  newPassword: string;
}

export interface SpringAuthChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SpringAuth2FAEnableRequest {
  code: string;
}

export interface SpringAuth2FADisableRequest {
  code: string;
  password: string;
}

export interface SpringAuthOAuthRequest {
  accessToken: string;
  idToken?: string;
}

// Response interfaces
export interface SpringAuthUserInfo {
  id: string;
  externalId: string;
  email: string;
  twoFactorEnabled: boolean;
  oauthProviders: string[];
}

export interface SpringAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: SpringAuthUserInfo;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface SpringTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface SpringTokenValidationResponse {
  valid: boolean;
  userId: string;
  externalId: string;
  email: string;
  expiresAt: string;
  tokenType: string;
}

export interface SpringTwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  otpAuthUrl: string;
}

export interface SpringTwoFactorEnableResponse {
  enabled: boolean;
  backupCodes: string[];
}

export interface SpringBackupCodesResponse {
  backupCodes: string[];
}

export interface SpringSessionInfo {
  sessionId: string;
  deviceName: string;
  deviceId: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

export interface SpringSessionsResponse {
  sessions: SpringSessionInfo[];
  currentSessionId: string;
}

// ============================================
// Spring Boot Auth Client Service
// ============================================

@Injectable()
export class SpringAuthClientService {
  private readonly logger = new Logger(SpringAuthClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('SPRING_AUTH_SERVICE_URL') || 'http://localhost:8081/api/auth';
    this.apiKey = this.configService.get('SPRING_AUTH_API_KEY') || '';
    this.timeout = parseInt(this.configService.get('SPRING_AUTH_TIMEOUT') || '10000', 10);
  }

  // ============================================
  // Registration & Login
  // ============================================

  async register(request: SpringAuthRegisterRequest, clientInfo?: ClientInfo): Promise<SpringAuthResponse> {
    return this.makeRequest<SpringAuthResponse>('POST', '/v1/register', request, null, clientInfo);
  }

  async login(request: SpringAuthLoginRequest, clientInfo?: ClientInfo): Promise<SpringAuthResponse> {
    return this.makeRequest<SpringAuthResponse>('POST', '/v1/login', request, null, clientInfo);
  }

  async loginWith2FA(request: SpringAuth2FALoginRequest, clientInfo?: ClientInfo): Promise<SpringAuthResponse> {
    return this.makeRequest<SpringAuthResponse>('POST', '/v1/login/2fa', request, null, clientInfo);
  }

  async logout(accessToken: string, clientInfo?: ClientInfo): Promise<void> {
    await this.makeRequest<void>('POST', '/v1/logout', null, accessToken, clientInfo);
  }

  // ============================================
  // Token Management
  // ============================================

  async refreshToken(request: SpringAuthRefreshRequest, clientInfo?: ClientInfo): Promise<SpringTokenResponse> {
    return this.makeRequest<SpringTokenResponse>('POST', '/v1/token/refresh', request, null, clientInfo);
  }

  async validateToken(request: SpringAuthTokenValidationRequest): Promise<SpringTokenValidationResponse> {
    return this.makeRequest<SpringTokenValidationResponse>('POST', '/v1/token/validate', request);
  }

  async revokeToken(request: SpringAuthRevokeRequest, clientInfo?: ClientInfo): Promise<void> {
    await this.makeRequest<void>('POST', '/v1/token/revoke', request, null, clientInfo);
  }

  async revokeAllTokens(accessToken: string, clientInfo?: ClientInfo): Promise<void> {
    await this.makeRequest<void>('POST', '/v1/token/revoke-all', null, accessToken, clientInfo);
  }

  // ============================================
  // Password Management
  // ============================================

  async forgotPassword(email: string, clientInfo?: ClientInfo): Promise<void> {
    await this.makeRequest<void>('POST', '/v1/password/forgot', { email }, null, clientInfo);
  }

  async resetPassword(request: SpringAuthPasswordResetRequest, clientInfo?: ClientInfo): Promise<void> {
    await this.makeRequest<void>('POST', '/v1/password/reset', request, null, clientInfo);
  }

  async changePassword(
    accessToken: string,
    request: SpringAuthChangePasswordRequest,
    clientInfo?: ClientInfo,
  ): Promise<void> {
    await this.makeRequest<void>('POST', '/v1/password/change', request, accessToken, clientInfo);
  }

  // ============================================
  // Two-Factor Authentication
  // ============================================

  async setup2FA(accessToken: string): Promise<SpringTwoFactorSetupResponse> {
    return this.makeRequest<SpringTwoFactorSetupResponse>('POST', '/v1/2fa/setup', null, accessToken);
  }

  async enable2FA(
    accessToken: string,
    request: SpringAuth2FAEnableRequest,
    clientInfo?: ClientInfo,
  ): Promise<SpringTwoFactorEnableResponse> {
    return this.makeRequest<SpringTwoFactorEnableResponse>('POST', '/v1/2fa/enable', request, accessToken, clientInfo);
  }

  async disable2FA(
    accessToken: string,
    request: SpringAuth2FADisableRequest,
    clientInfo?: ClientInfo,
  ): Promise<void> {
    await this.makeRequest<void>('POST', '/v1/2fa/disable', request, accessToken, clientInfo);
  }

  async generateBackupCodes(
    accessToken: string,
    code: string,
    clientInfo?: ClientInfo,
  ): Promise<SpringBackupCodesResponse> {
    return this.makeRequest<SpringBackupCodesResponse>(
      'POST',
      '/v1/2fa/backup-codes',
      { code },
      accessToken,
      clientInfo,
    );
  }

  // ============================================
  // OAuth
  // ============================================

  async oauthLogin(
    provider: string,
    request: SpringAuthOAuthRequest,
    clientInfo?: ClientInfo,
  ): Promise<SpringAuthResponse> {
    return this.makeRequest<SpringAuthResponse>('POST', `/v1/oauth/${provider}`, request, null, clientInfo);
  }

  async linkOAuthProvider(
    accessToken: string,
    provider: string,
    request: SpringAuthOAuthRequest,
    clientInfo?: ClientInfo,
  ): Promise<void> {
    await this.makeRequest<void>('POST', `/v1/oauth/${provider}/link`, request, accessToken, clientInfo);
  }

  async unlinkOAuthProvider(accessToken: string, provider: string, clientInfo?: ClientInfo): Promise<void> {
    await this.makeRequest<void>('DELETE', `/v1/oauth/${provider}/unlink`, null, accessToken, clientInfo);
  }

  // ============================================
  // Sessions
  // ============================================

  async getSessions(accessToken: string): Promise<SpringSessionsResponse> {
    return this.makeRequest<SpringSessionsResponse>('GET', '/v1/sessions', null, accessToken);
  }

  async terminateSession(accessToken: string, sessionId: string, clientInfo?: ClientInfo): Promise<void> {
    await this.makeRequest<void>('DELETE', `/v1/sessions/${sessionId}`, null, accessToken, clientInfo);
  }

  async terminateAllOtherSessions(accessToken: string, clientInfo?: ClientInfo): Promise<void> {
    await this.makeRequest<void>('DELETE', '/v1/sessions', null, accessToken, clientInfo);
  }

  // ============================================
  // Health Check
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.httpService.get(`${this.baseUrl}/actuator/health`, {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
    accessToken?: string | null,
    clientInfo?: ClientInfo,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key for service-to-service authentication
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Add user access token if provided
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add client info headers
    if (clientInfo) {
      if (clientInfo.ipAddress) {
        headers['X-Forwarded-For'] = clientInfo.ipAddress;
      }
      if (clientInfo.userAgent) {
        headers['User-Agent'] = clientInfo.userAgent;
      }
      if (clientInfo.deviceId) {
        headers['X-Device-ID'] = clientInfo.deviceId;
      }
    }

    try {
      let response: HttpResponse<T>;

      switch (method) {
        case 'GET':
          response = await this.httpService.get<T>(url, {
            headers,
            timeout: this.timeout,
            retries: 2,
            retryDelay: 500,
          });
          break;
        case 'POST':
          response = await this.httpService.post<T>(url, data, {
            headers,
            timeout: this.timeout,
            retries: 1,
            retryDelay: 500,
          });
          break;
        case 'PUT':
          response = await this.httpService.put<T>(url, data, {
            headers,
            timeout: this.timeout,
            retries: 1,
            retryDelay: 500,
          });
          break;
        case 'DELETE':
          response = await this.httpService.delete<T>(url, {
            headers,
            timeout: this.timeout,
            retries: 1,
            retryDelay: 500,
          });
          break;
      }

      // Check for error responses
      if (response.status >= 400) {
        this.handleErrorResponse(response);
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(`Spring Auth Service request failed: ${method} ${path}`, {
        error: error.message,
        status: error.status,
      });

      // Re-throw if already handled
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      // Service unavailable
      throw new ServiceUnavailableException('Auth service is temporarily unavailable');
    }
  }

  private handleErrorResponse(response: HttpResponse<any>): void {
    const { status, data } = response;
    const message = data?.message || data?.error || 'Unknown error';

    switch (status) {
      case 400:
        throw new BadRequestException(message);
      case 401:
        throw new UnauthorizedException(message);
      case 403:
        throw new UnauthorizedException('Access denied');
      case 404:
        throw new BadRequestException('Resource not found');
      case 409:
        throw new BadRequestException(message); // Conflict
      case 429:
        throw new BadRequestException('Too many requests. Please try again later.');
      default:
        if (status >= 500) {
          throw new ServiceUnavailableException('Auth service error');
        }
        throw new BadRequestException(message);
    }
  }
}

// Client info interface
interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}
