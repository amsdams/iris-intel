# Map Data Request Facade Plan

Status: first implementation slice implemented and validated. This is Phase 1, step 4 from [index.md](index.md).

## IITC Sources

- `reference/ingress-intel-total-conversion/core/code/map_data_request.js`
  - tile planning and request bucket sizing
  - `getEntities` response handling
  - retry, timeout, hard error, and unaccounted response behavior
  - queue refill delay behavior
- `reference/ingress-intel-total-conversion/core/code/map_data_cache.js`
  - fresh/stale tile cache behavior
- `reference/ingress-intel-total-conversion/core/code/render.js`
  - render queue relationship to map data responses

## Current IRIS Sources

- `packages/iitc-core/src/map-data-request.ts`
  - map data plan creation
  - tile queue state and request batch helpers
  - response classification and retry bucket diagnostics
  - queue refill delay decisions
  - queue/response diagnostic shaping
- `packages/iitc-core/src/map-data-request.test.ts`
- `packages/iitc-core/src/data-cache.ts`
- `packages/iitc-core/src/map-data-render-queue.ts`
- `apps/iitc-iris/src/page-map-runtime.ts`
  - current map/bounds source
  - `/r/getEntities` fetch execution
  - AbortController and stale generation handling
  - cache storage and render queue draining
  - Leaflet rendering and copied entity status dispatch

## Public Concepts

Keep IITC names at the boundary:

- Endpoint name: `getEntities`
- Source file/domain name: `mapDataRequest`
- Tile concepts: tile keys, queued/requested/success/failed/stale tiles
- Request concepts: request batches, active request slots, retry batches, queue refill delays
- Response concepts: returned, non-empty, empty, timeout, error, server retry, unaccounted
- Cache concepts: `cache-fresh`, `cache-stale`, stale retry exhaustion

## Ownership And Lifecycle

- Pure planning, response classification, queue mutation, retry delay decisions, and diagnostic shaping belong in
  `packages/iitc-core`.
- Browser-only fetch execution, CSRF/version handling, auth classification, AbortController cancellation, stale
  generation handoff, `IitcDataCache` storage, render queue draining, Leaflet rendering, and status posting stay in
  `apps/iitc-iris/src/page-map-runtime.ts`.
- The runtime remains the scheduler. Core helpers describe what should happen to the tile queue and diagnostics for a
  completed batch; they do not start requests or own concurrency.

## Scope

Already existing before this slice:

- `createIitcMapDataPlan`
- `createIitcTileQueueState`
- `markIitcTileRequestStarted`
- `applyIitcTileRequestResponseToQueue`
- `createIitcTileQueueRequestBatches`
- `getIitcTileQueueRefillDecision`
- `createIitcResponseBucketDiagnostics`
- `appendIitcResponseBucketDiagnostics`
- `classifyIitcGetEntitiesResponse`
- `classifyIitcTileRequestResponse`

Implemented in this slice:

- `createIitcTileQueueDiagnostics`
- `classifyIitcTileDiagnostics`
- Runtime usage for queue and tile-response diagnostics in `refreshEntities`

Non-goals:

- Do not move the `getEntities` fetch loop into core.
- Do not change retry policy, queue delays, cache freshness, or stale fallback behavior in this pass.
- Do not redesign copied diagnostics or the content-side request display.
- Do not change render queue semantics.

## Tests And Diagnostics

Focused tests cover:

- Existing map plan, tile queue, retry, response classification, and queue delay behavior.
- Queue diagnostic shaping, including partial-vs-failed tile accounting.
- Tile-response diagnostic shaping used by runtime status messages.

Manual/live comparison notes to capture after implementation:

- Same-bounds refresh still uses cache-fresh diagnostics.
- Timeout/hard-error/unaccounted retry behavior still opens refill slots according to queue delay decisions.
- Retry exhaustion with stale cached payload still reports `cache-stale` when available.
- Copied diagnostics keep `queue`, `renderQueue`, `cacheFreshTileKeys`, `cacheStaleTileKeys`, and retry bucket fields.

## Validation

For code changes, run:

- `npm run test:iitc-core -- --run src/map-data-request.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:iitc-core`
- `npm run package:iitc-iris`
- `git diff --check`
