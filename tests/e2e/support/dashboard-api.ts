import { expect, type APIRequestContext } from '@playwright/test';

import { getTestUser, type TestRole } from './test-users';

export type UserRole = TestRole;

export interface DashboardStats {
  totalUsers: number;
  totalClaims: number;
  claimsByStatus: Record<string, number>;
  cacheHit: boolean;
  queryTimeMs: number;
}

export async function loginAs(
  request: APIRequestContext,
  role: UserRole
): Promise<void> {
  const { email, password } = getTestUser(role);

  const response = await request.post('/api/auth/login', {
    data: { email, password },
  });

  expect(response.status()).toBe(200);
  const user = await response.json() as { role: UserRole };
  expect(user.role).toBe(role);
}

export async function csrfHeaders(
  request: APIRequestContext
): Promise<Record<string, string>> {
  const response = await request.get('/api/auth/csrf');
  expect(response.status()).toBe(200);

  const csrf = await response.json() as { token: string; headerName: string };
  return { [csrf.headerName]: csrf.token };
}

export function expectDashboardStats(stats: DashboardStats): void {
  expect(Number.isInteger(stats.totalUsers)).toBe(true);
  expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(stats.totalClaims)).toBe(true);
  expect(stats.totalClaims).toBeGreaterThanOrEqual(0);
  expect(typeof stats.cacheHit).toBe('boolean');
  expect(Number.isInteger(stats.queryTimeMs)).toBe(true);
  expect(stats.queryTimeMs).toBeGreaterThanOrEqual(0);
  expect(stats.claimsByStatus).not.toBeNull();
  expect(typeof stats.claimsByStatus).toBe('object');
  expect(Array.isArray(stats.claimsByStatus)).toBe(false);

  for (const count of Object.values(stats.claimsByStatus)) {
    expect(Number.isInteger(count)).toBe(true);
    expect(count).toBeGreaterThanOrEqual(0);
  }
}
