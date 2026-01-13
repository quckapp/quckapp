import { config } from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load test environment variables
config({ path: '.env.test' });

// Increase timeout for E2E tests (in-memory MongoDB startup can take time)
jest.setTimeout(60000);

let mongoServer: MongoMemoryServer;

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';

  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
});

afterAll(async () => {
  // Stop MongoDB Memory Server
  if (mongoServer) {
    await mongoServer.stop();
  }
  // Give time for async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for use in individual test files
export { mongoServer };
