import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * MongoDB Memory Server utility for testing
 * Provides isolated, fast in-memory MongoDB instances for tests
 */

let mongoServer: MongoMemoryServer | null = null;

/**
 * Start an in-memory MongoDB instance
 * @returns The MongoDB connection URI
 */
export async function startMongoMemoryServer(): Promise<string> {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'quickchat-test',
    },
    binary: {
      // Use a specific MongoDB version for consistency
      version: '6.0.12',
    },
  });

  const uri = mongoServer.getUri();
  console.log(`[Test] MongoDB Memory Server started at: ${uri}`);
  return uri;
}

/**
 * Stop the in-memory MongoDB instance
 */
export async function stopMongoMemoryServer(): Promise<void> {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
    console.log('[Test] MongoDB Memory Server stopped');
  }
}

/**
 * Connect mongoose to the in-memory MongoDB
 * @param uri - MongoDB connection URI
 */
export async function connectToMemoryMongo(uri?: string): Promise<void> {
  const connectionUri = uri || (mongoServer ? mongoServer.getUri() : null);

  if (!connectionUri) {
    throw new Error('MongoDB Memory Server not started. Call startMongoMemoryServer() first.');
  }

  await mongoose.connect(connectionUri);
  console.log('[Test] Mongoose connected to in-memory MongoDB');
}

/**
 * Disconnect mongoose from MongoDB
 */
export async function disconnectFromMongo(): Promise<void> {
  await mongoose.disconnect();
  console.log('[Test] Mongoose disconnected');
}

/**
 * Clear all collections in the database
 * Useful for cleaning up between tests
 */
export async function clearDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    console.warn('[Test] Database not connected, skipping clear');
    return;
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }

  console.log('[Test] All collections cleared');
}

/**
 * Drop the entire database
 * Use with caution - drops all collections
 */
export async function dropDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    console.warn('[Test] Database not connected, skipping drop');
    return;
  }

  await mongoose.connection.dropDatabase();
  console.log('[Test] Database dropped');
}

/**
 * Get the current MongoDB URI
 */
export function getMongoUri(): string | null {
  return mongoServer?.getUri() || null;
}

/**
 * Check if the memory server is running
 */
export function isServerRunning(): boolean {
  return mongoServer !== null;
}

/**
 * Seed the database with test data
 * @param seedData - Object containing model names and their seed documents
 */
export async function seedDatabase(
  seedData: Record<string, any[]>,
): Promise<Record<string, any[]>> {
  const results: Record<string, any[]> = {};

  for (const [modelName, documents] of Object.entries(seedData)) {
    const Model = mongoose.model(modelName);
    const created = await Model.insertMany(documents);
    results[modelName] = created;
    console.log(`[Test] Seeded ${documents.length} ${modelName} documents`);
  }

  return results;
}

/**
 * Create a test database context
 * Automatically handles setup and teardown
 */
export function createTestDatabaseContext() {
  let uri: string;

  return {
    async setup(): Promise<string> {
      uri = await startMongoMemoryServer();
      await connectToMemoryMongo(uri);
      return uri;
    },

    async teardown(): Promise<void> {
      await disconnectFromMongo();
      await stopMongoMemoryServer();
    },

    async reset(): Promise<void> {
      await clearDatabase();
    },

    getUri(): string {
      return uri;
    },
  };
}

/**
 * Jest helper: Setup hooks for a test suite
 * Usage: setupTestDatabase() at the top of your test file
 */
export function setupTestDatabase() {
  const context = createTestDatabaseContext();

  beforeAll(async () => {
    await context.setup();
  });

  afterAll(async () => {
    await context.teardown();
  });

  afterEach(async () => {
    await context.reset();
  });

  return context;
}
