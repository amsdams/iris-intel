# Roadmap

## Current State

CSS ownership, component simplification, domain/panel organization, content composition, repository cleanup, dependency
refresh, and map-replacement lifetime hardening are complete and user smoke accepted as of 2026-10-20.
The active npm workspaces are `apps/iitc-iris` and `packages/iitc-core`. No further generic refactor batch is queued.
The merge checkpoint is complete: PR #1 and main CI passed; the latest extension release published.
The disposable Android spike lives in `apps/android-intel-spike`. Phone login/persistence passed on 0.1.3;
0.2.0 bundled IRIS injection and a quick smoke of inventory, layers, COMM, portal details, and missions passed.

The retained ownership rules and known limits are in [Application Architecture](../architecture.md).
[IITC behavior and intentional divergences](../port-plan.md) remain the porting contract.

## Next Session Handoff

The 0.2.0 phone smoke passed for IRIS, inventory, layers, COMM, portal details, and missions. Login persisted after
force-stop on 0.1.3. Load IRIS is still manual per page; Reload/Intel returns to stock Intel. Google Password Manager
autofill remains unresolved. The native round-trip PASS label was not separately reported; do not invent that result.

Run `npm run serve` from the repo root for the XPI/ZIP/APK download page (`http://localhost:6969`, LAN URL printed).
Build extensions with `npm run package`, or the APK with `npm run android:check`; refresh the page after building.
`npm run android:serve` is an alias. The server starts without existing artifacts and exposes no repository files.

Latest implementation checks passed: `npm run check` (519 tests plus lint/types/CSS/workbench), `npm run package`,
`npm run android:check` (11 native and 13 JavaScript tests), APK signature and byte-for-byte download checks.
The restored download server also passed live artifact/hash, HEAD, missing-build, dynamic-refresh, and private-file
rejection checks. Continue with the wrapper-hardening batch below; no further generic CSS/component cleanup is queued.

## Next Work

1. Harden the [Android spike](../../../apps/android-intel-spike/README.md): automatic signed-in injection with stock-Intel
   recovery, native Back, and background/resume checks. Manual injection and the quick feature smoke passed on the phone.
2. Review injection timing/stock-runtime ownership and Android platform gaps under the [APK plan](android-apk-installable-plan.md).
   IITC-style embedded Google login remains a compatibility workaround, not a supported permanent OAuth architecture.
3. Create the permanent Android project after the login/injection proofs pass. The first distribution target is a
   private/friends sideload APK; store distribution is deferred.

Mobile polish and feature expansion should follow concrete usage findings. The [backlog](../backlog.md) records
unprioritized parity gaps and watch items; those are not prerequisites for the Android feasibility proof.

## Working Rules

Keep domain logic in core and UI/browser/Leaflet effects in the app. Preserve persisted keys, message contracts,
IITC-facing concepts, appearance, and cascade order unless the task explicitly changes them.

Use brief, combined implementation/validation batches. Create a detailed plan when unresolved scope or risk warrants it;
small authorized changes do not need another numbered slice or standalone planning document. For parity work, record
reference sources, ownership/lifecycle, observable behavior, intentional divergences, and validation evidence.

For code changes, run focused tests, `npm run check`, `npm run package`, and `git diff --check`.
Documentation-only changes need link/path/command checks and `git diff --check`.
Do not commit, tag, push, merge, or publish without user authorization.

## Historical Work

Completed extraction plans, CSS migration inventories, and obsolete research were removed after their lasting guidance
was consolidated. Their last complete snapshot is commit `b8a0c069f958512342b2f329ff076c43965dad4e`.
For example:

```bash
git show b8a0c069f958512342b2f329ff076c43965dad4e:docs/iitc-iris/plans/css-refactoring/37-component-simplification-review.md
```

Earlier applications and their documentation have a separate retrieval baseline in the [root README](../../../README.md).
