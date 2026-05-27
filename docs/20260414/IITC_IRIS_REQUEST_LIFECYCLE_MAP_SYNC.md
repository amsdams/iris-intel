# IITC vs IRIS: Request Lifecycle and Map Sync

This note compares the "request lifecycle and map sync" part of IITC-CE with the current IRIS runtime. The goal is not
to decide that IITC is always better. It is to make the semantic boundary explicit: what IITC already solved over years,
what IRIS has reimplemented in a modern MapLibre/extension runtime, and where we should investigate performance or
correctness regressions.

Primary local references:

- IITC request lifecycle: `reference/IITC-CE/core/code/map_data_request.js`
- IITC render lifecycle: `reference/IITC-CE/core/code/map_data_render.js`
- IITC tile math: `reference/IITC-CE/core/code/map_data_calc_tools.js`
- IITC portal details: `reference/IITC-CE/core/code/portal_detail.js`
- IITC COMM lifecycle: `reference/IITC-CE/core/code/comm.js`
- IITC extension wrapper: `reference/IITC-Button/src/xhr-sandbox.js`
- IRIS request coordinator: `apps/iris/src/content/runtime/request-coordinator.ts`
- IRIS page-world MapLibre runtime: `apps/iris/src/content/page-map-runtime.ts`
- IRIS page runtime protocol: `apps/iris/src/shared/page-map-runtime-protocol.ts`
- IRIS entity tile request helpers: `packages/core/src/requests/entities.ts`
- IRIS endpoint request policy: `packages/core/src/endpoint-request-policy.ts`
- IRIS store/map state/diagnostics: `packages/core/src/store.ts`
- IRIS entity parser: `packages/core/src/parsers/EntityParser.ts`

## High-Level Difference

IITC's map data lifecycle is one integrated page-world state machine around Leaflet:

1. Leaflet map movement starts.
2. IITC pauses rendering and cancels refresh timers.
3. Leaflet map movement ends.
4. IITC checks whether the new view is already covered by previously fetched data.
5. IITC schedules a delayed refresh.
6. IITC computes tile coverage, reads fresh tile cache entries, queues stale/missing tiles, sends capped concurrent tile
   batches, retries per tile, and pushes returned entities into a throttled render queue.
7. Rendering is incremental Leaflet object mutation: delete/update/create portals, links, and fields.
8. Hooks fire around map data refresh, request completion, entity creation/removal, and portal details.

IRIS splits the same broad problem across a browser extension/content runtime, a page-world MapLibre runtime, typed
messages, Zustand store state, core request helpers, and GeoJSON source publication:

1. MapLibre camera changes are bridged from page world to content UI/runtime messages.
2. IRIS updates typed map state in the store.
3. A request coordinator schedules entity refreshes for startup, move-settle, idle, resume, manual, retry, and COMM
   activity.
4. Core tile helpers compute tile keys and coverage keys.
5. The coordinator gates requests by in-flight/freshness/cooldown and per-tile freshness.
6. Active extension requests are posted to the page/interceptor runtime.
7. Responses are parsed into typed portals/links/fields and merged into store state.
8. UI snapshot builders publish GeoJSON FeatureCollections to the page-world MapLibre runtime, which calls `setData` on
   MapLibre sources.
9. Diagnostics track endpoint state, request history, stale generations, source feature counts, and source `setData`
   timings.

That means IRIS is not merely "IITC with MapLibre." The request lifecycle and map sync layer is modern bespoke runtime
logic. Some of it is necessary because extensions, MapLibre, TypeScript state, and Preact UI are different. Some of it
may be accidental complexity that we should keep refining toward IITC's proven semantics.

## Concept Comparison

Status legend:

- **Aligned**: IRIS intentionally matches the IITC semantic behavior closely.
- **Partial**: IRIS implements the same intent, but the mechanism or coverage is incomplete.
- **Gap**: IITC has a behavior IRIS likely should evaluate or port.
- **Different by design**: IRIS intentionally uses a different architecture because of MapLibre, TypeScript, or the
  extension/page-world split.

| Concept                        | Status              | IITC-CE                                                                                                                                                                               | IRIS                                                                                                                                                                                   | Gap / next action                                                                                                                                                       |
|--------------------------------|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Runtime ownership              | Different by design | One page-world runtime around global `window.map`, Leaflet layers, globals, and hooks.                                                                                                | Split runtime: extension/content app owns typed store and UI; page-world script owns MapLibre map and sources; communication happens via messages.                                     | Keep the split, but keep diagnostics strong because every map sync and data update crosses runtime boundaries.                                                          |
| Map movement start             | Partial             | `MapDataRequest.mapMoveStart` sets status to `paused`, clears the refresh timeout, and pauses the render queue.                                                                       | Page-world MapLibre movement marks runtime movement state, coalesces non-urgent `syncData` source publication while moving, and reports moving network/source overlap in benchmarks.  | Source-publication protection is aligned in spirit; request scheduling and entity refresh pass ownership remain less centralized than IITC.                              |
| Map movement end               | Mostly aligned      | `mapMoveEnd` checks whether current bounds are inside fetched data bounds at the same zoom, then either resumes existing timer or schedules `MOVE_REFRESH` after 3 seconds.           | `handleMoveMap` schedules `ENTITY_MOVE_SETTLE_MS = 3000`; move-settle entity refresh now skips when the current viewport is inside the last tile-aligned fetched data bounds at the same floored zoom and data is still fresh. | Remaining difference: IRIS still lacks one unified pass object that owns the timer, request queue, retries, render queue, and final refresh status.                    |
| Tile math                      | Mostly aligned      | `map_data_calc_tools.js` uses Intel tile params, `getDataZoomForMapZoom`, bounds-to-tile loops, and quadkey-like IDs.                                                                 | `packages/core/src/requests/entities.ts` implements similar tile math with `buildEntityRequestPayload`, `getDataZoomForMapZoom`, coverage keys, antimeridian handling, and a max cap. | Keep auditing because tile count differences directly affect benchmarks; otherwise this is one of the strongest semantic-port areas.                                    |
| Tile request priority          | Aligned             | Missing/stale tiles are sorted by projected distance from the map center before they enter `queuedTiles`, so central data is requested first.                                          | `buildEntityRequestPayload` now sorts generated tile keys by distance from the viewport/bounds center before batching, so IRIS and Mini request central data first.                    | Keep an eye on capped extreme coverage: center-first ordering applies to the generated candidate set, while the safety cap still prevents unbounded tile lists.          |
| Request batching/concurrency   | Partial             | IITC uses `MAX_REQUESTS = 5`, `NUM_TILES_PER_REQUEST = 25`, adaptive bucket sizing, and per-tile retry accounting.                                                                    | IRIS batches tile keys in 25s and uses strict request limiting, but active request behavior is split across coordinator/interceptor/session runtime.                                   | Batching/concurrency are close; one unified map-data pass would make active count, retry, and render progress easier to reason about.                                  |
| Cache model                    | Gap                 | IITC has `DataCache`; fresh tiles are rendered from cache immediately, stale data can be used after retry exhaustion, and tile freshness is central to queue construction.            | IRIS has store-level `tileFreshness`, endpoint freshness, coverage keys, and entity culling. Responses merge into normalized store state.                                              | IRIS can avoid requests, but does not have "render fresh cache first, then stream missing tiles" as an explicit lifecycle.                                              |
| Request cancellation/staleness | Aligned intent      | IITC does not abort map-data requests; it ignores returned tiles that are no longer wanted because the tile is no longer in `queuedTiles`.                                            | IRIS uses entity refresh generations. Stale queued entity requests are now purged as soon as a newer generation is known, stale active entity work can still be dropped in session runtime, and stale responses are ignored with diagnostics counters. | Mechanism differs, but the user-visible semantic goal is aligned: do not apply stale map data.                                                                          |
| Retry semantics                | Gap                 | IITC tracks tile-specific `error`, `RETRY`, `TIMEOUT`, unaccounted tiles, retry counts, stale-cache fallback, and different queue delays.                                             | IRIS has endpoint request gate, endpoint diagnostics, retry count for entity endpoint failures, and per-endpoint cooldown/freshness.                                                   | Tile-granular retry/fallback may be worth porting if holes, 400s, or timeouts remain visible.                                                                          |
| Render scheduling              | Partial             | IITC has a render queue, batch size, pause delay, and `pauseRenderQueue` during map movement. It processes deleted GUIDs and entities in chunks.                                      | IRIS publishes GeoJSON source snapshots to MapLibre. Non-urgent `syncData` publication is deferred/coalesced while moving; urgent camera/selection/snapshot paths stay immediate.     | Movement protection is aligned in spirit; IRIS still lacks IITC's incremental entity render queue and tile-level render pass.                                          |
| Entity rendering               | Partial             | IITC creates/updates Leaflet portal markers, links, and fields, including placeholder portals from links/fields, and fires entity hooks.                                              | IRIS parses Intel arrays into typed `Portal`, `Link`, `Field`, creates placeholder portals in `EntityParser`, and converts store state to GeoJSON features for MapLibre.               | Data semantics are close; hook timing and update granularity differ.                                                                                                   |
| Low-zoom movement rendering    | Different by design | IITC keeps Leaflet layers but protects movement by pausing queued render work.                                                                                                        | At z10 and below, IRIS hides main link/field layers while moving and restores them on move end; selected link/field layers stay visible.                                               | This is a MapLibre-specific performance guard, not an IITC port. Keep only if mobile z8 benches and manual panning confirm the tradeoff feels right.                   |
| End-of-render cleanup          | Gap                 | IITC tracks seen portal/link/field GUIDs during a render pass and removes unseen entities at `endRenderPass`.                                                                         | IRIS store merges updates and culls by distance/time; entity removal is explicit via deleted GUIDs and store culling, not tied to a single render pass.                                | A refresh-pass concept could make cleanup/source scope clearer and reduce retained broad state.                                                                         |
| Portal details                 | Partial             | IITC has a per-guid request queue, `DataCache`, parses details, updates the portal entity through `render.createPortalEntity`, and fires `portalDetailLoaded`.                       | IRIS posts `IRIS_PORTAL_DETAILS_FETCH`; response handling merges detail data into store and UI state. Selection protocol now has shared intent/open-info conversion.                   | Details work, but IITC plugin hook timing and direct map-object update semantics are not represented.                                                                  |
| COMM map coupling              | Partial / gap       | IITC COMM requests use current map bounds, detect meaningful bounding-box changes, clear channel state on large changes, avoid duplicate channel requests, and use refresh timers.    | IRIS has plext polling, manual COMM fetches, send-then-refresh, and COMM-derived portal/entity refresh hints that can schedule targeted details/topology refresh.                     | IRIS has richer topology hints, but still needs request/source chain diagnostics to prove it does not create normal-use bursts.                                        |
| Idle behavior                  | Partial             | IITC checks `window.isIdle()` before refreshes and has idle resume delay.                                                                                                             | IRIS has idle entity polls, visibility/session/offline checks, startup grace, and endpoint next-auto-refresh diagnostics.                                                              | IRIS is explicit diagnostically, but less centralized than IITC's `MapDataRequest` state machine.                                                                      |
| Diagnostics/status             | IRIS ahead          | IITC status is short/long/progress and displayed in the status bar. Debug tiles can show tile state.                                                                                  | IRIS tracks endpoint diagnostics, activity logs, source counts/timing, viewport perf, stale drops, coverage keys, preload lines, moving network/source overlap, and long-task deltas. | Keep using this advantage to validate each semantic-port step with before/after reports.                                                                               |
| Plugin integration             | Gap                 | IITC has global hooks like `mapDataRefreshStart`, `mapDataRefreshEnd`, `requestFinished`, `portalAdded`, `linkAdded`, `fieldAdded`, `portalRemoved`, and `portalDetailLoaded`.        | IRIS has a typed plugin manager and plugin feature source publication. It does not expose the full IITC hook lifecycle as a compatibility layer.                                       | Existing IITC plugins expect event timing around data/entity mutation, not just rendered feature sources.                                                              |
| Extension wrapper              | Different by design | IITC-Button mainly injects/runs IITC and provides an XHR sandbox/popup/plugin management. It is not where the core map-data lifecycle lives.                                          | IRIS extension code owns much more of the actual app runtime: request coordination, store, diagnostics, UI, and page-runtime sync.                                                     | Compare IRIS to IITC-CE core for lifecycle decisions; IITC-Button is mostly wrapper infrastructure.                                                                    |

## Lifecycle Walkthrough

### 1. Map Move Starts

IITC:

- Leaflet emits `movestart`.
- `MapDataRequest.mapMoveStart` sets status to `paused`.
- It cancels any pending refresh timeout.
- It calls `pauseRenderQueue(true)`, clearing render queue timers.

IRIS:

- MapLibre camera changes are reported from the page-world runtime using `IRIS_PAGE_MAP_RUNTIME_CAMERA_CHANGED`.
- Content/runtime handles move commands through `handleMoveMap`.
- Store camera/viewport state is updated through `updateMapCamera` or `updateMapViewport`.
- Entity refresh generation is incremented and broadcast so stale active work can be dropped.

Current status:

- IRIS now coalesces non-urgent source publication while the page-world map is moving and reports moving
  network/source overlap in benchmark rows.
- This aligns with the spirit of IITC's render-queue pause, but not with its exact implementation: parsing and store
  merge can still happen before the deferred MapLibre `setData` pass.

### 2. Map Move Ends / Settles

IITC:

- Leaflet emits `moveend`.
- IITC clamps bounds and compares them with `fetchedDataParams`.
- If the same zoom and the new viewport is inside already fetched data bounds, it avoids a new request and resumes the
  previous timer.
- Otherwise it schedules refresh after `MOVE_REFRESH = 3` seconds.

IRIS:

- IRIS schedules entity fetch after `ENTITY_MOVE_SETTLE_MS = 3000`.
- It stores or estimates viewport bounds.
- It uses `buildEntityRequestPayload` to compute tile keys and a coverage key.
- It gates requests by in-flight status, last success coverage key, endpoint freshness, and per-tile freshness.

Current status:

- IRIS now has the same important user-visible skip behavior: a move-settle entity refresh is skipped when the current
  viewport is contained by fresh tile-aligned fetched bounds at the same floored zoom.
- Coverage keys and tile freshness remain useful diagnostics, but small moves no longer have to fetch just because the
  exact coverage key changed.

### 3. Tile Coverage and Data Zoom

IITC:

- Detects or falls back to Intel's `ZOOM_TO_LEVEL` and `TILES_PER_EDGE`.
- Computes a data zoom with `getDataZoomForMapZoom`.
- Calculates intersecting tiles for current bounds.
- Expands data bounds to full tile boundaries.
- Sorts missing tiles by distance from map center so central data arrives first.

IRIS:

- Core helpers implement equivalent zoom/tile concepts.
- `buildEntityRequestPayload` computes tile keys, `dataZoom`, `coverageKey`, and diagnostics.
- It caps huge coverage at `MAX_ENTITY_TILE_KEYS`.
- Current benchmark preload reports tile count, batch count, data zoom, and diagnostics.

Current status:

- IRIS now sorts generated tile keys by distance from the viewport/bounds center before batching.
- This is aligned with IITC's center-first queue priority for the generated candidate set. The remaining difference is
  only the IRIS safety cap for extreme coverage, which still prevents unbounded tile lists.

### 4. Request Queue and Retry

IITC:

- Maintains one map-data request state machine: active count, requested tile set, queued tile set, error counts, render
  queue, and status.
- Limits concurrent tile requests with `MAX_REQUESTS = 5`.
- Uses up to `NUM_TILES_PER_REQUEST = 25`.
- Requeues failed/timeout/retry tiles, with different queue delays.
- Uses stale cache data after retry exhaustion when available.

IRIS:

- The coordinator decides whether to run and posts one fetch message per batch.
- The active-request/session runtime can drop stale entity generations.
- Store diagnostics track request start/success/failure by endpoint.
- Entity retries are endpoint-level with a retry limit/delay.

Potential gap:

- IITC's queue owns both tile retry state and render progress. IRIS spreads those concerns across coordinator,
  interceptor/session runtime, store diagnostics, parser, and page runtime.
- This is not automatically bad, but it makes "why did this tile/request/render now?" harder to reason about without
  richer diagnostics.

### 5. Response Application

IITC:

- Successful tile data goes into `DataCache`.
- If the tile is still wanted, it is pushed into the render queue.
- Deleted GUIDs and game entities are processed in render batches.
- Fields, links, then portals are processed in that order to work around Leaflet render ordering.
- Entity hooks fire as objects are added/removed.

IRIS:

- `EntityParser.parse` converts Intel arrays into typed partial portals, links, fields, and deleted GUIDs.
- Placeholder portals are created from links/fields where needed.
- Store update methods merge parsed entities and remove deleted entities.
- Snapshot builders produce GeoJSON FeatureCollections.
- Page-world MapLibre runtime calls `source.setData` and records per-source `setData` timings.

Potential gap:

- IITC processes incremental chunks. IRIS often republishes source collections. For a small desktop view this is fine;
  for mobile or broad views it can create main-thread spikes.
- The benchmark already shows source feature counts and `setData` timings, but normal-use diagnostics should also show
  whether network responses and source updates land while the user is moving.

### 6. End of Refresh

IITC:

- When no queued tiles and no render queue remain, `endRenderPass` removes unseen entities, brings portals to front,
  fires `mapDataRefreshEnd`, and schedules the next refresh.
- Refresh interval is based on zoom and total fetch/render duration: close views refresh more frequently than far views,
  with a factor based on actual refresh duration.

IRIS:

- Successful requests update endpoint diagnostics and tile freshness.
- Idle polling is scheduled by zoom threshold: close and far intervals.
- Entity culling runs independently by distance/time.
- There is no single "entity refresh pass complete" state that covers request queue plus render queue plus source
  publication.

Potential gap:

- Benchmarks now emit batch-complete lines, but the runtime itself does not have a single lifecycle object equivalent to
  IITC's map-data pass.
- A shared "refresh pass" diagnostic could connect request start, response parse, store merge, source publication, and
  first stable frame.

## Where IRIS Is Already Close to IITC

- Tile/data zoom semantics are intentionally close.
- The move-settle delay is explicitly IITC-like.
- Entity request batching now follows the same practical idea as IITC's 25-tile request batches.
- Placeholder portals from links/fields exist in the parser.
- Stale entity responses are guarded, even though the mechanism differs.
- Diagnostics are stronger than IITC's original status model for modern performance work.

## Where IRIS Deliberately Differs

- MapLibre sources replace Leaflet object layers.
- Typed store state replaces global `window.portals`, `window.links`, and `window.fields`.
- Extension messages replace direct page-global AJAX calls.
- The page-world map runtime is isolated behind a message protocol.
- Plugin output is currently feature-source oriented, not IITC hook compatible.
- Endpoint policy is explicit and testable in core modules.

These differences are probably correct for a modern runtime, but they make lifecycle design important. Without an
explicit scheduler, a clean typed architecture can still produce bad user-perceived timing.

## Active Alignment Gaps

These are the concrete IITC semantics that are not yet aligned and are worth considering before broader rewrites:

| Gap | IITC behavior | Current IRIS behavior | Why it matters |
|-----|---------------|-----------------------|----------------|
| Unified map-data pass | One object owns queued tiles, active requests, retries, render queue, status, and pass end. | Request coordinator, interceptor/session runtime, store, and page-world source sync still each own part of the lifecycle; IRIS now adds compact entity-pass diagnostics for pass id, generation, reason, requested/total/fresh tiles, batches, and data zoom. | Diagnostics make pass ownership gaps visible, but they are not yet the unified lifecycle object. |
| COMM-triggered topology refresh ownership | COMM lifecycle is bounds-aware and request-timer driven, but it is not the same object as the map-data pass. | IRIS has useful COMM-derived topology hints and now defers COMM topology refreshes while the page-world map is moving or synthetic Bench is running; ownership still lives beside the map-data pass rather than inside it. | COMM can improve live freshness, but its independent timers need explicit coordination so they do not surprise render windows or benchmark timing. |
| Tile-granular retry/fallback | Tracks per-tile errors/timeouts/retries and can render stale cache after retry exhaustion. | Retries are endpoint/generation oriented. | Better behavior for partial tile holes or intermittent Intel tile failures. |
| Source-publication pass lifecycle | Processes entity chunks and pauses that queue during movement. | Coalesces MapLibre source snapshots; movement deferral protects publication, not parsing/store merge/source construction; copied benchmarks show source update counts and moving overlap but not a single publication pass id/reason. | Large source snapshots may still cost more than incremental mutation, and source updates are harder to attribute to an entity/selection/plugin/planning cause. |
| IITC hook lifecycle | Fires map-data and entity lifecycle hooks around refresh and render. | Typed plugins publish feature sources and do not receive full IITC-compatible lifecycle events. | Needed only if semantic plugin compatibility becomes a goal. |

## Main Performance Questions

### Did the benchmark work improve smoothness?

It improved both measurement quality and some real request/source behavior, but the two should be separated:

- Measurement quality improved substantially. Synthetic Bench camera moves no longer drive the live Intel map, Batch waits
  for a confirmed quiet network window, entity in-flight counters are drain-aware, entity-pass diagnostics distinguish
  `current` work from carried context, and COMM topology refreshes are deferred while the page-world map is moving or
  Bench is running.
- Runtime smoothness improved where request/source churn was the cause. Move-settle fetches now skip covered bounds,
  heavy low-zoom link/field layers are hidden while moving, entity source publication is coalesced, and COMM-derived
  refreshes no longer land inside active movement windows.
- The latest desktop batches are now near the browser/device ceiling in most rows. That means remaining desktop smoothness
  work is unlikely to come from more entity request scheduling alone; it should target residual passive artifact/plext
  completions, mobile-only spikes, and source/render costs.

### Does IRIS publish source updates while the user is panning?

IITC pauses the render queue during map movement. IRIS now tracks active page-world movement, reports whether endpoint
successes and source updates land during movement, and coalesces non-urgent `syncData` source publication until after
movement settles.

Possible improvement:

- Keep urgent selection/camera updates immediate.
- Repeat mobile benchmarks to confirm the structural improvement translates into stable phone smoothness.
- Investigate remaining moving-overlap rows as request scheduling, long-task, or renderer issues rather than source
  publication alone.

### Are broad GeoJSON source updates too coarse?

IITC mutates individual Leaflet objects. IRIS publishes FeatureCollections. MapLibre prefers source/layer rendering, but
repeated full `setData` on thousands of features can be expensive.

Possible improvement:

- Keep derived source snapshots memoized by source and entity version.
- Split hot/cold sources more aggressively.
- Avoid rebuilding unchanged sources for endpoint responses that do not affect that source.
- Consider a dirty-source queue with per-source coalescing.

### Is IRIS fetching more often than IITC for small moves?

IITC can skip requests if the current bounds are inside already fetched tile bounds. IRIS has coverage keys and per-tile
freshness, and now also has fetched-bounds containment for move-settle refreshes.

Current status:

- Done for the main move-settle path: rows now report `skip covered by fetched bounds`.
- Keep coverage-key diagnostics so accidental over-fetching remains visible.
- Revisit only if manual use shows redundant fetches outside move-settle, such as COMM or resume flows.

### Do COMM refresh hints trigger too much map work?

IRIS has COMM-driven portal/entity refresh hints, which are useful. IITC COMM mainly manages chat channel state and
bounds-sensitive COMM requests; it does not appear to drive the same typed map-refresh topology logic.

Possible improvement:

- Add normal-use diagnostics showing "COMM hint -> request -> parse -> source update" chains.
- Keep COMM-driven entity refresh deferred during active pan/zoom or explicit benchmark windows.
- Batch portal-detail refreshes and entity refreshes into a single post-move flush.
- Make pending COMM topology timers visible in entity-pass diagnostics so quiet-window logic can distinguish "idle" from
  "about to refresh because COMM activity fired".

## What to Port Semantically From IITC Next

1. **Map-data pass concept**

   Create an explicit runtime concept for an entity refresh pass that spans tile coverage, queued batches, active
   batches, response parsing, store merge, source publication, and stable frame. The first diagnostic step is in place:
   benchmark rows can now say whether the last entity pass was created inside the scenario window or carried from an
   earlier scenario, plus its generation and tile/batch shape.

2. **Interaction-aware render/source queue**

   Partially aligned. IRIS now ports the spirit of `pauseRenderQueue` for non-urgent MapLibre source publication during
   movement. For the mobile z8 renderer bottleneck, IRIS also uses a MapLibre-specific low-zoom movement simplification
   that suspends the heavy main link/field layers during active movement. Source publication pass ownership now has a
   first compact diagnostic: copied rows report `sourcePass current/carry id ... passes ... movingPasses ... reason ...
   passMoving ... sources ... calls ... skipped ... setData ...`. The remaining practical gap is behavioral ownership, not visibility: decide whether
   heavy entity/plugin/planning source passes should be scheduled separately from urgent selection/filter publication.

3. **Tile-level retry/fallback**

   Keep endpoint diagnostics, but investigate whether tile-specific retry and stale-tile fallback would reduce
   empty/holey map states.

4. **IITC hook lifecycle compatibility layer**

   If plugin compatibility becomes a goal, define typed equivalents for `mapDataRefreshStart`, `mapDataRefreshEnd`,
   `portalAdded`, `portalRemoved`, `linkAdded`, `fieldAdded`, and `portalDetailLoaded`.

## Suggested Measurement Improvements

These are worth adding before more request/map scheduler changes:

- Per scenario: count active entity requests, passive entity responses, COMM requests, portal-detail requests, and
  source publications. Done for compact endpoint/source counters; deeper request-chain timing remains open.
- Per scenario: record whether each source publication and successful endpoint response happened while the map was
  moving.
- Per source update: record reason (`entities`, `portal-details`, `comm-activity`, `selection`, `plugins`,
  `bench-preload`, etc.). First pass is now in place: Overlay-originated source publications carry reasons such as
  `entities:portals`, `entities:links`, `entities:fields`, `plugins`, `planning`, `selection`, `visual-filters`, and
  `snapshot`, and deferred/coalesced publication preserves the combined reasons in benchmark rows. Portal/link/field
  store changes now also share one debounced entity patch publication instead of posting separate source messages per
  entity slice. Copied rows also summarize those reasons as `reasonMix urgent/heavy/snapshot/other`, keeping
  selection/filter updates visibly separate from heavy entity/plugin/planning publication before more scheduling changes.
- Per source publication pass: copied rows now report window source pass count, moving pass count, latest source
  publication pass id, current/carry scope, reason string, latest-pass moving flag, source count, real `setData` calls,
  unchanged skips, and pass `setData` time. This is diagnostics-only; it makes pass ownership attributable before
  changing the scheduler.
- Per entity refresh pass: requested tile count, skipped fresh tile count, batch count, generation, reason, and data zoom
  are now recorded in copied benchmark rows. Remaining gaps are active batch completion, retry count, parse time, store
  merge time, source build time, source `setData` time, and stable-frame delay.
- Per scenario: classify isolated benchmark rows as `noise clean` or explain measurement interference with
  `net-moving`, `source-moving`, and `longtask` causes. This keeps slow-frame data intact while making contaminated
  comparisons obvious.
- In normal diagnostics: expose latest "request/source overlap" event so phone lag can be correlated with network and
  rendering.

## Current Read

IRIS is a semantic port for the data model, tile math, placeholder portals, and much of the user-facing behavior. It is
now also partly aligned with IITC's interaction-aware render timing: non-urgent source publication is deferred during
movement and the benchmark can show moving network/source overlap. It is still not a semantic port of IITC's map-data
state machine. The biggest remaining divergence is refresh-pass ownership:

- IITC has one queue that pauses during movement and streams tile responses into incremental Leaflet mutations.
- IRIS has a modern typed pipeline with coalesced post-move source publication, but requests, store merges, and source
  publication are still coordinated across separate content/page-world paths.

The next practical work should not be a literal IITC port. It should be an IITC-informed scheduler/refinement pass:

- preserve IRIS's typed store, MapLibre runtime, diagnostics, and extension boundaries;
- adopt IITC's proven interaction timing and coverage semantics where they solve observed problems;
- measure before/after with diagnostics that include both network lifecycle and source publication lifecycle.
