import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Type,
} from '@nestjs/common';
import { z, ZodError, ZodType } from 'zod';

/**
 * Zod Validation Pipe for NestJS
 *
 * Provides runtime validation using Zod schemas.
 * Use this as an alternative to class-validator when you need:
 * - Type inference from schemas
 * - More complex validation rules
 * - Better TypeScript integration
 * - Smaller bundle size
 *
 * Usage:
 * @Post()
 * @UsePipes(new ZodValidationPipe(CreateUserSchema))
 * create(@Body() createUserDto: CreateUserDto) { ... }
 *
 * Or globally:
 * app.useGlobalPipes(new ZodValidationPipe());
 */

/**
 * Zod schema type alias
 */
export type ZodSchemaType = ZodType<any, any, any>;

/**
 * Custom error formatter for Zod validation errors
 */
export interface ZodValidationError {
  field: string;
  message: string;
  code: string;
  path: (string | number | symbol)[];
}

/**
 * Format Zod errors into a consistent structure
 */
export function formatZodErrors(error: ZodError): ZodValidationError[] {
  return error.issues.map((err) => ({
    field: String(err.path.join('.')) || 'root',
    message: err.message,
    code: err.code,
    path: err.path as (string | number | symbol)[],
  }));
}

/**
 * Metadata key for storing Zod schema on DTOs
 */
export const ZOD_SCHEMA_KEY = 'zod:schema';

/**
 * Decorator to attach Zod schema to a class
 */
export function ZodSchemaDecorator<T extends ZodType>(schema: T) {
  return function (target: Type<z.infer<T>>) {
    Reflect.defineMetadata(ZOD_SCHEMA_KEY, schema, target);
    return target;
  };
}

/**
 * Get Zod schema from class metadata
 */
export function getZodSchema<T>(target: Type<T>): ZodSchemaType | undefined {
  return Reflect.getMetadata(ZOD_SCHEMA_KEY, target);
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private schema?: ZodSchemaType;
  private options: ZodValidationPipeOptions;

  constructor(schemaOrOptions?: ZodSchemaType | ZodValidationPipeOptions) {
    if (schemaOrOptions && 'parse' in schemaOrOptions) {
      this.schema = schemaOrOptions as ZodSchemaType;
      this.options = {};
    } else {
      this.options = (schemaOrOptions as ZodValidationPipeOptions) || {};
    }
  }

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Skip validation for certain types
    if (this.shouldSkipValidation(metadata)) {
      return value;
    }

    // Get schema from constructor, decorator, or metadata
    const schema = this.getSchemaForMetadata(metadata);

    if (!schema) {
      // No schema found, return value as-is
      return value;
    }

    try {
      // Parse and validate
      const parsed = schema.parse(value);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        this.throwValidationError(error, metadata);
      }
      throw error;
    }
  }

  private shouldSkipValidation(metadata: ArgumentMetadata): boolean {
    // Skip for primitive types
    const primitiveTypes = [String, Number, Boolean, Array, Object];
    if (primitiveTypes.includes(metadata.metatype as any)) {
      return true;
    }

    // Skip custom params unless explicitly handled
    if (metadata.type === 'custom' && !this.options.validateCustom) {
      return true;
    }

    return false;
  }

  private getSchemaForMetadata(metadata: ArgumentMetadata): ZodSchemaType | undefined {
    // Use schema provided in constructor
    if (this.schema) {
      return this.schema;
    }

    // Try to get schema from class decorator
    if (metadata.metatype) {
      const decoratorSchema = getZodSchema(metadata.metatype);
      if (decoratorSchema) {
        return decoratorSchema;
      }
    }

    return undefined;
  }

  private throwValidationError(error: ZodError<any>, metadata: ArgumentMetadata): never {
    const errors = formatZodErrors(error);
    const errorMessages = errors.map((e) => `${e.field}: ${e.message}`).join('; ');

    throw new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      details: errors,
      summary: errorMessages,
      type: metadata.type,
    });
  }
}

/**
 * Options for ZodValidationPipe
 */
export interface ZodValidationPipeOptions {
  /** Validate custom parameter types */
  validateCustom?: boolean;
  /** Transform values after validation */
  transform?: boolean;
  /** Strip unknown keys */
  stripUnknown?: boolean;
}

/**
 * Create a typed validation pipe for a specific schema
 */
export function createZodValidationPipe<T extends ZodSchemaType>(
  schema: T,
): ZodValidationPipe {
  return new ZodValidationPipe(schema);
}

/**
 * Common Zod schemas for reuse
 */
export const CommonSchemas = {
  /**
   * MongoDB ObjectId validation
   */
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),

  /**
   * UUID v4 validation
   */
  uuid: z.string().uuid('Invalid UUID format'),

  /**
   * Email validation
   */
  email: z.string().email('Invalid email format').toLowerCase().trim(),

  /**
   * Password validation (min 8 chars, requires uppercase, lowercase, number)
   */
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),

  /**
   * Strong password (adds special character requirement)
   */
  strongPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),

  /**
   * Phone number (E.164 format)
   */
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)'),

  /**
   * URL validation
   */
  url: z.string().url('Invalid URL format'),

  /**
   * Pagination query params
   */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),

  /**
   * Date string validation (ISO 8601)
   */
  dateString: z.string().datetime({ message: 'Invalid date format (ISO 8601)' }),

  /**
   * Latitude
   */
  latitude: z.coerce.number().min(-90).max(90),

  /**
   * Longitude
   */
  longitude: z.coerce.number().min(-180).max(180),

  /**
   * GeoJSON Point coordinates
   */
  coordinates: z.tuple([
    z.coerce.number().min(-180).max(180), // longitude
    z.coerce.number().min(-90).max(90), // latitude
  ]),

  /**
   * Username validation
   */
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),

  /**
   * Slug validation
   */
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),

  /**
   * Hex color
   */
  hexColor: z.string().regex(/^#[\dA-Fa-f]{6}$/, 'Invalid hex color format'),

  /**
   * IP address (v4 or v6) - using regex for broader compatibility
   */
  ipv4: z.string().regex(
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    'Invalid IPv4 address',
  ),

  /**
   * File size validation (in bytes)
   */
  fileSize: (maxBytes: number) =>
    z.coerce.number().max(maxBytes, `File size must not exceed ${maxBytes} bytes`),

  /**
   * MIME type validation
   */
  mimeType: (allowedTypes: string[]) =>
    z.string().refine(
      (val) => allowedTypes.includes(val),
      { message: `MIME type must be one of: ${allowedTypes.join(', ')}` },
    ),
};

/**
 * Helper to create a schema with ID param
 */
export function withIdParam<T extends ZodSchemaType>(schema: T) {
  return z.object({
    params: z.object({
      id: CommonSchemas.objectId,
    }),
    body: schema,
  });
}

/**
 * Helper to make all properties optional (for PATCH requests)
 */
export function toPartial<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial();
}

/**
 * Type helper to infer schema type
 */
export type InferSchema<T extends ZodSchemaType> = z.infer<T>;
