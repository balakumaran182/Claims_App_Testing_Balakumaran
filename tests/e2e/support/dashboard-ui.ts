import type { Page, Route } from '@playwright/test';

import type { DashboardStats } from './dashboard-api';
import { signInThroughUi } from './auth-ui';

export const dashboardStats: DashboardStats = {
  totalUsers: 42,
  totalClaims: 127,
  claimsByStatus: {
    SUBMITTED: 15,
    UNDER_REVIEW: 8,
    APPROVED: 3,
    REJECTED: 2,
    CLOSED: 1,
  },
  cacheHit: true,
  queryTimeMs: 95,
};

export async function openAdminDashboard(page: Page): Promise<void> {
  await signInThroughUi(page, 'ADMIN');
}

export async function mockApiFallback(page: Page): Promise<void> {
  await page.route('**/api/**', async (route: Route) => {
    if (new URL(route.request().url()).pathname === '/api/auth/login') {
      await route.continue();
      return;
    }

    await route.fulfill({ status: 200, json: [] });
  });
}

export async function fulfillDashboardStats(
  route: Route,
  stats: DashboardStats = dashboardStats
): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    json: stats,
  });
}
