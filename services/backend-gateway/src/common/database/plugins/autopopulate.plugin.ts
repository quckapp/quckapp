import { Schema } from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mongooseAutopopulate = require('mongoose-autopopulate');

/**
 * Autopopulate Plugin Configuration
 *
 * This plugin automatically populates specified fields in Mongoose documents,
 * simplifying data retrieval for related collections.
 *
 * Usage in schema definition:
 * ```typescript
 * @Prop({
 *   type: mongoose.Schema.Types.ObjectId,
 *   ref: 'User',
 *   autopopulate: true, // Simple autopopulate
 * })
 * author: User;
 *
 * @Prop({
 *   type: mongoose.Schema.Types.ObjectId,
 *   ref: 'User',
 *   autopopulate: { select: 'name email avatar' }, // With field selection
 * })
 * author: User;
 *
 * @Prop({
 *   type: mongoose.Schema.Types.ObjectId,
 *   ref: 'User',
 *   autopopulate: { maxDepth: 2 }, // Limit nesting depth
 * })
 * author: User;
 * ```
 */

/**
 * Autopopulate options interface
 */
export interface AutopopulateOptions {
  /** Fields to select from the populated document */
  select?: string | Record<string, number>;
  /** Maximum depth for nested population */
  maxDepth?: number;
  /** Additional match conditions */
  match?: Record<string, any>;
  /** Options to pass to the populate query */
  options?: Record<string, any>;
  /** Function to determine if population should occur */
  functions?: (doc: any) => boolean;
}

/**
 * Apply the autopopulate plugin to a schema
 *
 * @param schema - Mongoose schema to apply the plugin to
 * @param options - Optional configuration options
 */
export function applyAutopopulatePlugin(
  schema: Schema,
  options?: { maxDepth?: number },
): void {
  schema.plugin(mongooseAutopopulate, options);
}

/**
 * Create autopopulate configuration for a field
 *
 * @param selectFields - Fields to select (space-separated or object)
 * @param additionalOptions - Additional autopopulate options
 */
export function createAutopopulateConfig(
  selectFields?: string | string[],
  additionalOptions?: Partial<AutopopulateOptions>,
): AutopopulateOptions | boolean {
  if (!selectFields && !additionalOptions) {
    return true;
  }

  const select = Array.isArray(selectFields)
    ? selectFields.join(' ')
    : selectFields;

  return {
    select,
    ...additionalOptions,
  };
}

/**
 * Common autopopulate configurations for reuse
 */
export const AUTOPOPULATE_CONFIGS = {
  /** Populate user with basic info only */
  USER_BASIC: {
    select: '_id name email avatar isOnline lastSeen',
    maxDepth: 1,
  } as AutopopulateOptions,

  /** Populate user with profile info */
  USER_PROFILE: {
    select: '_id name email avatar bio status isOnline lastSeen createdAt',
    maxDepth: 1,
  } as AutopopulateOptions,

  /** Populate message with sender info */
  MESSAGE_SENDER: {
    select: '_id name avatar',
    maxDepth: 1,
  } as AutopopulateOptions,

  /** Populate conversation participants */
  CONVERSATION_PARTICIPANTS: {
    select: '_id name email avatar isOnline lastSeen',
    maxDepth: 1,
  } as AutopopulateOptions,

  /** Populate with minimal info (just ID and name) */
  MINIMAL: {
    select: '_id name',
    maxDepth: 1,
  } as AutopopulateOptions,

  /** Populate without any field restriction (use carefully) */
  FULL: {
    maxDepth: 2,
  } as AutopopulateOptions,
};

/**
 * Decorator to mark a schema for autopopulation
 * Use this in combination with NestJS schema decorators
 */
export function AutoPopulate(options?: AutopopulateOptions) {
  return function (target: any, propertyKey: string) {
    const existingMetadata =
      Reflect.getMetadata('autopopulate:fields', target.constructor) || [];
    existingMetadata.push({ field: propertyKey, options });
    Reflect.defineMetadata(
      'autopopulate:fields',
      existingMetadata,
      target.constructor,
    );
  };
}

/**
 * Get autopopulate fields from a class
 */
export function getAutopopulateFields(
  target: any,
): Array<{ field: string; options?: AutopopulateOptions }> {
  return Reflect.getMetadata('autopopulate:fields', target) || [];
}

/**
 * Disable autopopulate for a specific query
 *
 * Usage:
 * ```typescript
 * const result = await Model.find().setOptions({ autopopulate: false });
 * ```
 */
export const DISABLE_AUTOPOPULATE = { autopopulate: false };

/**
 * Enable autopopulate with max depth for a specific query
 *
 * Usage:
 * ```typescript
 * const result = await Model.find().setOptions(withMaxDepth(3));
 * ```
 */
export function withMaxDepth(depth: number): { maxDepth: number } {
  return { maxDepth: depth };
}
