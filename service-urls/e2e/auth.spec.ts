import { test as base, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures/test-fixtures';

// Auth tests use the base test (no pre-authenticated state)
const test = base;

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
  // Clear localStorage so every test starts unauthenticated
  await page.addInitScript(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  });
});

// ─── Login Page Rendering ────────────────────────────────────────────────────

test.describe('Login Page', () => {
  test('shows the login form with title and fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('QuckApp Service URLs')).toBeVisible();
    await expect(page.getByText('Sign in to manage service configurations')).toBeVisible();
    await expect(page.getByPlaceholder('+1234567890')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Only admin accounts can access this panel')).toBeVisible();
  });

  test('password field is hidden by default and toggles visibility', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.getByPlaceholder('Enter your password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye icon to show password
    await page.locator('button:has(svg)').filter({ hasText: '' }).first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.locator('button:has(svg)').filter({ hasText: '' }).first().click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

// ─── Login Success ───────────────────────────────────────────────────────────

test.describe('Login Flow - Success', () => {
  test('logs in with valid credentials and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('+1234567890').fill('+1234567890');
    await page.getByPlaceholder('Enter your password').fill('Admin@123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should redirect to the dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Environment Overview')).toBeVisible();
  });

  test('stores tokens in localStorage after login', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('+1234567890').fill('+1234567890');
    await page.getByPlaceholder('Enter your password').fill('Admin@123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/');

    const token = await page.evaluate(() => localStorage.getItem('adminToken'));
    const user = await page.evaluate(() => localStorage.getItem('adminUser'));

    expect(token).toBe('mock-jwt-token-for-testing');
    expect(user).toContain('E2E Admin');
  });
});

// ─── Login Failure ───────────────────────────────────────────────────────────

test.describe('Login Flow - Failure', () => {
  test('shows error message with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('+1234567890').fill('+9999999999');
    await page.getByPlaceholder('Enter your password').fill('WrongPassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('does not store tokens after failed login', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('+1234567890').fill('+0000000000');
    await page.getByPlaceholder('Enter your password').fill('bad');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('adminToken'));
    expect(token).toBeNull();
  });
});

// ─── Auth Guard / Redirects ──────────────────────────────────────────────────

test.describe('Auth Guard', () => {
  test('redirects unauthenticated users from / to /login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/login');
  });

  test('redirects unauthenticated users from /env/local to /login', async ({ page }) => {
    await page.goto('/env/local');

    await expect(page).toHaveURL('/login');
  });

  test('redirects unknown routes to /login when not authenticated', async ({ page }) => {
    await page.goto('/nonexistent');

    await expect(page).toHaveURL('/login');
  });

  test('authenticated user can access dashboard directly', async ({ page }) => {
    // Set up auth before navigating
    await page.addInitScript(() => {
      localStorage.setItem('adminToken', 'mock-jwt-token-for-testing');
      localStorage.setItem(
        'adminUser',
        JSON.stringify({
          id: 'admin-001',
          phoneNumber: '+1234567890',
          displayName: 'E2E Admin',
          role: 'admin',
        })
      );
    });

    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Environment Overview')).toBeVisible();
  });

  test('authenticated user visiting /login is redirected to /', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('adminToken', 'mock-jwt-token-for-testing');
      localStorage.setItem(
        'adminUser',
        JSON.stringify({
          id: 'admin-001',
          phoneNumber: '+1234567890',
          displayName: 'E2E Admin',
          role: 'admin',
        })
      );
    });

    await page.goto('/login');

    await expect(page).toHaveURL('/');
  });
});
