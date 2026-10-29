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

Use Node 24 and `npm ci`. Validate changes with focused tests, `npm run check` (including CSS and workbench checks), `npm run package`,
and `git diff --check`. Documentation-only changes do not require application checks.
For relevant UI/map changes, run `npm run test:browser`; see `tests/browser/README.md` for scope and setup.
Browser tests, extension packaging, and Android builds rebuild the same web assets; run those commands sequentially.

Preserve the Android application ID, release signing key, and increasing version codes when maintaining update compatibility.
The permanent application ID is `io.github.amsdams.iris`; the user-approved 2026-10-29 change from
`org.iris.intelspike` creates a separate installation with fresh session/settings. Keep this identity for future releases.
For workflow changes, pin external actions to verified upstream commit SHAs with version comments, keep signing secrets
out of unsigned/PR calls, and validate workflow syntax and signing trigger paths. Do not persist checkout credentials.

Use `npm run dev:wb` for component browsing. Keep appearance, message contracts, persisted keys, and request lifecycle
behavior unchanged unless the authorized task explicitly changes them. Prefer combined implementation/checks and brief
progress notes. Do not commit, tag, push, or publish without user authorization.
