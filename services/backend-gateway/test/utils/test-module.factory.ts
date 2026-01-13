import { DynamicModule, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Test Module Factory
 * Creates NestJS testing modules with in-memory MongoDB support
 */

let mongoServer: MongoMemoryServer | null = null;

/**
 * Options for creating a test module
 */
export interface TestModuleOptions {
  imports?: any[];
  providers?: any[];
  controllers?: any[];
  schemas?: { name: string; schema: any }[];
  useRealMongo?: boolean;
  mongoUri?: string;
}

/**
 * Create a testing module with in-memory MongoDB
 */
export async function createTestModule(options: TestModuleOptions): Promise<TestingModule> {
  const { imports = [], providers = [], controllers = [], schemas = [], useRealMongo = false, mongoUri } = options;

  // Start in-memory MongoDB if needed
  let dbUri = mongoUri;
  if (!useRealMongo && !dbUri) {
    mongoServer = await MongoMemoryServer.create();
    dbUri = mongoServer.getUri();
  }

  const moduleImports: any[] = [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    JwtModule.register({
      secret: 'test-jwt-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ];

  // Add MongoDB module if URI is available
  if (dbUri) {
    moduleImports.push(
      MongooseModule.forRoot(dbUri, {
        // Options for test database
      }),
    );
  }

  // Add schema registrations
  if (schemas.length > 0) {
    moduleImports.push(
      MongooseModule.forFeature(
        schemas.map((s) => ({ name: s.name, schema: s.schema })),
      ),
    );
  }

  // Add user-provided imports
  moduleImports.push(...imports);

  const moduleBuilder = Test.createTestingModule({
    imports: moduleImports,
    providers: [
      ...providers,
      // Mock ConfigService with test values
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string, defaultValue?: any) => {
            const config: Record<string, any> = {
              JWT_SECRET: 'test-jwt-secret',
              JWT_EXPIRES_IN: '1h',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
              JWT_REFRESH_EXPIRES_IN: '7d',
              NODE_ENV: 'test',
              ENCRYPTION_KEY: 'test-encryption-key-32-characters',
            };
            return config[key] ?? defaultValue;
          }),
          getOrThrow: jest.fn((key: string) => {
            const config: Record<string, any> = {
              JWT_SECRET: 'test-jwt-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
            };
            if (!(key in config)) {
              throw new Error(`Config key ${key} not found`);
            }
            return config[key];
          }),
        },
      },
    ],
    controllers,
  });

  return moduleBuilder.compile();
}

/**
 * Close the test module and cleanup resources
 */
export async function closeTestModule(module: TestingModule): Promise<void> {
  await module.close();

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Create a minimal test module for unit tests (no database)
 */
export async function createUnitTestModule(options: {
  providers?: any[];
  controllers?: any[];
}): Promise<TestingModule> {
  const { providers = [], controllers = [] } = options;

  return Test.createTestingModule({
    providers: [
      ...providers,
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          getOrThrow: jest.fn((key: string) => 'test-value'),
        },
      },
    ],
    controllers,
  }).compile();
}

/**
 * Get the current MongoDB URI (for debugging)
 */
export function getTestMongoUri(): string | null {
  return mongoServer?.getUri() || null;
}

/**
 * Create a test context helper
 * Manages module lifecycle automatically
 */
export function createTestContext(options: TestModuleOptions) {
  let module: TestingModule;

  return {
    async init(): Promise<TestingModule> {
      module = await createTestModule(options);
      return module;
    },

    async destroy(): Promise<void> {
      if (module) {
        await closeTestModule(module);
      }
    },

    getModule(): TestingModule {
      return module;
    },

    get<T>(typeOrToken: Type<T> | string | symbol): T {
      return module.get<T>(typeOrToken);
    },
  };
}

/**
 * Integration test helper with automatic setup/teardown
 */
export function setupIntegrationTest(options: TestModuleOptions) {
  const context = createTestContext(options);

  beforeAll(async () => {
    await context.init();
  });

  afterAll(async () => {
    await context.destroy();
  });

  return context;
}
