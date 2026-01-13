# @quikapp/api-client

Type-safe TypeScript client for the QuikApp API, auto-generated from our OpenAPI specification.

## Installation

```bash
npm install @quikapp/api-client
# or
yarn add @quikapp/api-client
# or
pnpm add @quikapp/api-client
```

## Quick Start

```typescript
import { createClient } from '@quikapp/api-client';

const client = createClient({
  baseUrl: 'https://api.quikapp.io/v1',
  token: 'your-jwt-token',
});

// Login
const { data, error } = await client.auth.login({
  email: 'user@example.com',
  password: 'password',
});

if (error) {
  console.error('Login failed:', error.message);
} else {
  console.log('Logged in:', data.user);
}
```

## Configuration

```typescript
import { createClient } from '@quikapp/api-client';

const client = createClient({
  // Required: API base URL
  baseUrl: 'https://api.quikapp.io/v1',

  // Optional: JWT token for authenticated requests
  token: 'your-jwt-token',

  // Optional: Custom fetch implementation
  fetch: customFetch,

  // Optional: Callback when token refresh is needed
  onTokenRefresh: async (refreshToken) => {
    // Return new tokens or null if refresh failed
    return { accessToken: 'new-token', refreshToken: 'new-refresh' };
  },

  // Optional: Callback when authentication fails
  onAuthError: (error) => {
    // Handle auth errors (e.g., redirect to login)
    console.error('Auth error:', error);
  },
});
```

## API Namespaces

The client is organized into logical namespaces:

### Authentication (`client.auth`)

```typescript
// Login with email/password
const { data } = await client.auth.login({
  email: 'user@example.com',
  password: 'password',
});

// Register new user
await client.auth.register({
  email: 'user@example.com',
  password: 'password',
  displayName: 'John Doe',
});

// Refresh tokens
await client.auth.refreshToken({ refreshToken: 'token' });

// Logout
await client.auth.logout();

// Request password reset
await client.auth.requestPasswordReset({ email: 'user@example.com' });

// OAuth login
await client.auth.oauthLogin({ provider: 'google', code: 'oauth-code' });

// MFA
await client.auth.setupMfa();
await client.auth.verifyMfa({ code: '123456' });
await client.auth.disableMfa({ code: '123456' });
```

### Users (`client.users`)

```typescript
// Get current user
const { data: me } = await client.users.me();

// Update current user
await client.users.updateMe({ displayName: 'New Name' });

// Get user by ID
const { data: user } = await client.users.get('user-id');

// Update user preferences
await client.users.updatePreferences({ theme: 'dark' });

// List users (admin)
const { data: users } = await client.users.list({ limit: 20 });
```

### Workspaces (`client.workspaces`)

```typescript
// List workspaces
const { data: workspaces } = await client.workspaces.list();

// Create workspace
const { data: workspace } = await client.workspaces.create({
  name: 'My Workspace',
  description: 'A new workspace',
});

// Get workspace
const { data } = await client.workspaces.get('workspace-id');

// Update workspace
await client.workspaces.update('workspace-id', { name: 'Updated Name' });

// Delete workspace
await client.workspaces.delete('workspace-id');

// Members
await client.workspaces.getMembers('workspace-id');
await client.workspaces.inviteMembers('workspace-id', {
  emails: ['user@example.com'],
  role: 'member',
});
await client.workspaces.removeMember('workspace-id', 'user-id');
await client.workspaces.updateMemberRole('workspace-id', 'user-id', 'admin');
```

### Channels (`client.channels`)

```typescript
// List channels
const { data: channels } = await client.channels.list('workspace-id');

// Create channel
const { data: channel } = await client.channels.create('workspace-id', {
  name: 'general',
  description: 'General discussion',
  isPrivate: false,
});

// Get channel
const { data } = await client.channels.get('channel-id');

// Update channel
await client.channels.update('channel-id', { description: 'Updated' });

// Delete channel
await client.channels.delete('channel-id');

// Members
await client.channels.getMembers('channel-id');
await client.channels.addMembers('channel-id', { userIds: ['user-id'] });
await client.channels.removeMember('channel-id', 'user-id');

// Join/Leave
await client.channels.join('channel-id');
await client.channels.leave('channel-id');
```

### Messages (`client.messages`)

```typescript
// List messages
const { data: messages } = await client.messages.list('channel-id', {
  limit: 50,
  before: 'message-id',
});

// Send message
const { data: message } = await client.messages.send('channel-id', {
  content: 'Hello, world!',
});

// Update message
await client.messages.update('message-id', { content: 'Updated content' });

// Delete message
await client.messages.delete('message-id');

// Reactions
await client.messages.addReaction('message-id', { emoji: '👍' });
await client.messages.removeReaction('message-id', '👍');

// Pin/Unpin
await client.messages.pin('message-id');
await client.messages.unpin('message-id');
```

### Search (`client.search`)

```typescript
// Full search
const { data: results } = await client.search.search({
  query: 'search term',
  filters: {
    type: ['message', 'file'],
    channelIds: ['channel-id'],
    from: '2024-01-01',
    to: '2024-12-31',
  },
  limit: 20,
});

// Quick search
const { data: quick } = await client.search.quick('search term');

// Saved searches
await client.search.getSavedSearches();
await client.search.createSavedSearch({ name: 'My Search', query: 'term' });
await client.search.deleteSavedSearch('search-id');

// Search history
await client.search.getHistory();
await client.search.clearHistory();
```

### Notifications (`client.notifications`)

```typescript
// List notifications
const { data: notifications } = await client.notifications.list({
  unreadOnly: true,
});

// Get notification
const { data } = await client.notifications.get('notification-id');

// Mark as read
await client.notifications.markAsRead(['notification-id']);

// Mark all as read
await client.notifications.markAllAsRead();

// Delete notification
await client.notifications.delete('notification-id');

// Settings
await client.notifications.getSettings();
await client.notifications.updateSettings({ desktop: { enabled: true } });

// Push subscriptions
await client.notifications.subscribePush({ endpoint: '...', keys: {} });
await client.notifications.unsubscribePush('subscription-id');
```

### Presence (`client.presence`)

```typescript
// Get user presence
const { data: presence } = await client.presence.get('user-id');

// Get bulk presence
const { data } = await client.presence.getBulk(['user-id-1', 'user-id-2']);

// Update presence
await client.presence.update({ status: 'online', statusText: 'Working' });

// Set typing indicator
await client.presence.setTyping('channel-id', true);

// Get channel presence
const { data: channelPresence } = await client.presence.getChannelPresence('channel-id');
```

## Error Handling

```typescript
import { createClient, QuikAppError, isQuikAppError } from '@quikapp/api-client';

const client = createClient({ baseUrl: '...' });

try {
  const { data, error } = await client.users.get('invalid-id');

  if (error) {
    // error is a QuikAppError instance
    console.log(error.code);      // 'NOT_FOUND'
    console.log(error.status);    // 404
    console.log(error.message);   // 'User not found'
    console.log(error.requestId); // For support tickets

    // Check error types
    if (error.isNotFound()) {
      // Handle not found
    } else if (error.isUnauthorized()) {
      // Handle unauthorized
    } else if (error.isValidationError()) {
      // Get field-specific errors
      const emailErrors = error.getFieldErrors('email');
      const allErrors = error.getFieldErrorsMap();
    }
  }
} catch (e) {
  if (isQuikAppError(e)) {
    // Handle API error
  } else {
    // Handle network or other error
  }
}
```

## Types

All API types are exported and can be used for type annotations:

```typescript
import type {
  User,
  Workspace,
  Channel,
  Message,
  Notification,
  LoginRequest,
  LoginResponse,
} from '@quikapp/api-client';

function handleUser(user: User) {
  console.log(user.displayName);
}

const loginData: LoginRequest = {
  email: 'user@example.com',
  password: 'password',
};
```

## Development

### Generate Types from OpenAPI

```bash
# Generate TypeScript types from OpenAPI spec
npm run generate

# Build the package
npm run build

# Run type checking
npm run typecheck

# Lint
npm run lint
```

### Project Structure

```
packages/api-client/
├── src/
│   ├── generated/
│   │   └── schema.ts      # Auto-generated from OpenAPI
│   ├── client.ts          # Main client implementation
│   ├── error.ts           # Error handling
│   ├── types.ts           # Type re-exports
│   └── index.ts           # Public API
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## License

MIT
