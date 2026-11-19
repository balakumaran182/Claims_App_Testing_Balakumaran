import { expect, type Page } from '@playwright/test';

import { getTestUser, type TestRole } from './test-users';

export async function signInThroughUi(page: Page, role: TestRole): Promise<void> {
  const { email, password } = getTestUser(role);

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();

  const landingPath = role === 'ADMIN' ? /\/admin\/dashboard$/ : /\/claims$/;
  await expect(page).toHaveURL(landingPath);
}
