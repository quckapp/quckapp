import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';

/**
 * Test utilities for integration testing with mongodb-memory-server
 */

let mongoServer: MongoMemoryServer;

/**
 * Create a test module with in-memory MongoDB connection
 */
export async function createTestingModule(
  imports: any[] = [],
  providers: any[] = [],
): Promise<{ module: TestingModule; mongoServer: MongoMemoryServer }> {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  const module = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(mongoUri),
      ...imports,
    ],
    providers,
  }).compile();

  return { module, mongoServer };
}

/**
 * Get the MongoDB URI from the memory server
 */
export async function getTestMongoUri(): Promise<string> {
  if (\!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  return mongoServer.getUri();
}

/**
 * Close the test module and MongoDB connection
 */
export async function closeTestModule(
  module: TestingModule,
  server: MongoMemoryServer,
): Promise<void> {
  const connection = module.get<Connection>('DatabaseConnection');
  if (connection) {
    await connection.close();
  }
  await module.close();
  if (server) {
    await server.stop();
  }
}

/**
 * Clear all collections in the database
 */
export async function clearDatabase(module: TestingModule): Promise<void> {
  const connection = module.get<Connection>('DatabaseConnection');
  const collections = connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export { mongoServer };
