import { expect, test } from '@playwright/test';
import {
  csrfHeaders,
  expectDashboardStats,
  loginAs,
  type DashboardStats,
} from '../support/dashboard-api';

test('rejects anonymous access to admin dashboard statistics', async ({ request }) => {
  const response = await request.get('/api/admin/dashboard/stats');

  expect(response.status()).toBe(401);
});

test('denies a claimant access to dashboard statistics', async ({ request }) => {
  await loginAs(request, 'CLAIMANT');

  const statsResponse = await request.get('/api/admin/dashboard/stats');
  expect(statsResponse.status()).toBe(403);
});

test('denies a claimant permission to flush the dashboard cache', async ({ request }) => {
  await loginAs(request, 'CLAIMANT');
  const flushResponse = await request.post('/api/admin/dashboard/flush-cache', {
    headers: await csrfHeaders(request),
  });
  expect(flushResponse.status()).toBe(403);
});

test('admin can read dashboard statistics and flush the cache', async ({ request }) => {
  await loginAs(request, 'ADMIN');

  const statsResponse = await request.get('/api/admin/dashboard/stats');
  expect(statsResponse.status()).toBe(200);
  expectDashboardStats(await statsResponse.json() as DashboardStats);

  const flushResponse = await request.post('/api/admin/dashboard/flush-cache', {
    headers: await csrfHeaders(request),
  });
  expect(flushResponse.status()).toBe(204);

  const refreshedStatsResponse = await request.get('/api/admin/dashboard/stats');
  expect(refreshedStatsResponse.status()).toBe(200);
  const refreshedStats = await refreshedStatsResponse.json() as DashboardStats;
  expectDashboardStats(refreshedStats);
  expect(refreshedStats.cacheHit).toBe(false);
});
