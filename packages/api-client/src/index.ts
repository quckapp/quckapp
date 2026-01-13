/**
 * QuikApp TypeScript API Client
 *
 * Auto-generated type-safe client for the QuikApp API
 *
 * @example
 * ```ts
 * import { createClient } from '@quikapp/api-client';
 *
 * const client = createClient({
 *   baseUrl: 'https://api.quikapp.io/v1',
 *   token: 'your-jwt-token',
 * });
 *
 * // Type-safe API calls
 * const { data, error } = await client.auth.login({
 *   email: 'user@example.com',
 *   password: 'password',
 * });
 * ```
 */

export { createClient, type QuikAppClient, type ClientConfig } from './client';
export { QuikAppError, isQuikAppError } from './error';
export * from './types';

// Re-export generated types
export type { paths, components, operations } from './generated/schema';
