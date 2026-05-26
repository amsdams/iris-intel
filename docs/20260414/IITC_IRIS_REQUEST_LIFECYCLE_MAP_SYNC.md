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

| Concept                        | IITC-CE                                                                                                                                                                               | IRIS                                                                                                                                                                                   | Practical implication                                                                                                                                                    |
|--------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Runtime ownership              | One page-world runtime around global `window.map`, Leaflet layers, globals, and hooks.                                                                                                | Split runtime: extension/content app owns typed store and UI; page-world script owns MapLibre map and sources; communication happens via messages.                                     | IRIS has clearer type boundaries, but every map sync and data update crosses runtime boundaries.                                                                         |
| Map movement start             | `MapDataRequest.mapMoveStart` sets status to `paused`, clears the refresh timeout, and pauses the render queue.                                                                       | Camera messages update store state and bump entity generation. Page-world MapLibre movement now marks runtime movement state, coalesces non-urgent `syncData` source publication while moving, and reports moving network/source overlap in benchmarks. | IRIS is now closer to IITC's interaction-protection semantics for source publication, while request scheduling and entity refresh pass ownership remain less centralized. |
| Map movement end               | `mapMoveEnd` checks whether current bounds are inside fetched data bounds at the same zoom, then either resumes existing timer or schedules `MOVE_REFRESH` after 3 seconds.           | `handleMoveMap` schedules `ENTITY_MOVE_SETTLE_MS = 3000`, estimates or uses bounds, updates store camera/viewport, and schedules a move-settle fetch.                                  | IRIS copied the 3s settle idea, but the "already covered by fetched data bounds" logic is only partially represented by coverage/freshness keys.                         |
| Tile math                      | `map_data_calc_tools.js` uses Intel tile params, `getDataZoomForMapZoom`, bounds-to-tile loops, and quadkey-like IDs.                                                                 | `packages/core/src/requests/entities.ts` implements similar tile math with `buildEntityRequestPayload`, `getDataZoomForMapZoom`, coverage keys, and a max tile cap.                    | This is a strong semantic port area. Differences should be audited carefully because tile count differences directly affect benchmarks.                                  |
| Request batching               | IITC uses `MAX_REQUESTS = 5`, `NUM_TILES_PER_REQUEST = 25`, adaptive bucket sizing, and per-tile retry accounting.                                                                    | IRIS uses `batchEntityTileKeys`, currently batching tile keys before posting `IRIS_ENTITIES_FETCH`; active request behavior is split across coordinator/interceptor/session runtime.   | IRIS recently moved closer to IITC. Remaining difference: IITC has one queue that knows active request count, retries, and render progress together.                     |
| Cache model                    | IITC has `DataCache`; fresh tiles are rendered from cache immediately, stale data can be used after retry exhaustion, and tile freshness is central to queue construction.            | IRIS has store-level `tileFreshness`, endpoint freshness, coverage keys, and entity culling. Responses merge into normalized store state.                                              | IRIS can avoid requests, but does not have the same "render fresh cache first, then stream missing tiles into the render queue" lifecycle.                               |
| Request cancellation/staleness | IITC does not abort map-data requests; it ignores returned tiles that are no longer wanted because the tile is no longer in `queuedTiles`.                                            | IRIS uses entity refresh generations. Stale active entity work can be dropped in session runtime and stale responses are ignored with diagnostics counters.                            | Both avoid applying stale map data, but via different mechanisms. IRIS's generation model fits extension messaging better.                                               |
| Retry semantics                | IITC tracks tile-specific `error`, `RETRY`, `TIMEOUT`, unaccounted tiles, retry counts, stale-cache fallback, and different queue delays.                                             | IRIS has endpoint request gate, endpoint diagnostics, retry count for entity endpoint failures, and per-endpoint cooldown/freshness.                                                   | IITC's retry is tile-granular. IRIS retry is more endpoint/generation oriented. Tile-granular retry may be worth porting later if holes or 400/timeout behavior persist. |
| Render scheduling              | IITC has a render queue, batch size, pause delay, and `pauseRenderQueue` during map movement. It processes deleted GUIDs and entities in chunks.                                      | IRIS parses and stores entities, then publishes GeoJSON source snapshots to MapLibre. Non-urgent `syncData` publication is now deferred/coalesced while moving, with urgent camera/selection/snapshot paths still immediate. | IRIS now ports the spirit of IITC's movement pause for source publication, but not IITC's incremental entity render queue or tile-level render pass.                      |
| Entity rendering               | IITC creates/updates Leaflet portal markers, links, and fields, including placeholder portals from links/fields, and fires entity hooks.                                              | IRIS parses Intel arrays into typed `Portal`, `Link`, `Field`, creates placeholder portals in `EntityParser`, and converts store state to GeoJSON features for MapLibre.               | IRIS preserves major semantics, but hook timing and update granularity differ from IITC.                                                                                 |
| End-of-render cleanup          | IITC tracks seen portal/link/field GUIDs during a render pass and removes unseen entities at `endRenderPass`.                                                                         | IRIS store merges updates and culls by distance/time; entity removal is explicit via deleted GUIDs and store culling, not tied to a single render pass.                                | IRIS may keep broader state than current visible pass. That helps richer UI, but can make source rebuilds heavier unless filtered aggressively.                          |
| Portal details                 | IITC `portalDetail.request` has a per-guid request queue, `DataCache`, parses details, updates the portal entity through `render.createPortalEntity`, and fires `portalDetailLoaded`. | IRIS posts `IRIS_PORTAL_DETAILS_FETCH`; response handling merges detail data into store and UI state. Selection protocol now has shared intent/open-info conversion.                   | IITC portal details directly improve the map object. IRIS details improve the typed store and then derived UI/map snapshots.                                             |
| COMM map coupling              | IITC COMM requests use current map bounds, detect meaningful bounding-box changes, clear channel state on large changes, avoid duplicate channel requests, and use refresh timers.    | IRIS has plext polling, manual COMM fetches, send-then-refresh, and COMM-derived portal/entity refresh hints. It can schedule entity refresh after activity.                           | IRIS has richer topology refresh hints, but this is a potential source of normal-use request bursts and map updates during interaction.                                  |
| Idle behavior                  | IITC checks `window.isIdle()` before refreshes and has idle resume delay.                                                                                                             | IRIS has idle entity polls, visibility/session/offline checks, startup grace, and endpoint next-auto-refresh diagnostics.                                                              | IRIS is more explicit diagnostically, but less centralized than IITC's `MapDataRequest` state machine.                                                                   |
| Diagnostics/status             | IITC status is short/long/progress and displayed in the status bar. Debug tiles can show tile state.                                                                                  | IRIS tracks endpoint diagnostics, activity logs, source feature counts, source `setData` times, viewport performance samples, stale drops, coverage keys, benchmark preload lines, and per-scenario moving network/source overlap. | IRIS now has stronger observability than IITC for before/after profiling; normal-use request/source chain diagnostics are still a future refinement.                      |
| Plugin integration             | IITC has global hooks like `mapDataRefreshStart`, `mapDataRefreshEnd`, `requestFinished`, `portalAdded`, `linkAdded`, `fieldAdded`, `portalRemoved`, and `portalDetailLoaded`.        | IRIS has a typed plugin manager and plugin feature source publication. It does not expose the full IITC hook lifecycle as a compatibility layer.                                       | This is a semantic-port gap. Existing IITC plugins expect event timing around data and entity mutation, not just a rendered feature source.                              |
| Extension wrapper              | IITC-Button mainly injects/runs IITC and provides an XHR sandbox/popup/plugin management. It is not where the core map-data lifecycle lives.                                          | IRIS extension code owns much more of the actual app runtime: request coordination, store, diagnostics, UI, and page-runtime sync.                                                     | Comparing IRIS to IITC-Button alone is misleading; the relevant lifecycle is in IITC-CE core.                                                                            |

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

Potential gap:

- IRIS has stale-response protection, but not a direct equivalent to "pause render queue while moving" for MapLibre
  `setData` publication.
- This matters for perceived pan lag on mobile: even if network requests are correctly delayed, an old response or
  COMM-triggered update can still cause parsing/merge/source publication during interaction.

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

Potential gap:

- IITC's coverage reuse is geometric: "does fetched data bounds contain the current bounds at the same zoom?"
- IRIS's reuse is key/freshness based: "is this exact coverage key or these tiles fresh enough?"
- The IRIS model is easier to diagnose and works across extension messages, but it may fetch more often than IITC if
  coverage keys change for small viewport movement.

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

Potential gap:

- IITC sorts requested tiles by center distance. IRIS currently batches tile keys as generated by the helper.
- If IRIS fetches a large view, center-first ordering may improve perceived load because relevant visible data appears
  before edge data.

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

## Main Performance Questions

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
freshness, but coverage keys may differ frequently.

Possible improvement:

- Store last fetched data bounds per data zoom.
- Skip move-settle entity fetch if current bounds are contained and tile TTL is still acceptable.
- Keep current coverage-key diagnostics so differences remain visible.

### Do COMM refresh hints trigger too much map work?

IRIS has COMM-driven portal/entity refresh hints, which are useful. IITC COMM mainly manages chat channel state and
bounds-sensitive COMM requests; it does not appear to drive the same typed map-refresh topology logic.

Possible improvement:

- Add normal-use diagnostics showing "COMM hint -> request -> parse -> source update" chains.
- Suppress or defer COMM-driven source publication during active pan/zoom.
- Batch portal-detail refreshes and entity refreshes into a single post-move flush.

## What to Port Semantically From IITC Next

1. **Map-data pass concept**

   Create an explicit runtime concept for an entity refresh pass that spans tile coverage, queued batches, active
   batches, response parsing, store merge, source publication, and stable frame.

2. **Interaction-aware render/source queue**

   Partially aligned. IRIS now ports the spirit of `pauseRenderQueue` for non-urgent MapLibre source publication during
   movement. Remaining work is around request scheduling, refresh-pass ownership, and unchanged-source suppression.

3. **Geometric coverage containment**

   Port IITC's "new bounds contained by fetched data bounds at same zoom" check, adapted to IRIS bounds and data zoom.

4. **Tile-level retry/fallback**

   Keep endpoint diagnostics, but investigate whether tile-specific retry and stale-tile fallback would reduce
   empty/holey map states.

5. **Center-first tile ordering**

   Sort missing tile requests by distance from viewport center, especially for broad mobile/desktop views.

6. **IITC hook lifecycle compatibility layer**

   If plugin compatibility becomes a goal, define typed equivalents for `mapDataRefreshStart`, `mapDataRefreshEnd`,
   `portalAdded`, `portalRemoved`, `linkAdded`, `fieldAdded`, and `portalDetailLoaded`.

## Suggested Measurement Improvements

These are worth adding before more request/map scheduler changes:

- Per scenario: count active entity requests, passive entity responses, COMM requests, portal-detail requests, and
  source publications. Done for compact endpoint/source counters; deeper request-chain timing remains open.
- Per scenario: record whether each source publication and successful endpoint response happened while the map was
  moving.
- Per source update: record reason (`entities`, `portal-details`, `comm-activity`, `selection`, `plugins`,
  `bench-preload`, etc.).
- Per entity refresh pass: record requested tile count, skipped fresh tile count, active batch count, retry count, parse
  time, store merge time, source build time, source `setData` time, and stable-frame delay.
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
