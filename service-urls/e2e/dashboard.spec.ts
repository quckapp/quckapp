import { test, expect } from './fixtures/test-fixtures';

// All dashboard tests use the authenticatedPage fixture (pre-logged in)

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByText('Environment Overview')).toBeVisible();
  });

  // ─── Layout ──────────────────────────────────────────────────────────────

  test('renders the page header with title', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Environment Overview')).toBeVisible();
  });

  test('shows all 8 environment cards', async ({ authenticatedPage: page }) => {
    const envNames = [
      'Local',
      'Development',
      'QA',
      'UAT 1',
      'UAT 2',
      'UAT 3',
      'Staging',
      'Production',
    ];

    for (const name of envNames) {
      await expect(page.getByRole('button', { name: new RegExp(name, 'i') })).toBeVisible();
    }
  });

  // ─── Environment Summary Data ────────────────────────────────────────────

  test('shows service and infra counts from summaries', async ({ authenticatedPage: page }) => {
    // Local has 5 services, 3 infra
    await expect(page.getByText('5 services')).toBeVisible();
    await expect(page.getByText('3 infra')).toBeVisible();

    // Development has 12 services, 6 infra
    await expect(page.getByText('12 services')).toBeVisible();
    await expect(page.getByText('6 infra')).toBeVisible();
  });

  test('shows Firebase badge for environments that have it', async ({ authenticatedPage: page }) => {
    // Development and staging and production have Firebase
    const firebaseBadges = page.getByText('Firebase');
    const count = await firebaseBadges.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('shows Prod badge for production environment', async ({ authenticatedPage: page }) => {
    // The Prod badge is a span inside the Production card — use locator with CSS
    const prodBadge = page.locator('button:has-text("Production") span:has-text("Prod")').first();
    await expect(prodBadge).toBeVisible();
  });

  test('shows "No data configured" for empty environments', async ({ authenticatedPage: page }) => {
    // QA has 0 services, 0 infra and no data in summaries for uat1-3
    const noDataTexts = page.getByText('No data configured');
    const count = await noDataTexts.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ─── Navigation ──────────────────────────────────────────────────────────

  test('clicking Local card navigates to /env/local', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: /Local/i }).click();
    await expect(page).toHaveURL('/env/local');
  });

  test('clicking Development card navigates to /env/development', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: /Development/i }).click();
    await expect(page).toHaveURL('/env/development');
  });

  test('clicking Production card navigates to /env/production', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: /Production/i }).click();
    await expect(page).toHaveURL('/env/production');
  });
});
