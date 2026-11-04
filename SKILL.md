# IITC IRIS Repository Guide

The active workspaces are `apps/iitc-iris` and `packages/iitc-core`. Earlier IRIS/Mini-IRIS applications and their
core/plugin libraries are available in Git history; they are not current implementation or build targets.

The disposable Android login/injection proof is `apps/android-intel-spike` (a Gradle project, outside npm workspaces).
Use `npm run android:check` to test/lint/build it. `npm run serve` lists local XPI/ZIP/APK downloads on port 6969;
`npm run android:serve` is an alias. No builds run automatically when serving.
Use `npm run android:bundle` with release signing configured for a checked, signed Play Console AAB at
`apps/android-intel-spike/app/build/outputs/bundle/release/app-release.aab`; the download page lists APKs, not AABs.
Do not treat compilation as real-device authentication or IRIS injection evidence.

Read `docs/iitc-iris/plans/index.md` for current scope and `docs/iitc-iris/port-plan.md` for behavior/parity work.
The app owns Preact, Leaflet, and browser integration. Keep domain logic in `packages/iitc-core`.

Use Node 24 and `npm ci`. While editing, run focused tests and affected lint/type checks. Once changes settle, run
`npm run check` (including CSS and workbench checks) and `git diff --check`; for relevant UI/map changes, also run
the full `npm run test:browser` suite. Repeat broad checks only when subsequent changes, failures, or unresolved
concerns justify them. Documentation-only changes do not require application checks.

When preparing a downloadable build, package/sign once after final validation (`npm run package` and the relevant
Android build command). Avoid rebuilding artifacts during every layout iteration. Browser tests, extension packaging,
and Android builds rebuild the same web assets; run those commands sequentially.

Local browser runs use two workers after repeated full-suite benchmarks; CI keeps one. Re-benchmark runtime,
reliability and timing-test interference before increasing concurrency. After a successful web build, use
`npm run test:browser:reuse -- <file>` or `npm run package:reuse` to avoid rebuilding unchanged assets. Android can
reuse them with `IRIS_REUSE_WEB_BUILD=1 npm run android:check` (or the relevant build command). Reuse verifies source,
configuration, lockfile and output fingerprints and fails if stale; run `npm run build -w apps/iitc-iris` to refresh.
Default commands still build normally. See [the testing improvement plan](docs/iitc-iris/plans/comm-ui-testing.md)
for evidence/follow-ups and [the browser guide](tests/browser/README.md) for commands and setup.

Preserve the Android application ID, release signing key, and increasing version codes when maintaining update compatibility.
The permanent application ID is `io.github.amsdams.iris`; the user-approved 2026-10-29 change from
`org.iris.intelspike` creates a separate installation with fresh session/settings. Keep this identity for future releases.
For workflow changes, pin external actions to verified upstream commit SHAs with version comments, keep signing secrets
out of unsigned/PR calls, and validate workflow syntax and signing trigger paths. Do not persist checkout credentials.

Use `npm run dev:wb` for component browsing. Keep appearance, message contracts, persisted keys, and request lifecycle
behavior unchanged unless the authorized task explicitly changes them. Prefer combined implementation/checks and brief
progress notes. Do not commit, tag, push, or publish without user authorization.
