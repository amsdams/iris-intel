# Roadmap

## Current State

CSS ownership, component simplification, domain/panel organization, content composition, repository cleanup, dependency
refresh, and map-replacement lifetime hardening are complete and user smoke accepted as of 2026-10-20.
The active npm workspaces are `apps/iitc-iris` and `packages/iitc-core`. No further generic refactor batch is queued.
The merge checkpoints are complete: PRs #1–#3 and main CI passed; the latest release includes XPI/ZIP and a signed APK.
The disposable Android spike lives in `apps/android-intel-spike`. Phone login/persistence passed on 0.1.3;
0.2.0 bundled IRIS injection and a quick smoke of inventory, layers, COMM, portal details, and missions passed.

The retained ownership rules and known limits are in [Application Architecture](../architecture.md).
[IITC behavior and intentional divergences](../port-plan.md) remain the porting contract.

## Next Session Handoff

**Session pickup:** triage concrete alpha feedback first, especially crashes, login, data loss, or broken workflows.
Release consistency and automatic base-map recovery are implemented (2026-10-25); run the phone checks below
and verify the next GitHub Actions run. The [Play Store readiness review](play-store-readiness.md) is complete: resolve
supported authentication and website-distribution permission evidence before beginning store delivery work. [Optional additional features](../backlog.md#optional-additional-features-deferred-2026-10-21)
are deferred; the baseline includes Passcode and Missions. Further runtime decomposition should accompany a concrete
change or finding, rather than become another general cleanup prerequisite.

**Map request extraction (2026-10-27):** map refresh generations, queues/retries, cached/stale tile delivery, wanted-response
handoff and artifact fetching now live in `map/map-request.ts`. Shared Intel transport/auth helpers live in
`intel/intel-request.ts`; panel endpoint behavior stays in the entry point. The entry point is 3,087 lines, down from
3,962. The core algorithms, messages, diagnostics and timings are retained. `npm run check` passes (569 app/core + six
release-gate tests, lint/types/CSS/workbench). New regressions cover concurrent slots, cache reuse, stale-cache fallback,
retry delays, wanted/unwanted late responses, source changes, auth failures and map disposal. All 24 browser checks and
ten focused Firefox checks pass. Extension packaging and signed Android release tests/lint/build pass (31 native + 15
JavaScript tests). Local APK `0.4.1-alpha+b159255`, code 1843, matches the pinned certificate; all 19 bundled assets,
XPI/ZIP contents and port-6969 downloads match the current build. Source changes are uncommitted; focused live XPI
smoke of map loading and repeated pan/zoom remains pending.

**Map runtime split (2026-10-27):** extracted Search requests/previews/navigation, Draw Tools storage/actions/rendering,
and mission overlays into their domain folders. A second combined pass extracted entity rendering, incremental layer
updates, filters, highlighters and portal overlays into `map/entities/map-renderer.ts`, with shared types/panes in
`map/map-layers.ts`. The entry point is 3,962 lines, down from 6,159; requests, selection state and mission caches
retain their ownership. Existing UI/messages/storage/order and map-disposal guards
are preserved. `npm run check` passes (554 app/core + six release-gate tests, lint/types/CSS/workbench).
All 23 browser cases pass, including three new entity-renderer regressions; all nine Search/overlay/entity cases also
pass in Firefox's browser engine. Map replacement coverage awaits completed animation/paint; the first overlay test
passed five repetitions. An existing Canvas redraw
error during immediate map replacement was confirmed against the original runtime and recorded in the backlog.
Extension packaging and signed Android release tests/lint/build pass (31 native + 15 JavaScript tests). Local APK
`0.4.1-alpha+6c211bc`, code 1842, matches the pinned certificate; all 19 bundled assets and the port-6969 download match.
The user accepted XPI smoke of both the feature and entity-renderer extractions; they are committed as `b159255`.

**Search interaction simplification (2026-10-25):** Enter in the field submits online search; Up/Down or Tab
focus results; click/Enter on a row navigates. `/` opens or refocuses the input; menu opening leaves focus alone, and
text editing/disabled shortcuts are respected. Separate Zoom controls and Shift+Enter behavior are removed. Point results
use IITC's zoom 15; streets and areas fit bounds with a maximum of 15. The initial map overview stays at 11.
Confirmed submission now cancels pending local work, including submission before the input effect runs. Closing or
leaving Search clears its preview and floating badge; query, results, and map view remain for reopening.
`npm run check` passes (544 app/core + six release-gate tests, lint/types/CSS/workbench). All 19 browser cases pass after
correcting the new close/reopen test to await navigation; all five Search checks also pass in Firefox's browser engine.
Extension packaging and signed Android tests/lint/build pass (31 native + 15 JavaScript tests). Fresh local APK
`0.4.1-alpha+8f85b26`, code 1841, has the pinned certificate and matching bundled assets/download on port 6969.
These Search changes were committed as `6c211bc`. On 2026-10-27 the user reports installing the latest GitHub release
through App → Releases; remote CI logs were not inspected. The user smoke-tested search zoom and reports it is “a lot better”; the zoom
change is accepted. Broader keyboard/device-specific smoke was not separately reported. The rapid-second-click zoom
animation edge case is recorded in [the backlog](../backlog.md#search-navigation-during-zoom-animation-2026-10-25).
The local-debounce overwrite is fixed with workflow timing regressions and a delayed-online-response browser check.
The close/reopen and immediate-Enter changes still need user smoke acceptance.

**Landscape clipping repair (2026-10-25):** reproduced clipped, unscrollable request-panel bodies and panel tops
above the viewport on short screens. Shared bodies now scroll when their controls exceed available height; controls
retain their size and nested lists keep a usable minimum height. Shell height limits reserve room above navigation.
Browser coverage exercises 17 sheets at three landscape sizes and portrait, including populated mission/inventory/draw
lists, import fields, and footers. All 14 browser tests and `npm run check` (556 app/core + six release-gate tests,
lint/types/CSS/workbench), extension packaging, and Android release tests/lint/build pass. The fresh signed APK
`0.4.1-alpha+b8724d2`, code 1840, matches the pinned certificate and tested bundled assets; its
port-6969 download is verified. The user reports landscape is “a lot better” after the fix; general improvement is
confirmed, without claiming individual acceptance of all sheets. The user also tested selected-portal details in
landscape and accepted its scrolling; leave the sheet layout as-is for now. Android keyboard-open landscape checks
(COMM/Search/Passcode) remain optional focused checks. No new blocker surfaced; prioritize concrete tester feedback
over another general cleanup pass. The landscape batch was committed as `8f85b26`.

**CI hardening (2026-10-25):** signed and unsigned Android calls are separate; unsigned/PR calls receive no signing
secrets. The reusable signing guard allows only main/version-tag push/manual contexts. All 19 external action
references are pinned to verified upstream release commits, checkouts do not retain credentials, and default workflow
permissions are read-only. Actionlint, local signing-path checks (four allowed/six rejected contexts), `npm run check`
(556 app/core + six release-gate tests, lint/types/CSS/workbench), and extension packaging pass.
The user subsequently pushed this batch (`b8724d2`); its GitHub Actions result was not inspected here.
`AGENTS.md` delegates to the shared `SKILL.md` guide.

**Alpha feedback (2026-10-25):** the user reports three testers could run the APK. The refreshed local signed APK
`0.4.1-alpha+c850134`, code 1839, installed from port 6969 and still works. These confirm basic installation/startup;
individual feature paths and the new map background/resume checks were not separately reported.

**Combined follow-ups (2026-10-25):** release consistency, automatic OSM recovery, and the
[Play Store readiness review](play-store-readiness.md) are complete locally. `npm run check` passes 556 app/core tests
and six release-gate tests, lint/types/CSS/workbench; all ten browser checks pass. Extension packaging and Android
release checks pass (31 native + 15 JavaScript tests, lint, signed assembly). APK `0.4.1-alpha+f5a6770`, code 1838,
matches the pinned certificate; its 19 bundled assets and local download match the tested build. Fresh ZIP/XPI/APK
are available via `npm run serve`. This batch was subsequently committed as `c850134`; public GitHub update metadata
reports code 1839 for that commit, and the matching local APK was rebuilt. Full CI logs were not inspected here;
feature-specific phone smoke remains pending.

**Appearance controls (2026-10-21):** interface theme and base map selection now share **System → Appearance**.
The choices stay independent and retain existing saved preferences. Map → Display contains overlays, portal filters,
and highlighters. XPI/APK smoke: change both choices independently and reload to confirm persistence.

**Draw Tools crossing repair (2026-10-21):** classification now ports IITC's whole-arc `crossLinks` helpers into core,
fixing shared-anchor false positives, antimeridian misses, and misses at generated rendering vertices. Twelve focused
regressions and full app/core checks (546 tests), CSS/workbench, and extension packaging pass. Reference comparison
agreed on 5,000 ordinary/shared-anchor/degenerate fixtures; antimeridian handling is an explicit corrected divergence.
Signed Android release tests/lint/build pass; certificate pin, embedded assets, and local download checks pass.
Fresh ZIP/XPI and signed APK are available via `npm run serve`. The user smoke-tested the shared-anchor false-positive
fix and reported improvement (2026-10-21); that case is accepted. Platform and genuine-crossing/antimeridian live
checks were not separately reported; those cases have automated coverage.
Snapping remains intentionally hidden and unchanged. See [Draw Tools](../features/draw-tools.md).

**Manual APK updates (0.4.1-alpha):** App → Check for updates fetches public metadata from the `latest` GitHub
release, compares Android version codes, and reports newer/current/failure. App → Releases opens that release directly.
Checks run off the UI thread with timeouts and response-size limits; dismissal/destruction cancels the task and
ignores stale results. No WebView cookies, account details, background polling, or automatic APK downloads are used.
CI publishes metadata generated from the assembled APK alongside the signed artifact. The user confirmed
**Check for updates works on the phone (2026-10-21)**; the update-check smoke is accepted. Local validation passed: 534 app/core tests,
packaging, 31 native + 15 JavaScript tests, Android release lint/build, workflow YAML parsing, and APK signature/download
checks. Generated metadata matches the assembled APK (`0.4.1-alpha+948061e`, version code 1832).
At earlier local verification, the public metadata URL returned 404; the subsequent successful phone check
supersedes that pending acceptance. Individual newer/current/failure outcomes were not separately reported.
The user has shared the app via Telegram.

**Friends alpha (0.4.0-alpha, 2026-10-21):** launcher name IRIS, compact native App menu, About/Privacy/Feedback,
Reload, Recovery, and Diagnostics; successful startup hides the temporary status line. Existing app ID and signing
key are preserved. Full web interface has **System → Appearance → System / Dark / Light**, in APK and extensions,
independent of map style. Existing default remains dark; native header/dialogs follow Android system appearance.
The shared palette covers panels, fields, navigation, tables, status text, and player popups; map/game colors retain
their existing meaning. Workbench loads the same palette. See the [friends guide](../friends-testing.md).
App checks (534 tests), packaging, browser theme persistence/live-system switching, and representative light/dark
panels pass. Android release tests (27 native + 13 JavaScript), lint, and assembly pass. Signed local APK
`0.4.0-alpha+cffbff2` (version code 1831) matches the existing certificate pin; all 19 embedded assets match
the tested web build, and the local download matches the APK checksum. Populated inventory/portal details and
player group/list touch behavior were checked in the browser with simulated data.
Initial user feedback on the new appearance is positive; Passcode/COMM fields retained Intel’s black input background.
Search, COMM, and Passcode now share `ui/shared/input-surface.css`: matching background, border, 6px corners,
font, height, and focus treatment. The passcode-specific helper was removed. Browser checks with Intel CSS
confirm matching computed styles in both light and dark themes.
The user accepted the aligned input styling (2026-10-21) and subsequently shared the app via Telegram.
Native-menu acceptance remains unreported.

**Session wrap-up (2026-10-21):** PR #3 merged as `c8a7d4b`; [main CI](https://github.com/amsdams/iris-intel/actions/runs/39579786375)
passed extension checks/package and Android release tests/lint/build, then published
[the signed APK](https://github.com/amsdams/iris-intel/releases/download/latest/iitc-iris-android.apk)
(`0.3.7-spike+c8a7d4b`, version code 1829) alongside XPI/ZIP. The downloaded APK's checksum matches GitHub,
its certificate matches the public pin, and all 19 embedded IRIS assets match the tested local build.
Future main pushes and version tags include APKs; PRs check debug builds without release credentials.
A dedicated signing key is held in encrypted GitHub secrets and ignored local `apps/android-intel-spike/signing/`.
The user confirmed that directory is backed up; backup restoration has not been tested. Moving from the previous
debug-signed phone installation needs one uninstall/reinstall, clearing its session/settings; later signed releases
update in place. Preserve the key, application ID, and increasing version codes during project promotion.
The user installed the published GitHub release after removing the old debug app and confirmed it works;
the release installation smoke is accepted. Individual feature retests were not separately reported.
A NAS Git mirror was discussed but not configured;
normal Git pushes exclude the signing directory.

**Overlapping player markers trial (0.3.8-spike):** implemented count marker → compact agent list → existing
popup/history, with an All agents return link. Grouping uses exact last-seen coordinates after faction filtering;
nearby portals remain separate at every zoom. Single-agent pins are unchanged. IITC's spiderfier was reviewed;
the user chose the count/list alternative. App checks (531 tests), packaging, Android release tests/lint/build,
and a real-browser touch check pass: each agent/history, Back to list, pan refresh, zoom, faction counts, map
replacement, and cleanup. Signed local APK uses the existing release key. Browser evidence uses three simulated colocated agents. The user subsequently tested the grouped player-tracker
marker and confirmed it works (2026-10-21); live grouped-marker smoke is accepted. The platform and individual
history/faction paths were not separately reported.
The local download page now distinguishes signed and debug APKs; use `iitc-iris-android.apk` to update a GitHub install.

**OpenFreeMap trial (0.3.6-spike):** Dark/Light now use OpenFreeMap via MapLibre’s Leaflet binding, without API keys.
OSM stays available; saved CARTO choices migrate. Workers and licences are packaged locally. Real-tile browser checks
passed for both styles, pan/zoom, OSM switching, map replacement, and cross-origin worker loading. App checks and
Android checks pass. The user tested XPI and APK and reported both look fine (2026-10-21).
Automatic OSM recovery and deliberate browser failure/context-restoration checks were added on 2026-10-25 (see Next Work).
Phone background/resume acceptance of the new recovery handling remains pending; no live provider outage is claimed.

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
Denial/retry and precise-location recovery passed on 0.3.4; approximate-only access and cancellation across navigation remain unreported.
The 0.2.0 feature smoke and 0.1.3 login persistence passed. Google Password Manager autofill remains unresolved.
The native round-trip PASS label was not separately reported for 0.2.0; do not invent that result.

Run `npm run serve` from the repo root for the XPI/ZIP/APK download page (`http://localhost:6969`, LAN URL printed).
Build extensions with `npm run package`, or the APK with `npm run android:check`; refresh the page after building.
`npm run android:serve` is an alias. The server starts without existing artifacts and exposes no repository files.

Earlier friends-alpha validation passed app, packaging, Android, and published APK checks as recorded above.
For the latest local build and its pending acceptance, use the dated Combined follow-ups entry above; earlier
published-release evidence does not establish acceptance of these uncommitted changes.
The restored download server also passed live artifact/hash, HEAD, missing-build, dynamic-refresh, and private-file
rejection checks. No further generic CSS/component cleanup is queued.

## Next Work

**Engineering follow-ups (2026-10-21):**

1. **Release workflow consistency — implemented (2026-10-25):** main and tagged release jobs resolve one source
   commit for extension and Android builds. Root/app/manifest/lockfile versions and explicit release tags are checked
   before either build/signing; Android also checks its selected source. Six gate regressions and actionlint pass.
   Verification in GitHub Actions remains pending the next push; no remote run was triggered in this session.
2. **Base-map recovery — implemented (2026-10-25):** unresolved style/network failures or WebGL loss switch once
   to OSM, synchronize and persist the selection, and display a dismissible notice. Transient errors/context restoration
   get a grace period; hidden-page deadlines pause. Superseded layers cannot override newer choices, and map replacement
   disposes listeners/timers. Ten focused app regressions and seven real-browser recovery checks pass, including
   HTTP/style failures, missing WebGL, actual context loss/restoration, manual retry, and map replacement.
   **Phone check pending:** select Dark/Light, background/resume, pan/zoom, and switch to OSM and back. Browser tests use
   controlled provider responses; they do not establish live-provider or Android background/resume acceptance.
3. **Focused map-runtime decomposition — feature extraction implemented (2026-10-27):** Search, Draw Tools and mission
   overlays now have domain-owned modules; see the checkpoint above. Request coordination/entity rendering remain in
   `page-map-runtime.ts`; further extraction should follow a concrete ownership need rather than a line-count target.
   No broader component/CSS refactor is needed. Live XPI/APK smoke for this extraction remains pending.

Additional distribution and message-boundary notes are retained in the [backlog](../backlog.md#release-and-quality-backlog).
These notes stand alone; the temporary `review-xpi-cicd.md` can be deleted.

**Existing acceptance and regression checks:**

1. Grouped player-marker smoke is accepted. Keep history/back and faction counts in routine regression checks;
   nearby overlapping portals remain a separate decision.
2. Phone-smoke **0.4.0-alpha**: App menu/About/Privacy, Reload/Recovery/Diagnostics, theme switching and persistence.
   Then share the signed APK with 2–5 trusted players using the friends guide; gather concrete feedback.
   Launcher/menu polish is implemented; technical folder/script naming remains unchanged for now.
3. Carry the existing platform ownership inventory and known limits forward: embedded Google login is a compatibility
   workaround, Google Password Manager is unresolved, and file handling is deferred because Draw Tools uses text/clipboard.
4. Keep unreported edge cases (approximate-only access, permission cancellation during navigation, and individual
   regional account flows) in future regression checks. First distribution remains private/friends sideload APK;
   store distribution is deferred.

When convenient, verify the signing backup can be restored and its certificate matches the public pin. Keep private
signing material outside Git; any mailbox/NAS archive containing `release.env` should be encrypted independently.

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
