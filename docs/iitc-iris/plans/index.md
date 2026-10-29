# Roadmap

## Current State

CSS ownership, component simplification, domain/panel organization, content composition, repository cleanup, dependency
refresh, and map-replacement lifetime hardening are complete and user smoke accepted as of 2026-10-20.
The active npm workspaces are `apps/iitc-iris` and `packages/iitc-core`. The user-requested map-runtime extraction is recorded below.
The merge checkpoints are complete: PRs #1–#3 and main CI passed; the latest release includes XPI/ZIP and a signed APK.
The disposable Android spike lives in `apps/android-intel-spike`. Phone login/persistence passed on 0.1.3;
0.2.0 bundled IRIS injection and a quick smoke of inventory, layers, COMM, portal details, and missions passed.

The retained ownership rules and known limits are in [Application Architecture](../architecture.md).
[IITC behavior and intentional divergences](../port-plan.md) remain the porting contract.

## Next Session Handoff

**Session pickup (2026-10-29):** resume Play Console closed testing. The user reports the Console requires a
published closed-testing release, at least 12 opted-in testers and at least 14 days with 12 testers; currently it
shows 0 opted in. Next: select countries/regions and testers, create a release (reuse an eligible existing bundle
from the library if offered), preview/confirm and send for review, then share the closed-test opt-in link. Internal
installation smoke has passed; it does not establish closed-test participation or production access. Record tester
feedback during the test for the later production-access application. No closed release was submitted this session.

Store artwork and four actual phone screenshots are ready in
[`apps/android-intel-spike/store-listing/`](../../../apps/android-intel-spike/store-listing/README.md), with upload order
and capture details. AI asset declaration was discussed; final Console labels/submission are not confirmed.
The [readiness review](play-store-readiness.md) retains unresolved reviewer-access, authentication/permission,
UGC and signing/channel questions; internal testing acceptance does not resolve them.

**Branch checkpoint:** current work is on `main` (`22a48fc`, tracking `origin/main`).
`feat/play-store-preparation` (`0bf9abe`, also on origin) has one unique older preparation commit; main has since
received the permanent package identity and published privacy work. Keep the branch for now and review its unique
submission notes before deciding what to carry forward or delete; do not blindly restore its old package paths or
privacy page. No branch switch, merge, commit or push was performed during this wrap-up.

**Public privacy policy (2026-10-29):** `site/privacy/index.html` describes Android/extension data flows,
third-party services, retention/deletion and the approved support contact `1sos.2play@gmail.com`.
System → About and the native offline Privacy dialog link to it. The pinned Pages workflow publishes only `site/`.
Publication succeeded after enabling GitHub Actions as the Pages source: the public page returned HTTP 200 and
matched the source; the user confirmed it loads and reported entering it in Play Console.
`npm run check`, all 50 Chrome cases, extension packaging, signed Android release/bundle and workflow validation
pass. The standalone page passes light/dark and phone/desktop checks with no external requests or overflow.
APK/AAB certificate pins, bundletool validation, all 22 web assets, extension assets and served APK match.
Updated APK/AAB: `0.4.1-alpha+77521ef` (1855); XPI/ZIP: `2026-10-29T20-56-36`.
The new in-app links require an updated app release. Public-page publication is complete; the user worked through
Play content/listing declarations, but final Data safety answers and submission have not been independently audited.

**First Play internal-testing bundle (2026-10-29):** the user reports developer verification complete and testers
added, and is at the internal release's App bundles upload. `npm run android:bundle` now checks Android JavaScript
tests/release unit tests/lint and builds the signed AAB at
`apps/android-intel-spike/app/build/outputs/bundle/release/app-release.aab`.
Bundletool validation, package `io.github.amsdams.iris`, version `0.4.1-alpha+f3e3c7e` (1854), target API 36,
JAR signature/pinned release certificate and all 22 bundled web assets pass. The AAB uses the existing release key
for upload; this does not configure Google's delivered-APK signing key. The user reports uploading and selecting
Save and publish for the internal release. User smoke accepted on the Play-delivered installation: installed through
the tester link, app usable, closing/reopening preserves the signed-in session and goes straight to the map,
location and clipboard work. The Play app-signing fingerprint remains unverified; compare its app-signing certificate
with the pinned GitHub certificate before assuming cross-channel update compatibility.
A separate upload key remains recommended; no new key or signing secret was created. CI AAB delivery
and Play-specific update-channel behavior remain future work. Previously recorded auth/permission questions remain.

**Permanent Android identity (2026-10-29):** the user chose `io.github.amsdams.iris` before Play listing creation.
Application ID, Java namespace/source paths and update metadata now use it, retaining the pinned release key.
The old `org.iris.intelspike` installation cannot update in place: manually install the new APK, sign in again,
and copy drawings from the old app before removing it. Settings do not migrate automatically. Both update metadata
producer and consumer reject the old identity; installation/testing notes explain the transition.
`npm run check`, extension packaging, `android:check` and signed `android:release` pass (31 native tests per build,
15 Android JavaScript tests). Both APK manifests and launcher activities use the new ID; 22 bundled assets and served
downloads match. The release certificate is unchanged and generated update metadata carries the new ID.
Signed APK: `0.4.1-alpha+f3e3c7e` (1854), available on port 6969; XPI/ZIP: `2026-10-29T19-37-44`.
Phone check pending: fresh login, IRIS injection, session persistence, location and clipboard with the new package.
Play signing enrollment, AAB delivery and the previously recorded auth/permission questions remain separate work.

**Credits and About (2026-10-28):** System → About acknowledges IITC/IITC-CE, original plugin authors and inventory
references, with project/source links and six offline license disclosures. Root `CREDITS.md` records feature/source
lineage, and the missing GPL-3.0 text now matches the license already declared in the README. Packaging includes
credits, GPL and Preact notices alongside the retained IITC, Leaflet and MapLibre notices in extension/APK assets.
`npm run check` passes (662 app/core tests + six release gates); Chrome coverage passes (46 suite cases plus the four
final panel cases), as do four Firefox panel checks. Packaging and signed Android checks pass. All seven notice files,
22 APK assets, extension contents and served downloads match; the APK certificate matches the release pin.
XPI/ZIP: `2026-10-28T21-10-31`; signed APK `0.4.1-alpha+fe2683b` (1853), available on port 6969.
Live smoke pending: About credits, license expansion and closure on XPI/APK.

**Optional panel visibility (2026-10-28):** System → Panels shows/hides Counts, List, Scoreboard, Links and Markers.
All start shown, with local preferences and Restore defaults; baseline panels remain available. Menu/navigation and
stored-sheet restoration respect visibility. Saved drawings, rendered overlays and layer settings remain independent.
Preferences save during the action so immediate reloads retain changes. Reordering remains deferred.
`npm run check` passes (662 app/core tests + six release gates); all 50 Chrome cases and six focused Firefox cases
pass, including persistence/reset, malformed preferences, drawing preservation and four viewport/close-button checks.
Packaging and signed Android checks pass; certificate, 19 bundled assets, extension assets and served downloads match.
XPI/ZIP: `2026-10-28T21-01-36`; APK `0.4.1-alpha+fe2683b` (1853), available on port 6969.
Live smoke pending: hide/show panels, reload and Restore defaults on XPI/APK.

**Zoom-dependent availability (2026-10-28):** Display, Counts, Lists and Scoreboard now show inline coverage notes
at wider views, including shorter-link omissions where applicable. Labels/highlighters use known per-portal data at
any zoom, and unknown history stays unstyled. Enabled settings, tile requests/cache policy and core are unchanged;
player-tracker overrides and COMM coverage changes are deferred. Reference comparison is in the port plan.
`npm run check` passes (659 app/core tests + six release gates); all 48 Chrome cases and six focused Firefox checks
pass. Packaging and signed Android checks pass; certificate, 19 bundled assets, extension assets and served downloads
match. XPI/ZIP: `2026-10-28T20-41-44`; APK `0.4.1-alpha+48aea63` (1852), available on port 6969.
User smoke accepted: reports the changes look good; platform and individual paths were not separately specified.
Missing Intel data is not fetched by enabling a filter.

**Diagnostics cleanup (2026-10-28):** removed manual scenarios/snapshot history, fixed Amsterdam/Damrak presets,
unused data-source UI wiring, duplicate debug actions and their supporting code/tests/CSS. Jump parsing and its
existing regression now live with map navigation. Technical details use a native disclosure, collapsed by default
while honoring saved debug visibility; full JSON export and IITC Delay timing/preferences remain available.
`npm run check` passes (658 app/core tests + six release gates); all 47 Chrome cases and focused Firefox diagnostics/
layout checks pass. The typography test now compares the actual Search input font rather than its surrounding form.
Packaging and signed Android checks pass (31 native + 15 JavaScript tests, lint/build); certificate, 19 bundled assets,
extension contents and port-6969 downloads match. XPI/ZIP: `2026-10-28T20-18-10`; APK `0.4.1-alpha+ab86a15` (1851).
User reviewed the smaller panel and reports it is much cleaner. Individual Technical details/Jump/JSON paths and
the platform were not separately reported; automated coverage above passes.

**Canvas cleanup and close-button audit (2026-10-28):** the queued redraw/map-replacement race is fixed through
`map/map-canvas.ts`; reference comparison and regression coverage are in the port plan. All 20 sheets now have one
close button, adding the missing Appearance/Diagnostics actions; nested sections share the parent header.
`npm run check` passes (670 app/core tests + six release gates). Chrome regressions pass after adjusting one fixture
and repeating it three times; nine focused Firefox checks pass, including panel closure at four viewport sizes.
Packaging and signed Android checks pass (31 native + 15 JavaScript tests, lint/build); certificate, all 19 bundled
assets and port-6969 downloads match. XPI/ZIP timestamp: `2026-10-28T20-08-18`; APK `0.4.1-alpha+d141d6b` (1850).
User smoke accepted: behavior appears unchanged and both Appearance/Diagnostics close buttons are usable.
The platform and individual map/drawing/mission paths were not separately reported.

**Key-count performance (2026-10-28):** the same approach now covers inventory badges: app-owned GUID lookup,
retained unchanged layers and cached glyphs on one independent key canvas above the level canvas. Accepted inventory
refreshes update map counts immediately; failed refreshes preserve previous counts. Both overlays share the isolated
`portal-label-canvas.ts` adapter. Existing badge appearance/offsets/filtering and core are preserved by intent.
At 4,000 synthetic badges, unchanged refresh/frame samples fell from about 312 to 33 ms; the phone-size/4×-CPU gesture
probe stayed near 17 ms p95 with keys on. These are local fixture observations, not Android frame-rate claims.
`npm run check` passes (670 app/core tests + six release gates), all 41 Chrome cases and seven focused Firefox cases
pass, and final lint is clean. Count changes/removals, failed-refresh cache retention, animated pixel positioning,
canvas ordering, clearing and replacement are covered. The saved probe and reference comparison are documented.
Extension packaging and signed Android release checks pass (31 native + 15 JavaScript tests, lint/build).
Pinned signature, all 19 bundled assets and port-6969 downloads match. XPI/ZIP checkpoint: `2026-10-28T18-27-45`;
APK `0.4.1-alpha+285c891` (1849), rebuilt with canvas key badges.
Live APK appearance/performance smoke remains pending: key counts alone and with levels, pan/zoom, toggle and refresh.

**Ornament/artifact performance (2026-10-28):** both overlays now retain unchanged decorations and use separate
map-owned canvases through the shared `portal-image-canvas.ts` adapter. Image loading/failure, late-load cleanup,
unused-cache limits, stacking, appearance, exclusions and existing visibility policy have browser coverage. Core,
Draw Tools and player trails remain unchanged. Reference comparison and synthetic limits are in the port plan.
At 4,000 local images, unchanged refresh/frame samples fell from about 472 to 71 ms for each overlay, retaining all
4,000 layers. Enabled phone-size/4×-CPU pan/zoom probes stayed near 17 ms p95 at 100/1,000/4,000 images, using one
canvas and zero image DOM markers per overlay. These are synthetic observations, not real-device frame-rate claims.
`npm run check` passes (670 app/core tests + six release gates); all 45 Chrome cases, four final focused Chrome cases
and ten focused Firefox cases pass. Packaging and signed Android checks pass (31 native + 15 JavaScript tests,
lint/build); signature, all 19 APK assets and downloaded artifacts are verified against the final web build.
Latest XPI/ZIP: `2026-10-28T18-47-27`; APK `0.4.1-alpha+285c891` (1850). Live XPI/APK acceptance remains pending:
visible ornaments/artifacts, pan/zoom, toggles and refresh; key-count smoke also remains pending above.

**Level-label performance (2026-10-28):** the first pass replaces pairwise collisions with spatial buckets and
retains unchanged labels through incremental refreshes. It improved synthetic refresh timings, but the user still
reported APK pan/zoom lag in dense Amsterdam and confirmed labels off was noticeably smoother. The follow-up now
draws labels on one map-owned Leaflet Canvas with cached glyphs, avoiding thousands of animated DOM elements.
Settled font/colour/size, collision selection, filters, request policy, key-count badges, persisted settings and core
remain unchanged by intent. The private Leaflet renderer seam is isolated in `portal-label-canvas.ts`.
A 4,000-portal/phone-size/4×-CPU Chrome gesture probe reduced label-on p95 frame gaps from about 67 ms (pan)/200 ms
(zoom) to about 17 ms for both. These are local fixture observations, not Android frame-rate claims.
`npm run check` passes (669 app/core tests + six release-gate tests, lint/types/CSS/workbench), with no lint warnings.
All 39 Chrome browser cases and five focused Firefox cases pass, including text-pixel alignment after animated
pan/zoom, clearing disabled labels, retention, key-count coexistence and map replacement. The browser README records
the saved refresh and `--gestures` probes; both pass. The port plan records reference comparison, intentional differences
and limits. Extension packaging and signed Android release checks pass (31 native + 15 JavaScript tests, lint/build);
pinned signature, all 19 bundled assets and port-6969 downloads match. Latest XPI/ZIP: `2026-10-28T15-49-12`;
APK `0.4.1-alpha+7357dfe` (1848), rebuilt with the canvas renderer.
The user tested the new APK and reports it is a lot smoother; the live performance smoke is accepted.
Inventory availability remains a watch item; zoom-dependent availability progress is recorded above.

**Session wrap-up (2026-10-28):** optional panel visibility and About/credits await the short smoke checks above.
Zoom availability smoke is accepted; checks and signed artifacts are ready for the user's commit/push. The final
build includes both System → Panels and System → About. Verify release CI and install its published build after
pushing. No additional implementation is required before wrapping up.
Main lesson: distinguish missing Intel data from disabled display settings, and unknown metadata from a negative result.
Next candidates are the existing search-during-zoom race and panel cancellation/reopening checks; player-tracker zoom
overrides and COMM coverage feedback remain optional/deferred. Earlier combined overlay smoke limits remain above.
Earlier summary-card and level-label smoke passed. After pushing, verify release CI and install its published build.
Keep inventory availability under observation; zoom-dependent availability smoke is accepted above. Further
architecture/UI cleanup follows concrete findings. Play Store authentication/distribution requirements remain a
separate pre-submission task.

**Summary cards (2026-10-27):** all nine panels use the shared value-first `SummaryCell`/`SummaryGrid`:
bold values above small muted uppercase labels, with consistent spacing and smaller mobile values. Portal Details
retains the health indicator and level colour; Lists retains faction tinting and each panel keeps its column layout.
Removed duplicate typography rules and legacy cell/grid aliases. User reports the final UI looks good on desktop XPI
and mobile APK; general smoke is accepted, without claiming exhaustive theme/feature coverage. Inventory availability remains a watch item;
no further map-runtime extraction or core changes are needed for this UI pass.
`npm run check` passes (666 app/core tests, six release-gate tests, lint/types/CSS/workbench), as do all 36 Chrome
browser cases and a temporary visual check across six theme/viewport combinations. Packaging and signed Android
release checks pass (31 native + 15 JavaScript tests, lint/build); signature, bundled assets and downloads match.
Latest local XPI/ZIP timestamp: `2026-10-27T21-26-41`; APK `0.4.1-alpha+5c18ffe` (1847).

**Portal level visibility (2026-10-27):** Portal Details now uses the shared Badge beside the owner below the title,
with the existing level palette, a dark tinted surface and bold white text in both themes. The fixed header keeps
the badge visible while details scroll; unknown/placeholder levels are omitted and the summary value remains.
Code checks and all 36 Chrome browser cases pass. A temporary visual probe checks six theme/viewport combinations,
including 320 px width, long owner names and text contrast. Extension packaging and signed Android release checks
pass; local XPI/ZIP timestamp `2026-10-27T21-18-30`, APK `0.4.1-alpha+5c18ffe` (1847). Pinned signature, bundled assets
and port-6969 downloads match. The subsequent combined UI smoke is accepted on desktop XPI and mobile APK.

**Inventory recovery and feedback (2026-10-27):** user reproduced loading → empty on open/Refresh while C.O.R.E.
was active. Shared JSON transport now rejects non-OK HTTP responses. Inventory validates result/item shapes before
the unchanged core parser and makes up to three attempts, 500 ms apart, for invalid results. Failed/empty
refreshes preserve previously loaded items; visible feedback distinguishes retries, failures and empty
responses on first load. Invalid subscription responses report errors rather than inactive C.O.R.E. Cancellation
restores idle/cached state, cancels retry delays and allows reopening; selection changes retain failure feedback.
The final pass waits for active C.O.R.E. before dispatching inventory, while keeping shared checks independent of
panel cancellation. Invalid/inactive subscription results stop before requesting items.
Reference comparison and intentional differences are in the port plan. The actual live response/server cause remains
unknown. User confirmed better feedback, with empty results on mobile and preserved data on desktop. Reference
plugins flag empty replies as possible throttling, so valid empty lists now stop immediately and advise waiting
before Refresh; only invalid results are retried. User then fetched inventory on mobile while desktop still received
empty data, after attempts close together. Active investigation stops here; keep availability/timing as a watch item.
The final subscription-order change still needs live observation.
`npm run check` passes (665 app/core tests + six release-gate tests,
lint/types/CSS/workbench); all 36 Chrome cases and five Firefox panel-workflow cases pass. The initial landscape
suite exposed its old `{result:false}` inventory fixture, which is now correctly rejected; the fixture now supplies
a valid empty list. Extension packaging passes; XPI/ZIP timestamp `2026-10-27T21-09-07`. Signed Android release
checks pass (31 native + 15 JavaScript tests, lint/build); APK `0.4.1-alpha+5c18ffe`, code 1847, matches the pinned
certificate. All 19 bundled assets, extension contents and port-6969 downloads match. Changes remain uncommitted.

**Feature organization and persistence contracts (2026-10-27):** grouped Player Tracker and base-layer files;
Search, Missions, Display, Scores, Inventory and Passcode panels now live inside their feature folders.
Runtime/workflow logic and tests stay outside panel folders. Map-generated CSS stays centrally imported in the same
order, alongside its source feature. UI/page persistence adapters share `map/map-view-settings.ts`; the base-layer
key now lives with its normalization. Camera/scenario helpers use the shared view contract instead of owning it in
Diagnostics. Storage formats/defaults, URL behavior, lifecycle ordering and core remain unchanged by intent.
`npm run check` passes (653 app/core + six release-gate tests, lint/types/CSS/workbench), including three added
shared-contract/adapter regressions; two existing pure map-view tests moved from Diagnostics to their new owner.
All 34 Chrome and 20 focused Firefox cases pass. All 42 moved files match apart from relative paths; compiled CSS is
byte-identical. Shared view parsing matches both previous adapters on 4,478 fixtures (8,956 comparisons). Static imports/
exports resolve across 169 production TypeScript modules, with no runtime cycles, UI-to-feature imports or imports back
into entry points. Extension packaging and signed Android release checks pass (31 native + 15 JavaScript tests, lint/build).
APK `0.4.1-alpha+2c92386`, code 1846, matches the pinned certificate; all 19 assets, packaged extension contents and
port-6969 downloads match. Latest local XPI/ZIP timestamp: `2026-10-27T20-46-44`. Source changes are uncommitted;
user reports XPI behaves as before, so the general smoke test is accepted. APK device testing was not repeated for this pass.

**Combined map coordination extraction (2026-10-27):** map-view/preferences/URL/cookies now live in `map/map-view.ts`,
agent profile publication in `agent/agent-runtime.ts`, overlay/highlighter update coordination in
`map/map-settings-runtime.ts`, and status/request/interaction diagnostics in `map/map-diagnostics.ts`.
The shared JSON endpoint helper moved into `intel/intel-request.ts`. The entry point is 630 lines, down from 1,166;
core, behavior, storage/message contracts and lifecycle ordering are unchanged by intent. Boot/disposal, feature assembly,
panes/layers, message routing and small location/debug overlays remain in the coordinator. `npm run check` passes
(650 app/core + six release-gate tests, lint/types/CSS/workbench), including 22 new runtime regressions. Source comparison
checks 28 moved functions, both update branches, mirrored timing and all remaining coordinator functions after explicit
dependency substitutions. All 34 Chrome cases pass (33 in the suite plus the corrected persistence case rerun), as do
20 focused Firefox cases. The new persistence assertion was corrected for Leaflet pixel rounding; serialized coordinates
are still compared exactly. Extension packaging and signed Android release checks pass (31 native + 15 JavaScript tests,
lint/build). APK `0.4.1-alpha+2c92386`, code 1846, matches the pinned certificate; all 19 assets, extension contents and
port-6969 downloads match. Latest local XPI/ZIP timestamp: `2026-10-27T20-32-58`. Source changes are uncommitted;
the user reports a quick XPI smoke behaves as before. General extraction smoke is accepted, without claiming exhaustive
feature coverage or APK device testing. Deferred Inventory, label and zoom findings remain separate. Recommend
investigating Inventory reliability next; further extraction should need a concrete ownership benefit.

**Portal selection/details/context extraction (2026-10-27):** selection/navigation and orange overlays now live in
`map/map-selection-runtime.ts`; detail requests/status/cache in `portals/portal-details-runtime.ts`; context targeting,
click suppression and gesture installation in `map/map-context-actions.ts`. Shared entity/history mutation, pending
selection resolution, cache limits and request/message ordering are preserved. Core is unchanged; Inventory, label
performance and zoom findings remain deferred by user choice. The entry point is 1,166 lines, down from 1,671.
`npm run check` passes (628 app/core + six release-gate tests, lint/types/CSS/workbench), including 18 new runtime
regressions. All 32 Chrome and 18 focused Firefox browser cases pass. Source comparison checks moved functions and
the detail-promotion block after dependency substitutions; no intentional behavior changes. XPI/ZIP packaging and signed
Android release checks pass (31 native + 15 JavaScript tests, lint/build). APK `0.4.1-alpha+9af2cf1`, code 1845,
matches the pinned certificate; all 19 assets, extension contents and port-6969 downloads match. Latest local XPI/ZIP
timestamp: `2026-10-27T20-18-55`. This batch is committed as `2c92386`; the user reports XPI behavior remains as
before. General extraction smoke is accepted.

**COMM extraction (2026-10-27):** channel state/buffers, fetch/send requests, preview conversion and cancellation
now live in `comm/comm-runtime.ts`. Player Tracker retains its existing polling seam and shares the public buffer.
No intentional behavior changes; known Inventory/loading, label-performance and zoom findings remain deferred by
user choice. The entry point is now 1,671 lines. `npm run check` passes (610 app/core + six release-gate
tests, lint/types/CSS/workbench), including 12 new COMM regressions. All 29 Chrome cases pass (28 in the suite,
plus the corrected new test rerun); all 15 focused Firefox cases pass. The initial COMM browser assertion incorrectly
expected Send enabled after the draft was cleared; only that assertion was corrected. Ten moved functions match their
originals after explicit dependency substitutions. Extension packaging and signed Android release checks pass
(31 native + 15 JavaScript tests, lint/build). APK `0.4.1-alpha+18f3b4e`, code 1844, matches the pinned certificate;
all 19 assets, extension contents and port-6969 downloads match. Latest local XPI/ZIP timestamp: `2026-10-27T20-03-44`.
The preceding feature batches are committed as `9af2cf1`; subsequent general XPI extraction smoke is accepted.

| Extraction checkpoint | Entry-point lines |
| --- | ---: |
| Original runtime | 6,159 |
| Search, Draw Tools, mission overlay | 5,506 |
| Entity renderer | 3,962 |
| Map requests and Intel transport | 3,087 |
| Missions and Player Tracker | 2,401 |
| Scores, Passcode, Inventory/subscription | 1,963 |
| COMM | 1,671 |
| Portal selection, details and context | 1,166 |
| Diagnostics, view persistence, agent state and settings | 630 |

Extraction checkpoint reduction: 5,529 lines (90%) moved out of the coordinator; the organization pass adds one shared-settings import (631 lines now). Remaining ownership: feature assembly, map
boot/lifetime/layers, movement/message routing, auth recovery and small location/debug overlays. Further splitting needs
a meaningful ownership boundary, not a line-count target. Inventory recovery/feedback is implemented above and awaiting live testing.

**Scores, Passcode and Inventory extraction (2026-10-27):** these request workflows, their response-to-UI adaptation
and cancellation now have feature owners. Inventory owns the shared subscription check and exposes key counts to the
renderer; panel cancellation and map disposal retain their different subscription behavior. The entry point is now
1,963 lines, down from 2,401 (6,159 before extraction work). No intentional behavior changes. `npm run check` passes
(598 app/core + six release-gate tests, lint/types/CSS/workbench), including 16 new feature regressions. All 28 Chrome
browser checks and 14 focused Firefox checks pass. Extension packaging and signed Android release checks pass
(31 native + 15 JavaScript tests, lint/build); APK `0.4.1-alpha+18f3b4e`, code 1844, matches the pinned certificate,
all 19 bundled assets, extension contents and downloads on port 6969. Both feature batches are uncommitted. The user
reports behavior remains as before; general extraction smoke is accepted, without claiming exhaustive per-feature coverage.
Inventory required repeated attempts without useful feedback; level labels slow the map and zoom-dependent feature
limits need investigation. These are recorded in the [smoke follow-ups](../backlog.md#smoke-feedback-inventory-reliability-level-labels-and-zoom-limits-2026-10-27),
deferred while the user-authorized extraction continues; Inventory is the first investigation afterward. An existing
[cancelled-panel loading state](../backlog.md#cancelled-panel-can-remain-loading-on-reopen-2026-10-27) is recorded for a focused fix.

**Missions and Player Tracker extraction (2026-10-27):** mission fetching/status/persistent caches and Player Tracker
history/grouped markers/traces/polling now have feature runtimes. Shared COMM data was subsequently extracted as described above.
Map replacement cancels requests/timers and clears markers while retaining caches/history. This pass reduced the entry point to
2,401 lines, down from 3,087 in the previous batch (6,159 before these extractions). No intentional behavior changes.
`npm run check` passes (582 app/core + six release-gate tests, lint/types/CSS/workbench), including 13 new feature
regressions. All 26 Chrome browser checks and 12 focused Firefox checks pass, including live-request mission caching
and grouped-player popup/history/filtering across map replacement. Extension packaging and signed Android release
checks pass (31 native + 15 JavaScript tests, lint/build). Local APK `0.4.1-alpha+18f3b4e`, code 1844, matches the pinned
certificate; all 19 bundled assets, XPI/ZIP contents and port-6969 downloads match the current build. Source changes
are uncommitted. The subsequent general extraction smoke is accepted as described above.

**Map request extraction (2026-10-27):** map refresh generations, queues/retries, cached/stale tile delivery, wanted-response
handoff and artifact fetching now live in `map/map-request.ts`. Shared Intel transport/auth helpers live in
`intel/intel-request.ts`; panel endpoint behavior stays in the entry point. The entry point is 3,087 lines, down from
3,962. The core algorithms, messages, diagnostics and timings are retained. `npm run check` passes (569 app/core + six
release-gate tests, lint/types/CSS/workbench). New regressions cover concurrent slots, cache reuse, stale-cache fallback,
retry delays, wanted/unwanted late responses, source changes, auth failures and map disposal. All 24 browser checks and
ten focused Firefox checks pass. Extension packaging and signed Android release tests/lint/build pass (31 native + 15
JavaScript tests). Local APK `0.4.1-alpha+b159255`, code 1843, matches the pinned certificate; all 19 bundled assets,
XPI/ZIP contents and port-6969 downloads match the current build. The user accepted live XPI smoke; this batch
is committed as `18f3b4e`.

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
3. **Focused map-runtime decomposition — ownership extractions implemented (2026-10-27):** Search, Draw Tools,
   Missions, Player Tracker, Scores, Passcode, Inventory, entity rendering and map request coordination have dedicated
   owners; see checkpoints above. The page entry point retains composition, shared COMM data/requests, selection and portal-detail requests.
   General XPI smoke is accepted; prioritize the reported Inventory/label/zoom follow-ups before more extraction. Further extraction
   should follow a concrete ownership need. No broader component/CSS refactor is needed.

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
