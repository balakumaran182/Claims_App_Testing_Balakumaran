import { expect, test } from '@playwright/test';

import { signInThroughUi } from '../support/auth-ui';

test('admin can view dashboard statistics and reload them after flushing the cache', async ({ page }) => {
  await signInThroughUi(page, 'ADMIN');
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Total Users' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Total Claims' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Claims by Status' })).toBeVisible();
  await expect(page.getByText(/Cache Hit|Cache Miss/)).toBeVisible();

  await page
    .getByRole('button', { name: 'Flush cache and reload dashboard stats from database' })
    .click();

  await expect(page.getByText('Cache Miss')).toBeVisible();
});

test('claimant cannot view the admin dashboard through direct navigation', async ({ page }) => {
  await signInThroughUi(page, 'CLAIMANT');
  await page.goto('/admin/dashboard');

  await expect(page).toHaveURL(/\/claims$/);
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);
});
