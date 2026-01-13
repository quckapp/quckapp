import { Schema, Document, Model, Types } from 'mongoose';
import MongooseDelete from 'mongoose-delete';

/**
 * Soft Delete Plugin
 * Implements soft delete functionality using mongoose-delete package
 * Documents are marked as deleted but remain in the database
 *
 * Features:
 * - Soft delete with deleted, deletedAt, deletedBy fields
 * - Override find methods to exclude deleted documents by default
 * - Methods to find deleted documents: findDeleted, findWithDeleted
 * - Restore functionality
 * - Index support for better query performance
 */

/** Available methods that can be overridden */
type OverridableMethods =
  | 'countDocuments'
  | 'find'
  | 'findOne'
  | 'findOneAndUpdate'
  | 'update'
  | 'updateOne'
  | 'updateMany'
  | 'aggregate';

export interface SoftDeletePluginOptions {
  /** Include deletedAt timestamp (default: true) */
  deletedAt?: boolean;
  /** Include deletedBy user reference (default: true) */
  deletedBy?: boolean;
  /** User model name for deletedBy reference (default: 'User') */
  deletedByType?: string;
  /** Override find methods to exclude deleted (default: true) */
  overrideMethods?: boolean | 'all' | OverridableMethods[];
  /** Create indexes on deleted fields (default: true) */
  indexFields?: boolean;
  /** Validate before delete (default: false) */
  validateBeforeDelete?: boolean;
}

/**
 * Soft delete interface for documents
 */
export interface SoftDeleteInterface {
  deleted?: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId | string;
}

/**
 * Extended soft delete document interface
 */
export interface SoftDeleteDocument extends Omit<Document, 'delete'>, SoftDeleteInterface {
  /** Soft delete this document */
  delete(deleteBy?: string | Types.ObjectId): Promise<this>;
  /** Restore this soft-deleted document */
  restore(): Promise<this>;
  /** Check if document is soft deleted */
  isDeleted(): boolean;
}

/**
 * Extended soft delete model interface with static methods
 */
export interface SoftDeleteModel<T extends SoftDeleteDocument> extends Model<T> {
  /** Count only deleted documents */
  countDocumentsDeleted: Model<T>['countDocuments'];
  /** Count all documents including deleted */
  countDocumentsWithDeleted: Model<T>['countDocuments'];
  /** Find only deleted documents */
  findDeleted: Model<T>['find'];
  /** Find all documents including deleted */
  findWithDeleted: Model<T>['find'];
  /** Find One only deleted documents */
  findOneDeleted: Model<T>['findOne'];
  /** Find One all documents including deleted */
  findOneWithDeleted: Model<T>['findOne'];
  /** Find One And Update only deleted documents */
  findOneAndUpdateDeleted: Model<T>['findOneAndUpdate'];
  /** Find One And Update all documents including deleted */
  findOneAndUpdateWithDeleted: Model<T>['findOneAndUpdate'];
  /** Update One only deleted documents */
  updateOneDeleted: Model<T>['updateOne'];
  /** Update One all documents including deleted */
  updateOneWithDeleted: Model<T>['updateOne'];
  /** Update Many only deleted documents */
  updateManyDeleted: Model<T>['updateMany'];
  /** Update Many all documents including deleted */
  updateManyWithDeleted: Model<T>['updateMany'];
  /** Aggregate only deleted documents */
  aggregateDeleted: Model<T>['aggregate'];
  /** Aggregate all documents including deleted */
  aggregateWithDeleted: Model<T>['aggregate'];

  /** Delete documents by conditions */
  delete(conditions?: any, deleteBy?: any): Promise<any>;
  /** Restore documents by conditions */
  restore(conditions?: any): Promise<any>;
  /** Delete a document by ID */
  deleteById(
    id?: string | Types.ObjectId,
    deleteBy?: string | Types.ObjectId,
  ): Promise<any>;

  // Custom helper methods
  /** Soft delete a document by ID */
  softDelete(id: string, deletedBy?: string): Promise<T | null>;
  /** Restore a soft-deleted document by ID */
  restoreById(id: string): Promise<T | null>;
  /** Permanently delete a document by ID */
  hardDelete(id: string): Promise<T | null>;
  /** Count only deleted documents (alias) */
  countDeleted(conditions?: Record<string, any>): Promise<number>;
  /** Bulk soft delete */
  bulkSoftDelete(conditions: Record<string, any>, deletedBy?: string): Promise<any>;
  /** Bulk restore */
  bulkRestore(conditions: Record<string, any>): Promise<any>;
}

/**
 * Apply mongoose-delete plugin with enhanced configuration
 */
export function softDeletePlugin(
  schema: Schema,
  options: SoftDeletePluginOptions = {},
): void {
  const {
    deletedAt = true,
    deletedBy = true,
    deletedByType = 'User',
    overrideMethods = true,
    indexFields = true,
    validateBeforeDelete = false,
  } = options;

  // Apply mongoose-delete plugin
  schema.plugin(MongooseDelete, {
    deletedAt,
    deletedBy,
    deletedByType: deletedBy ? { type: Schema.Types.ObjectId, ref: deletedByType } : undefined,
    overrideMethods: overrideMethods as boolean | 'all' | OverridableMethods[],
    validateBeforeDelete,
    indexFields,
  });

  // Add custom static methods for convenience
  schema.statics.softDelete = async function (
    id: string,
    deletedBy?: string,
  ): Promise<Document | null> {
    const doc = await this.findById(id);
    if (!doc) return null;
    return doc.delete(deletedBy);
  };

  schema.statics.restoreById = async function (id: string): Promise<Document | null> {
    const doc = await (this as any).findOneDeleted({ _id: id });
    if (!doc) return null;
    return doc.restore();
  };

  schema.statics.hardDelete = async function (id: string): Promise<Document | null> {
    return this.findByIdAndDelete(id);
  };

  schema.statics.countDeleted = async function (
    conditions: Record<string, any> = {},
  ): Promise<number> {
    return (this as any).countDocumentsDeleted(conditions);
  };

  schema.statics.bulkSoftDelete = async function (
    conditions: Record<string, any>,
    deletedBy?: string,
  ): Promise<any> {
    const update: Record<string, any> = {
      deleted: true,
      deletedAt: new Date(),
    };
    if (deletedBy) {
      update.deletedBy = deletedBy;
    }
    return (this as any).updateManyWithDeleted(conditions, update);
  };

  schema.statics.bulkRestore = async function (conditions: Record<string, any>): Promise<any> {
    return (this as any).restore({ ...conditions, deleted: true });
  };

  // Instance method to check if deleted
  schema.methods.isDeleted = function (): boolean {
    return this.deleted === true;
  };

  // Add virtual for backward compatibility
  schema.virtual('isDeletedFlag').get(function () {
    return this.deleted === true;
  });

  // Virtual to check if document can be permanently deleted
  schema.virtual('canHardDelete').get(function () {
    return this.deleted === true;
  });
}

/**
 * Create a soft-deletable schema with all necessary configurations
 */
export function createSoftDeleteSchema<T>(
  definition: Record<string, any>,
  options?: SoftDeletePluginOptions & { timestamps?: boolean },
): Schema<T & SoftDeleteDocument> {
  const { timestamps = true, ...pluginOptions } = options || {};

  const schema = new Schema<T & SoftDeleteDocument>(definition, { timestamps });
  softDeletePlugin(schema, pluginOptions);

  return schema;
}
