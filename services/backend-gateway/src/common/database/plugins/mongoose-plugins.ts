import { Schema } from 'mongoose';

// Use require for CommonJS modules that don't have proper ESM exports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mongooseAutopopulate = require('mongoose-autopopulate');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mongooseDelete = require('mongoose-delete');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mongoosePaginateV2 = require('mongoose-paginate-v2');

/**
 * Mongoose Plugins Configuration
 *
 * This module provides utility functions to apply various Mongoose plugins
 * to schemas for enhanced functionality:
 *
 * - mongoose-lean-virtuals: Include virtuals in lean queries
 * - mongoose-autopopulate: Automatic population of referenced documents
 * - mongoose-delete: Soft delete functionality
 * - mongoose-field-encryption: Field-level encryption (configured separately)
 */

/**
 * Apply lean virtuals plugin to a schema
 * Allows virtuals to be included when using .lean() queries
 *
 * @example
 * const UserSchema = new Schema({ ... });
 * applyLeanVirtuals(UserSchema);
 *
 * // Now virtuals will be included in lean queries:
 * User.find().lean({ virtuals: true });
 */
export function applyLeanVirtuals(schema: Schema): void {
  // @ts-ignore - CommonJS module compatibility
  schema.plugin(mongooseLeanVirtuals);
}

/**
 * Apply autopopulate plugin to a schema
 * Automatically populates referenced documents without explicit .populate() calls
 *
 * @example
 * const MessageSchema = new Schema({
 *   sender: {
 *     type: Schema.Types.ObjectId,
 *     ref: 'User',
 *     autopopulate: true // or { select: 'name avatar' }
 *   }
 * });
 * applyAutopopulate(MessageSchema);
 */
export function applyAutopopulate(schema: Schema): void {
  // @ts-ignore - CommonJS module compatibility
  schema.plugin(mongooseAutopopulate);
}

/**
 * Apply soft delete plugin to a schema
 * Documents are marked as deleted instead of being permanently removed
 *
 * @param schema - The Mongoose schema
 * @param options - Soft delete options
 *
 * @example
 * applySoftDelete(UserSchema, {
 *   deletedAt: true,
 *   deletedBy: true,
 *   overrideMethods: 'all'
 * });
 *
 * // Then use:
 * await User.delete({ _id: userId });  // Soft delete
 * await User.findDeleted();            // Find deleted documents
 * await User.restore({ _id: userId }); // Restore deleted document
 */
export function applySoftDelete(
  schema: Schema,
  options: {
    deletedAt?: boolean;
    deletedBy?: boolean;
    overrideMethods?: boolean | 'all' | string[];
    validateBeforeDelete?: boolean;
    indexFields?: boolean | 'all' | string[];
  } = {},
): void {
  const defaultOptions = {
    deletedAt: true,
    deletedBy: true,
    overrideMethods: 'all' as const,
    validateBeforeDelete: false,
    indexFields: true,
  };

  // @ts-ignore - CommonJS module compatibility
  schema.plugin(mongooseDelete.default || mongooseDelete, { ...defaultOptions, ...options });
}

/**
 * Apply all common plugins to a schema
 * Applies: lean virtuals, autopopulate, soft delete
 *
 * @example
 * const UserSchema = new Schema({ ... });
 * applyAllPlugins(UserSchema);
 */
export function applyAllPlugins(
  schema: Schema,
  options?: {
    leanVirtuals?: boolean;
    autopopulate?: boolean;
    softDelete?: boolean | {
      deletedAt?: boolean;
      deletedBy?: boolean;
      overrideMethods?: boolean | 'all' | string[];
    };
  },
): void {
  const opts = {
    leanVirtuals: true,
    autopopulate: true,
    softDelete: true,
    ...options,
  };

  if (opts.leanVirtuals) {
    applyLeanVirtuals(schema);
  }

  if (opts.autopopulate) {
    applyAutopopulate(schema);
  }

  if (opts.softDelete) {
    const softDeleteOpts = typeof opts.softDelete === 'object' ? opts.softDelete : {};
    applySoftDelete(schema, softDeleteOpts);
  }
}

/**
 * Apply pagination plugin to schema (mongoose-paginate-v2 is already installed)
 */
export const mongoosePaginate = mongoosePaginateV2;

/**
 * Helper to create schema with common plugins pre-applied
 */
export function createSchemaWithPlugins<T>(
  definition: Record<string, any>,
  options?: {
    schemaOptions?: Record<string, any>;
    plugins?: {
      leanVirtuals?: boolean;
      autopopulate?: boolean;
      softDelete?: boolean | Record<string, any>;
      paginate?: boolean;
    };
  },
): Schema<T> {
  const schema = new Schema<T>(definition, {
    timestamps: true,
    ...options?.schemaOptions,
  });

  const pluginOpts = {
    leanVirtuals: true,
    autopopulate: true,
    softDelete: false,
    paginate: true,
    ...options?.plugins,
  };

  if (pluginOpts.leanVirtuals) {
    applyLeanVirtuals(schema);
  }

  if (pluginOpts.autopopulate) {
    applyAutopopulate(schema);
  }

  if (pluginOpts.softDelete) {
    const softDeleteOpts = typeof pluginOpts.softDelete === 'object' ? pluginOpts.softDelete : {};
    applySoftDelete(schema, softDeleteOpts);
  }

  if (pluginOpts.paginate) {
    // @ts-ignore - CommonJS module compatibility
    schema.plugin(mongoosePaginateV2);
  }

  return schema;
}
