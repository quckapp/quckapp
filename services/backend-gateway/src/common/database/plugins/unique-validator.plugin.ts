import { Schema, Model, Document } from 'mongoose';

/**
 * Unique Validator Plugin
 * Provides better error messages for unique constraint violations
 * Compatible with Mongoose 8.x
 */

export interface UniqueValidatorOptions {
  message?: string;
  type?: string;
}

export function uniqueValidatorPlugin(
  schema: Schema,
  options: UniqueValidatorOptions = {},
): void {
  const {
    message = '{PATH} must be unique. Value "{VALUE}" already exists.',
    type = 'unique',
  } = options;

  // Find all unique paths in the schema
  const uniquePaths: string[] = [];

  schema.eachPath((path, schemaType) => {
    if (schemaType.options && schemaType.options.unique) {
      uniquePaths.push(path);
    }
  });

  // Also check compound indexes
  const indexes = schema.indexes();
  indexes.forEach(([fields, indexOptions]) => {
    if (indexOptions && indexOptions.unique) {
      Object.keys(fields).forEach((field) => {
        if (!uniquePaths.includes(field)) {
          uniquePaths.push(field);
        }
      });
    }
  });

  if (uniquePaths.length === 0) {
    return; // No unique fields to validate
  }

  // Pre-save validation
  schema.pre('save', async function (next) {
    if (!this.isNew && !this.isModified()) {
      return next();
    }

    const model = this.constructor as Model<Document>;
    const errors: any[] = [];

    for (const path of uniquePaths) {
      // Only check if the field is new or modified
      if (this.isNew || this.isModified(path)) {
        const value = this.get(path);

        if (value !== undefined && value !== null && value !== '') {
          const query: Record<string, any> = { [path]: value };

          // Exclude current document when updating
          if (!this.isNew && this._id) {
            query._id = { $ne: this._id };
          }

          const exists = await model.findOne(query).lean();

          if (exists) {
            errors.push({
              path,
              value,
              message: message.replace('{PATH}', path).replace('{VALUE}', String(value)),
              type,
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed') as any;
      error.name = 'ValidationError';
      error.errors = {};

      errors.forEach((err) => {
        error.errors[err.path] = {
          message: err.message,
          type: err.type,
          path: err.path,
          value: err.value,
        };
      });

      return next(error);
    }

    next();
  });

  // Pre-update validation for findOneAndUpdate
  schema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate() as Record<string, any>;
    if (!update) return next();

    const model = this.model;
    const filter = this.getFilter();
    const errors: any[] = [];

    // Get the values being updated
    const updateValues: Record<string, any> = {};

    // Handle $set operator
    if (update.$set) {
      Object.assign(updateValues, update.$set);
    }

    // Handle direct field updates
    uniquePaths.forEach((path) => {
      if (update[path] !== undefined) {
        updateValues[path] = update[path];
      }
    });

    for (const path of uniquePaths) {
      const value = updateValues[path];

      if (value !== undefined && value !== null && value !== '') {
        const query: Record<string, any> = { [path]: value };

        // Exclude current document
        if (filter._id) {
          query._id = { $ne: filter._id };
        }

        const exists = await model.findOne(query).lean();

        if (exists) {
          errors.push({
            path,
            value,
            message: message.replace('{PATH}', path).replace('{VALUE}', String(value)),
            type,
          });
        }
      }
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed') as any;
      error.name = 'ValidationError';
      error.errors = {};

      errors.forEach((err) => {
        error.errors[err.path] = {
          message: err.message,
          type: err.type,
          path: err.path,
          value: err.value,
        };
      });

      return next(error);
    }

    next();
  });
}

/**
 * Helper to format unique validation errors
 */
export function formatUniqueError(error: any): string {
  if (error.name !== 'ValidationError' || !error.errors) {
    return error.message;
  }

  const messages = Object.values(error.errors).map((err: any) => err.message);
  return messages.join(', ');
}
