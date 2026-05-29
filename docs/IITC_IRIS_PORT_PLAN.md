# IITC IRIS Port Plan

Goal: build a clean IITC-compatible IRIS track with a Mini-IRIS-sized UI shell and an IITC-CE-derived core. This track should use the same map library family as IITC-CE and avoid depending on the current IRIS map renderer while the port is being validated.

## Pass 1: Scaffold

- Add `packages/iitc-core` as the porting target for IITC-CE request lifecycle, zoom semantics, entity decoding, and renderer-facing model code.
- Add `apps/iitc-iris` as a new extension app with a minimal shell, separate build/package scripts, and vendored IITC-CE Leaflet assets.
- Keep the app loadable before adding entity rendering, so later regressions are easier to isolate.

Acceptance:

- `npm run typecheck:iitc-core`
- `npm run test:iitc-core`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`

## Pass 2: Request Lifecycle

- Port IITC tile parameter calculation, tile queueing, cache keys, and request deduping into `packages/iitc-core`.
- Use IITC-CE zoom/data-zoom behavior as the source of truth.
- Add fixture-driven tests from the existing HAR files for Amsterdam and Damrak.

Acceptance:

- The new core produces the same map-data request shapes as IITC-CE for the first Amsterdam and Damrak test views.
- Tile state transitions are covered by tests before renderer integration.

## Pass 3: Entity Decode

- Port IITC-CE map entity parsing into `packages/iitc-core`.
- Preserve IITC concepts and names where they make comparison easier: portals, links, fields, ornaments, artifacts, shards, events.
- Decode fixtures from `docs/har` and `docs/update-map` without rendering concerns mixed in.

Acceptance:

- Fixture counts by entity type match IITC-CE for the same request responses.
- Ornament and artifact identifiers are exposed distinctly enough for UI styling checks.

## Pass 4: Leaflet Rendering

- Add portal, link, field, ornament, artifact, shard, and event layers using Leaflet primitives compatible with IITC-CE.
- Match IITC zoom visibility rules first, then refine visual styling.
- Keep renderer state independent from request lifecycle state.

Acceptance:

- IITC IRIS and IITC-CE show the same entity categories at comparable Amsterdam/Damrak zoom levels.
- Hard refreshes do not randomly hide links or fields once data is available.

## Pass 5: Comparison UI

- Add a Mini-IRIS-style control surface for fixture/mock mode, free search, current request state, and entity counts.
- Include a compact diagnostic view for zoom, data zoom, tile count, request count, and decoded entity totals.

Acceptance:

- Amsterdam and Damrak can be selected from fixtures.
- Free search can be used for other places without changing fixture behavior.

## Pass 6: Replacement Readiness

- Compare IITC IRIS, Mini-IRIS, current IRIS, and IITC-CE on the same views.
- Document mismatches as intentional differences or blockers.
- Only then decide which current IRIS code can be retired or replaced.

Acceptance:

- A documented comparison table exists for the core zoom/entity cases.
- Remaining gaps are tracked as explicit work items instead of renderer surprises.
