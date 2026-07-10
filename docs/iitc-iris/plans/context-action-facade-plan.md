# Context Action Facade Plan

Status: first implementation slice implemented and validated. This is Phase 1, step 7 from [index.md](index.md).

## IITC Sources

- `reference/ingress-intel-total-conversion/core/code/map.js`
  - map context menu event flow
  - portal, link, field, and map context target priority
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display.js`
  - portal selection relationship for portal context actions

## Current IRIS Sources

- `packages/iitc-core/src/context-action.ts`
  - context payload shaping
  - portal/link/field/map target planning
  - link and field anchor/portal GUID helpers
  - link distance and field perimeter helpers
- `packages/iitc-core/src/context-action.test.ts`
- `apps/iitc-iris/src/map-context-runtime.ts`
  - app message wrapper and browser gesture listeners
- `apps/iitc-iris/src/page-map-runtime.ts`
  - Leaflet hit testing, visibility checks, selection mutation, and message posting
- `apps/iitc-iris/src/content.tsx`
  - panel display and user-triggered context actions

## Public Concepts

Keep IITC names at the boundary:

- `mapContext`
- portal, link, field, and map context targets
- selected map object
- portal anchors
- context lat/lng and Intel URL actions

## Ownership And Lifecycle

- Pure context payload construction, target priority, anchor lists, GUID lists, and distance calculations belong in
  `packages/iitc-core`.
- DOM events, long-press timers, right-click suppression, Leaflet hit testing, layer visibility, selection mutation, and
  `window.postMessage` stay in `apps/iitc-iris`.
- The app wrapper still owns the IRIS message `type`; core returns only message-compatible payload fields.

## Scope

Implemented in this slice:

- `createIitcMapContextPayload`
- `planIitcMapContextPoint`
- `getIitcMapContextLinkPortalGuids`
- `getIitcMapContextLinkPortalAnchors`
- `getIitcMapContextLinkDistanceMeters`
- `getIitcMapContextFieldPortalGuids`
- `getIitcMapContextFieldPortalAnchors`
- `getIitcMapContextFieldPerimeterMeters`
- Runtime usage for context payloads, object details, and portal/link/field/map context messages

Non-goals:

- Do not move Leaflet hit testing or geodesic link rendering into core.
- Do not change context menu UI labels, button visibility, or clipboard behavior.
- Do not change long-press timing, right-click handling, or portal click suppression.
- Do not change selected portal details fetch behavior.

## Tests And Diagnostics

Focused tests cover:

- Map and portal context payload shaping.
- Context target priority: portal, link, field, then plain map.
- Link and field selected-object planning.
- Anchor labels, GUID extraction, link distance, and field perimeter helpers.

Manual/live comparison notes to capture after implementation:

- Long-press and right-click still open portal details when hitting a portal.
- Link and field context still select the object and show anchor buttons.
- Plain map context still clears selected map objects and shows coordinates.
- Context anchor buttons still navigate through the portal-link navigation facade.

## Validation

For code changes, run:

- `npm run test:iitc-core -- --run src/context-action.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:iitc-core`
- `npm run package:iitc-iris`
- `git diff --check`
