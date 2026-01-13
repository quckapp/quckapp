import { Schema } from 'mongoose';
import { ConfigService } from '@nestjs/config';

/**
 * Field Encryption Configuration for Mongoose
 *
 * Uses mongoose-field-encryption for encrypting sensitive fields
 * in MongoDB documents at the field level.
 *
 * Encryption is AES-256-CBC by default.
 */

const mongooseFieldEncryption = require('mongoose-field-encryption').fieldEncryption;

export interface FieldEncryptionOptions {
  /** Fields to encrypt (field names) */
  fields: string[];
  /** 32-character encryption secret (will use env ENCRYPTION_KEY if not provided) */
  secret?: string;
  /** Salt for encryption */
  saltGenerator?: () => string;
  /** Exclude fields from encryption */
  excludeFromEncryption?: string[];
}

/**
 * Apply field-level encryption to a schema
 *
 * @param schema - The Mongoose schema
 * @param options - Encryption options
 *
 * @example
 * const UserSchema = new Schema({
 *   email: String,
 *   ssn: String,        // Will be encrypted
 *   creditCard: String, // Will be encrypted
 * });
 *
 * applyFieldEncryption(UserSchema, {
 *   fields: ['ssn', 'creditCard'],
 * });
 *
 * // The ssn and creditCard fields will be stored encrypted in MongoDB
 * // but will be automatically decrypted when read
 */
export function applyFieldEncryption(
  schema: Schema,
  options: FieldEncryptionOptions,
): void {
  const secret = options.secret || process.env.ENCRYPTION_KEY;

  if (!secret || secret.length < 32) {
    console.warn(
      '[FieldEncryption] Warning: ENCRYPTION_KEY must be at least 32 characters. ' +
      'Field encryption is disabled.',
    );
    return;
  }

  schema.plugin(mongooseFieldEncryption, {
    fields: options.fields,
    secret: secret.substring(0, 32), // Use first 32 chars
    saltGenerator: options.saltGenerator || (() => secret.substring(0, 16)),
    excludeFromEncryption: options.excludeFromEncryption,
  });
}

/**
 * Create a configured field encryption plugin factory
 * Useful when you want to apply the same encryption config to multiple schemas
 *
 * @example
 * const encryptPlugin = createFieldEncryptionPlugin(['ssn', 'creditCard']);
 *
 * UserSchema.plugin(encryptPlugin);
 * PaymentSchema.plugin(encryptPlugin);
 */
export function createFieldEncryptionPlugin(
  fields: string[],
  customSecret?: string,
) {
  return function (schema: Schema) {
    applyFieldEncryption(schema, {
      fields,
      secret: customSecret,
    });
  };
}

/**
 * Decorator for marking fields that should be encrypted
 * (For documentation purposes - actual encryption is applied via plugin)
 */
export function Encrypted(): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    // This is a marker decorator for documentation
    // Actual encryption is handled by the mongoose plugin
    const encryptedFields = Reflect.getMetadata('encrypted:fields', target) || [];
    encryptedFields.push(propertyKey);
    Reflect.defineMetadata('encrypted:fields', encryptedFields, target);
  };
}

/**
 * Get encrypted field names from a class decorated with @Encrypted()
 */
export function getEncryptedFields(target: any): string[] {
  return Reflect.getMetadata('encrypted:fields', target.prototype) || [];
}

/**
 * Encryption service for manual encryption/decryption
 */
export class EncryptionService {
  private readonly crypto = require('crypto');
  private readonly algorithm = 'aes-256-cbc';
  private readonly secret: string;

  constructor(configService?: ConfigService) {
    this.secret = configService?.get('ENCRYPTION_KEY') || process.env.ENCRYPTION_KEY || '';

    if (this.secret.length < 32) {
      console.warn('[EncryptionService] ENCRYPTION_KEY should be at least 32 characters');
    }
  }

  /**
   * Encrypt a string value
   */
  encrypt(text: string): string {
    if (!this.secret || this.secret.length < 32) {
      return text; // Return unencrypted if no key
    }

    const iv = this.crypto.randomBytes(16);
    const key = Buffer.from(this.secret.substring(0, 32));
    const cipher = this.crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt an encrypted string
   */
  decrypt(encryptedText: string): string {
    if (!this.secret || this.secret.length < 32) {
      return encryptedText; // Return as-is if no key
    }

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        return encryptedText; // Not encrypted
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = Buffer.from(this.secret.substring(0, 32));
      const decipher = this.crypto.createDecipheriv(this.algorithm, key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return encryptedText; // Return original if decryption fails
    }
  }

  /**
   * Hash a value (one-way, for comparison)
   */
  hash(text: string): string {
    return this.crypto
      .createHash('sha256')
      .update(text + this.secret)
      .digest('hex');
  }

  /**
   * Generate a random encryption key
   */
  static generateKey(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }
}
