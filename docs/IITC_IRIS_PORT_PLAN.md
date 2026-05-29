# IITC IRIS Port Plan

Goal: build a clean IITC-compatible IRIS track with a Mini-IRIS-sized UI shell and an IITC-CE-derived core. This track should use the same map library family as IITC-CE and avoid depending on the current IRIS map renderer while the port is being validated.

## Pass 1: Scaffold - Done

- Add `packages/iitc-core` as the porting target for IITC-CE request lifecycle, zoom semantics, entity decoding, and renderer-facing model code.
- Add `apps/iitc-iris` as a new extension app with a minimal shell, separate build/package scripts, and vendored IITC-CE Leaflet assets.
- Keep the app loadable before adding entity rendering, so later regressions are easier to isolate.

Acceptance:

- `npm run typecheck:iitc-core`
- `npm run test:iitc-core`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`

## Pass 2: Request Lifecycle - Done

- Port IITC tile parameter calculation, tile queueing, cache keys, and request deduping into `packages/iitc-core`.
- Use IITC-CE zoom/data-zoom behavior as the source of truth.
- Add fixture-driven tests from the existing HAR files for Amsterdam and Damrak.

Acceptance:

- The new core produces the same map-data request shapes as IITC-CE for the first Amsterdam and Damrak test views.
- Tile state transitions are covered by tests before renderer integration.

Current status:

- Tile math, zoom/data-zoom selection, request key generation, basic batching, and the live-compat batch policy are ported.
- IITC IRIS currently uses a temporary core-owned compatibility policy for live Intel tile holes: summary tile requests run in sequential 5-tile batches, returned-empty summary tiles are retried as single-tile requests, and response merging keeps a non-empty tile payload over a later empty payload for the same tile.
- This shim exists because the core port does not yet include IITC-CE's full tile lifecycle: tile cache state, active request accounting, tile-specific retry/error counters, timeout handling, and stale-cache fallback.
- The compatibility policy should remain while validating live parity, but the intended replacement is a closer IITC-CE-derived request queue in `packages/iitc-core`, not permanent ad hoc runtime policy.

## Pass 3: Entity Decode - Partial

- Port IITC-CE map entity parsing into `packages/iitc-core`.
- Preserve IITC concepts and names where they make comparison easier: portals, links, fields, ornaments, artifacts, shards, events.
- Decode fixtures from `docs/har` and `docs/update-map` without rendering concerns mixed in.

Acceptance:

- Fixture counts by entity type match IITC-CE for the same request responses.
- Ornament and artifact identifiers are exposed distinctly enough for UI styling checks.

Current status:

- Portals, links, fields, placeholder portals, fake field-edge link filtering, and ornament IDs are decoded.
- Fixture tests cover low-zoom placeholder behavior and zoom-15 summary/ornament behavior.
- Artifact brief decoding is wired with a synthetic parser test, but live artifact behavior is unverified because Intel is not currently returning artifact portal payloads in the available test responses.
- Shard and event decoding still need dedicated live fixtures and tests.

## Pass 4: Leaflet Rendering - Partial

- Add portal, link, field, ornament, artifact, shard, and event layers using Leaflet primitives compatible with IITC-CE.
- Match IITC zoom visibility rules first, then refine visual styling.
- Keep renderer state independent from request lifecycle state.

Acceptance:

- IITC IRIS and IITC-CE show the same entity categories at comparable Amsterdam/Damrak zoom levels.
- Hard refreshes do not randomly hide links or fields once data is available.

Current status:

- Typed npm Leaflet is bundled into `iitc-iris`.
- Fields, links, placeholder portals, real portals, health rings, ornament rings, and simple artifact rings render.
- Artifact rendering is wired but unverified against live Intel data; keep it simple until a real artifact fixture or HAR is available.
- Layer ordering and visual parity are only approximate.
- Shard, event, portal label polish, and plugin/highlighter parity are not done.

## Pass 5: Comparison UI - Started

- Add a Mini-IRIS-style control surface for fixture/mock mode, free search, current request state, and entity counts.
- Include a compact diagnostic view for zoom, data zoom, tile count, request count, and decoded entity totals.

Acceptance:

- Amsterdam and Damrak can be selected from fixtures.
- Free search can be used for other places without changing fixture behavior.

Current status:

- The dock shows zoom, data zoom, summary availability, tile span, fetch state, entity totals, real/placeholder/ornament portal counts, and copy-to-clipboard diagnostics.
- The dock has fixed Amsterdam and Damrak view presets for repeatable IITC/IITC IRIS comparisons.
- The dock can jump to arbitrary comparison views from `lat,lng,z` text or Intel URLs with `ll` and `z` query params.
- Visual parity comparisons should use the dock's viewport P/L/F counts and copied `entities.viewport` block; total fetched counts include padded request bounds and placeholder support entities.
- Fixture/mock selector and place-name geocoding are not yet implemented in IITC IRIS.

## Pass 6: Replacement Readiness - Not Started

- Compare IITC IRIS, Mini-IRIS, current IRIS, and IITC-CE on the same views.
- Document mismatches as intentional differences or blockers.
- Only then decide which current IRIS code can be retired or replaced.

Acceptance:

- A documented comparison table exists for the core zoom/entity cases.
- Remaining gaps are tracked as explicit work items instead of renderer surprises.
