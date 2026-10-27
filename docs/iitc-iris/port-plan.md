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
fixture uses a missing GUID and retains the arriving portal in subsequent responses. Live user smoke remains pending.

## COMM ownership extraction — 2026-10-27

Reference checkpoint: `core/code/comm.js` owns channel buffers, continuation requests and `sendPlext`;
`plugins/player-activity-tracker.js` consumes public COMM activity. Extracted the existing IRIS browser workflow into
`comm/comm-runtime.ts`; pure parsing/planning/state algorithms remain in core. Player Tracker keeps its existing
request/response seam, backed by the same public buffer. Preserve request payloads, preview conversion, messages,
storage keys, send/fetch cancellation differences and map-lifetime guards. This changes ownership only; existing
COMM parity gaps and cancelled-panel loading behavior remain separate follow-ups. Twelve focused runtime regressions
and real-panel Chrome/Firefox checks cover shared tracker data, channel isolation/continuations, sending, errors and
cancellation. Source comparison confirms the ten moved functions retain their bodies after explicit dependency
substitutions; extension packaging and signed APK checks pass. Live COMM smoke is pending.

## Scores, Passcode and Inventory ownership extraction — 2026-10-27

Reference seams: `core/code/game_status.js`, `region_scoreboard.js` and `redeeming.js` own score endpoint updates and
passcode redemption/reward display. Inventory/subscription are existing IRIS additions using Intel's `getInventory`
and `getHasActiveSubscription` endpoints, with decoding/counting already in core. Extracted existing panel request state,
response-to-UI conversion and cancellation into `map/scores-runtime.ts`, `agent/passcode-runtime.ts` and
`agent/inventory-runtime.ts`. Preserved parallel score requests, passcode sanitation,
shared subscription requests, selected-portal key counts and message order. Panel cancellation still leaves the shared
subscription request running; map disposal cancels it and resets only a loading subscription. No new behavior or hooks.
Sixteen focused regressions and real-panel browser flows cover score/reward conversion, key selection, stale-response
rejection and shared subscription lifetime. An existing cancellation/reopen loading-state issue is recorded in the backlog.

## Missions and Player Tracker ownership extraction — 2026-10-27

Reference seams: `plugins/missions.js` owns mission list/detail requests and age-limited portal/mission caches;
`plugins/player-activity-tracker.js` owns player history, COMM-derived mutations, marker/trace layers and popups.
Extracted those existing IRIS workflows into `map/missions/missions-runtime.ts` and `map/player-tracker-runtime.ts`,
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
WebGL failures. `map/base-layer-controller.ts` owns recovery deadlines and cleanup; the layers workflow reflects
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
