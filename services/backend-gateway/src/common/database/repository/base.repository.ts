import {
  Document,
  Model,
  FilterQuery,
  UpdateQuery,
  QueryOptions,
  PipelineStage,
  PopulateOptions,
} from 'mongoose';

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  select?: string | string[];
  populate?: string | PopulateOptions | PopulateOptions[];
}

/**
 * Paginated result structure
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Base Repository Interface
 * Defines the contract for all repositories
 */
export interface IBaseRepository<T extends Document> {
  // Create
  create(data: Partial<T>): Promise<T>;
  createMany(data: Partial<T>[]): Promise<T[]>;

  // Read
  findById(id: string, options?: QueryOptions): Promise<T | null>;
  findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null>;
  findAll(filter?: FilterQuery<T>, options?: QueryOptions): Promise<T[]>;
  findWithPagination(
    filter: FilterQuery<T>,
    options: PaginationOptions,
  ): Promise<PaginatedResult<T>>;

  // Update
  updateById(id: string, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null>;
  updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions,
  ): Promise<T | null>;
  updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
  ): Promise<{ modifiedCount: number }>;

  // Delete
  deleteById(id: string): Promise<T | null>;
  deleteOne(filter: FilterQuery<T>): Promise<T | null>;
  deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount: number }>;

  // Utilities
  count(filter?: FilterQuery<T>): Promise<number>;
  exists(filter: FilterQuery<T>): Promise<boolean>;
  aggregate<R = unknown>(pipeline: PipelineStage[]): Promise<R[]>;
}

/**
 * Base Repository Implementation
 * Provides common CRUD operations for all MongoDB collections
 */
export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    const document = new this.model(data);
    return document.save();
  }

  /**
   * Create multiple documents
   */
  async createMany(data: Partial<T>[]): Promise<T[]> {
    return this.model.insertMany(data) as unknown as Promise<T[]>;
  }

  /**
   * Find document by ID
   */
  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    let query = this.model.findById(id);

    if (options?.populate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.populate(options.populate as any);
    }
    if (options?.projection) {
      query = query.select(options.projection);
    }

    return query.exec();
  }

  /**
   * Find single document by filter
   */
  async findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null> {
    let query = this.model.findOne(filter);

    if (options?.populate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.populate(options.populate as any);
    }
    if (options?.projection) {
      query = query.select(options.projection);
    }
    if (options?.sort) {
      query = query.sort(options.sort);
    }

    return query.exec();
  }

  /**
   * Find all documents matching filter
   */
  async findAll(filter: FilterQuery<T> = {}, options?: QueryOptions): Promise<T[]> {
    let query = this.model.find(filter);

    if (options?.populate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.populate(options.populate as any);
    }
    if (options?.projection) {
      query = query.select(options.projection);
    }
    if (options?.sort) {
      query = query.sort(options.sort);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.skip) {
      query = query.skip(options.skip);
    }

    return query.exec();
  }

  /**
   * Find documents with pagination
   */
  async findWithPagination(
    filter: FilterQuery<T>,
    options: PaginationOptions,
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 10, sort, select, populate } = options;

    const skip = (page - 1) * limit;

    let query = this.model.find(filter);

    if (populate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.populate(populate as any);
    }
    if (select) {
      query = query.select(select);
    }
    if (sort) {
      query = query.sort(sort);
    }

    const [data, total] = await Promise.all([
      query.skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Update document by ID
   */
  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options: QueryOptions = { new: true },
  ): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, options).exec();
  }

  /**
   * Update single document by filter
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: QueryOptions = { new: true },
  ): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, update, options).exec();
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
  ): Promise<{ modifiedCount: number }> {
    const result = await this.model.updateMany(filter, update).exec();
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  /**
   * Delete single document by filter
   */
  async deleteOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOneAndDelete(filter).exec();
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount: number }> {
    const result = await this.model.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount };
  }

  /**
   * Count documents matching filter
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Check if document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.exists(filter);
    return result !== null;
  }

  /**
   * Run aggregation pipeline
   */
  async aggregate<R = unknown>(pipeline: PipelineStage[]): Promise<R[]> {
    return this.model.aggregate(pipeline).exec();
  }

  /**
   * Get the underlying Mongoose model
   * Use sparingly - prefer repository methods
   */
  getModel(): Model<T> {
    return this.model;
  }

  /**
   * Start a new transaction-safe session
   */
  async withTransaction<R>(
    fn: (session: unknown) => Promise<R>,
  ): Promise<R> {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
