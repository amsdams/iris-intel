# Portal Details Facade Plan

Status: first implementation slice implemented and validated. This is Phase 1, step 2 from [index.md](index.md).

## IITC Sources

- `reference/ingress-intel-total-conversion/core/code/portal_detail.js`
  - `getPortalDetails` request lifecycle
  - selected portal detail cache behavior
  - portal detail update path
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display.js`
  - detail display model for owner, mods, resonators, history, and mitigation
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display_tools.js`
  - display helpers for portal detail sections

## Current IRIS Sources

- `packages/iitc-core/src/portal-details.ts`
  - `parseIitcPortalDetailsResponse`
  - `getIitcPortalMitigation`
- `packages/iitc-core/src/portal-details-facade.ts`
  - request state, cache lookup/write, parse-to-state helpers
- `packages/iitc-core/src/portal-details.test.ts`
- `apps/iitc-iris/src/page-map-runtime.ts`
  - selected portal ownership
  - `/r/getPortalDetails` request execution
  - abort/cancellation
  - parsed details projection back into rendered portal entities
- `apps/iitc-iris/src/content.tsx`
  - selected portal details panel rendering

## Public Concepts

Keep IITC names at the boundary:

- Endpoint name: `getPortalDetails`
- Domain name: `portalDetails`
- Selection concept: selected portal GUID
- Detail concepts: owner, mods, resonators, history, mission flag, mitigation
- Request states: `loading`, `ready`, `error`, `auth`
- Cache marker: `cached`

## Ownership And Lifecycle

- Pure parsing, request-state shaping, cache hit annotation, cache pruning, and empty-response conversion belong in
  `packages/iitc-core`.
- Browser-only fetch execution, CSRF/version handling, auth classification, AbortController cancellation, selected portal
  staleness checks, Leaflet rendering, and entity mutation stay in `apps/iitc-iris/src/page-map-runtime.ts`.
- Selecting or clearing a portal remains the owner of cancellation. The facade only returns state objects; it does not
  cancel requests or decide whether a response is stale for the current selected portal.
- The cache remains memory-only and bounded to the current 12-entry behavior.

## Scope

Implemented in the first slice:

- `getIitcCachedPortalDetails`
- `createIitcPortalDetailsLoadingState`
- `createIitcPortalDetailsAuthState`
- `createIitcPortalDetailsErrorState`
- `applyIitcPortalDetailsResponse`
- `writeIitcPortalDetailsCache`
- Runtime usage in `refreshSelectedPortalDetails`

Non-goals:

- Do not move `/r/getPortalDetails` fetch logic into core.
- Do not expose IITC plugin hooks or `window.portalDetail` compatibility yet.
- Do not change selected portal cancellation semantics.
- Do not redesign the portal details panel.
- Do not add persistent portal detail caching in this pass.

## Tests And Diagnostics

Focused tests cover:

- Request state object shape.
- Parsed `getPortalDetails` response to ready state and diagnostics.
- Empty response to error state.
- Cache hit annotation and bounded cache pruning.

Manual/live comparison notes to capture after implementation:

- Selecting a portal with no cached details shows loading, then ready/error/auth.
- Selecting a cached portal renders cached details immediately and then refreshes.
- Selecting a different portal before a response returns does not apply stale details.
- Clearing selection cancels the active portal detail request and removes details from copied diagnostics.

Implemented notes:

- `packages/iitc-core/src/portal-details-facade.ts` owns cache hit annotation, bounded memory-cache writes, request-state
  construction, empty-response conversion, and parse-to-ready-state conversion.
- `apps/iitc-iris/src/page-map-runtime.ts` still owns `/r/getPortalDetails` fetch execution, auth classification,
  AbortController cancellation, selected portal staleness checks, entity mutation, and Leaflet rerendering.

## Validation

For code changes, run:

- `npm run test:iitc-core -- --run src/portal-details.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:iitc-core`
- `npm run package:iitc-iris`
- `git diff --check`
