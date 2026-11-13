# Dependency lifecycle and browser smoke review — 2026-11-13

User-authorized follow-up on `feat/missing-core-features`, before live testing the new core features. Preserve the
feature work and build downloadable XPI/ZIP/APK files only on request. No remote push or new commit is authorized.

## Dependency refresh

Registry metadata and the installed tree were checked before updating. Compatible direct upgrades:

| Dependency | Before | After |
| --- | --- | --- |
| MapLibre GL JS | 6.15.0 | 6.18.0 |
| Playwright Test | 1.64.1 | 1.65.0 |
| ESLint | 10.13.0 | 10.14.0 |
| globals | 17.13.0 | 17.14.0 |
| typescript-eslint | 8.72.0 | 8.72.2 |
| Vite, root and app | 6.4.4 | 6.4.6 |

Compatible transitive dependencies were refreshed with `npm update`; manifests now use the updated direct versions
as their minimum compatible releases. A clean `npm ci` succeeds from the resulting lockfile with Node 24.15.0.
The repository's install-script restrictions remain active.

The initial npm audit reported 13 moderate advisories, with no high or critical findings. Updating Vite resolves its
[development-server query advisory](https://github.com/advisories/GHSA-8g5g-mxqh-grgj). The remaining development-tool
chain shared `minimatch` 10.2.6; the [amplification advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
is fixed in 11.0.1+. A narrow root override maps `minimatch@^10.0.0` to `^11.0.8`, retaining the same import/require
entry points and supporting the project's Node 24 runtime. This avoids npm audit's suggested unrelated downgrades
of ESLint/archiver/typescript-eslint. Remove the override when those upstream packages adopt a patched dependency.
Final npm audit reports **zero advisories across the full dependency tree**, including development dependencies.
Lint/architecture checks exercise the override's ESLint consumers; an in-memory archive/glob probe verifies exact
entry discovery and ZIP streaming through archiver/readdir-glob without creating a downloadable archive.

Major migrations are intentionally separate from this refresh: Preact 11, Vite 8, Vitest 5, TypeScript 7, Stylelint
18/config-standard 41, and newer Chrome types. Node types remain on the Node 24 line. In particular, the current
typescript-eslint release's peer range is `<6.1.0`, excluding TypeScript 7. Vite 8 also changes the bundler/toolchain
([migration guide](https://vite.dev/guide/migration)). Android's AGP 8.13.2/Gradle 8.14.3 pins remain unchanged;
the [AGP 9.5 family](https://developer.android.com/build/releases/agp-9-5-0-release-notes) requires Gradle 9.6, a
separate paired toolchain migration. No workflow/action, signing, application ID or SDK target change is included.

## Smoke-test review and improvements

The review covered the `.smoke.mjs` suite, fixture server/host and Playwright configuration. Existing strengths are
isolated browser contexts, role-based interaction, actual compiled bridge/Leaflet execution, retained failure traces,
verified web-build reuse, two benchmarked local workers, one CI worker and no automatic retries.

The feature work is now organized into portal-details, portal-sharing, scores and map-lifecycle suites rather than
one mixed core-features suite plus a directions suite. Existing scenarios are retained, including theme/viewport
coverage. `portal-fixture.mjs` shares setup without registering tests. Feature fixtures are installed before navigation
and remain active after reload.

`smoke-fixtures.mjs` collects uncaught errors from the main page and popups. Feature suites fail on unexpected
external requests and RPCs missing explicit mocks. Only deliberate OSM tile imagery and external map navigation
are stubbed; the local Intel host exposes the strict RPC hook while legacy suites retain their existing behavior.
Unexpected RPCs are recorded in the test runner through a context binding, so reloads or closed popup pages cannot
erase the evidence. Diagnostics are attached on fixture failures. These suites fix locale/time zone to en-US/UTC, use bounded polling
for source readiness, and wait on new map-source responses after replacement.

Coverage now checks the actual rendered QR SVG by rasterizing and independently decoding it; verifies geodesic
circle vertex distances; exercises large-range fitting/visibility when tile coverage omits the selected portal;
and tests Scores cancellation, reopening, late completion and full reload. Layout/disclosure checks and the
selection-retention fix already in the working tree are preserved and included in final validation.

The first full post-refresh run exposed a pre-existing search-fixture race: a one-shot injected portal could be
overwritten by the startup map refresh. The loaded-portal search scenario now serves that portal through the normal
fixture data source on every refresh, waits for its response and retains the original navigation assertions.
No wait threshold or retry was added. A focused run and three repeated runs verify this scenario before the final
whole-suite rerun.

Remaining test boundaries are explicit: legacy suites still contain permissive empty endpoint defaults, there are no
maintained screenshot-diff baselines, and Chrome checks do not establish Firefox/WebView/live Intel compatibility.
The existing CI workflows do not run Playwright. These are follow-ups, not claims of completed coverage. The deliberate
WebGL restoration wait remains: it must cross the actual fallback deadline to prove recovery cancelled the timer.

## Final validation

Final `npm run check` passes 758 app/core tests (149 core, 609 app), all release/build/architecture gates,
ESLint, TypeScript, CSS and workbench checks. The full browser suite passes all 85 cases with two local workers
in 58.9 seconds, including the repaired search scenario. The search scenario also passes three repeated runs.
The final feature-guard check passes all 19 affected portal/sharing/scores/lifecycle cases after moving RPC logging
into the runner (11.3 seconds). No assertion, timeout or retry policy was relaxed.

Android validation passes 15 JavaScript tests, 33 native JUnit tests and debug lint using the verified web assets.
It runs `:app:testDebugUnitTest :app:lintDebug`, without assembling an APK. The clean install, full npm audit,
archive compatibility probe, source/output fingerprint verification and whitespace checks pass.
No XPI/ZIP/APK was packaged. The feature and maintenance changes remain uncommitted on this branch; live user
acceptance remains the next checkpoint.

Subsequent handoff: the user requested and tested XPI `2026-11-13T21-11-47`, reported that everything looks fine,
and authorized main integration. General XPI acceptance is recorded; no additional Android runtime results are claimed.
