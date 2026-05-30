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
- The IITC same-zoom refresh skip rule is ported in core: a move does not need a new request when the new viewport remains inside the previously fetched data bounds.
- IITC IRIS currently uses a temporary core-owned compatibility policy for live Intel tile holes: summary tile requests run in sequential 5-tile batches, returned-empty summary tiles are retried as single-tile requests, and response merging keeps a non-empty tile payload over a later empty payload for the same tile.
- Response merge, tile-return diagnostics, requested-tile response classification, and IITC-style request response buckets now live in `packages/iitc-core` with tests, so the runtime no longer owns richer-payload merging, empty-tile detection, unaccounted-tile detection, or recovered-tile accounting.
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
- Fields, links, placeholder portals, real portals, level fill, health fill, ornaments, level labels, and simple artifact rings render.
- Optional detail styling now has an explicit render policy: level fill, health fill, ornaments, artifact rings, and level labels only draw when detailed portal data is available at zoom 14+ and the matching layer toggle is enabled. Base fields, links, and portals remain independent of that policy.
- Base renderer styling is closer to IITC-CE: team-coloured portal fills, IITC portal radius/weight scaling, 0.25 field fill opacity, full-opacity links, orange neutral portals, and text-only portal level labels with simple overlap thinning.
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
- Copied diagnostics include IITC-style request response buckets (`serverRetryTileKeys`, `timeoutTileKeys`, `errorTileKeys`, `responseRetryTileKeys`, and `queueDelayReasons`) so slow-network retries can be separated from returned-empty tile recovery.
- The dock has fixed Amsterdam and Damrak view presets for repeatable IITC/IITC IRIS comparisons.
- The dock can jump to arbitrary comparison views from `lat,lng,z` text, Intel map URLs with `ll` and `z`, or IITC-CE portal links with `pll`.
- The dock can copy the current view back out as an Intel URL.
- The dock has base-map switches for CartoDB Dark Matter, CartoDB Positron, and OpenStreetMap, with the selected base map persisted for repeatable visual comparisons.
- Layer toggles are persisted; the default comparison view enables only fields, links, and portals while leaving level fill, health fill, ornaments, artifacts, labels, and tile debug off.
- Current layer toggles:
  - `F`: fields.
  - `LN`: links.
  - `P`: portals.
  - `LF`: portal body fill by IITC level colours, matching IITC-CE's `Level Color` highlighter behavior, including neutral portals with an orange outline and level-coloured body.
  - `HF`: portal body fill by recharge status, matching IITC-CE's `Needs Recharge (Health)` highlighter behavior.
  - `OR`: ornament image overlays.
  - `AR`: artifact rings.
  - `LV`: portal level labels.
  - `T`: tile debug rectangles.
- Optional detail styling (`LF`, `HF`, `OR`, `AR`, `LV`) only renders when detailed portal data is available at zoom 14+; toggles may be enabled in the dock but still hidden in low-zoom placeholder mode.
- The dock has a data-source switch for live Intel data, bundled Amsterdam z10/z14 fixtures, and a Damrak z15 fixture extracted from an IITC HAR. Fixture mode renders deterministic saved `getEntities` responses and jumps to the matching view.
- Copied diagnostics include `renderPolicy`, so comparison snapshots show whether optional detail overlays were eligible to render.
- Visual parity comparisons should use the dock's viewport P/L/F counts and copied `entities.viewport` block; total fetched counts include padded request bounds and placeholder support entities.
- Mock controls and place-name geocoding are not yet implemented in IITC IRIS.

## Pass 6: Replacement Readiness - Not Started

- Compare IITC IRIS, Mini-IRIS, current IRIS, and IITC-CE on the same views.
- Document mismatches as intentional differences or blockers.
- Only then decide which current IRIS code can be retired or replaced.

Acceptance:

- A documented comparison table exists for the core zoom/entity cases.
- Remaining gaps are tracked as explicit work items instead of renderer surprises.
