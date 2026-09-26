# Content Runtime Effects Extraction Plan

Status: All checkpoints complete. Checkpoints 0 (baseline review), 1 (side-panel auto-request plans), 2
(runtime settings message builders), 3 (portal mission refresh decision), and 4 (search debounce plan) are done.
No further checkpoints are planned for this slice.


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
- `apps/iitc-iris/src/content-search-actions.ts`
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

Remaining checkpoint execution rules:

- AGY may implement Checkpoints 3 and 4 in the same branch only if Checkpoint 3 is completed first and both checkpoints
  stay inside this plan's exact boundaries.
- Do not create a broad `content-runtime-effects` hook, dependency object, service, class, registry, or generic effect
  runner.
- Prefer small named helpers that answer one question, such as `shouldRefreshPortalMissions` or
  `getSearchDebounceAction`.
- Do not move `useEffect`, `window.setTimeout`, `window.clearTimeout`, `window.postMessage`, state setters, refs,
  `refreshMissions`, or `requestSearch` out of `content.tsx`.
- Do not touch layer/highlighter effects, side-panel auto-request effects, panel JSX, folder layout, CSS, storage keys,
  message type names, or page-runtime code while completing Checkpoints 3 and 4.
- If the implementation needs more than one small helper module plus focused tests, stop and update this plan before
  changing code.

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

Create a focused app module such as `content-side-panel-auto-requests.ts` with pure helpers that return either `null` or
a typed object containing:

- the exact message object to post;
- retry delays, preserving COMM `500` and `1500` ms retries and scores/inventory `500` ms retry.

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

#### Checkpoint 1 implementation notes (done)

Extracted to `apps/iitc-iris/src/content-side-panel-auto-requests.ts`:

- `getCommAutoRequest(activeSidePanel, commStatus, commTab)` — returns `null` or `{ message, retryDelaysMs: [500, 1500] }`.
- `getScoresAutoRequest(activeSidePanel, scoresStatus)` — returns `null` or `{ message, retryDelaysMs: [500] }`.
- `getInventoryAutoRequest(activeSidePanel, inventoryStatus)` — returns `null` or `{ message, retryDelaysMs: [500] }`.

Input types use `IitcIrisSidePanelId | null` and the exact status literal unions from the state interfaces. All three helpers are wired into their corresponding `useEffect` bodies in `content.tsx`.

Intentionally left inline in `content.tsx`:

- The `useEffect` bodies themselves (hook ownership, timer setup/cleanup via `window.setTimeout`/`clearTimeout`).
- `storeCommTab(commState.tab)` call — storage side effect owned by `content.tsx`.
- `window.postMessage(autoRequest.message, '*')` calls — browser API owned by `content.tsx`.

Compatibility verified by test: the COMM auto-request message omits `commOlder`. A dedicated test
(`does not include commOlder in the message`) guards this payload contract explicitly.

Naming: "plan" was replaced with "auto-request" to reflect the runtime behavior rather than the
planning document terminology. Renamed file: `content-side-panel-auto-requests.ts`.

### Checkpoint 2: Runtime Settings Message Builders

After checkpoint 1 is reviewed, extract missing pure message builders for inline runtime settings payloads:

- `dataSourceSettings`
- `lifecycleSettings`
- `searchClear`

Keep layer and highlighter timing logic in `content.tsx`; their `performance.now()` intent refs are deliberately owned by
the component. Existing `buildLayerSettingsMessage` and `buildHighlighterSettingsMessage` stay in
`content-layer-actions.ts` unless a later checkpoint narrows that ownership further.

#### Checkpoint 2 implementation notes (done)

Added to `apps/iitc-iris/src/content-outbound-messages.ts`:

- `buildDataSourceSettingsMessage(dataSource)` — returns `{ type: IITC_IRIS_MESSAGES.dataSourceSettings, dataSource }`.
- `buildLifecycleSettingsMessage(lifecycleSettings)` — returns `{ type: IITC_IRIS_MESSAGES.lifecycleSettings, lifecycleSettings }`.

`searchClear` was already extracted as `buildSearchClearMessage()` in `content-search-actions.ts` and is tested there.
`content.tsx` now imports it from `content-search-actions` instead of assembling the literal inline.

`content.tsx` wires the builders in three locations:
- the `dataSourceSettings` `useEffect` (replacing inline literal).
- the `lifecycleSettings` `useEffect` (replacing inline literal).
- the empty-search branch inside the search debounce `useEffect` (replacing inline literal via `buildSearchClearMessage`).
- the `retryMapFetch` closure in `retryAuthRequest` (also replaced with `buildDataSourceSettingsMessage`).

`IITC_IRIS_MESSAGES` is no longer directly referenced in `content.tsx`; the import was removed.

Intentionally left inline in `content.tsx`:

- The `useEffect` bodies (hook ownership, timer setup/cleanup).
- `storeDataSourceId`, `storeLifecycleSettings` calls — storage side effects owned by `content.tsx`.
- `window.postMessage(…, '*')` calls — browser API owned by `content.tsx`.
- Layer and highlighter timing logic (`layerSettingsIntentAtRef`, `highlighterSettingsIntentAtRef`) and their `buildLayerSettingsMessage` / `buildHighlighterSettingsMessage` calls — not touched per plan constraint.
- `setSearchState`, `setActiveSearchResultIndex` calls in the search effect — state setter ownership remains in `content.tsx`.
- The `100` ms debounce timer for non-empty search terms — timer ownership remains in `content.tsx`.

### Checkpoint 3: Portal Mission Refresh Decision

After checkpoint 2 is reviewed, extract only the pure decision behind the selected-portal mission refresh effect:

- active side panel must be `missions`;
- mission source must be `portal`;
- current status must not be `loading`;
- selected portal guid must exist;
- selected portal guid must differ from `missionsState.portalGuid`.

`content.tsx` still calls `refreshMissions('portal')`.

Preferred implementation:

- Add `apps/iitc-iris/src/content-mission-refresh.ts`.
- Export `shouldRefreshPortalMissions(input)` or an equivalently narrow name.
- The helper should return only `boolean`.
- Input should be a typed object or narrow positional args containing only:
  - `activeSidePanel`
  - selected portal guid
  - `missionsState.source`
  - `missionsState.status`
  - `missionsState.portalGuid`
- Keep `entityFetch`, full `missionsState`, callbacks, setters, refs, `window`, and Preact types out of the helper.
- Wire the helper into only the existing selected-portal mission refresh `useEffect` in `content.tsx`.

Required tests:

- returns `true` when missions panel is active, source is `portal`, status is not `loading`, selected portal guid exists,
  and selected portal differs from `missionsState.portalGuid`;
- returns `false` when the active panel is not `missions`;
- returns `false` when source is not `portal`;
- returns `false` while missions are `loading`;
- returns `false` when selected portal guid is missing;
- returns `false` when selected portal guid already matches `missionsState.portalGuid`.

#### Checkpoint 3 implementation notes (done)

Added `apps/iitc-iris/src/content-mission-refresh.ts`:

- `shouldRefreshPortalMissions(input: ShouldRefreshPortalMissionsInput)` — returns `boolean`.
- Input interface carries only `activeSidePanel`, `selectedPortalGuid`, `missionSource`, `missionStatus`, and
  `missionPortalGuid`; no setters, refs, `window`, or Preact types.
- `IitcIrisSidePanelId` is imported from `menu-registry` (its actual source), not `messages`.

`content.tsx` still calls `refreshMissions('portal')` and owns the `useEffect` dependency array.

Intentionally left inline in `content.tsx`:

- The `useEffect` body and its `refreshMissions('portal')` call.
- The `refreshMissions` `useCallback` wrapper and the `postIitcMessage` call inside it.

### Checkpoint 4: Search Debounce Plan

After checkpoint 3 is reviewed, extract only pure search debounce decisions:

- trimmed empty term clears local search state and emits `searchClear`;
- non-empty term schedules a search after the current `100` ms delay.

`content.tsx` still owns the debounce timer, state setters, and actual request callback.

Preferred implementation:

- Add the helper to `apps/iitc-iris/src/content-search-actions.ts` unless that file becomes unclear; only then add a
  focused file such as `content-search-debounce.ts`.
- Export `getSearchDebounceAction(searchTerm)` or an equivalently narrow name.
- The helper should trim the term and return a small discriminated union:
  - `{type: 'clear'}` for empty trimmed terms;
  - `{type: 'request'; term: string; delayMs: 100}` for non-empty trimmed terms.
- The helper must not call `buildSearchClearMessage`, `requestSearch`, setters, timers, `window`, or storage.
- Wire the helper into only the existing search debounce `useEffect` in `content.tsx`.
- `content.tsx` still calls `setSearchState(EMPTY_SEARCH_STATE)`, `setActiveSearchResultIndex(0)`,
  `window.postMessage(buildSearchClearMessage(), '*')`, `window.setTimeout`, `window.clearTimeout`, and
  `requestSearch(action.term, false)`.

Required tests:

- empty string returns `{type: 'clear'}`;
- whitespace-only string returns `{type: 'clear'}`;
- non-empty input returns `{type: 'request', term: trimmedTerm, delayMs: 100}`;
- the helper trims the request term without changing the current debounce delay;
- existing `buildSearchClearMessage` tests remain green.

#### Checkpoint 4 implementation notes (done)

Added `getSearchDebounceAction(searchTerm: string): SearchDebounceAction` to
`apps/iitc-iris/src/content-search-actions.ts` (the file remained clear with the addition).

- `SearchDebounceAction` is a discriminated union: `{type: 'clear'}` | `{type: 'request'; term: string; delayMs: 100}`.
- The helper trims the input term and returns `'clear'` for empty/whitespace, `'request'` otherwise.
- The helper does not call `buildSearchClearMessage`, `requestSearch`, setters, timers, `window`, or storage.
- Four new tests were added to `content-search-actions.test.ts`; existing tests remain green.

`content.tsx` still owns all runtime in the search debounce `useEffect`:

- `setSearchState(EMPTY_SEARCH_STATE)` and `setActiveSearchResultIndex(0)` on clear.
- `window.postMessage(buildSearchClearMessage(), '*')` on clear.
- `window.setTimeout(() => requestSearch(action.term, false), action.delayMs)` on request.
- `window.clearTimeout` for cleanup.

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

- `npm run test -w apps/iitc-iris -- --run src/content-side-panel-auto-requests.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

For checkpoint 2:

- `npm run test -w apps/iitc-iris -- --run src/content-outbound-messages.test.ts src/content-search-actions.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

For checkpoints 3 and 4:

- `npm run test -w apps/iitc-iris -- --run src/content-mission-refresh.test.ts src/content-search-actions.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

For later checkpoints, run the focused tests for every touched helper plus the same typecheck, lint, package, and diff
validation.
