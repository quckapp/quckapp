import createFetchClient, { type Middleware } from 'openapi-fetch';
import type { paths, components } from './generated/schema';
import { QuikAppError } from './error';

type Schemas = components['schemas'];

/**
 * Client configuration options
 */
export interface ClientConfig {
  /** Base URL for the API (e.g., 'https://api.quikapp.io/v1') */
  baseUrl: string;
  /** JWT access token for authentication */
  token?: string;
  /** API key for service-to-service communication */
  apiKey?: string;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
  /** Callback when token needs refresh */
  onTokenRefresh?: () => Promise<string | null>;
  /** Callback on authentication error */
  onAuthError?: (error: QuikAppError) => void;
}

/**
 * QuikApp API Client interface
 */
export interface QuikAppClient {
  setToken: (token: string | null) => void;
  raw: ReturnType<typeof createFetchClient<paths>>;
  auth: {
    login(body: Schemas['LoginRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    register(body: Schemas['RegisterRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    logout(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    refresh(body: Schemas['RefreshTokenRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    requestPasswordReset(body: Schemas['PasswordResetRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    confirmPasswordReset(body: Schemas['PasswordResetConfirm']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    oauth(body: Schemas['OAuthRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    getOAuthUrl(params: { provider: string; redirectUri: string }): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    setupMfa(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    verifyMfa(body: Schemas['MfaVerifyRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    disableMfa(body: { password: string }): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    listSessions(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    revokeSession(sessionId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    revokeAllSessions(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    verifyEmail(body: { token: string }): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    resendVerification(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
  };
  users: {
    me(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    updateMe(body: Schemas['UserUpdateRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PATCH']>>;
    deleteMe(body: { password: string; confirmation: string }): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    getById(userId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    getByUsername(username: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    getPreferences(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    updatePreferences(body: Schemas['UserPreferences']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PATCH']>>;
    getStatus(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    setStatus(body: Schemas['UserStatus']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PUT']>>;
    clearStatus(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    changePassword(body: { currentPassword: string; newPassword: string }): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    changeEmail(body: { newEmail: string; password: string }): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listBookmarks(params?: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    removeBookmark(bookmarkId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
  };
  workspaces: {
    list(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    create(body: Schemas['WorkspaceCreateRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    get(workspaceId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    update(workspaceId: string, body: Schemas['WorkspaceUpdateRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PATCH']>>;
    delete(workspaceId: string, body: { confirmation: string }): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    getBySlug(slug: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listMembers(workspaceId: string, params?: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    getMember(workspaceId: string, userId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMember(workspaceId: string, userId: string, body: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PATCH']>>;
    removeMember(workspaceId: string, userId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    leave(workspaceId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listInvites(workspaceId: string, params?: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    invite(workspaceId: string, body: Schemas['InviteMembersRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    revokeInvite(workspaceId: string, inviteId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    acceptInvite(inviteCode: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    getStats(workspaceId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
  };
  channels: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list(workspaceId: string, params?: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    create(workspaceId: string, body: Schemas['ChannelCreateRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    get(workspaceId: string, channelId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    update(workspaceId: string, channelId: string, body: Schemas['ChannelUpdateRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PATCH']>>;
    delete(workspaceId: string, channelId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    join(workspaceId: string, channelId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    leave(workspaceId: string, channelId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    archive(workspaceId: string, channelId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    unarchive(workspaceId: string, channelId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listMembers(workspaceId: string, channelId: string, params?: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    addMembers(workspaceId: string, channelId: string, body: Schemas['AddMembersRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    removeMember(workspaceId: string, channelId: string, userId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listDMs(workspaceId: string, params?: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    openDM(workspaceId: string, userId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    createGroupDM(workspaceId: string, body: { userIds: string[]; name?: string }): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
  };
  messages: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list(workspaceId: string, channelId: string, params?: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    send(workspaceId: string, channelId: string, body: Schemas['MessageCreateRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    get(workspaceId: string, channelId: string, messageId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    edit(workspaceId: string, channelId: string, messageId: string, body: Schemas['MessageUpdateRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PATCH']>>;
    delete(workspaceId: string, channelId: string, messageId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    addReaction(workspaceId: string, channelId: string, messageId: string, emoji: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    removeReaction(workspaceId: string, channelId: string, messageId: string, emoji: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    pin(workspaceId: string, channelId: string, messageId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    unpin(workspaceId: string, channelId: string, messageId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    listPinned(workspaceId: string, channelId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    markRead(workspaceId: string, channelId: string, messageId?: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
  };
  search: {
    query(workspaceId: string, body: Schemas['SearchRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    quick(workspaceId: string, q: string, types?: string[]): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    messages(workspaceId: string, body: Schemas['SearchRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    files(workspaceId: string, body: Schemas['SearchRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
  };
  notifications: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list(params?: Record<string, any>): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    get(notificationId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    delete(notificationId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['DELETE']>>;
    markRead(body: Schemas['MarkNotificationsReadRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    getUnreadCount(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    getSettings(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    updateSettings(body: Schemas['UpdateNotificationSettingsRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PATCH']>>;
  };
  presence: {
    get(): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    update(body: Schemas['UpdatePresenceRequest']): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['PUT']>>;
    getUser(userId: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['GET']>>;
    getBulk(userIds: string[]): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    setTyping(channelId: string, threadId?: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    stopTyping(channelId: string, threadId?: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
    heartbeat(activeChannelId?: string, activeThreadId?: string): Promise<ReturnType<ReturnType<typeof createFetchClient<paths>>['POST']>>;
  };
}

/**
 * Create a QuikApp API client
 */
export function createClient(config: ClientConfig): QuikAppClient {
  const {
    baseUrl,
    token,
    apiKey,
    fetch: customFetch,
    timeout = 30000,
    headers: customHeaders = {},
    onTokenRefresh,
    onAuthError,
  } = config;

  let currentToken = token;

  // Create base fetch client
  const client = createFetchClient<paths>({
    baseUrl,
    fetch: customFetch,
  });

  // Auth middleware
  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Add custom headers
      Object.entries(customHeaders).forEach(([key, value]) => {
        request.headers.set(key, value);
      });

      // Add authorization
      if (currentToken) {
        request.headers.set('Authorization', `Bearer ${currentToken}`);
      } else if (apiKey) {
        request.headers.set('X-API-Key', apiKey);
      }

      // Clean up timeout on response
      request.signal?.addEventListener('abort', () => clearTimeout(timeoutId));

      return request;
    },

    async onResponse({ response }) {
      // Handle 401 - try to refresh token
      if (response.status === 401 && onTokenRefresh) {
        const newToken = await onTokenRefresh();
        if (newToken) {
          currentToken = newToken;
        }
      }

      // Parse error responses
      if (!response.ok) {
        try {
          const errorBody = await response.clone().json();
          if (errorBody.error) {
            const error = QuikAppError.fromResponse(errorBody, response.status);
            if (response.status === 401 && onAuthError) {
              onAuthError(error);
            }
            throw error;
          }
        } catch (e) {
          if (e instanceof QuikAppError) throw e;
          throw new QuikAppError(
            response.statusText || 'Request failed',
            'UNKNOWN_ERROR',
            response.status
          );
        }
      }

      return response;
    },
  };

  client.use(authMiddleware);

  // Create API namespaces
  return {
    // Update token
    setToken(newToken: string | null) {
      currentToken = newToken ?? undefined;
    },

    // Get raw client for custom operations
    raw: client,

    // ==========================================================================
    // Auth API
    // ==========================================================================
    auth: {
      async login(body) {
        return client.POST('/auth/login', { body });
      },

      async register(body) {
        return client.POST('/auth/register', { body });
      },

      async logout() {
        return client.POST('/auth/logout');
      },

      async refresh(body) {
        return client.POST('/auth/refresh', { body });
      },

      async requestPasswordReset(body) {
        return client.POST('/auth/password-reset', { body });
      },

      async confirmPasswordReset(body) {
        return client.POST('/auth/password-reset/confirm', { body });
      },

      async oauth(body) {
        return client.POST('/auth/oauth', { body });
      },

      async getOAuthUrl(params) {
        return client.GET('/auth/oauth/url', {
          params: {
            query: params as { provider: 'google' | 'github' | 'microsoft' | 'apple'; redirectUri: string },
          },
        });
      },

      async setupMfa() {
        return client.POST('/auth/mfa/setup');
      },

      async verifyMfa(body) {
        return client.POST('/auth/mfa/verify', { body });
      },

      async disableMfa(body) {
        return client.DELETE('/auth/mfa', { body });
      },

      async listSessions() {
        return client.GET('/auth/sessions');
      },

      async revokeSession(sessionId) {
        return client.DELETE('/auth/sessions/{sessionId}', {
          params: { path: { sessionId } },
        });
      },

      async revokeAllSessions() {
        return client.DELETE('/auth/sessions/all');
      },

      async verifyEmail(body) {
        return client.POST('/auth/verify-email', { body });
      },

      async resendVerification() {
        return client.POST('/auth/resend-verification');
      },
    },

    // ==========================================================================
    // Users API
    // ==========================================================================
    users: {
      async me() {
        return client.GET('/users/me');
      },

      async updateMe(body) {
        return client.PATCH('/users/me', { body });
      },

      async deleteMe(body) {
        return client.DELETE('/users/me', { body: body as { password: string; confirmation: 'DELETE MY ACCOUNT' } });
      },

      async getById(userId) {
        return client.GET('/users/{userId}', {
          params: { path: { userId } },
        });
      },

      async getByUsername(username) {
        return client.GET('/users/username/{username}', {
          params: { path: { username } },
        });
      },

      async getPreferences() {
        return client.GET('/users/me/preferences');
      },

      async updatePreferences(body) {
        return client.PATCH('/users/me/preferences', { body });
      },

      async getStatus() {
        return client.GET('/users/me/status');
      },

      async setStatus(body) {
        return client.PUT('/users/me/status', { body });
      },

      async clearStatus() {
        return client.DELETE('/users/me/status');
      },

      async changePassword(body) {
        return client.POST('/users/me/password', { body });
      },

      async changeEmail(body) {
        return client.POST('/users/me/email', { body });
      },

      async listBookmarks(params) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return client.GET('/users/me/bookmarks', { params: { query: params } } as any);
      },

      async removeBookmark(bookmarkId) {
        return client.DELETE('/users/me/bookmarks/{bookmarkId}', {
          params: { path: { bookmarkId } },
        });
      },
    },

    // ==========================================================================
    // Workspaces API
    // ==========================================================================
    workspaces: {
      async list() {
        return client.GET('/workspaces');
      },

      async create(body) {
        return client.POST('/workspaces', { body });
      },

      async get(workspaceId) {
        return client.GET('/workspaces/{workspaceId}', {
          params: { path: { workspaceId } },
        });
      },

      async update(workspaceId, body) {
        return client.PATCH('/workspaces/{workspaceId}', {
          params: { path: { workspaceId } },
          body,
        });
      },

      async delete(workspaceId, body) {
        return client.DELETE('/workspaces/{workspaceId}', {
          params: { path: { workspaceId } },
          body,
        });
      },

      async getBySlug(slug) {
        return client.GET('/workspaces/slug/{slug}', {
          params: { path: { slug } },
        });
      },

      async listMembers(workspaceId, params) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return client.GET('/workspaces/{workspaceId}/members', {
          params: { path: { workspaceId }, query: params },
        } as any);
      },

      async getMember(workspaceId, userId) {
        return client.GET('/workspaces/{workspaceId}/members/{userId}', {
          params: { path: { workspaceId, userId } },
        });
      },

      async updateMember(workspaceId, userId, body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return client.PATCH('/workspaces/{workspaceId}/members/{userId}', {
          params: { path: { workspaceId, userId } },
          body,
        } as any);
      },

      async removeMember(workspaceId, userId) {
        return client.DELETE('/workspaces/{workspaceId}/members/{userId}', {
          params: { path: { workspaceId, userId } },
        });
      },

      async leave(workspaceId) {
        return client.POST('/workspaces/{workspaceId}/leave', {
          params: { path: { workspaceId } },
        });
      },

      async listInvites(workspaceId, params) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return client.GET('/workspaces/{workspaceId}/invites', {
          params: { path: { workspaceId }, query: params },
        } as any);
      },

      async invite(workspaceId, body) {
        return client.POST('/workspaces/{workspaceId}/invites', {
          params: { path: { workspaceId } },
          body,
        });
      },

      async revokeInvite(workspaceId, inviteId) {
        return client.DELETE('/workspaces/{workspaceId}/invites/{inviteId}', {
          params: { path: { workspaceId, inviteId } },
        });
      },

      async acceptInvite(inviteCode) {
        return client.POST('/workspaces/invites/{inviteCode}/accept', {
          params: { path: { inviteCode } },
        });
      },

      async getStats(workspaceId) {
        return client.GET('/workspaces/{workspaceId}/stats', {
          params: { path: { workspaceId } },
        });
      },
    },

    // ==========================================================================
    // Channels API
    // ==========================================================================
    channels: {
      async list(workspaceId, params) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return client.GET('/workspaces/{workspaceId}/channels', {
          params: { path: { workspaceId }, query: params },
        } as any);
      },

      async create(workspaceId, body) {
        return client.POST('/workspaces/{workspaceId}/channels', {
          params: { path: { workspaceId } },
          body,
        });
      },

      async get(workspaceId, channelId) {
        return client.GET('/workspaces/{workspaceId}/channels/{channelId}', {
          params: { path: { workspaceId, channelId } },
        });
      },

      async update(workspaceId, channelId, body) {
        return client.PATCH('/workspaces/{workspaceId}/channels/{channelId}', {
          params: { path: { workspaceId, channelId } },
          body,
        });
      },

      async delete(workspaceId, channelId) {
        return client.DELETE('/workspaces/{workspaceId}/channels/{channelId}', {
          params: { path: { workspaceId, channelId } },
        });
      },

      async join(workspaceId, channelId) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/join', {
          params: { path: { workspaceId, channelId } },
        });
      },

      async leave(workspaceId, channelId) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/leave', {
          params: { path: { workspaceId, channelId } },
        });
      },

      async archive(workspaceId, channelId) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/archive', {
          params: { path: { workspaceId, channelId } },
        });
      },

      async unarchive(workspaceId, channelId) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/unarchive', {
          params: { path: { workspaceId, channelId } },
        });
      },

      async listMembers(workspaceId, channelId, params) {
        return client.GET('/workspaces/{workspaceId}/channels/{channelId}/members', {
          params: { path: { workspaceId, channelId }, query: params },
        });
      },

      async addMembers(workspaceId, channelId, body) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/members', {
          params: { path: { workspaceId, channelId } },
          body,
        });
      },

      async removeMember(workspaceId, channelId, userId) {
        return client.DELETE('/workspaces/{workspaceId}/channels/{channelId}/members/{userId}', {
          params: { path: { workspaceId, channelId, userId } },
        });
      },

      async listDMs(workspaceId, params) {
        return client.GET('/workspaces/{workspaceId}/dms', {
          params: { path: { workspaceId }, query: params },
        });
      },

      async openDM(workspaceId, userId) {
        return client.POST('/workspaces/{workspaceId}/dms/open', {
          params: { path: { workspaceId } },
          body: { userId },
        });
      },

      async createGroupDM(workspaceId, body) {
        return client.POST('/workspaces/{workspaceId}/dms/group', {
          params: { path: { workspaceId } },
          body,
        });
      },
    },

    // ==========================================================================
    // Messages API
    // ==========================================================================
    messages: {
      async list(workspaceId, channelId, params) {
        return client.GET('/workspaces/{workspaceId}/channels/{channelId}/messages', {
          params: { path: { workspaceId, channelId }, query: params },
        });
      },

      async send(workspaceId, channelId, body) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/messages', {
          params: { path: { workspaceId, channelId } },
          body,
        });
      },

      async get(workspaceId, channelId, messageId) {
        return client.GET('/workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}', {
          params: { path: { workspaceId, channelId, messageId } },
        });
      },

      async edit(workspaceId, channelId, messageId, body) {
        return client.PATCH('/workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}', {
          params: { path: { workspaceId, channelId, messageId } },
          body,
        });
      },

      async delete(workspaceId, channelId, messageId) {
        return client.DELETE('/workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}', {
          params: { path: { workspaceId, channelId, messageId } },
        });
      },

      async addReaction(workspaceId, channelId, messageId, emoji) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}/reactions', {
          params: { path: { workspaceId, channelId, messageId } },
          body: { emoji },
        });
      },

      async removeReaction(workspaceId, channelId, messageId, emoji) {
        return client.DELETE('/workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}/reactions/{emoji}', {
          params: { path: { workspaceId, channelId, messageId, emoji } },
        });
      },

      async pin(workspaceId, channelId, messageId) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}/pin', {
          params: { path: { workspaceId, channelId, messageId } },
        });
      },

      async unpin(workspaceId, channelId, messageId) {
        return client.DELETE('/workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}/unpin', {
          params: { path: { workspaceId, channelId, messageId } },
        });
      },

      async listPinned(workspaceId, channelId) {
        return client.GET('/workspaces/{workspaceId}/channels/{channelId}/pins', {
          params: { path: { workspaceId, channelId } },
        });
      },

      async markRead(workspaceId, channelId, messageId) {
        return client.POST('/workspaces/{workspaceId}/channels/{channelId}/read', {
          params: { path: { workspaceId, channelId } },
          body: messageId ? { messageId } : undefined,
        });
      },
    },

    // ==========================================================================
    // Search API
    // ==========================================================================
    search: {
      async query(workspaceId, body) {
        return client.POST('/workspaces/{workspaceId}/search', {
          params: { path: { workspaceId } },
          body,
        });
      },

      async quick(workspaceId, q, types) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return client.GET('/workspaces/{workspaceId}/search/quick', {
          params: { path: { workspaceId }, query: { q, types } },
        } as any);
      },

      async messages(workspaceId, body) {
        return client.POST('/workspaces/{workspaceId}/search/messages', {
          params: { path: { workspaceId } },
          body,
        });
      },

      async files(workspaceId, body) {
        return client.POST('/workspaces/{workspaceId}/search/files', {
          params: { path: { workspaceId } },
          body,
        });
      },
    },

    // ==========================================================================
    // Notifications API
    // ==========================================================================
    notifications: {
      async list(params) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return client.GET('/notifications', { params: { query: params } } as any);
      },

      async get(notificationId) {
        return client.GET('/notifications/{notificationId}', {
          params: { path: { notificationId } },
        });
      },

      async delete(notificationId) {
        return client.DELETE('/notifications/{notificationId}', {
          params: { path: { notificationId } },
        });
      },

      async markRead(body) {
        return client.POST('/notifications/read', { body });
      },

      async getUnreadCount() {
        return client.GET('/notifications/unread-count');
      },

      async getSettings() {
        return client.GET('/notifications/settings');
      },

      async updateSettings(body) {
        return client.PATCH('/notifications/settings', { body });
      },
    },

    // ==========================================================================
    // Presence API
    // ==========================================================================
    presence: {
      async get() {
        return client.GET('/presence');
      },

      async update(body) {
        return client.PUT('/presence', { body });
      },

      async getUser(userId) {
        return client.GET('/presence/users/{userId}', {
          params: { path: { userId } },
        });
      },

      async getBulk(userIds) {
        return client.POST('/presence/bulk', { body: { userIds } });
      },

      async setTyping(channelId, threadId) {
        return client.POST('/presence/typing', { body: { channelId, threadId } });
      },

      async stopTyping(channelId, threadId) {
        return client.POST('/presence/typing/stop', { body: { channelId, threadId } });
      },

      async heartbeat(activeChannelId, activeThreadId) {
        return client.POST('/presence/heartbeat', { body: { activeChannelId, activeThreadId } });
      },
    },
  };
}
