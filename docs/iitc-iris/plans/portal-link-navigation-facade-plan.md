# Portal-Link Navigation Facade Plan

Status: first implementation slice implemented and validated. This is Phase 1, step 6 from [index.md](index.md).

## IITC Sources

- `reference/ingress-intel-total-conversion/core/code/map.js`
  - portal selection and map focus behavior
  - selected portal resolution after map data changes
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display.js`
  - selected portal lifecycle relationship

## Current IRIS Sources

- `packages/iitc-core/src/portal-link-navigation.ts`
  - portal lookup by GUID or lat/lng
  - pending portal selection shaping
  - map-focus navigation planning
- `packages/iitc-core/src/portal-link-navigation.test.ts`
- `apps/iitc-iris/src/page-map-runtime.ts`
  - Leaflet map movement
  - selected portal mutation
  - pending selection storage and resolution
- `apps/iitc-iris/src/content.tsx`
  - panel actions that post portal-link navigation messages

## Public Concepts

Keep IITC names at the boundary:

- `portalLinkNavigation`
- `zoomToAndShowPortal`
- `selectPortalByLatLng`
- pending portal selection
- GUID-first portal lookup with lat/lng fallback

## Ownership And Lifecycle

- Pure portal matching, pending selection shaping, and navigation planning belong in `packages/iitc-core`.
- Leaflet `setView`, selected portal mutation, message handling, and render-cycle timing stay in
  `apps/iitc-iris/src/page-map-runtime.ts`.
- The runtime owns when pending selection is stored and when render completion attempts to resolve it.

## Scope

Implemented in this slice:

- `findIitcPortalByGuidOrLatLng`
- `createIitcPortalLinkPendingSelection`
- `planIitcPortalLinkNavigation`
- `resolveIitcPendingPortalSelection`
- Runtime usage for `zoomToAndShowPortal`, `selectPortalByLatLng`, context lookup, and pending selection resolution

Non-goals:

- Do not move Leaflet map movement or selected portal mutation into core.
- Do not change the one-E6 coordinate matching tolerance.
- Do not change click handlers, panel layout, portal details fetch behavior, or context menu behavior.

## Tests And Diagnostics

Focused tests cover:

- GUID lookup winning before coordinate fallback.
- Lat/lng matching with the existing one-E6 tolerance.
- Loaded portal navigation planning.
- Unloaded portal pending selection and focus planning.
- GUID-only pending selection.
- Pending selection resolution after portals load.

Manual/live comparison notes to capture after implementation:

- COMM, inventory, mission, portal-analysis, and context portal links still zoom to and select loaded portals.
- Links to unloaded portals still pan to coordinates and select after map data returns.
- GUID-only inventory key links still select when the portal later appears in loaded entities.

## Validation

For code changes, run:

- `npm run test:iitc-core -- --run src/portal-link-navigation.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:iitc-core`
- `npm run package:iitc-iris`
- `git diff --check`
