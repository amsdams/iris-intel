# Map Lifecycle

Map lifecycle is the highest-risk part of the port. For request scheduling, tile cache, stale fallback, render queue
timing, and map-data status, IITC-CE is the contract. IITC IRIS should port the `MapDataRequest` lifecycle directly
enough that live behavior can be compared line-by-line with:

- `reference/ingress-intel-total-conversion/core/code/map_data_request.js`
- `reference/ingress-intel-total-conversion/core/code/data_cache.js`
- `reference/ingress-intel-total-conversion/core/code/map_data_render.js`
- `reference/ingress-intel-total-conversion/core/code/map_data_debug.js`
- `reference/ingress-intel-total-conversion/core/code/map_data_calc_tools.js`

Required map lifecycle rules:

- Use an IITC-style tile-indexed cache, not only whole-response reuse. Fresh cached tiles should enter the render queue
  as `cache-fresh`.
- On retry exhaustion, use stale cached tile data when available and count/report it as stale/out-of-date, matching IITC
  `cache-stale`; do not silently replace this with `partialTileKeys` except as a temporary documented gap.
- Preserve IITC request queue semantics: centre-first tile ordering, `MAX_REQUESTS`, `NUM_TILES_PER_REQUEST`, dynamic
  bucket sizing, retry-count-based smaller batches, request delay constants, and timeout/error retry distinction.
- Preserve IITC render queue semantics: render cached/network/stale tiles through a queue, process incrementally, and
  end the request only after the render queue is drained.
- Preserve map movement lifecycle: pause rendering on move start, refresh after IITC's movement debounce and download
  delay, avoid aborting map-data requests merely because a newer request started, and ignore old tile responses by
  checking whether their tile is still wanted.
- Keep optional side requests, such as artifacts, out of the critical map-data lifecycle unless IITC-CE does otherwise.
  If sequencing differs, document it as temporary and expose diagnostics.
- Do not solve map lifecycle problems with IRIS-style broad fetch/merge/render shortcuts when an IITC lifecycle concept
  exists. Port the IITC concept first, then decide whether a cleaner implementation can preserve the same observable
  behavior.

Current map lifecycle audit:

| Area                     | IITC-CE contract                                                                                                | IITC IRIS status                                                                                                                            | Action                                                                     |
|--------------------------|-----------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| Tile math/data zoom      | `map_data_calc_tools.js` tile params and adjusted data zoom                                                     | Mostly aligned in `packages/iitc-core` with tests                                                                                           | Keep validating against IITC fixtures                                      |
| Initial request batching | `MapDataRequest.processRequestQueue`: max 5 requests, up to 25 tiles, dynamic bucket sizing, centre-first order | Runtime now uses core IITC queue batch helpers for initial live request waves while limiting the initial phase to one attempt per tile before compatibility retries | Validate live timing against IITC-CE on large low-zoom and dense high-zoom views |
| Retry lifecycle          | `requeueTile`, `handleResponse`, retry limit, timeout/error distinction, smaller batches after retries, and queue delays | Retry request failures now flow through the same core response-bucket classifier and queue apply path as initial failures. Core exposes IITC queue-delay constants: normal/timeout/server-retry continue immediately, hard errors and unaccounted responses delay the next refill by 5s. Runtime applies those delays before opening new request slots. Returned-empty placeholder recovery remains a compatibility shim. | Replace returned-empty shim with IITC-derived queue behavior after live validation |
| Tile cache               | `DataCache` per tile, fresh/stale decisions                                                                     | Cache-fresh behavior is accepted after repeated 2026-06-05 Amsterdam z15 live copies showed same-bounds renders staying cache-fresh with no warning strings | Keep as watch-only; reopen only if copied summaries warn about fresh cached tiles being retried |
| Stale fallback           | Retry exhaustion renders stale tile via `cache-stale` when possible                                             | Wired but unproven under live retry exhaustion; copied diagnostics expose `cacheStaleTiles` and `cacheStaleTileKeys`, while current live runs kept `cacheStaleTiles` at 0 | Park unless live copies show cached tiles still ending as partial          |
| Render queue             | `pushRenderQueue` and `processRenderQueue` incrementally render cached, network, and stale tiles                | IITC-named render queue facade handles `cache-fresh`, `ok`, and `cache-stale`; copied diagnostics now expose rendered queue tile counts/statuses. Core can drain the queue in IITC-style entity-count batches while preserving unfinished entries, and runtime now uses that batched drain primitive with IITC's canvas-sized batch limit before rendering merged responses. Runtime tracks core field/link/portal Leaflet layers by GUID and can incrementally add/remove/replace those core layers when render context is unchanged; secondary labels, ornaments, artifacts, selection, and plugin overlays still rebuild normally. | Validate guarded incremental core rendering against IITC-CE, then decide whether to expand mutation to secondary overlays |
| Move lifecycle           | `mapMoveStart` pauses render queue; old non-cancelled tile responses ignored if no longer wanted                | Milestone B continues: IRIS invalidates render generations on `movestart`, clears pending refresh timers, suppresses movement progress renders, and does not abort old map-data fetches when a new live viewport starts. Comparison mode applies IITC's 400ms move debounce plus the 1000ms download-queue delay when live tiles remain queued. Core queue success accounting now only accepts tiles that are still queued/wanted; runtime can drain successful old response payloads into the current refresh when their tiles are still wanted. | Validate fast pan/zoom behavior against IITC-CE; keep moving toward true shared `MapDataRequest` state |
| Artifacts                | IITC artifact subsystem is separate from base map-data tile lifecycle                                           | Mostly aligned after deferring artifact fetch until first map render; live non-empty payload still unverified                               | Keep as documented temporary sequencing until artifact parity is validated |

Adherence summary after 2026-05-31 audit:

- Adheres: IITC tile parameters/data zoom, tile key shape, centre-first tile ordering, max request and tile-per-request
  constants, response bucket classification, timeout/server-retry/error distinction, queue-delay mapping, and copied
  diagnostics for live comparison.
- Partially adheres: dynamic request batching exists in core and now drives initial live request waves; `IitcDataCache`
  and an IITC-named render queue facade now exist; retry-exhausted tiles can use stale cached payloads; core queue state
  ignores successful response tiles that are no longer queued/wanted like IITC; runtime can warm cache from old settled
  responses for tiles still wanted by the current plan. Core render queue draining can now consume partial batches like
  IITC's `processRenderQueue`, and runtime uses that primitive with the same effectively-unbounded canvas batch size
  before rendering merged responses. Runtime progressive rendering now uses GUID-indexed add/remove/replace handling for
  core field, link, and portal layers when render context is stable; it deliberately falls back to full redraw for zoom,
  layer/style context changes, same-object rerenders, and key/history overlay modes. Secondary overlays still redraw as
  before; retry-limit state exists and retry request failures use the same response-bucket path as initial failures.
  Runtime comparison mode now applies IITC's movement debounce and download delay, and old responses can drain into the
  active refresh when their tiles are still queued/wanted. Returned-empty high-zoom recovery is still a compatibility path.
- Does not yet adhere: the runtime still has per-refresh async state instead of one shared IITC-style `MapDataRequest`
  object, so lifecycle parity is bridged rather than structurally identical.
- Map lifecycle is parked as acceptable for current UI parity work. Live copies on 2026-05-31 proved per-tile fresh
  cache and render queue behavior (`cacheFreshTiles` 131/132 and 132/132, first render around 0.1s). Stale fallback is
  wired and diagnosed but remains live-unproven because the test cases did not produce retry exhaustion for previously
  cached tiles. Retry diagnostics are intentionally noisy: `retryRequests` counts retry HTTP batches and
  `retriedTileKeys` includes tiles that recovered. Treat retry volume as a bug only if retries occur for fresh cached
  tiles, cached stale tiles still end as partial, or IITC-CE comparison shows a materially different retry pattern on
  the same viewport.
- Live copy on 2026-06-05 for Amsterdam z15 showed healthy cache-fresh and retry-recovery behavior: same-bounds
  snapshots rendered 42/42 cache-fresh tiles with no retries, while the south-pan reload rendered 36 cache-fresh tiles
  and 6 network `ok` tiles, with 2 timeout-retried tiles recovered and no partials or warning strings. This validates
  the current cache-fresh/retry accounting for that dense view. It still does not close stale fallback parity because
  `cacheStaleTiles` remained 0.
- A second 2026-06-05 Amsterdam z15 copy showed the same pattern across Fast and IITC-delay scenario runs: same-bounds
  snapshots rendered 36/36 cache-fresh tiles, Fast pan recovered 4 timeout-retried tiles after 2 retry requests, and
  IITC-delay pan recovered 2 timeout-retried tiles after 1 retry request. One delay-run reload snapshot intentionally
  caught the request mid-flight (`complete: false`, 34/36 rendered, 2 queued retry tiles), then the following snapshots
  completed cleanly with 36/36 rendered, no partials, and no warning strings. `cacheStaleTiles` remained 0, so stale
  fallback is still a live-unproven branch rather than an active defect.
- Cache-fresh/retry wrap-up: current evidence is sufficient to park this as accepted for the active parity pass. Reopen
  only for a copied summary warning, fresh cached tile retries, retry exhaustion that leaves visible partials, or an
  IITC-CE side-by-side showing a materially different retry pattern on the same viewport. True `cache-stale` fallback
  remains watch-only until a live stale-cache retry-exhaustion case appears.
- Live manual comparison on 2026-06-10 after the tile-wanted old-response patch: repeated west and north pan actions
  compared Firefox with IITC against Firefox Nightly with IITC IRIS. No visible parity regression was found; IITC IRIS
  appeared at least as responsive in that comparison.
- Live manual comparison on 2026-06-10 after switching runtime render queue draining to the batched core primitive:
  repeated pan checks showed no visible cleanup, flicker, stale viewport, or tile-hole regression.
- Runtime implementation note on 2026-06-10: core entity layers are tracked by GUID (`fields`, `links`, and `portals`)
  and use guarded incremental mutation when safe. Layer-setting-only changes now use scoped visibility sync when the
  entity data object is unchanged: field toggles touch fields, link toggles touch links, portal toggles touch portals,
  faction filters touch affected factions across entity kinds, and level/unclaimed filters touch affected portal
  buckets. Highlighter changes use a portal style-refresh path where possible rather than rebuilding entity layers.
- Runtime overlay note on 2026-06-10: secondary overlays are masked by the layer change. Field toggles skip portal
  labels, ornaments, artifacts, and selected-object overlay work. Link toggles refresh link/draw overlays when needed.
  Portal/faction/level/detail changes refresh the relevant portal-side overlays. Draw Tools, tile debug, and player
  tracker toggles route through dedicated overlay paths.
- Core group-toggle note on 2026-06-10: fields, links, and portals now live inside persistent Leaflet layer groups.
  Pure `F`, `LN`, and `P` hide/show toggles can attach or detach the group instead of removing/re-adding every object,
  as long as the current entity layers already exist. Hidden groups are cleared on later data-changing renders so
  re-enabling after a map refresh rebuilds current geometry.
- Filter-layer note on 2026-06-10: faction and level filter-only changes now preserve existing Leaflet layer instances,
  matching IITC-CE's `IITC.filters.FilterLayer` pattern more closely. Filtered entities are removed from their core
  group and later re-added rather than destroyed/recreated. Data-changing renders clear cached hidden layers before
  diffing to avoid stale hidden geometry.
- Filter runtime note on 2026-06-10: core visibility now flows through named IITC-style filter descriptors, where a
  disabled layer activates its filter and visible entities are those not matching any active filter. This replaces the
  earlier scattered `isTeamLayerVisible` / `isPortalLevelLayerVisible` checks with a runtime shape closer to IITC-CE's
  `IITC.filters.filterPortal/filterLink/filterField`.
- Runtime diagnostics note on 2026-06-10: entity status and copied scenario summaries include render mutation
  diagnostics (`full` or `incremental`, plus per-layer added/removed/replaced/unchanged counts). Copied diagnostics also
  include `timing.layerUpdate` for the latest layer update and rolling `timing.interactionUpdates` entries for recent
  layer/highlighter changes. Whole-overlay group toggles report `coreGroupToggleMs`. Use these to confirm manual
  comparisons are exercising the intended incremental, style-refresh, group-toggle, or dedicated-overlay path before
  expanding mutation further.
- Current lifecycle WIP: core layer/filter toggles are much more scoped and filter-only changes now preserve layers.
  Dense Amsterdam z15 JS timings improved, but manual comparison still reports IRIS visual latency behind IITC-CE. The
  next pass should add click-to-pixels diagnostics before changing the render path again: record sent time, runtime
  start, runtime completion, first `requestAnimationFrame`, and second `requestAnimationFrame` for each layer/highlighter
  interaction. Use that to decide whether the remaining gap is content/message dispatch, runtime filter work, Leaflet
  renderer invalidation, or browser paint/compositing. Only then choose between direct dispatch, renderer/pane changes,
  or team/level membership buckets.
- Live fast-pan copies on 2026-06-10 at Amsterdam z15 and z14 kept final states complete. The z15 run recovered 3-8
  timeout-retried tiles depending on the pan segment, while z14 placeholder mode recovered 5 timeout-retried tiles after
  2 retry requests. Intermediate snapshots still showed active requests and queued retry tiles, but final snapshots had
  full returned/non-empty coverage, no partials, and no stale-cache fallback. This keeps lifecycle parked unless a
  copied run shows unrecovered partials, fresh-cache retries, or visible holes after the queue drains.
- Diagnostics clarification on 2026-06-10: `emptyTileKeys` now means successful returned tiles with zero entities.
  Timeout/error tile payloads stay in `timeoutTileKeys`/`errorTileKeys` and `responseRetryTileKeys` instead of also
  appearing as empty tiles.
- Runtime timing note on 2026-06-10: comparison mode now uses IITC's 400ms move debounce and 1000ms download delay for
  live queued tiles. Fast mode keeps the 250ms movement delay and skips the download delay. Copied diagnostics include
  `timing.downloadDelayMs` so cached-only refreshes can report `0`.
- Live IITC-timing pan validation on 2026-06-10 exercised the "while panning, not waiting for settle" path and the final
  settled path. Mid-pan snapshots correctly showed incomplete cache-first/live states (`12/36`, `24/36`, and `33/36`
  returned tiles) with active requests or queued retry tiles, `downloadDelayMs: 1000`, no partials, and no warnings. A
  later settled run at z15 completed cleanly: final snapshots reached `returnedTiles == requestedTiles`, no
  `partialTileKeys`, no warning strings, no active requests, no queued tiles, and all timeout-retried tiles recovered.
  This validates the current old-response bridge, queue refill timing, and IITC comparison delay behavior for active
  panning. Keep retry volume as a watch item only; treat it as a defect if IITC-CE side-by-side shows materially lower
  retry churn on the same viewport or if retries stop recovering.

Map lifecycle validation runbook - 2026-06-05:

- Use the System -> Scenarios controls for repeatable live captures. Start with `Start Fast`, capture `Snap Before Pan S`,
  run the built-in south pan, then capture `Snap Reload`, `Snap Prog` if requests are still active, and `Snap Done`.
  Repeat with `Start Delay` to compare against IITC-style movement and download timing.
- Capture at least three live view types before changing lifecycle behavior:
  - same-bounds pan/reload after an already successful render, to confirm `cacheFreshTiles` and `renderQueue.ok/cache-fresh`
    dominate without unexpected retries;
  - a large low-zoom view, such as Amsterdam z10, to inspect request waves, low-zoom partial placeholders, and retry
    volume;
  - a dense high-zoom view, such as Damrak z15, to inspect timeout/retry behavior and first visible render timing.
- Copy each scenario run with `Copy Runs` and compare these fields first:
  `entities.cacheFreshTiles`, `entities.cacheFreshTileKeys`, `entities.cacheStaleTiles`,
  `entities.cacheStaleTileKeys`, `entities.partialTileKeys`, `entities.retryRequests`,
  `entities.retriedTileKeys`, `entities.queue`, `entities.renderQueue`, and `entities.timing`.
  Copied scenario snapshots include a derived `summary` block with these counts and warning strings for fresh-cached
  retries, stale-cached partials, and render-queue counter mismatches.
- Treat the run as healthy when same-bounds renders mostly report `cache-fresh`, retry tiles either recover or are
  explainable by low-zoom placeholder coverage, and render-queue statuses match the visible source (`cache-fresh`, `ok`,
  or `cache-stale`).
- Treat the run as a lifecycle parity bug when fresh cached tiles are retried unnecessarily, a tile with stale cached
  payload still ends as partial after retry exhaustion, `renderQueue` counters do not match rendered tile counts, or Fast
  vs Delay shows a retry pattern that diverges materially from IITC-CE on the same viewport.
- Do not start surgical render mutation or tile-by-tile wanted-check rewrites until a copied run demonstrates a concrete
  mismatch. If no mismatch is found, document the live evidence and keep map lifecycle parked while continuing UI/plugin
  parity work.
