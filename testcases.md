# Test Cases — Admin Dashboard

All automated cases in this document are Playwright tests under this `qa-tests` project. Browser behavior tests sign in through the real UI, then use Playwright route interception to return deterministic dashboard API responses. Live integration tests use the configured UI and backend services. These tests exercise behavior through a browser or HTTP request rather than running Vitest component/unit tests.

## Test conventions

- Assert user-visible content, accessible roles, URLs, and HTTP results; avoid implementation details such as component state or CSS classes.
- Reuse login, CSRF, response validation, and dashboard fixtures in `tests/e2e/support/`.
- Keep mocked dashboard responses deterministic; real UI login still requires the UI, BFF, identity provider, and local test credentials.
- Keep live tests read-only except for the dashboard cache flush. Run cache tests serially against an environment not shared with other active test runs; do not create or alter claim/user records.
- Admin and claimant credentials are read from the ignored local `test-users.local.json` file; never commit that file.

## Playwright browser behavior tests (mocked API)

These tests run in the UI project and exercise dashboard behavior in a real browser. Each test signs in with a real test account; Playwright then stubs the dashboard statistics/cache responses so edge cases remain deterministic. The UI, BFF authentication flow, and identity provider must be running. Test implementation: `tests/e2e/ui/admin-dashboard.behavior.ui.spec.ts`.

| ID | Scenario | Expected result |
|---|---|---|
| P-01 | Dashboard API returns valid statistics. | Dashboard heading, totals, claim statuses, cache state, and query duration are visible with the returned values. |
| P-02 | Dashboard API omits a claim status. | The supported status remains visible and its count is displayed as zero. |
| P-03 | Dashboard statistics request is pending. | Refresh and cache-control buttons are disabled until the response completes. |
| P-04 | Initial statistics request fails; user selects “Retry” and the next request succeeds. | An error alert is shown, then cleared on retry; successful statistics appear afterward. |
| P-05 | User flushes cache and reloads statistics. | Flush request succeeds, the next stats request bypasses cache, and the dashboard displays a cache miss. |
| P-06 | Statistics API responds with `403 Forbidden`. | Dashboard statistics are not displayed and the user is redirected to the claims area. |
| P-07 | Cache flush API responds with a server error. | A visible error is shown; the UI does not report a cache miss. |
| P-08 | Cache flush API responds with `403 Forbidden`. | User is redirected away from the admin dashboard. |

These browser tests replace the prior component/store unit cases with end-user-level assertions. They validate behavior, not isolated internal functions.

## Playwright API integration tests

These cases use the running BFF and its configured downstream services. Test implementation: `tests/e2e/api/admin-dashboard.api.spec.ts`. Run with `npm run test:api`.

| ID | Scenario | Expected result |
|---|---|---|
| A-01 | Anonymous client requests `GET /api/admin/dashboard/stats`. | BFF returns `401 Unauthorized`. |
| A-02 | Authenticated claimant requests dashboard statistics. | BFF returns `403 Forbidden`. |
| A-03 | Authenticated claimant requests `POST /api/admin/dashboard/flush-cache` with a valid CSRF token. | BFF returns `403 Forbidden`. |
| A-04 | Authenticated admin requests dashboard statistics. | BFF returns `200 OK`; totals and query duration are non-negative integers, cache state is boolean, and `claimsByStatus` is an object whose present counts are non-negative integers. |
| A-05 | Authenticated admin flushes the dashboard cache, then requests statistics. | Flush returns `204 No Content`; the subsequent response returns `200 OK`, valid statistics, and `cacheHit: false`. |

The API response may omit statuses with zero claims. P-02 verifies that the UI displays omitted status counts as zero.

## Playwright browser integration tests

These tests sign in through the UI and exercise the running stack. Test implementation: `tests/e2e/ui/admin-dashboard.ui.spec.ts`. Run with `npm run test:ui`.

| ID | Scenario | Expected result |
|---|---|---|
| U-01 | Admin signs in through the UI. | Browser lands on `/admin/dashboard`; the dashboard sections and cache performance state are visible. |
| U-02 | Admin selects “Flush cache and reload dashboard stats from database”. | Dashboard reloads and displays the cache-miss state. |
| U-03 | Claimant signs in and navigates directly to `/admin/dashboard`. | Dashboard statistics are not exposed; the user is redirected to `/claims`. |

## Shared setup and commands

- Start the UI and backend stack at the URLs configured in `playwright.config.ts` (defaults: UI `http://localhost:3001`, BFF `http://localhost:8090`).
- Copy `test-users.example.json` to `test-users.local.json` and enter local test credentials. All browser tests sign in through the UI; dashboard behavior tests mock only the statistics/cache endpoints, while integration tests use the live backend.
- From `qa-tests`, run `npm test` for both Playwright projects, `npm run test:api` for API integration, or `npm run test:ui` for browser tests.
- Run `npm run typecheck` to type-check the Playwright tests, and `npm run test:list` to list discovered cases.

## Optional, not currently gated

Visual regression coverage can be added once a stable dashboard fixture and approved screenshot baseline are available. Load testing should be added only after the team defines an endpoint workload and measurable latency/error-rate SLOs; no arbitrary threshold is assumed here.
