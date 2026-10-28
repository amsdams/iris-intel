# IITC IRIS Port Plan

Repository cleanup (2026-10-20): only `apps/iitc-iris` and `packages/iitc-core` remain active. Earlier IRIS/Mini-IRIS
code and documentation references below are historical Git paths; see the root README for retrieval. Retained samples
now live in `docs/iitc-iris/fixtures/`. Current implementation scope is in [the roadmap](plans/index.md).

Goal: maintain a clean IITC-compatible app with a compact UI shell, Leaflet rendering, and an IITC-CE-derived core.

Porting rule: prefer IITC-CE file names, public method names, data model names, and UI concepts when adding ported
behavior. Diverge only when TypeScript packaging, extension boundaries, or deliberate product decisions require it, and
document the reason near the relevant feature checkpoint. Existing IRIS/Mini-IRIS names can be used as local reference
material, but they should not become the default naming source for IITC IRIS.

## Porting Doctrine

The goal is behavioral parity with IITC-CE without importing its incidental complexity. IITC IRIS should preserve IITC
concepts and seams so comparison and debugging stay cheap, while using modern TypeScript boundaries, tests, and small
modules to avoid carrying over hard-to-maintain structure.

Non-functional requirements:

- Source of truth: use `reference/ingress-intel-total-conversion` first for behavior, naming, request shape, lifecycle,
  and UI concepts. Use
  earlier IRIS/Mini-IRIS from Git history only as implementation reference or migration context.
- Parity before improvement: the first acceptable version of any core map workflow is the IITC-CE behavior, not a
  cleaner IRIS-style reinterpretation. Optimization, UX redesign, and architectural simplification are allowed only
  after parity is demonstrated or the divergence is documented as temporary.
- Name compatibility: keep IITC names for recognizable domains such as `comm`, `parseMsgData`, `portalDetails`,
  `getEntities`, `artifacts`, `ornaments`, `links`, `fields`, `portals`, and layer/UI concepts. Do not rename a concept
  just because a cleaner generic name exists.
- Structure freedom: do not copy IITC file layout, globals, DOM coupling, or mutation-heavy flow when those are
  incidental. A cleaner module boundary is allowed if exported names and behavior remain easy to map back to IITC.
- Parity harness first: every ported subsystem needs copied diagnostics, fixture/live comparison points, and focused
  tests before broader UI polish.
- Behavioral deltas must be explicit: if IITC IRIS intentionally differs from IITC-CE, document why in this plan and
  expose enough diagnostics to verify the impact.
- Thin runtime, tested core: request planning, parsing, decoding, classification, and derived counters should live in
  `packages/iitc-core`; the extension runtime should mostly wire Leaflet, browser APIs, and UI messages.
- Avoid “smart” rewrites before parity: simplify internals only after the equivalent IITC behavior is understood, named,
  and covered by tests or diagnostics.
- Preserve IITC runtime semantics before optimization: for every ported subsystem, identify the IITC ownership model,
  lifecycle, mutation path, and hook/plugin contract. Prefer an explicit typed equivalent of the IITC model over a local
  shortcut that only matches the visible output.
- Visual parity is not JavaScript timing: for interaction-sensitive map features, measure click-to-pixels latency across
  content dispatch, page-runtime work, Leaflet invalidation, and browser paint before choosing further optimizations.
- Do not claim implementation superiority without measured visual parity: an IRIS implementation can be structurally
  cleaner or faster in internal timings, but it is not better than IITC-CE until click-to-visible behavior is comparable
  or intentionally documented as a divergence.
- Keep user-facing UI comparable: core map workflows should look and behave close enough to IITC-CE that screenshot and
  live-state comparisons are meaningful. Debug and fixture controls can remain IITC IRIS-specific, but should stay
  visually separate.

Required process for each new subsystem:

1. Identify the IITC-CE source files under `reference/ingress-intel-total-conversion` and record them in the pass notes
   before implementing.
2. Record the IITC ownership model, lifecycle, mutation path, and whether the behavior is hook/plugin-visible.
3. List the IITC public concepts being ported: file/module name, function names, endpoint names, data fields, UI
   pane/control names, and lifecycle events.
4. Choose IITC-aligned names at the boundary first. For example, prefer `comm.ts` plus `parseMsgData` over a cleaner but
   less traceable `plext.ts` parser name.
5. If a cleaner internal split is useful, keep a small IITC-named facade that maps directly back to the IITC source. The
   facade is the debugging contract.
6. Add tests or copied diagnostics that prove the IITC behavior before adding larger UI or architectural cleanup.
7. For interaction-sensitive features, add click-to-pixels diagnostics or document why visual parity is not yet measured.
8. Document every intentional divergence in this plan with the reason, expected effect, and how to compare it against
   IITC-CE.

Validation rule: after validating IITC IRIS code changes, run `npm run package` from the repository root so
the extension build and ZIP/XPI packaging are checked. Documentation-only changes do not require this package step.

Current local reference checkout: `reference/ingress-intel-total-conversion`. Older notes may refer to the same IITC-CE
lineage by repository name; new source references should use the local path above so searches and comparisons are
directly reproducible.

Naming checklist before creating a new file or exported function:

- Is there an IITC file or function with this responsibility? Use that name or an obvious TypeScript variant.
- Is the word from Intel payload terminology but not IITC module terminology, such as `plext`? Use it inside field/types
  where accurate, but prefer the IITC module concept at file/API boundaries, such as `comm`.
- Would a future debugger know where to look in `reference/ingress-intel-total-conversion` from this name? If not,
  rename or add a documented facade.
- Is the new name borrowed from current IRIS/Mini-IRIS? Treat that as suspect unless the pass explicitly documents why
  IITC naming is not appropriate.
- Is the divergence only for code cleanliness? Keep the IITC name at the boundary and hide the cleaner structure inside.

## Portal Level Numbers performance checkpoint — 2026-10-28

Reference: `reference/ingress-intel-total-conversion/plugins/portal-level-numbers.js`, especially
`updatePortalLabels`, `addLabel`, `removeLabel`, and `delayedUpdatePortalLabels`. The plugin owns GUID-indexed
Leaflet markers in a layer group, filters portals attached to the map with known levels, uses spatial buckets to
avoid testing every pair, and coalesces request/refresh/layer hooks with short timers. Its `addLabel` still replaces
existing markers. Labels are passive overlays, not portal state or a plugin-visible data mutation.

IRIS keeps its existing immediate render lifecycle, zoom/detail gating, 15 px inclusive collision square,
higher-level-first/GUID tie priority, neutral labels, styling and message contracts. These are retained IRIS behavior;
this pass does not claim identical upstream tie resolution, mobile spacing (upstream scales by 1.5), or hook timing.
The new neighbouring-bucket scan is checked against the previous exhaustive algorithm. Unchanged label markers/DOM
are retained through incremental refreshes; changed/hidden/removed labels are replaced or removed, and full clear/map
replacement resets their index. Key counts remain independent decorations in the shared labels pane.

Synthetic Chrome profiling (1280×800, zoom 16, 20 px grid, three measured runs after warm-up) found 4,000-label collision
selection falling from a median 49.3 ms to 5.0 ms; unchanged refresh/frame sampling fell from 288.7 ms to 33.4 ms,
retaining all 4,000 markers instead of replacing all. Initial toggle/frame sampling stayed about 165 ms in both runs;
creating/painting thousands of DOM labels remains expensive. These are local fixture observations, not phone or
live-IITC speed claims. The repeatable probe and frame-sampling limits are in `tests/browser/README.md`.

### Dense-map gestures: shared label canvas follow-up

The first APK smoke in Amsterdam still felt sluggish; the user confirmed labels off was noticeably smoother.
A second probe measures animated pan/zoom with 4,000 loaded portals, a 412×780 viewport at 2× pixel density and
4× Chromium CPU throttling. Retaining markers did not remove their DOM animation/style overhead. Removing text
shadows alone barely helped. The DOM version's label-on p95 frame gaps were about 67 ms for pan and 200 ms for zoom;
labels off stayed near 17 ms. With a shared canvas, label-on gaps stayed near 17 ms in the same local probe.
These are synthetic browser observations, not Android frame-rate guarantees. The user subsequently tested the new
APK and reports it is a lot smoother; the live performance smoke is accepted.

IRIS now draws the selected level labels using passive CircleMarker layers on one map-owned Leaflet Canvas renderer.
The font, colour, fixed settled size and collision winners remain; cached per-level glyphs approximate the previous
CSS shadows. Native renderer bounds skip offscreen painting, its transform follows gestures, and label indices still
retain unchanged layers. During zoom animation, raster text scales with the map and redraws at its fixed size at the
end. Key counts were initially kept as independent DOM badges; the key-count follow-up below replaces them. Renderer disposal follows the map lifecycle.
`portal-label-canvas.ts` isolates Leaflet 1.9's private `_updateCircle`/`_point`/`_empty` drawing seam; recheck it when
upgrading Leaflet. Browser regressions check actual text pixels at portal positions after animated pan/zoom, an empty
canvas after disabling labels, retained layers/canvas and full-clear/map-replacement behavior. The browser README
records the repeatable `--gestures` probe. Request/data/collision policy and core remain unchanged.

## Key-count overlay performance investigation — 2026-10-28

References: `reference/ingress-intel-total-conversion/plugins/keys-on-map.js` (`portalAdded`, `keyUpdate`, `renderKey`)
uses GUID-indexed key data/layers and portal add/remove hooks, replacing the affected marker on a count update.
`reference/Community-plugins/dist/DanielOnDiordna/liveInventory.user.js` (`addKeyToLayer`, `removeKeyFromLayer`)
uses `keyMap`, retains a portal's `_keyMarker` until removal and gates on detailed map data. Both use passive HTML
markers, not a shared canvas. IRIS uses live inventory totals and its existing badge styling/offset/filter policies;
these are not claims of identical upstream behavior.

Before optimization, IRIS recreated key badges whenever portal overlays updated, unlike its retained level labels.
`getPortalKeyCount` called the core helper's array `find` for each rendered portal, even when
key counts were disabled. With P rendered portals and K key records, those repeated lookups could cost O(P × K).
The follow-up addresses this in the app without changing core or inventory request behavior.

The saved profiler now accepts `--key-counts`: it loads synthetic inventory through the real subscription/inventory
request path, with one key per portal and all external responses stubbed. At 100/1,000/4,000 portals, median unchanged
refresh/frame samples were about 33/42/312 ms, retaining zero badge layers. At 4,000 portals the initial toggle/frame
sample was about 155 ms. These samples include dispatch and two animation frames, not just rendering work.

The phone-size (412×780, 2× pixel density), 4×-CPU Chrome gesture probe compares the same camera path off/on:

| Loaded portals/key badges | Pan p95 frame gap, off/on | Zoom p95 frame gap, off/on |
| --- | --- | --- |
| 100 | 17 / 17 ms | 17 / 17 ms |
| 1,000 | 17 / 33 ms | 17 / 67 ms |
| 4,000 | 17 / 67 ms | 33 / 417 ms |

Two pan and two zoom animations are sampled per mode. Assertions verify the loaded dataset survives camera refreshes
and some enabled badges remain in the viewport; not all loaded badges are onscreen. These are synthetic observations,
not Android frame-rate claims or a measurement of the user's inventory distribution. They demonstrate combined
render/update overhead, without isolating the exact share attributable to DOM painting versus lookup/refresh work.

Implemented follow-up: an app-owned GUID/count lookup is rebuilt only with accepted inventory summaries; overlay
lookups are skipped while disabled. Key badges are synchronized by GUID/count/coordinates/radius, retaining unchanged
layers. Accepted inventory updates refresh only the key overlay immediately; failed/empty refreshes preserve cached
counts. This also fixes badges previously waiting for the next map refresh to reflect changed inventory.

`portal-label-canvas.ts` now isolates both label renderers' Leaflet drawing seam. Each overlay owns one map-lifetime
canvas so their redraws stay independent, with key badges above levels regardless of enable order. Key glyphs use the
existing font tokens, dark rounded badge and portal-relative offset; the cache is capped at 128 counts. Long counts
can overflow the badge as before. Key badges retain existing filters/zoom policy and passive click-through, without
level-label collision suppression. As with levels, text scales during zoom animation and redraws at settled size.
The obsolete HTML badge CSS is removed. Core, request timing, persisted settings and message contracts are unchanged.
The repeated 4,000-badge probe retained all 4,000 layers, with median unchanged refresh/frame samples about 33 ms
(previously 312 ms) and initial toggle/frame sampling about 44 ms (previously 155 ms). In the same synthetic gesture
probe, key-count-on pan/zoom p95 gaps stayed near 17 ms at all three sizes, using one canvas and zero badge DOM nodes.
These observations have the same synthetic/device limits as the baseline; live APK smoke remains pending.
Browser regressions cover count changes/removals, cached inventory after failure, layer retention, filters, both
canvases' ordering, actual text pixels after animated pan/zoom, full clear and map replacement.

## Other passive overlays: investigation and combined implementation — 2026-10-28

References: `core/code/ornaments.js` (`setup`, `addPortal`, `removePortal`) keeps per-portal decoration ownership and
chooses `L.canvasIconLayer` when canvas is preferred and available. `core/external/leaflet.canvas-markers.js` supplies
URL/image caching, async image-load drawing and viewport bounds queries. In contrast, `core/code/artifact.js`
(`updateLayer`) clears/rebuilds ordinary image markers on artifact-data updates. Canvas support for ornaments does
not imply that upstream artifacts also use canvas, nor that the external adapter preserves every IRIS image option.

IRIS currently clears/recreates both image overlays whenever portal overlays update; `preferCanvas` alone does not
convert `L.marker` icons. The first recommended change is retaining unchanged markers, with equality covering all
appearance inputs. A shared image canvas is a reasonable next step for dense ornaments, using the reference's
image-loading/viewport concepts while preserving IRIS opacity, offsets, sizes, stacking and exclusions. Keep existing
overlay visibility policy: ornaments/artifacts currently iterate entity portals rather than the filtered label list.
Test async load success/failure, late loads after removal/replacement, disposal and redraw before adopting it. Remote
image loading and possible cross-origin canvas restrictions need their own verification; the label glyph cache does
not establish those behaviors. The initial investigation left rendering unchanged; the authorized implementation is recorded below.

The saved Chrome probe supports `--ornaments` and `--artifacts` at 100/1,000/4,000 markers. It replaces their URLs with
one shared local PNG and waits for decoding, excluding remote availability/cold-network behavior. At zoom 16 and
1280×800, three measured runs after warm-up gave unchanged refresh/frame medians of about 35/59/472 ms for ornaments
and 35/64/473 ms for artifacts, retaining zero marker identities. The sample includes dispatch, a queued task, two
animation-frame opportunities and decoding; it is not pure render time or GPU completion. The high count is a stress
case; actual player decoration density has not been measured. These observations establish avoidable rebuilding,
without proving a particular canvas speedup or a live Android bottleneck.

The phone-size/4×-CPU gesture mode retained the populated dataset with decoded images throughout. At 100 images,
off/on pan and zoom p95 frame gaps stayed near 17 ms. At 1,000, enabled zoom gaps reached about 50 ms for both
overlays. At 4,000, enabled pan/zoom gaps were about 100/250 ms for ornaments and 67/267 ms for artifacts, versus
about 17/17 ms disabled. These are combined update/animation observations with warm local assets; they do not isolate
DOM costs or predict real-device performance. Run these probes sequentially and alone as described in the browser README.

Implemented follow-up: ornaments and artifacts now synchronize independent decoration indices, keeping unchanged
layers and replacing changed URL/size/anchor/opacity/coordinates/stacking inputs. Artifact ID changes that do not
change the image preserve the layer. A common `portal-image-canvas.ts` adapter gives each overlay a map-owned canvas,
with URL-shared decoded images per renderer and at most 128 unused cached URLs. All currently active URLs remain
available. No core, entity-data, persisted-setting or request-lifecycle changes are made. Obsolete HTML image-marker CSS and its
central import are removed; the dedicated canvases remain passive. Draw Tools/player trails remain untouched.

The adapter follows upstream's image caching/viewport-drawing concepts rather than porting its entire layer plugin.
Native Leaflet CircleMarker bounds/projection/redraws handle clipping and gestures; a private drawing seam preserves
screen-y plus z-index stacking, with entity-order ties even when changed layers are reattached. Images keep their
previous settled dimensions, anchors and opacity. Ornaments still shrink at lower zooms; neither image overlay gains
level-label zoom/faction gating. During animated zoom the bitmap canvas scales, then redraws at settled dimensions.

Load completion redraws only attached users through Leaflet's coalesced redraw queue. Unused in-flight/failed entries
lose their callbacks; failed URLs retry after removal/re-enable. Map disposal clears the image cache and late loads
cannot revive removed decorations. As with the previous image markers, remote images load without requiring CORS;
a cross-origin asset can taint this dedicated image canvas, so it is not used for pixel readback/export. Same-origin
fixture assets make automated pixel checks possible without asserting real server CORS behavior. The current image
URLs are PNGs; animated image formats are not part of this adapter's verified contract.

Browser regressions check appearance pixels, target/fragment sizes and opacity, retained identity, changes/removals,
placeholder treatment, stacking after reattachment, exclusion/filter policy, low-zoom resizing, animated pan/zoom,
clearing/re-enabling, failed and late image loads, bounded unused caches and map replacement. Live appearance and
performance acceptance remain pending.

The repeated warm-image refresh probe retains all layers. At 100/1,000/4,000 markers, unchanged refresh/frame medians
are about 35/45/72 ms for ornaments and 36/45/71 ms for artifacts (baseline 35/59/472 and 35/64/473 ms respectively).
These include dispatch, frame opportunities and explicit diagnostic image decoding, with the same synthetic limits
as the baseline. They do not isolate renderer CPU time or establish phone performance.
In the repeated phone-size/4×-CPU gesture probes, enabled pan/zoom p95 frame gaps stayed near 17 ms for both overlays
at all three sizes, with one canvas and zero image DOM markers. The original 4,000-image enabled gaps were about
100/250 ms for ornaments and 67/267 ms for artifacts. This remains fixture evidence, not live APK acceptance.

Other source-audited candidates: Draw Tools clears/rebuilds markers and paths, and player-tracker trace polylines are
rebuilt, so retention could help. Their costs are unmeasured. Player pins already retain identity and have interactive
popups, so converting them blindly would sacrifice useful behavior. Main portals/links/fields already use retained
canvas paths; low-volume selection/location/search and selected-mission overlays are lower priority.

## Inventory reliability reference checkpoint — 2026-10-27

Reference: `core/code/send_request.js` (`postAjax`) routes HTTP failures through the error callback;
`reference/Community-plugins/dist/DanielOnDiordna/liveInventory.user.js` (`getInventory`) validates the result and
supports bounded 500 ms retries. `reference/Community-plugins/dist/elkuku/inventory.user.js` (`InventoryFetcher.refresh`)
rejects empty refreshes and retains cached inventory on refresh failure. Inventory is plugin-owned in IITC rather
than a core panel. IRIS keeps its existing page-lifetime summary, `getInventory`/`lastQueryTimestamp: 0`, subscription
sharing and message boundary. The app adapter now validates responses, makes at most three attempts for invalid
results (500 ms between attempts), preserves previous data on failure, and resets cancelled requests so reopening can load again.
An empty response alone cannot prove an empty account; show that limitation rather than silently clearing known data.
The first version also retried valid empty lists. Phone testing still returned empty lists; desktop retained earlier
data with a warning. Further reference comparison found `jaiperdu/player-inventory.user.js` (`handleInventory`,
`refreshInventory`) explicitly associates empty results with possible rate limiting; Live Inventory/elkuku cache
successful results for ten minutes. IRIS now stops on a valid empty list, advises waiting, and retains known data.
This avoids immediate retries on a potentially throttled response. Throttling is plausible, not a confirmed server
cause; IRIS has not added a persistent cache or assumed an exact server cooldown/shared-device quota.
Invalid subscription responses are errors rather than inactive subscriptions. Shared transport rejects non-OK HTTP
responses, retaining HTML-login detection first. The final pass waits for a shared active-subscription result before
dispatching `getInventory`, matching the plugin prerequisite. Closing while waiting does not cancel the shared check
or dispatch an inventory request after it finishes. Stock Intel's captured `xp.Ld`/`xp.re` gates access on subscription,
and `xp.Ua` uses `Ap = 6E5` (ten minutes) between fetches; this establishes a client policy, not a server quota.
No core parser or public hook changes. User later fetched inventory on mobile while desktop still received an empty
list, after attempts close together. Stop active investigation here; server timing remains a watch item. Automated
fixtures verify sequencing/recovery/feedback rather than proving a live-server cause; the final sequencing change
still needs live observation.

## Feature organization and shared persistence contracts — 2026-10-27

Reference seams remain `core/code/map.js` (position/URL/cookies) and `layerchooser.js` (layer preferences).
Grouped 42 existing feature files and nested panels under features that also own runtime/workflow files.
Shared map-view keys/defaults/types/validation/parsing between the UI and page adapters; the base-layer key and
normalization live together in layer settings. Camera/scenario helpers now consume that map contract.
Stored formats, URL precedence, bounds/defaults, CSS import order and runtime lifetimes are retained. All moved files
match their previous contents apart from relative paths; compiled CSS is byte-identical. The shared parser matches
both previous adapters on 4,478 stored/URL fixtures (8,956 comparisons). Static imports/exports resolve across 169
production TypeScript modules with no runtime cycles or imports from shared UI into features. No new IITC behavior,
message contract changes or core work are included. User reports XPI behaves as before; general smoke accepted.
Verification details are in the roadmap.

## Map coordination ownership extraction — 2026-10-27

Reference checkpoint: `core/code/map.js` owns initial position and move-end Intel cookies;
`portal_highlighter.js` and `layerchooser.js` own active highlighter/layer changes; `sidebar.js` reads Intel PLAYER.
Existing IRIS diagnostics aggregate request, renderer and feature snapshots rather than exposing IITC hooks.
Extracted view/preference serialization, agent profile publication, diagnostics and layer/highlighter update coordination
into explicit app owners, and moved the shared JSON endpoint helper into Intel transport. Preserved current IRIS
storage keys, URL precedence/clamps, cookies, PLAYER conversion, render/message order, two-frame diagnostics,
page-lifetime retained state and map-lifetime cancellation. Boot/disposal and message routing stay in the entry point;
core and existing parity differences remain unchanged. This is ownership cleanup, with no new public hooks or UX.
Twenty-two new runtime regressions cover persistence/fallbacks, profile conversion/subscription publication, ordered
settings/render paths, auth/status aggregation, concurrent request counts, retained snapshots and lifetime-bound frames.
Source comparison checks 28 moved functions, both update branches, the mirrored timing block and remaining coordinator
functions after explicit dependency substitutions. Browser checks cover combined settings and persistence through reload;
the initial exact-coordinate assertion was corrected to allow Leaflet's pixel rounding while checking actual serialized
coordinates exactly. All 34 Chrome cases pass (33 in the suite plus that corrected case rerun), as do 20 focused Firefox cases.
Full app/core checks, extension packaging and signed APK checks pass. The user reports quick XPI smoke behaves as
before; general extraction smoke is accepted, without claiming exhaustive feature coverage or APK device testing.

## Portal selection, details and context ownership extraction — 2026-10-27

Reference checkpoint: `core/code/portal.js` owns portal-link navigation/pending selection;
`portal_display.js` owns selection/display updates; `portal_details.js` owns detail requests/cache and promotion of
detailed entities. Preserve the existing IRIS selection/message order, orange selection overlays, shared history,
12-entry detail cache and cancellation guards. Move browser selection/navigation to `map/map-selection-runtime.ts`,
detail requests/cache to `portals/portal-details-runtime.ts`, and context hit-testing/gestures to
`map/map-context-actions.ts`. The IRIS context sheet/long press remains its existing deliberate shell behavior;
no new IITC hooks, cache expiry/retry parity or rendering changes are introduced. Core algorithms remain unchanged.
Eighteen focused regressions cover pending/loaded navigation, selection ordering, visibility, detailed entity promotion,
cache reuse/limits, auth/server failures and cancelled/obsolete responses. Source comparison checks all moved functions
and the detail-promotion block after explicit dependency substitutions. Real browser checks cover context targets,
detail-cache reuse, pending portal arrival and map replacement. The initial replacement fixture also failed before
extraction: it matched another portal at the same coordinates and later refreshed to an empty map. The corrected
fixture uses a missing GUID and retains the arriving portal in subsequent responses. General XPI user smoke is accepted.

## COMM ownership extraction — 2026-10-27

Reference checkpoint: `core/code/comm.js` owns channel buffers, continuation requests and `sendPlext`;
`plugins/player-activity-tracker.js` consumes public COMM activity. Extracted the existing IRIS browser workflow into
`comm/comm-runtime.ts`; pure parsing/planning/state algorithms remain in core. Player Tracker keeps its existing
request/response seam, backed by the same public buffer. Preserve request payloads, preview conversion, messages,
storage keys, send/fetch cancellation differences and map-lifetime guards. This changes ownership only; existing
COMM parity gaps and cancelled-panel loading behavior remain separate follow-ups. Twelve focused runtime regressions
and real-panel Chrome/Firefox checks cover shared tracker data, channel isolation/continuations, sending, errors and
cancellation. Source comparison confirms the ten moved functions retain their bodies after explicit dependency
substitutions; extension packaging and signed APK checks pass. Subsequent general XPI extraction smoke is accepted.

## Scores, Passcode and Inventory ownership extraction — 2026-10-27

Reference seams: `core/code/game_status.js`, `region_scoreboard.js` and `redeeming.js` own score endpoint updates and
passcode redemption/reward display. Inventory/subscription are existing IRIS additions using Intel's `getInventory`
and `getHasActiveSubscription` endpoints, with decoding/counting already in core. Extracted existing panel request state,
response-to-UI conversion and cancellation into `map/scores/scores-runtime.ts`, `agent/passcode/passcode-runtime.ts` and
`agent/inventory/inventory-runtime.ts`. Preserved parallel score requests, passcode sanitation,
shared subscription requests, selected-portal key counts and message order. Panel cancellation still leaves the shared
subscription request running; map disposal cancels it and resets only a loading subscription. No new behavior or hooks.
Sixteen focused regressions and real-panel browser flows cover score/reward conversion, key selection, stale-response
rejection and shared subscription lifetime. An existing cancellation/reopen loading-state issue is recorded in the backlog.

## Missions and Player Tracker ownership extraction — 2026-10-27

Reference seams: `plugins/missions.js` owns mission list/detail requests and age-limited portal/mission caches;
`plugins/player-activity-tracker.js` owns player history, COMM-derived mutations, marker/trace layers and popups.
Extracted those existing IRIS workflows into `map/missions/missions-runtime.ts` and `map/player-tracker/player-tracker-runtime.ts`,
retaining mission endpoint names, cache keys/ages, player history/deduplication and refresh timing. Shared COMM channel data subsequently moved into the COMM owner above; map disposal
cancels feature requests/timers and clears markers while retaining page-lifetime caches/history. Existing mission
overlay and grouped-player helpers remain their rendering collaborators. This is an internal extraction, with no
new plugin hooks or intentional behavior changes; existing grouped-marker and mission-navigation differences remain.
Thirteen focused regressions cover cache reuse/expiry, request cancellation, grouping/filtering, history retention and
poll timing. Real Leaflet browser checks cover mission requests/cache reuse and grouped-player list/history/back
navigation across map replacement in Chrome and Firefox.

## Map request ownership extraction — 2026-10-27

Reference seams: `core/code/map_request.js`, `map_cache.js`, `send_request.js`, `request_handling.js`, and `artifact.js`.
IITC's Request owns refresh generations, tile queues/cache and delivery to the renderer; artifacts inject extra entities.
Extracted existing IRIS coordination into `map/map-request.ts`, retaining the tested core queue/cache algorithms.
`intel/intel-request.ts` supplies shared page-context CSRF/version/auth helpers and lifetime-bound endpoint transport.
Movement/download delays, retries, wanted-response bridging, fixture/live switching, diagnostics and map-lifetime
cancellation are retained. This is an internal ownership change, with existing IRIS/IITC
timing and artifact behavior retained; no new hooks or public plugin surface. Regression tests cover concurrent/stale
responses, cache/retry delivery, source changes, authentication and disposal; a browser check runs simulated TIMEOUT
recovery and cached refresh through real Leaflet layers. Rendering semantics and visual timing are unchanged by intent.

## Entity renderer ownership extraction — 2026-10-27

Reference seams: `core/code/map_renderer.js`, `portal_marker.js`, `portal_highlighter.js`, and `layerchooser.js`.
Extracted existing portal/link/field construction, visibility filters, persistent groups, incremental synchronization,
highlighter style refresh and portal overlays into `map/entities/map-renderer.ts`. Preserved object reuse, faction/level fast
paths, diagnostics, pane/style order, pending portal selection and map replacement semantics. Requests, selection state,
and the page message bridge keep their existing owners. Shared layer types/pane names live in `map/map-layers.ts`.
This is an internal extraction with no intentional behavior changes or new public hooks. Real Leaflet browser regressions
cover unchanged/replaced/removed entities, overlay/faction/level/unclaimed filters, highlighter style reuse and replacement-map
resources. The entry point is 3,962 lines, down from 5,506 after the preceding split.

## Map runtime ownership split — 2026-10-27

This is an extraction of existing IRIS behavior, using reference `core/code/search_query.js`, `search_query_results_view.js`,
`plugins/draw-tools.js`, and `plugins/missions.js` for domain naming and ownership. Search owns its query generation and
preview/selection paths; Draw Tools owns stored item mutations and rendering; mission overlays own route/waypoint layers.
Request coordination and entity rendering now have the separate owners above. The page entry point retains panel
COMM/portal-detail requests, shared panes and layer arrays, and map lifetime disposal. Existing message names, persisted formats, render styles/order, geocoder
fallback, and documented IRIS/IITC behavior differences remain. Map disposal invalidates Search and aborts its fetches
through the same lifetime. Draw Tools highlight state retains its page lifetime across map replacement. No public hooks
or plugin API are introduced. Focused regressions cover stale Search completion, stored indexes and current settings,
mission waypoint interactions and replacement-map navigation; browser checks exercise real Leaflet layers after replacement.

## Search interaction simplification — 2026-10-25

Reference: `reference/ingress-intel-total-conversion/core/code/search.js`, `search_query.js`, and
`search_query_results_view.js`. IITC submits confirmed searches from the input and gives result rows keyboard focus;
its row click/Enter paths distinguish selection from zoom. IRIS deliberately offers one navigation action per result:
Enter in the field submits an online search, arrows or Tab focus result buttons, and click/Enter on a button navigates.
The `/` shortcut opens or refocuses the search input; menu opening does not automatically focus it. Existing text-field
editing and the global shortcuts preference still take precedence.
Point results center at zoom 15; address/area bounds are fitted with a maximum zoom of 15, matching reference IITC's
`DEFAULT_ZOOM` in `core/total-conversion-build.js`. Search uses its own constant so the initial map overview stays at 11.
The separate Zoom button and Shift+Enter variant are removed to avoid overlapping actions. Hover/focus previews,
local debounce, request sequencing, and map-focus/portal-sheet behavior remain. Confirmed submission cancels pending
local work, matching IITC; the guard also covers submission before the deferred input effect runs. Closing or leaving
Search clears its preview and floating badge while retaining the query, results, and map view. Browser checks cover
fast submission, focus in displayed group order, point navigation, area fitting, portal selection, and close/reopen.

## Current Status - 2026-10-20

IITC IRIS has the core live-map path, entity rendering, geodesic links/fields, portal selection/details, COMM, scores,
missions, inventory, passcodes, agent profile, player tracker, search, diagnostics, Draw Tools v1 links/markers, and
portal analysis Counts/List/Scoreboard views. CSS/component ownership, feature composition, and repository/runtime
cleanup are complete; see [Application Architecture](architecture.md) for the retained ownership contract and limits.

The extension version is `0.1.2`. Latest verification passed 112 core and 405 app tests, lint/typechecks, CSS lint,
workbench build, and Chrome/Firefox packaging. The user reported the cleanup smoke test passed. Build/install commands
and artifact naming are maintained in the [root README](../../README.md#development).

Only `apps/iitc-iris` and `packages/iitc-core` remain active. The retired diagnostics fixture choices and empty fallback
maps were removed; the app uses live Intel data. Retained [payload samples](fixtures/README.md) are reference material.
Android hosting remains unproven and is governed by the [APK plan](plans/android-apk-installable-plan.md).

Base-map divergence (2026-10-21): CARTO’s key requirement prompted replacing Dark/Light with OpenFreeMap
Dark/Positron through MapLibre’s Leaflet binding. This changes basemap cartography, while Leaflet retains camera,
overlay, and interaction ownership; OSM remains available. Preference migration and real-tile browser checks pass.
The user tested the updated XPI and APK and reported both look fine (2026-10-21).
Recovery divergence (2026-10-25): IRIS additionally switches to OSM after unresolved OpenFreeMap style/network or
WebGL failures. `map/layers/base-layer-controller.ts` owns recovery deadlines and cleanup; the layers workflow reflects
and persists the actual selection with a dismissible notice. This is IRIS provider resilience, not copied IITC behavior.
Focused lifecycle tests and browser-injected HTTP/style/WebGL failures pass; live phone background/resume is pending.

Cross Links correction (2026-10-21): port `cross-links.js` whole-arc classification and tolerant shared-anchor
checks into pure core helpers, replacing IRIS's sampled planar intersections. Intentional delta: omit the upstream
raw-longitude rejection and recognize equivalent wrapped endpoints so crossings across the antimeridian work.
Compare the focused fixtures with upstream: ordinary/shared-anchor results should agree; wrapped cases reproduce
and correct the reference limitation. Rendering, visible-link filtering, and runtime ownership remain unchanged;
snapping stays parked with its existing IITC-compatible viewport/nearest-portal behavior. See [Draw Tools](features/draw-tools.md).

## Documentation Layout

Feature details have been split out of this entry point so the current truth is easier to scan:

| Area | Status | Detail |
| --- | --- | --- |
| Missions | Partial | [features/missions.md](features/missions.md) |
| Internal registry and lifecycle facades | Native foundation implemented | [features/hook-plugin-lifecycle.md](features/hook-plugin-lifecycle.md) |
| Geodesic rendering | Partial | [features/geodesic-rendering.md](features/geodesic-rendering.md) |
| Map lifecycle | Partial | [features/map-lifecycle.md](features/map-lifecycle.md) |
| Scaffold/request lifecycle | Done/Partial | [features/scaffold-request-lifecycle.md](features/scaffold-request-lifecycle.md) |
| Entity decode and Leaflet rendering | Partial | [features/entity-rendering.md](features/entity-rendering.md) |
| Comparison UI | Implemented / Live comparison | [features/comparison-ui.md](features/comparison-ui.md) |
| Portal selection and details | Implemented / Partial parity | [features/portal-details.md](features/portal-details.md) |
| IITC side request/UI systems | Implemented / Partial parity | [features/side-systems.md](features/side-systems.md) |
| Draw Tools | Stable v1 / Partial | [features/draw-tools.md](features/draw-tools.md) |
| Portal analysis views | Stable v1 / Partial | [features/portal-analysis.md](features/portal-analysis.md) |
| Highlighters and layers | Stabilized v1 / Partial | [features/highlighters-and-layers.md](features/highlighters-and-layers.md) |
| Backlog and watch items | Ongoing | [backlog.md](backlog.md) |
| Roadmap | Ongoing | [plans/index.md](plans/index.md) |

## Current High-Level Gaps

- Map lifecycle is parked as acceptable for current UI/plugin parity work. Queue refill, old wanted-response bridging,
  IITC comparison timing, incremental core rendering, cache-fresh rendering, and retry recovery have live validation.
  True stale-cache retry exhaustion is still wired/diagnosed but needs a live case that proves cached stale tiles render
  exactly like IITC.
- Plugin-facing compatibility remains intentionally limited: no broad `window.plugin.*`, `addHook`/`runHooks`, toolbox,
  plugin-facing highlighter API, full plugin layer registry, or Leaflet.draw event parity yet. Native highlighter
  selection is stable for existing IRIS highlighter-like behavior and IITC-CE's single active highlighter model. The
  layer registry now has shared metadata/defaults, diagnostics, focused routing for non-core overlays, click-to-pixels
  timing, persistent Leaflet groups for whole `F`/`LN`/`P` overlay hide/show, named IITC-style filter descriptors,
  preserved layer instances for filter-only changes, lazy copied-status counts, and scoped/direct faction buckets. The
  main visual-latency mistake was fixed by deferring heavy copied entity-status reposts until after the map has had two
  animation frames to paint. Faction filters remain the watch item, but the team-subgroup optimization attempt was
  measured and rolled back because it worsened paint timing.
- Draw Tools v1 is links/markers only. Polygons, circles, visible snap cleanup UX, `DrawTools Opt`, stock Intel `pls`,
  and plugin-facing `window.plugin.drawTools` / `pluginDrawTools` remain deferred.
- The bottom-sheet/two-layer menu model is a deliberate product-shell divergence from IITC's sidebar/dropdown/statusbar
  UI.

## Next Planning Entry Points

- For new feature ports, update the relevant feature file or add a new file under `docs/iitc-iris/features/`.
- For cross-cutting parity gaps and prioritization, update [backlog.md](backlog.md).
- Keep this file as the short index, doctrine, latest validation snapshot, and high-level gap summary.
