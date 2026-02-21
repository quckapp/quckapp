import { test as base, type Page } from '@playwright/test';
import {
  ADMIN_USER,
  LOGIN_RESPONSE,
  ENVIRONMENT_SUMMARIES,
  MOCK_SERVICES,
  MOCK_INFRASTRUCTURE,
  MOCK_SECRETS,
  MOCK_FIREBASE,
} from './mock-data';

// ── API route handler that intercepts all /api calls with mock data ──

async function setupApiMocks(page: Page) {
  // Auth: POST /auth/login
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON();
    if (body.phoneNumber === '+1234567890' && body.password === 'Admin@123') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(LOGIN_RESPONSE),
      });
    } else {
      // Use 400 (not 401) for bad credentials — the axios interceptor
      // treats 401 as "expired token" and does a hard redirect to /login,
      // which prevents the Redux error state from being shown.
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    }
  });

  // Auth: GET /admin/profile
  await page.route('**/api/v1/admin/profile', async (route) => {
    const auth = route.request().headers()['authorization'];
    if (auth === 'Bearer mock-jwt-token-for-testing') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: ADMIN_USER }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    }
  });

  // Summaries: GET /admin/service-urls/summary
  await page.route('**/api/v1/admin/service-urls/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: ENVIRONMENT_SUMMARIES }),
    });
  });

  // Services: GET /admin/service-urls/:env/services
  await page.route('**/api/v1/admin/service-urls/*/services', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_SERVICES }),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'svc-new',
            environment: 'local',
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Services: PUT/DELETE /admin/service-urls/:env/services/:key
  await page.route('**/api/v1/admin/service-urls/*/services/*', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ...MOCK_SERVICES[0], ...body } }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Deleted' }),
      });
    } else {
      await route.continue();
    }
  });

  // Infrastructure: GET/POST /admin/service-urls/:env/infrastructure
  await page.route('**/api/v1/admin/service-urls/*/infrastructure', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_INFRASTRUCTURE }),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'inf-new',
            environment: 'local',
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Infrastructure: PUT/DELETE /admin/service-urls/:env/infrastructure/:key
  await page.route('**/api/v1/admin/service-urls/*/infrastructure/*', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ...MOCK_INFRASTRUCTURE[0], ...body } }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Deleted' }),
      });
    } else {
      await route.continue();
    }
  });

  // Secrets: GET /admin/service-urls/:env/secrets
  await page.route('**/api/v1/admin/service-urls/*/secrets', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_SECRETS }),
      });
    } else if (route.request().method() === 'PUT') {
      // Batch upsert
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: body.secrets || MOCK_SECRETS }),
      });
    } else {
      await route.continue();
    }
  });

  // Secrets: PUT/DELETE /admin/service-urls/:env/secrets/:key
  await page.route('**/api/v1/admin/service-urls/*/secrets/*', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'sec-new',
            environment: 'local',
            ...body,
            valueMasked: '****',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Deleted' }),
      });
    } else {
      await route.continue();
    }
  });

  // Firebase: GET /admin/service-urls/:env/firebase
  await page.route('**/api/v1/admin/service-urls/*/firebase', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_FIREBASE }),
      });
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ...MOCK_FIREBASE, ...body } }),
      });
    } else {
      await route.continue();
    }
  });

  // Export: GET /admin/service-urls/:env/export
  await page.route('**/api/v1/admin/service-urls/*/export', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          services: MOCK_SERVICES,
          infrastructure: MOCK_INFRASTRUCTURE,
          secrets: MOCK_SECRETS,
        },
      }),
    });
  });

  // Import: POST /admin/service-urls/:env/import
  await page.route('**/api/v1/admin/service-urls/*/import', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { imported: 5 } }),
    });
  });

  // Clone: POST /admin/service-urls/clone
  await page.route('**/api/v1/admin/service-urls/clone', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { cloned: true } }),
    });
  });
}

// ── Custom test fixture with authenticated state ──

type TestFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await setupApiMocks(page);

    // Set localStorage tokens to simulate an already-authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('adminToken', 'mock-jwt-token-for-testing');
      localStorage.setItem(
        'adminUser',
        JSON.stringify({
          id: 'admin-001',
          phoneNumber: '+1234567890',
          displayName: 'E2E Admin',
          email: 'admin@test.com',
          role: 'admin',
          avatarUrl: null,
        })
      );
    });

    await use(page);
  },
});

export { setupApiMocks };
export { expect } from '@playwright/test';
