# Search Facade Plan

Status: first implementation slice implemented and validated. This is Phase 1, step 3 from [index.md](index.md).

## IITC Sources

- `reference/ingress-intel-total-conversion/core/code/search.js`
  - search result ordering and selected-result behavior
  - portal, coordinate, and geocoder result handling
- `reference/ingress-intel-total-conversion/core/code/map.js`
  - result focus, pan, zoom, and preview behavior

## Current IRIS Sources

- `packages/iitc-core/src/search-facade.ts`
  - local portal result normalization
  - coordinate parsing
  - Nominatim response normalization
  - request-state helpers
- `packages/iitc-core/src/search-facade.test.ts`
- `apps/iitc-iris/src/page-map-runtime.ts`
  - loaded portal source
  - Nominatim fetch execution
  - stale search sequence guard
  - Leaflet preview and selection rendering
- `apps/iitc-iris/src/content.tsx`
  - search sheet rendering
  - keyboard selection and grouping display

## Public Concepts

Keep IITC names at the boundary:

- Domain name: `search`
- Result concepts: `portal`, `guid`, `coordinate`, `address`, `empty`
- Request states: `idle`, `loading`, `ready`, `empty`, `error`
- Search sources: loaded portals, coordinates, Nominatim/OpenStreetMap
- Result geometry: point, bounds, and GeoJSON preview data

## Ownership And Lifecycle

- Pure result normalization, ordering, coordinate parsing, Nominatim response normalization, and request-state shaping
  belong in `packages/iitc-core`.
- Browser-only Nominatim fetch execution, current map bounds/viewbox, stale sequence checks, Leaflet rendering, portal
  selection, and map movement stay in `apps/iitc-iris/src/page-map-runtime.ts`.
- React input state, keyboard active-result state, grouped display, and sheet rendering stay in
  `apps/iitc-iris/src/content.tsx`.

## Scope

Implemented in the first slice:

- `getIitcLocalSearchResults`
- `parseIitcSearchCoordinateResults`
- `normalizeIitcNominatimResults`
- `createIitcSearchIdleState`
- `createIitcSearchLocalState`
- `createIitcSearchLoadingState`
- `createIitcSearchSuccessState`
- `createIitcSearchErrorState`
- Runtime usage in `runSearch` and Nominatim result normalization

Non-goals:

- Do not move fetch, map viewbox construction, Leaflet preview layers, or portal selection into core.
- Do not redesign the Search sheet or result grouping UI.
- Do not add persistent search cache.
- Do not expose IITC plugin/search globals in this pass.

## Tests And Diagnostics

Focused tests cover:

- GUID and title portal result normalization.
- Short automatic search suppression.
- Decimal and DMS coordinate parsing.
- Nominatim address normalization, bounds conversion, fallback titles, and de-duplication.
- Search request-state helpers for local, success, empty, and error states.

Manual/live comparison notes to capture after implementation:

- Typing 3+ characters searches loaded portals without network.
- Pressing Enter keeps local portal/coordinate results first, then appends Nominatim results.
- Failed Nominatim requests preserve local results and report an error.
- Hover/focus preview still draws and clears geometry; selection still pans/zooms/selects as before.

## Validation

For code changes, run:

- `npm run test:iitc-core -- --run src/search-facade.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:iitc-core`
- `npm run package:iitc-iris`
- `git diff --check`
