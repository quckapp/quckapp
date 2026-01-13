/**
 * Repository Pattern Interface
 * Design Pattern: Repository Pattern for data access abstraction
 * SOLID Principles:
 * - Interface Segregation: Clients only depend on methods they use
 * - Dependency Inversion: Depend on abstraction, not implementation
 */

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

export interface ISearchableRepository<T> extends IRepository<T> {
  search(query: string, limit?: number): Promise<T[]>;
  searchByField(field: string, value: any): Promise<T[]>;
}

export interface ICacheableRepository<T> extends IRepository<T> {
  findByIdCached(id: string, ttl?: number): Promise<T | null>;
  clearCache(id?: string): Promise<void>;
}
