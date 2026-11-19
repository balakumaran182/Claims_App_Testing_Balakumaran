import { expect, test } from '@playwright/test';

import {
  dashboardStats,
  fulfillDashboardStats,
  mockApiFallback,
  openAdminDashboard,
} from '../support/dashboard-ui';

const dashboardStatsUrl = '**/api/admin/dashboard/stats**';
const flushCacheUrl = '**/api/admin/dashboard/flush-cache';

test('P-01: admin sees dashboard statistics and cache performance', async ({ page }) => {
  await page.route(dashboardStatsUrl, (route) => fulfillDashboardStats(route));
  await openAdminDashboard(page);

  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Total Users' })).toBeVisible();
  await expect(page.getByText(String(dashboardStats.totalUsers), { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Total Claims' })).toBeVisible();
  await expect(page.getByText(String(dashboardStats.totalClaims), { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Claims by Status' })).toBeVisible();
  await expect(page.getByText('Under Review')).toBeVisible();
  await expect(page.getByText('Cache Hit ⚡', { exact: true })).toBeVisible();
  await expect(page.getByText(`${dashboardStats.queryTimeMs}ms`)).toBeVisible();
});

test('P-02: dashboard shows zero for claim statuses omitted by the API', async ({ page }) => {
  const statsWithoutUnderReview = {
    ...dashboardStats,
    claimsByStatus: {
      SUBMITTED: 15,
      APPROVED: 3,
      REJECTED: 2,
      CLOSED: 1,
    },
  };
  await page.route(dashboardStatsUrl, (route) => fulfillDashboardStats(route, statsWithoutUnderReview));
  await openAdminDashboard(page);

  await expect(page.getByText('Under Review')).toBeVisible();
  await expect(page.getByText('0', { exact: true })).toBeVisible();
});

test('P-03: refresh and cache actions remain disabled while statistics are loading', async ({ page }) => {
  let releaseStatsResponse!: () => void;
  const statsResponseGate = new Promise<void>((resolve) => {
    releaseStatsResponse = resolve;
  });

  await page.route(dashboardStatsUrl, async (route) => {
    await statsResponseGate;
    await fulfillDashboardStats(route);
  });

  try {
    await openAdminDashboard(page);

    await expect(page.getByRole('button', { name: 'Refresh dashboard' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Load dashboard stats from cache' })).toBeDisabled();
    await expect(page.getByRole('button', {
      name: 'Flush cache and reload dashboard stats from database',
    })).toBeDisabled();
  } finally {
    releaseStatsResponse();
  }

  await expect(page.getByText('Cache Hit ⚡', { exact: true })).toBeVisible();
});

test('P-04: dashboard displays a request error and lets the user retry', async ({ page }) => {
  let statsRequestCount = 0;
  await page.route(dashboardStatsUrl, async (route) => {
    statsRequestCount += 1;
    if (statsRequestCount === 1) {
      await route.fulfill({ status: 500, json: { message: 'Service unavailable' } });
      return;
    }

    await fulfillDashboardStats(route);
  });
  await openAdminDashboard(page);

  const dashboardError = page.getByRole('alert').filter({
    hasText: 'Failed to load dashboard',
  });
  await expect(dashboardError).toContainText('Failed to load dashboard');
  await page.getByRole('button', { name: 'Retry' }).click();

  await expect(page.getByText(String(dashboardStats.totalUsers), { exact: true })).toBeVisible();
  await expect(dashboardError).toHaveCount(0);
  expect(statsRequestCount).toBe(2);
});

test('P-05: flushing cache reloads statistics and shows a cache miss', async ({ page }) => {
  const statsRequests: URL[] = [];
  await page.route(dashboardStatsUrl, async (route) => {
    statsRequests.push(new URL(route.request().url()));
    const stats = statsRequests.length === 1
      ? dashboardStats
      : { ...dashboardStats, cacheHit: false, queryTimeMs: 823 };
    await fulfillDashboardStats(route, stats);
  });
  await page.route(flushCacheUrl, (route) => route.fulfill({ status: 204 }));
  await openAdminDashboard(page);
  await expect(page.getByText('Cache Hit ⚡', { exact: true })).toBeVisible();

  await page.getByRole('button', {
    name: 'Flush cache and reload dashboard stats from database',
  }).click();

  await expect(page.getByText('Cache Miss')).toBeVisible();
  expect(statsRequests).toHaveLength(2);
  expect(statsRequests[1].searchParams.get('bypassCache')).toBe('true');
});

test('P-06: access denied for dashboard statistics redirects the user away', async ({ page }) => {
  await page.route(dashboardStatsUrl, (route) => fulfillDashboardStats(route));
  await openAdminDashboard(page);
  await expect(page.getByText('Cache Hit ⚡', { exact: true })).toBeVisible();

  await mockApiFallback(page);
  await page.route(dashboardStatsUrl, (route) => route.fulfill({
    status: 403,
    json: { message: 'Forbidden' },
  }));
  await page.getByRole('button', { name: 'Refresh dashboard' }).click();

  await expect(page).toHaveURL(/\/claims$/);
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);
});

test('P-07: failed cache flush is reported without showing a cache miss', async ({ page }) => {
  await page.route(dashboardStatsUrl, (route) => fulfillDashboardStats(route));
  await page.route(flushCacheUrl, (route) => route.fulfill({
    status: 500,
    json: { message: 'Service unavailable' },
  }));
  await openAdminDashboard(page);
  await expect(page.getByText('Cache Hit ⚡', { exact: true })).toBeVisible();

  await page.getByRole('button', {
    name: 'Flush cache and reload dashboard stats from database',
  }).click();

  await expect(page.getByRole('alert').filter({
    hasText: 'Failed to load dashboard',
  })).toContainText('Failed to load dashboard');
  await expect(page.getByText('Cache Hit ⚡', { exact: true })).toBeVisible();
  await expect(page.getByText('Cache Miss')).toHaveCount(0);
});

test('P-08: access denied while flushing cache redirects the user away', async ({ page }) => {
  await mockApiFallback(page);
  await page.route(dashboardStatsUrl, (route) => fulfillDashboardStats(route));
  await page.route(flushCacheUrl, (route) => route.fulfill({
    status: 403,
    json: { message: 'Forbidden' },
  }));
  await openAdminDashboard(page);
  await expect(page.getByText('Cache Hit ⚡', { exact: true })).toBeVisible();

  const flushResponse = page.waitForResponse((response) =>
    response.url().includes('/api/admin/dashboard/flush-cache')
  );
  await page.getByRole('button', {
    name: 'Flush cache and reload dashboard stats from database',
  }).click();

  expect((await flushResponse).status()).toBe(403);
  await expect(page).toHaveURL(/\/claims$/);
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);
});
