# Standalone QA Test Project

This folder contains the Playwright test project and its documentation separately from application source. One Playwright configuration runs both BFF API and browser UI tests.

## Prerequisites

- Install the application services and dependencies as described in the repository root README.
- Start the full application stack. Defaults are UI `http://localhost:3001` and BFF `http://localhost:8090`.
- Install this test project's dependencies with `npm install`.
- Install the Playwright browser once with `npx playwright install chromium`.
- Copy `test-users.example.json` to `test-users.local.json` and fill in the local admin and claimant test account credentials. The local file is git-ignored; do not commit it.

For the demo stack documented in the repository README, the local test accounts are `admin@demo.com` and `claimant@demo.com`. Use only these demo credentials against a local test stack.

## Run

```bash
npm test
npm run test:api
npm run test:ui
npm run test:list
npm run typecheck
```

Set `PLAYWRIGHT_UI_URL` and `PLAYWRIGHT_API_URL` to override the default service addresses. Playwright writes an HTML report to `playwright-report/` and run artifacts to `test-results/`.

To run UI tests with a visible browser, and use installed Google Chrome if Windows blocks Playwright's downloaded Chromium:

```powershell
$env:PLAYWRIGHT_BROWSER_CHANNEL="chrome"
$env:PLAYWRIGHT_HEADED="true"
npm run test:ui
```

Clear either variable to return that setting to its default:

```powershell
Remove-Item Env:PLAYWRIGHT_BROWSER_CHANNEL
Remove-Item Env:PLAYWRIGHT_HEADED
```

See [teststatergy.md](teststatergy.md) for risk prioritization and [testcases.md](testcases.md) for the detailed cases.
