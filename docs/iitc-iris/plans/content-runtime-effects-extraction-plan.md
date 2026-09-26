# Content Runtime Effects Extraction Plan

Status: planned. This is the next Phase 2 slice after the completed command callback, shell, and side-panel extraction
checkpoints.

## IITC Sources

- `reference/ingress-intel-total-conversion/code/comm.js` for the COMM request concept and channel refresh behavior.
- `reference/ingress-intel-total-conversion/code/map_data_request.js` for the broader page-runtime request/retry
  lifecycle model that remains outside this pass.
- `reference/ingress-intel-total-conversion/code/portal_detail.js` and related request modules only as naming/parity
  references when a side-panel request maps to an IITC concept.

This plan is app-surface extraction, not a new IITC behavior port. IITC source review is required to preserve names and
avoid changing request semantics, but implementation should stay in `apps/iitc-iris`.

## Current IRIS Sources

- `apps/iitc-iris/src/content.tsx`
- `apps/iitc-iris/src/content-outbound-messages.ts`
- `apps/iitc-iris/src/content-command-callbacks.ts`
- `apps/iitc-iris/src/content-message-adapter.ts`
- `apps/iitc-iris/src/content-layer-actions.ts`
- Existing focused tests beside those modules.

## Public Concepts

- Page-runtime message types from `IITC_IRIS_MESSAGES`, including `requestComm`, `requestScores`,
  `requestInventory`, `requestMissions`, `dataSourceSettings`, `lifecycleSettings`, and `searchClear`.
- Side-panel request names: COMM, scores, inventory, missions, passcode, search.
- Storage keys and persisted ids owned by `content-storage-settings.ts`.
- The content/page-runtime boundary: `window.postMessage(message, '*')`.

## Ownership/Lifecycle

`content.tsx` still owns Preact state, refs, effects, storage calls, timers, browser APIs, stale guards, and the actual
`window.postMessage` calls. Extracted modules may own pure derivation only: message objects, retry delay plans, whether
an effect should run, and small typed snapshots that are easy to unit test.

Do not move `useEffect`, `useCallback`, `window`, `document`, `navigator`, `performance`, `setTimeout`, refs, or Preact
state setters into a helper in this slice. Do not create a broad hook that owns runtime lifecycle.

## Hook/Plugin Visibility

No new IITC hook, plugin, `window.plugin.*`, Leaflet, or page-runtime public API is exposed. Message payloads crossing
the existing content/page boundary must remain byte-for-byte compatible unless a checkpoint explicitly documents a
divergence. There are no intended divergences in this plan.

## Scope

Reduce repeated runtime message and retry-plan assembly in `content.tsx` without changing behavior.

### Checkpoint 0: Baseline Review

- Read `index.md`, `port-plan.md`, this plan, and the current `content.tsx`.
- Confirm the working tree is based on the current refactor branch.
- Identify the exact `content.tsx` effects touched by the next checkpoint before editing.
- Do not change code in this checkpoint unless the plan is stale; update the plan first if the current code no longer
  matches the checklist.

### Checkpoint 1: Side-Panel Auto-Request Plans

Extract only pure side-panel request planning from these `content.tsx` effects:

- COMM auto-request when `activeSidePanel === 'comm'` and `commState.status === 'idle'`.
- Scores auto-request when `activeSidePanel === 'scores'` and `scoresState.status === 'idle'`.
- Inventory auto-request when `activeSidePanel === 'inventory'` and `inventoryState.status === 'idle'`.

Create a focused app module such as `content-side-panel-request-plans.ts` with pure helpers that return either `null` or
a typed plan containing:

- the exact message object to post;
- retry delays, preserving COMM `500` and `1500` ms retries and scores/inventory `500` ms retry;
- whether the COMM tab should be stored before posting.

Important compatibility rule: the existing COMM auto-request message omits `commOlder`. Do not reuse a builder that adds
`commOlder: false` unless the test proves the payload remains intentionally compatible and the divergence is documented.

`content.tsx` should still perform storage, `window.postMessage`, timer setup, and timer cleanup. The extracted helper
should not accept setters, refs, `window`, or storage functions.

Add focused unit tests for:

- COMM active/idle returns the current request payload and retry delays.
- COMM inactive or non-idle returns `null`.
- Scores active/idle returns the current request payload and retry delay.
- Inventory active/idle returns the current request payload and retry delay.
- No helper emits browser side effects.

Stop after this checkpoint for the first AGY pass.

### Checkpoint 2: Runtime Settings Message Builders

After checkpoint 1 is reviewed, extract missing pure message builders for inline runtime settings payloads:

- `dataSourceSettings`
- `lifecycleSettings`
- `searchClear`

Keep layer and highlighter timing logic in `content.tsx`; their `performance.now()` intent refs are deliberately owned by
the component. Existing `buildLayerSettingsMessage` and `buildHighlighterSettingsMessage` stay in
`content-layer-actions.ts` unless a later checkpoint narrows that ownership further.

### Checkpoint 3: Portal Mission Refresh Decision

After checkpoint 2 is reviewed, extract only the pure decision behind the selected-portal mission refresh effect:

- active side panel must be `missions`;
- mission source must be `portal`;
- current status must not be `loading`;
- selected portal guid must exist;
- selected portal guid must differ from `missionsState.portalGuid`.

`content.tsx` still calls `refreshMissions('portal')`.

### Checkpoint 4: Search Debounce Plan

After checkpoint 3 is reviewed, extract only pure search debounce decisions:

- trimmed empty term clears local search state and emits `searchClear`;
- non-empty term schedules a search after the current `100` ms delay.

`content.tsx` still owns the debounce timer, state setters, and actual request callback.

## Non-Goals

- No UI, markup, CSS, panel prop, or route changes.
- No source directory migration.
- No global store or general event bus.
- No broad `useContentRuntimeEffects` hook.
- No movement of browser, DOM, Leaflet, extension runtime, or Preact effect ownership into `packages/iitc-core`.
- No changes to storage keys, message type names, persisted ids, public panel ids, or user-facing labels.
- No cleanup of unrelated `content.tsx` callbacks while implementing these checkpoints.

## Tests/Diagnostics

Each code-changing checkpoint needs focused unit tests for the extracted pure helper. Tests should assert externally
visible contracts: message payload shape, retry delays, run/skip decisions, and compatibility with current storage or
request semantics. Avoid tests that only duplicate a helper's internal branches without protecting a content/page
boundary contract.

Manual live diagnostics are not required for checkpoint 1 if the payload and timing tests are exact and full validation
passes. Add manual notes only if a checkpoint changes when requests are posted, retried, or cleared.

## Divergences

None intended. If a helper changes a message payload, retry delay, storage timing, or request trigger condition, stop and
document the divergence here before continuing.

## Validation

For checkpoint 1:

- `npm run test -w apps/iitc-iris -- --run src/content-side-panel-request-plans.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

For later checkpoints, run the focused tests for every touched helper plus the same typecheck, lint, package, and diff
validation.
