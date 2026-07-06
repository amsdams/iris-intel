# Player Tracker Facade Plan

Status: first implementation slice implemented and validated. This is Phase 1, step 5 from [index.md](index.md).

## IITC Sources

- `reference/ingress-intel-total-conversion/plugins/player-activity-tracker.js`
  - COMM-derived player position extraction
  - player/team visibility policy
  - marker age opacity and trace aging
  - stale activity pruning
- `reference/ingress-intel-total-conversion/core/code/comm.js`
  - source COMM message shape and `getPlexts` relationship

## Current IRIS Sources

- `packages/iitc-core/src/player-tracker.ts`
  - COMM message processing
  - stored player event pruning
  - lat/lng averaging
  - layer/team visibility policy
  - marker opacity and trace age bucket helpers
  - diagnostics shaping
- `packages/iitc-core/src/player-tracker.test.ts`
- `apps/iitc-iris/src/page-map-runtime.ts`
  - player tracker COMM refresh timer
  - `/r/getPlexts` fetch execution through the COMM facade
  - AbortController cancellation
  - Leaflet marker/trace/popup rendering
  - player tracker portal-link navigation

## Public Concepts

Keep IITC names at the boundary:

- Domain/plugin name: `playerTracker`
- Source data: COMM messages from `getPlexts`
- Layer concepts: global player tracker, Resistance, Enlightened, Machina
- Display concepts: markers, traces, age opacity, previous locations
- Diagnostics: enabled, visible, players, events, markers, traces, latest COMM time

## Ownership And Lifecycle

- Pure COMM-derived player event extraction, pruning, de-duplication, visibility policy, opacity/age calculations, and
  diagnostics belong in `packages/iitc-core`.
- Browser-only COMM refresh timing, request execution, AbortController cancellation, Leaflet rendering, marker assets,
  popup DOM, and map navigation stay in `apps/iitc-iris/src/page-map-runtime.ts`.
- The runtime remains responsible for deciding when player tracker should refresh. The facade only describes how current
  settings and COMM data affect tracker state.

## Scope

Already existing before this slice:

- `processIitcPlayerTrackerData`
- `pruneIitcPlayerTrackerStored`
- `getIitcPlayerTrackerLatLng`
- `getIitcPlayerTrackerDiagnostics`

Implemented in this slice:

- `isIitcPlayerTrackerEnabled`
- `isIitcPlayerTrackerVisibleForZoom`
- `isIitcPlayerTrackerTeamVisible`
- `getIitcPlayerTrackerEventOpacity`
- `getIitcPlayerTrackerTraceAgeBucket`
- `applyIitcPlayerTrackerCommMessages`
- Runtime usage for visibility, opacity/trace style policy, and COMM de-duplication/process state

Non-goals:

- Do not move COMM fetch or refresh timers into core.
- Do not move Leaflet marker/trace/popup rendering into core.
- Do not change marker assets, popup layout, or portal-link navigation behavior.
- Do not port richer player tracker plugin features such as level guessing or nickname plugin integration in this pass.

## Tests And Diagnostics

Focused tests cover:

- COMM-derived player movement extraction.
- Same-time event merging and stale pruning.
- Layer/team visibility policy.
- Marker opacity and trace age bucket calculations.
- COMM de-duplication and latest COMM time preservation.

Manual/live comparison notes to capture after implementation:

- PTR/PTE/PTM layer toggles still control only their teams unless the legacy global tracker toggle is enabled.
- Tracker remains hidden below IITC min zoom and cancels refresh work when hidden.
- COMM refreshes still update all-channel data and player tracker markers.
- Marker opacity/traces still fade with age and popups still navigate via portal links.

## Validation

For code changes, run:

- `npm run test:iitc-core -- --run src/player-tracker.test.ts src/comm.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:iitc-core`
- `npm run package:iitc-iris`
- `git diff --check`
