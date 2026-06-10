# Scaffold And Request Lifecycle

- Add `packages/iitc-core` as the porting target for IITC-CE request lifecycle, zoom semantics, entity decoding, and
  renderer-facing model code.
- Add `apps/iitc-iris` as a new extension app with a minimal shell, separate build/package scripts, and vendored IITC-CE
  Leaflet assets.
- Keep the app loadable before adding entity rendering, so later regressions are easier to isolate.

Acceptance:

- `npm run typecheck:iitc-core`
- `npm run test:iitc-core`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`

Current verification - 2026-06-10:

- `npm run test:iitc-core`, `npm run typecheck:iitc-core`, and `npm run lint:iitc-core` pass.
- `npm run test -w packages/core`, `npm run typecheck:core`, and `npm run lint:core` pass.
- The previous missing-fixture degradation for the entity-decode parity tests is resolved in the current workspace; no
  fresh HAR capture is required for this checkpoint.

## Pass 2: Request Lifecycle - Done

- Port IITC tile parameter calculation, tile queueing, cache keys, and request deduping into `packages/iitc-core`.
- Use IITC-CE zoom/data-zoom behavior as the source of truth.
- Add fixture-driven tests from the existing HAR files for Amsterdam and Damrak.

Acceptance:

- The new core produces the same map-data request shapes as IITC-CE for the first Amsterdam and Damrak test views.
- Tile state transitions are covered by tests before renderer integration.

Current status:

- Tile math, zoom/data-zoom selection, request key generation, basic batching, and the live-compat batch policy are
  ported.
- The IITC same-zoom refresh skip rule is ported in core: a move does not need a new request when the new viewport
  remains inside the previously fetched data bounds.
- IITC IRIS now uses the core IITC request batch shape for the first live request wave: up to 5 concurrent requests with
  dynamically sized batches capped at 25 tiles/request. Returned-empty summary tiles are still retried as single-tile
  compatibility requests, and response merging keeps a non-empty tile payload over a later empty payload for the same
  tile.
- Live-compat retry selection now comes from `packages/iitc-core`: the runtime retries returned-empty compatibility
  tiles plus explicit IITC response retry buckets such as timeout, error, and unaccounted tiles.
- Core now has an immutable IITC tile queue state model covering queued, requested, successful, failed, stale,
  active-request, and tile-error-count state; tests cover success removal, timeout requeueing, server retry without
  error-count increments, and retry-limit fail/stale behavior.
- IITC IRIS now uses that core queue state to drive live-compat retry selection while keeping the conservative existing
  batch shape; returned-empty summary tiles are an explicit compatibility option in the core queue.
- Runtime request batch construction now goes through core queue helpers for initial and retry phases. The initial phase
  uses IITC-style concurrent request buckets; the retry phase remains conservative while live empty-tile behavior is
  validated.
- Milestone A update: initial live request waves now use `createIitcTileQueueRequestBatches` from the active queue state
  instead of fixed sequential wave construction, while preserving one initial attempt per tile before compatibility
  retries.
- Milestone A update: retry request failures now call the same core response-bucket classifier and queue apply path as
  initial request failures, matching IITC's `handleResponse(undefined, tiles, false)` shape more closely.
- Milestone A update: the live runtime no longer uses the broad same-bounds whole-response cache shortcut; same-bounds
  pans now pass through the per-tile `IitcDataCache` fresh/stale path, while exact duplicate request keys can still
  no-op.
- Milestone B update: the live runtime now listens to `movestart`, clears pending refresh timers, invalidates the active
  render generation, suppresses progress renders while the map is moving, and lets old map-data requests finish instead
  of aborting them solely because movement ended.
- Milestone B update: starting a new live viewport request no longer aborts the previous map-data request; old responses
  are ignored by generation checks. In-progress copied diagnostics now include cached first-render entities and
  non-empty cached tile keys instead of reporting an empty entity block while cached tiles are visible.
- Milestone B update: throttled progress status messages now report entity counts from the last actually rendered
  progress frame, avoiding mixed copies where fetch counters came from a newer response but ornament draw counters came
  from the previous render.
- Milestone B update: copied diagnostics now include a separate `renderQueue` block with rendered tile counts split by
  `ok`, `cache-fresh`, and `cache-stale`, plus rendered tile keys and last rendered tile status. This keeps fetch queue
  and render queue parity evidence separate before true surgical render mutation.
- Milestone B update: successful tile payloads from old non-aborted map-data responses were tested as cache warmers,
  matching IITC's split where old responses can warm cache but are not rendered unless the tile is still wanted. Live
  copies repeatedly showed `staleGenerationCacheWarmTiles: 0` while slow views correlated with high timeout retry
  volume, so stale-generation cache warming is gated off by default as a temporary IRIS divergence.
- Milestone B update: copied diagnostics keep `staleGenerationCacheWarmTiles` and `staleGenerationCacheWarmTileKeys` so
  this gated behavior can be re-enabled and measured later if IITC-style movement/download delays are ported.
- Stabilization update: System sheet now has an `IITC Delay` dev toggle. Default remains the current fast post-move
  refresh; enabling the toggle waits 3s after `moveend`, approximating IITC's movement refresh delay for live
  comparison without changing default behavior.
- Stabilization update: copied diagnostics now include `entities.timing` with cache, initial request, retry, artifact
  wait, total, and movement-delay timings. Use this before more lifecycle changes so perceived slowness can be tied to
  initial requests, retries, artifact wait, or the movement-delay setting.
- Stabilization update: System sheet now has scenario buttons for live lifecycle comparison. `Fast` and `Delay` start
  runs with the chosen movement-delay setting and a `previous` snapshot so stale pre-mode diagnostics are explicit,
  `Pan S` provides a repeatable movement action, and manual `Reload`/`In Prog`/`Done` snapshots can be copied as one JSON
  bundle with `Copy Run`. This is diagnostic UI only; it does not change map-data behavior.
- Stabilization decision: default lifecycle stays on the fast 250ms post-move refresh. The IITC-style 3s movement delay
  remains a diagnostic comparison toggle because it can reduce retry pressure on some live runs but increases perceived
  latency. Remaining lifecycle parity gaps are accepted for now: surgical render mutation is not ported, stale fallback
  is wired but live-unproven, and old responses are still generation-filtered rather than checked tile-by-tile against
  the current wanted set.
- Player Tracker MVP: IITC IRIS now has live faction-split player tracker toggles (`PTR`, `PTE`, `PTM`) fed from `/r/getPlexts` all-COMM
  data. Core history reduction lives in `packages/iitc-core/src/player-tracker.ts` and follows IITC
  `player-activity-tracker.js` behavior for the three-hour history window, z9 visibility gate, ignored destroyed
  link/field messages, same-time portal grouping, averaged event coordinates, faction marker pins, and dashed magenta
  traces. The tracker pane is non-blocking so normal portal selection is not swallowed by the overlay; marker popups
  remain available on marker hits. Copied diagnostics expose player/event/marker/trace counts and latest COMM time. Full IITC plugin parity is
  still intentionally out of scope: search integration, ctrl/cmd nickname centering, add-ons, and OMS-grade co-located
  marker behavior remain later work.
- COMM parity note: IRIS stores and previews COMM oldest-to-newest like IITC `comm.renderData`, and continuation fetches
  now pass IITC's `ascendingTimestampOrder` write semantics through to storage. This keeps the visible order and GUID
  continuity comparable against stock IITC.
- Large initial tile plans are executed across all 25-tile request batches in waves of up to five concurrent requests,
  instead of stopping after only the first concurrent wave. This fixes low-zoom views such as z10 where the plan can
  contain more than 125 tiles.
- Placeholder-mode timeout retries now use the IITC-style per-tile retry limit, and final exhausted low-zoom placeholder
  tiles are reported as partial coverage instead of hard request failures.
- Runtime fetch cancellation is explicit: pan/zoom and data-source changes abort the active `getEntities` request, and
  core queue state can mark obsolete queued/requested tiles as stale instead of letting old responses race the newest
  map view.
- IITC IRIS keeps the core same-zoom refresh-skip helper for tests/reference, but the live runtime now favors
  tile-indexed `IitcDataCache` decisions over whole-response reuse when a pan stays inside fetched padded bounds.
- Response merge, tile-return diagnostics, requested-tile response classification, and IITC-style request response
  buckets now live in `packages/iitc-core` with tests, so the runtime no longer owns richer-payload merging, empty-tile
  detection, unaccounted-tile detection, or recovered-tile accounting.
- Response bucket diagnostic accumulation now also lives in `packages/iitc-core`, so live retry/timeout/error accounting
  is immutable and tested outside the page runtime.
- The remaining shim exists around returned-empty summary tile recovery: the core queue has IITC-style active request
  accounting, tile-specific retry/error counters, response bucket classification, and stale marking, but the runtime
  still performs explicit single-tile empty recovery until live parity is validated.
- IITC-named `IitcDataCache` and render queue facades now exist in `packages/iitc-core`. The runtime stores successful
  tile payloads, renders fresh cached tiles as `cache-fresh`, and can render retry-exhausted cached payloads as
  `cache-stale`.
- Important lifecycle gap: stale fallback is partially ported but not yet fully validated against IITC-CE. IITC IRIS
  has copied `cache-fresh`/`cache-stale` tile diagnostics and no longer uses the broad whole-response cache shortcut,
  but retry exhaustion with stale cached payloads still needs live validation before the gap can be considered closed.
- Important performance/parity gap: live z15 views can still take tens of seconds when many summary tiles timeout and
  recover, even with `successTiles === requestedTiles` and no partials. IITC IRIS now renders the merged live response
  progressively after initial batches and throttled retry progress, closer to IITC-CE's render queue behavior; copied
  diagnostics include final elapsed time and first visible render timing. Continue comparing against IITC-CE on the same
  viewport for retry count, timeout tile pattern, stale/partial data use, and whether remaining delay comes from
  cache/stale fallback or retry policy.
- The compatibility retry policy should remain while validating live parity, but the intended replacement is a closer
  IITC-CE-derived request queue in `packages/iitc-core`, not permanent ad hoc runtime policy.
