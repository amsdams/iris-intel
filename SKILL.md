# IITC IRIS Repository Guide

The active workspaces are `apps/iitc-iris` and `packages/iitc-core`. Earlier IRIS/Mini-IRIS applications and their
core/plugin libraries are available in Git history; they are not current implementation or build targets.

The disposable Android login proof is `apps/android-intel-spike` (a Gradle project, outside npm workspaces).
Use `npm run android:check` to test/lint/build it and `npm run android:serve` for local phone downloads.
Do not treat compilation as real-device authentication or IRIS injection evidence.

Read `docs/iitc-iris/plans/index.md` for current scope and `docs/iitc-iris/port-plan.md` for behavior/parity work.
The app owns Preact, Leaflet, and browser integration. Keep domain logic in `packages/iitc-core`.

Use Node 24 and `npm ci`. Validate changes with focused tests, `npm run check` (including CSS and workbench checks), `npm run package`,
and `git diff --check`. Documentation-only changes do not require application checks.

Use `npm run dev:wb` for component browsing. Keep appearance, message contracts, persisted keys, and request lifecycle
behavior unchanged unless the authorized task explicitly changes them. Prefer combined implementation/checks and brief
progress notes. Do not commit, tag, push, or publish without user authorization.
