import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type TestRole = 'ADMIN' | 'CLAIMANT';

interface TestUser {
  email: string;
  password: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTestUser(value: unknown): value is TestUser {
  return isRecord(value)
    && typeof value.email === 'string'
    && value.email.length > 0
    && typeof value.password === 'string'
    && value.password.length > 0;
}

export function getTestUser(role: TestRole): TestUser {
  const configPath = fileURLToPath(
    new URL('../../../test-users.local.json', import.meta.url)
  );
  const config: unknown = JSON.parse(readFileSync(configPath, 'utf8'));
  const userKey = role === 'ADMIN' ? 'admin' : 'claimant';
  const user = isRecord(config) ? config[userKey] : undefined;

  if (!isTestUser(user)) {
    throw new Error(
      `Add a non-empty ${userKey}.email and ${userKey}.password to ${configPath}`
    );
  }

  return user;
}
