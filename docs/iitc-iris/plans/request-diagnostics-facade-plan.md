# Request Diagnostics Facade Plan

Status: first implementation slice implemented and validated. This is Phase 1, step 8 from [index.md](index.md).

## IITC Sources

- `reference/ingress-intel-total-conversion/core/code/map_data_request.js`
  - active request lifecycle and status visibility during map data fetches
- `reference/ingress-intel-total-conversion/core/code/comm.js`
  - panel request lifecycle relationship for `getPlexts`

## Current IRIS Sources

- `packages/iitc-core/src/request-diagnostics.ts`
  - active request state
  - request begin/finish state transitions
  - copied request diagnostics snapshot
- `packages/iitc-core/src/request-diagnostics.test.ts`
- `apps/iitc-iris/src/page-map-runtime.ts`
  - request start/end timing
  - fetch execution
  - AbortController ownership
  - posting copied diagnostics with status messages
- `apps/iitc-iris/src/messages.ts`
  - copied diagnostics message shape

## Public Concepts

Keep IITC names at the boundary:

- active requests
- endpoint
- request group
- elapsed request time
- copied diagnostics on request and status messages

## Ownership And Lifecycle

- Pure active-request bookkeeping and snapshot shaping belong in `packages/iitc-core`.
- `performance.now()`, fetch execution, request cancellation, stale response guards, auth recovery, and
  `window.postMessage` stay in `apps/iitc-iris`.
- Runtime still decides when a request begins and finishes. The facade only makes the copied diagnostics shape stable and
  testable.

## Scope

Implemented in this slice:

- `createIitcRequestDiagnosticsState`
- `beginIitcRequestDiagnostics`
- `finishIitcRequestDiagnostics`
- `createIitcRequestDiagnosticsSnapshot`
- Runtime usage for active request diagnostics copied into `requestStatus`, panel status, and entity status messages

Non-goals:

- Do not move AbortController ownership into core.
- Do not change request cancellation behavior.
- Do not alter map-data retry, queue, cache, or auth recovery behavior.
- Do not move render timing counters or animation-frame scheduling into core in this pass.

## Tests And Diagnostics

Focused tests cover:

- Empty request diagnostics.
- Request id assignment.
- Active request grouping by endpoint.
- Rounded elapsed request times.
- Immutable finish behavior and stale finish calls.

Manual/live comparison notes to capture after implementation:

- Opening panels and moving the map still updates copied active request diagnostics.
- Aborted requests disappear from active diagnostics after their fetch wrapper settles.
- Entity, COMM, scores, passcode, inventory, and missions status messages still include copied request diagnostics.

## Validation

For code changes, run:

- `npm run test:iitc-core -- --run src/request-diagnostics.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:iitc-core`
- `npm run package:iitc-iris`
- `git diff --check`
