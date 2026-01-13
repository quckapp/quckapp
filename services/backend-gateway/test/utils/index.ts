/**
 * Test Utilities Index
 *
 * This file exports all testing utilities for easy imports:
 *
 * import { mockUser, setupTestDatabase, createTestModule, createMockUser } from 'test/utils';
 */

// Mock data and basic utilities
export * from './test.utils';

// MongoDB Memory Server utilities
export * from './mongodb-memory';

// NestJS Test Module Factory
export * from './test-module.factory';

// Data Factories (faker-based mock data generators)
export * from '../factories';
