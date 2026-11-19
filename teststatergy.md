# Test Strategy — Claims Management App

## Application assessment

The application is a claims-management system with a Next.js/React UI, a Spring Boot backend-for-frontend (BFF), and a Spring Boot Claims Service, supported by Redis and a database. This QA project focuses on the admin dashboard: the UI requests statistics from the BFF, the BFF enforces admin access and calls the Claims Service, and the service returns cached or freshly calculated statistics. Admins can flush the cache and reload the dashboard.

Relevant implementation includes the [dashboard page](../code/demo-app-ui/app/(authenticated)/admin/dashboard/page.tsx), [BFF admin controller](../code/bff-service/src/main/java/com/example/demo/adapter/in/web/AdminController.java), and [Claims Service dashboard controller](../code/claims-service/src/main/java/com/example/demo/adapter/in/web/DashboardController.java).

## Highest-risk areas

1. **Authorization:** Dashboard data and cache controls must remain restricted to admins. A role-check regression could expose administrative information or operations.
2. **BFF-to-service integration:** Authentication, service-account calls, response mapping, and Claims Service authorization cross a security-sensitive service boundary.
3. **Statistics and caching:** Incorrect totals/status counts or stale cache results could mislead operational decisions.
4. **Failure and recovery behavior:** Loading, API failures, retries, and access-denied handling affect dashboard usability. This risk is only partly covered by the current QA tests.

## What this strategy tests

- **Playwright browser behavior tests:** Real UI sign-in followed by dashboard loading, statistics/status rendering, retry, access-denied handling, and cache-control feedback. Dashboard API responses are mocked deterministically after login.
- **Playwright API integration tests:** Anonymous access is rejected; claimant access to statistics and cache controls is denied; an admin can read statistics and flush the cache; response fields have expected types and non-negative counts.
- **Playwright browser integration tests:** An admin signs in, sees the dashboard sections and cache state, and flushes/reloads the cache; a claimant is redirected from the admin dashboard.
- **Detailed cases:** See [testcases.md](testcases.md).

The statistics checks validate response shape and reasonable ranges, not exact totals against a fixed data set. The browser happy path is covered; claimant authorization is verified through the API suite, with a browser redirect case identified for additional coverage.

## Deliberately left out

- Fine-grained isolated unit tests and backend module suites. The standalone `qa-tests` project uses Playwright for browser and API behavior; it does not run Vitest or Maven suites.
- Injected upstream failures, timeout/retry behavior, and broader recovery scenarios.
- Load testing and broad performance benchmarking.
- Kafka, CDC, and WebSocket scenarios, plus every admin screen and every possible statistics combination.

These are deferred so the initial effort prioritizes authorization and the dashboard's cross-service/cache flow.

## Issues and concerns found

- The application's existing Playwright configuration under `code/demo-app-ui` references a missing global setup file. The standalone QA project has its own config and does not rely on that scaffold.
- The BFF listens on port `8090`, while the OpenAPI server URL lists `8080`; the UI client also defaults to `8080`. Docker supplies an explicit BFF URL, but local runs without that environment variable may target the wrong service. See the [BFF application configuration](../code/bff-service/src/main/resources/application.yml), [BFF OpenAPI specification](../code/bff-service/src/main/resources/openapi/bff-api.yml), and [UI BFF client](../code/demo-app-ui/src/lib/api/bff-client.ts).
- The live dashboard stats response omitted a zero-count claim status, while the OpenAPI example shows all five statuses. The schema permits an open map and the UI displays absent counts as zero, so this is a contract/documentation ambiguity rather than a confirmed defect.
- **Review concern, not a confirmed defect:** the BFF admin controller shares an `ApiClient` instance and changes its bearer token between service-account and user-token calls. Concurrent requests could merit investigation for token-isolation issues. See the [AdminController.java](../code/bff-service/src/main/java/com/example/demo/adapter/in/web/AdminController.java).

## Running and limitations

The standalone Playwright project targets the running UI (`http://localhost:3001`) and BFF (`http://localhost:8090`) by default. Start the full stack before running tests. Set `PLAYWRIGHT_UI_URL` or `PLAYWRIGHT_API_URL` to override either address. Authentication cases read local credentials from the git-ignored `qa-tests/test-users.local.json` file.

From `qa-tests`, run `npm test` to run both Playwright projects, or `npm run test:api` / `npm run test:ui` to run one project. `npm run test:list` lists discovered tests; `npm run typecheck` checks the test sources.

The UI was reachable at `http://localhost:3001` and the BFF health endpoint returned `200` during setup. Playwright API authorization/cache tests and the admin browser journey passed. The observed response omitted a zero-count claim status; the UI presents the absent count as zero. The initial QA dependency install reported five high-severity npm audit findings; the project dependencies have since been narrowed to Playwright and TypeScript only.
