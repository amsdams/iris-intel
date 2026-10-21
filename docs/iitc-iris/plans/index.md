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

**OpenFreeMap trial (0.3.6-spike):** Dark/Light now use OpenFreeMap via MapLibre’s Leaflet binding, without API keys.
OSM stays available; saved CARTO choices migrate. Workers and licences are packaged locally. Real-tile browser checks
passed for both styles, pan/zoom, OSM switching, map replacement, and cross-origin worker loading. App checks and
Android checks pass; XPI/APK smoke acceptance, including phone rendering performance, remains pending.

**Player-tracker popup (0.3.5-spike):** phone taps did nothing. Browser hit-testing reproduced the marker shadow
intercepting clicks because Leaflet gives it the pin’s custom CSS class. Pointer handling now targets the icon only.
Player markers also retain identity across COMM refreshes so popup auto-pan cannot remove the open popup.
Browser reproduction and three marker-lifetime regressions pass. The user confirmed the popup opens in both
the XPI and APK (2026-10-21); history-link behavior was not separately reported.

**Fresh-login regression:** uninstall/reinstall and another account exposed an external `accounts.google.nl`
handoff followed by HTTP 400. Version **0.3.3-spike** uses 187 exact regional Google account hosts derived
from [Google’s published list](https://www.google.com/supported_domains), verified 2026-10-21 with source hash
recorded in `GoogleAccountHosts.java`. All entries and host boundaries are tested; individual login flows are not.
The user confirmed 0.3.3 works after the login fix, with location and clipboard still working.
Draw Tools import/export currently uses JSON text and clipboard; there is no file-picker/download flow to test.
**Location denial regression:** 0.3.3 flickered and closed after the user denied two prompts and tapped Locate.
No crash trace is available. **0.3.4-spike** stops automatic permission retries, retains WebView denials, drops cancelled
callbacks, and adds location state/request-count diagnostics. Phone retest: the user received one prompt, denied it,
and saw permission denied. A second Locate produced one more prompt; after denying it, further taps produced no
prompts. Enabling location with precise access in Android settings restored successful positioning. The reported
denial regression passes the phone retest; no crash trace was captured to establish the original crash mechanism.

Version **0.3.0-spike** implements automatic signed-in IRIS startup, stock-dashboard interception, persistent
IRIS/Stock Intel recovery modes, native Back (image → panel → selection → background), and pause/resume of WebView
timers and native probe polling. **Phone confirmed (2026-10-21):** Stock Intel mode persisted after force-close;
after selecting IRIS, IRIS loaded again after close/reopen and Diagnostics showed **Stock dashboard: blocked**.
Back closes an open panel, rotation follows the phone, and Reload restores the open panel (user confirmed).
The user also confirmed the app remains responsive after the requested background/resume check.
The main 0.3.0 wrapper smoke is accepted; Back from image/selection/plain map remains unreported.
Platform checks: copying markers and portal titles works. Location was denied with geolocation disabled on 0.3.0.
**0.3.1-spike** adds on-demand Android coarse/fine foreground location permission and an Intel-only WebView handler.
Phone confirmed: location prompts appeared, access was accepted, and location was found.
Denial/retry, approximate-only access, and cancellation across navigation remain unreported.
The 0.2.0 feature smoke and 0.1.3 login persistence passed. Google Password Manager autofill remains unresolved.
The native round-trip PASS label was not separately reported for 0.2.0; do not invent that result.

Run `npm run serve` from the repo root for the XPI/ZIP/APK download page (`http://localhost:6969`, LAN URL printed).
Build extensions with `npm run package`, or the APK with `npm run android:check`; refresh the page after building.
`npm run android:serve` is an alias. The server starts without existing artifacts and exposes no repository files.

Latest implementation checks passed: `npm run check` (528 tests plus lint/types/CSS/workbench), `npm run package`,
`npm run android:check` (27 native and 13 JavaScript tests), APK signature and byte-for-byte download checks.
The restored download server also passed live artifact/hash, HEAD, missing-build, dynamic-refresh, and private-file
rejection checks. No further generic CSS/component cleanup is queued.

## Next Work

1. **Feasibility spike phone checks are complete for the tested paths.** Promote the existing wrapper into the
   permanent Android project; update names/scripts and move test controls behind accessible diagnostics/recovery UI.
2. Carry the existing platform ownership inventory and known limits forward: embedded Google login is a compatibility
   workaround, Google Password Manager is unresolved, and file handling is deferred because Draw Tools uses text/clipboard.
3. Keep unreported edge cases (approximate-only access, permission cancellation during navigation, and individual
   regional account flows) in future regression checks. First distribution remains private/friends sideload APK;
   store distribution is deferred.

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
