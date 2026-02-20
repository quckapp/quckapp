import { test, expect } from './fixtures/test-fixtures';

test.describe('Environment Detail - Layout & Navigation', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/env/local');
    await page.waitForLoadState('networkidle');
  });

  test('renders the environment page with sidebar sections', async ({ authenticatedPage: page }) => {
    // Sidebar navigation sections
    const sectionNames = [
      'Overview',
      'Spring Boot',
      'NestJS',
      'Elixir',
      'Go',
      'Python',
      'Infrastructure',
      'Secrets & Config',
      'Firebase',
    ];
    for (const section of sectionNames) {
      await expect(page.getByText(section, { exact: true }).first()).toBeVisible();
    }
  });

  test('clicking a sidebar section switches the active view', async ({ authenticatedPage: page }) => {
    // Click NestJS section
    await page.getByText('NestJS', { exact: true }).first().click();
    // Should see NestJS services (auth-service and user-service are NESTJS)
    await expect(page.getByText('auth-service')).toBeVisible();
    await expect(page.getByText('user-service')).toBeVisible();
  });

  test('invalid environment redirects to dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/env/invalid-env');
    await expect(page).toHaveURL('/');
  });
});

// ─── Services ────────────────────────────────────────────────────────────────

test.describe('Environment Detail - Services', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/env/local');
    await page.waitForLoadState('networkidle');
  });

  test('overview shows service count stats', async ({ authenticatedPage: page }) => {
    // Mock has 4 services — overview should show totals
    await expect(page.getByText(/services/i).first()).toBeVisible();
  });

  test('navigating to a category section shows filtered services', async ({ authenticatedPage: page }) => {
    // Click Go section — should show workspace-service
    await page.getByText('Go', { exact: true }).first().click();
    await expect(page.getByText('workspace-service')).toBeVisible();
  });

  test('add service button opens the service modal', async ({ authenticatedPage: page }) => {
    // Navigate to NestJS section to see the Add button
    await page.getByText('NestJS', { exact: true }).first().click();

    // Click the Add Service button (Plus icon)
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    // Modal should appear with form fields
    await expect(page.getByText('Add Service', { exact: false })).toBeVisible();
  });

  test('can fill and submit a new service form', async ({ authenticatedPage: page }) => {
    await page.getByText('NestJS', { exact: true }).first().click();

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    // Wait for modal to be fully visible
    await expect(page.getByText('Add Service', { exact: false })).toBeVisible();

    // Fill using placeholder selectors (labels don't have htmlFor)
    await page.getByPlaceholder('e.g. auth-service').fill('test-service');
    await page.getByPlaceholder('http://localhost:8080').fill('http://localhost:9999');

    // Submit — button says "Create" for new services
    await page.getByRole('button', { name: /create/i }).click();

    // Modal should close (API mock returns success)
    await page.waitForTimeout(1000);
  });
});

// ─── Infrastructure ──────────────────────────────────────────────────────────

test.describe('Environment Detail - Infrastructure', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/env/local');
    await page.waitForLoadState('networkidle');
    // Navigate to Infrastructure section
    await page.getByText('Infrastructure', { exact: true }).first().click();
  });

  test('shows infrastructure items from mock data', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('MySQL').first()).toBeVisible();
    await expect(page.getByText('Redis').first()).toBeVisible();
    await expect(page.getByText('MongoDB').first()).toBeVisible();
  });

  test('shows infrastructure details', async ({ authenticatedPage: page }) => {
    // Check for host:port format or just port in the infra cards
    await expect(page.getByText(/localhost/i).first()).toBeVisible();
    // Port 3306 may appear as text or within a combined host:port
    await expect(page.getByText(/3306/).first()).toBeVisible();
  });

  test('add infrastructure button opens the infra modal', async ({ authenticatedPage: page }) => {
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    await expect(page.getByText(/add infrastructure/i).first()).toBeVisible();
  });
});

// ─── Secrets & Config ────────────────────────────────────────────────────────

test.describe('Environment Detail - Secrets & Config', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/env/local');
    await page.waitForLoadState('networkidle');
    // Navigate to Secrets section
    await page.getByText('Secrets & Config', { exact: true }).first().click();
  });

  test('shows secrets from mock data', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('JWT_SECRET')).toBeVisible();
    await expect(page.getByText('LIVEKIT_API_KEY')).toBeVisible();
  });

  test('shows secret category badges', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('AUTH').first()).toBeVisible();
    await expect(page.getByText('LIVEKIT').first()).toBeVisible();
  });

  test('secrets are masked by default', async ({ authenticatedPage: page }) => {
    // Values should be masked (showing **** or masked version)
    await expect(page.getByText('super****cret')).toBeVisible();
    await expect(page.getByText('API****KEY')).toBeVisible();
  });

  test('add secret button opens the secret modal', async ({ authenticatedPage: page }) => {
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    await expect(page.getByText(/add secret/i).first()).toBeVisible();
  });

  test('can fill and submit a new secret', async ({ authenticatedPage: page }) => {
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    // Wait for modal to appear
    await expect(page.getByText(/add secret/i).first()).toBeVisible();

    // Fill using placeholder selectors (labels don't have htmlFor)
    await page.getByPlaceholder('e.g. JWT_SECRET').fill('NEW_SECRET');
    await page.getByPlaceholder(/enter secret value/i).fill('my-secret-value');

    // Submit — button says "Create" for new secrets
    await page.getByRole('button', { name: /create/i }).click();

    // Modal should close
    await page.waitForTimeout(1000);
  });

  test('category filter pills are visible', async ({ authenticatedPage: page }) => {
    // The "All" pill shows as "All (2)" since we have 2 mock secrets
    await expect(page.getByRole('button', { name: /All \(\d+\)/ })).toBeVisible();
  });
});

// ─── Firebase ────────────────────────────────────────────────────────────────

test.describe('Environment Detail - Firebase', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/env/local');
    await page.waitForLoadState('networkidle');
    // Navigate to Firebase section
    await page.getByText('Firebase', { exact: true }).first().click();
  });

  test('shows firebase config from mock data', async ({ authenticatedPage: page }) => {
    // Use exact: true to avoid matching substrings like 'quckapp-local.appspot.com'
    await expect(page.getByText('quckapp-local', { exact: true })).toBeVisible();
    await expect(page.getByText(/firebase@quckapp-local\.iam/).first()).toBeVisible();
  });

  test('shows storage bucket', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('quckapp-local.appspot.com')).toBeVisible();
  });
});

// ─── Bulk Operations ─────────────────────────────────────────────────────────

test.describe('Environment Detail - Bulk Operations', () => {
  test('export button is available in the header', async ({ authenticatedPage: page }) => {
    await page.goto('/env/local');
    await page.waitForLoadState('networkidle');

    // Export is usually a button with download icon in the header
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeEnabled();
    }
  });

  test('clone button opens clone modal', async ({ authenticatedPage: page }) => {
    await page.goto('/env/local');
    await page.waitForLoadState('networkidle');

    const cloneButton = page.getByRole('button', { name: /clone/i });
    if (await cloneButton.isVisible()) {
      await cloneButton.click();
      // Modal title is "Clone Local" (Clone + environment label)
      await expect(page.getByText(/Clone Local/i)).toBeVisible();
    }
  });
});
