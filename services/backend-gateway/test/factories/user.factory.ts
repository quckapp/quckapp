import { faker } from '@faker-js/faker';

/**
 * User Factory
 * Generates realistic mock user data for testing
 */

export interface MockUserData {
  phoneNumber: string;
  username: string;
  email: string;
  displayName: string;
  password: string;
  avatar?: string;
  bio?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  role?: 'user' | 'admin' | 'moderator' | 'super_admin';
  isActive?: boolean;
  isVerified?: boolean;
  isBanned?: boolean;
}

/**
 * Generate a random phone number in E.164 format
 */
export function generatePhoneNumber(): string {
  const countryCode = faker.helpers.arrayElement(['+1', '+44', '+91', '+61', '+49', '+33']);
  const number = faker.string.numeric(10);
  return `${countryCode}${number}`;
}

/**
 * Generate a single mock user
 */
export function createMockUser(overrides: Partial<MockUserData> = {}): MockUserData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    phoneNumber: generatePhoneNumber(),
    username: faker.internet.username({ firstName, lastName }).toLowerCase(),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    displayName: `${firstName} ${lastName}`,
    password: faker.internet.password({ length: 12, memorable: false, pattern: /[A-Za-z0-9@#$%]/ }),
    avatar: faker.image.avatar(),
    bio: faker.person.bio(),
    status: faker.helpers.arrayElement(['online', 'offline', 'away', 'busy']),
    role: 'user',
    isActive: true,
    isVerified: faker.datatype.boolean(),
    isBanned: false,
    ...overrides,
  };
}

/**
 * Generate multiple mock users
 */
export function createMockUsers(count: number, overrides: Partial<MockUserData> = {}): MockUserData[] {
  return Array.from({ length: count }, () => createMockUser(overrides));
}

/**
 * Generate a mock admin user
 */
export function createMockAdmin(overrides: Partial<MockUserData> = {}): MockUserData {
  return createMockUser({
    role: 'admin',
    isVerified: true,
    isActive: true,
    ...overrides,
  });
}

/**
 * Generate a mock moderator user
 */
export function createMockModerator(overrides: Partial<MockUserData> = {}): MockUserData {
  return createMockUser({
    role: 'moderator',
    isVerified: true,
    isActive: true,
    ...overrides,
  });
}

/**
 * Generate a mock banned user
 */
export function createMockBannedUser(overrides: Partial<MockUserData> = {}): MockUserData {
  return createMockUser({
    isBanned: true,
    isActive: false,
    ...overrides,
  });
}

/**
 * Generate mock user for registration test
 */
export function createRegistrationPayload(): Pick<MockUserData, 'phoneNumber' | 'username' | 'email' | 'displayName' | 'password'> {
  const user = createMockUser();
  return {
    phoneNumber: user.phoneNumber,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    password: 'Test@123456', // Use a valid password that passes validation
  };
}

/**
 * Generate mock login credentials
 */
export function createLoginPayload(phoneNumber?: string, password?: string): { phoneNumber: string; password: string } {
  return {
    phoneNumber: phoneNumber || generatePhoneNumber(),
    password: password || 'Test@123456',
  };
}
