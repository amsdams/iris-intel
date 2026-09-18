# Content Command Callbacks Extraction Plan

Status: planned. This is the next Phase 2 slice after merging the AGY app-surface extraction work into
`feaure/the-refactor`.

## Purpose

Reduce the remaining callback clutter in `apps/iitc-iris/src/content.tsx` without changing behavior or moving runtime
ownership out of the content shell.

This pass is not a new IITC parity port. It is a behavior-preserving app-side extraction around command/callback wiring
that already delegates to tested helpers or message builders.

## IITC Sources

Use IITC-CE only as naming and lifecycle context for commands touched by this pass:

- `reference/ingress-intel-total-conversion/core/code/comm.js` for COMM refresh, tab, send, and nickname behavior.
- `reference/ingress-intel-total-conversion/core/code/portal_detail.js` for selected portal focus/link/details behavior.
- `reference/ingress-intel-total-conversion/core/code/map_data_request.js` for map fetch retry and request lifecycle
  concepts.
- `reference/ingress-intel-total-conversion/plugins/draw-tools.js` for Draw Tools links/markers command concepts.

If this slice touches a command that maps to another IITC file or plugin, add that source before changing code.

## Current IRIS Sources

Primary files:

- `apps/iitc-iris/src/content.tsx`
- `apps/iitc-iris/src/content-outbound-messages.ts`
- `apps/iitc-iris/src/content-auth-navigation.ts`
- `apps/iitc-iris/src/content-copy-helpers.ts`
- `apps/iitc-iris/src/content-comm-panel-actions.ts`
- `apps/iitc-iris/src/content-camera-actions.ts`
- `apps/iitc-iris/src/content-location-actions.ts`
- `apps/iitc-iris/src/content-portal-selection-actions.ts`
- `apps/iitc-iris/src/content-search-actions.ts`
- `apps/iitc-iris/src/content-layer-actions.ts`

Likely new file:

- `apps/iitc-iris/src/content-command-callbacks.ts`
- `apps/iitc-iris/src/content-command-callbacks.test.ts`

Only add more files if the implementation proves one module would become too broad.

## Work Breakdown For AGY

Implement this as a sequence of small checkpoints. Stop after any checkpoint that reveals behavior uncertainty and
record the issue in this plan before continuing.

### Checkpoint 0: Baseline Inventory

- Start from a clean `feaure/the-refactor` working tree.
- List the remaining inline command callbacks in `content.tsx` and group them by public behavior, not by file size.
- Confirm each callback already delegates to an existing helper/message builder, or identify the smallest helper that
  needs to exist before extraction.
- Do not move code yet if the callback owns state sequencing that is not already tested.

Expected output:

- A short note in this plan, or in the implementation summary, naming the callback groups selected for extraction.
- Baseline validation from the "Before implementation" commands.

### Checkpoint 1: Simple Request Commands

Target callbacks:

- `refreshScores`
- `refreshInventory`
- `refreshMissions`
- `requestMissionDetails`
- `zoomToMission`
- `redeemPasscode`
- `sendComm`
- `addCommNickname`

Expected extraction:

- Move only the callback assembly/routing into `content-command-callbacks.ts`.
- Keep `window.postMessage`, setters, and current state passed in from `content.tsx` as narrow dependencies.
- Preserve current default arguments, especially mission source fallback and passcode loading guard behavior.

Expected tests:

- Assert emitted messages or delegated calls for scores, inventory, missions, mission details, mission zoom, passcode,
  COMM send, and nickname append.
- Include negative cases for empty passcode, loading passcode, empty COMM draft, and alerts COMM tab.

### Checkpoint 2: Search Commands

Target callbacks:

- `requestSearch`
- `clearSearch`
- `previewSearchResult`
- `selectSearchResult`
- `moveSearchSelection`
- `selectActiveSearchResult`
- `handleSearchKeyDown`

Expected extraction:

- Preserve search message payloads, active-result filtering, wrapping behavior, and keyboard `preventDefault` behavior.
- Keep map-focus close behavior explicit and tested.
- Keep `openSheet('portal')` behavior for portal/guid results exactly as-is.

Expected tests:

- Assert search request/clear/preview/select message shape.
- Assert active-result movement skips `empty` rows and wraps.
- Assert Enter and Shift+Enter selection behavior.
- Assert map-focus mode closes sheets instead of opening the portal sheet.

### Checkpoint 3: Map, Context, And Portal Commands

Target callbacks:

- `setMapView`
- `centerMapContext`
- `zoomToAndShowPortal`
- `selectMapContextAnchor`
- `selectPortalByLatLng`
- `selectCommPortal`
- `panMap`
- `zoomMap`
- `clearPortalSelection`
- `focusSelectedPortal`
- `copyMapContextLatLng`
- `copyMapContextUrl`
- `copyMapContextGuid`
- `copyMapContextPortalGuids`
- `copySelectedPortalLink`
- `copySelectedPortalGuid`
- `copySelectedPortalTitle`
- `setPortalSectionOpen`

Expected extraction:

- Keep map camera values passed in from `content.tsx`.
- Preserve zoom defaults, `latE6`/`lngE6` conversion, and no-op behavior when required coordinates are missing.
- Preserve portal section storage behavior and copy status behavior.

Expected tests:

- Assert map view, pan, zoom, clear-selection, and portal-selection payloads.
- Assert context copy/center no-op behavior with missing context.
- Assert selected portal copy/focus behavior for null and selected portal states.
- Assert portal section persistence uses the updated section map.

### Checkpoint 4: Sheet/Menu/Auth/Data Source Commands

Target callbacks:

- `closeSheetToMap`
- `closeSidePanel`
- `openSheet`
- `toggleSheet`
- `openIntelLogin`
- `retryAuthRequest`
- `openCommPanel`
- `selectCommTab`
- `toggleCommPanel`
- `toggleMissionsSheet`
- `togglePrimaryMenu`
- `setDataSource`

Expected extraction:

- This is the highest-risk checkpoint. Keep the existing state update ordering unless a test proves it is equivalent.
- Preserve panel-request cancellation before sheet changes.
- Preserve `storeActiveSheet` and `storeSidePanelId` writes.
- Preserve passcode auth retry priority over sheet-level search retry.
- Preserve data-source id normalization and fixture map jump behavior.

Expected tests:

- Assert close/open/toggle sheet effects, including cancel-panel-request message emission.
- Assert primary menu effects for map, selected, agent, comm, and system menus.
- Assert COMM tab selection refreshes only when needed.
- Assert mission sheet portal/view toggles.
- Assert auth retry routes to active side panel before search/map fallback.
- Assert data-source fixture selection stores id and jumps to fixture coordinates.

### Checkpoint 5: Layer And Highlighter Commands

Target callbacks:

- `toggleLayerSetting`
- `selectPortalHighlighter`

Expected extraction:

- Preserve intent timestamp handling in `content.tsx` unless the extracted helper accepts explicit timestamp setter
  callbacks.
- Do not change the `useEffect` that stores settings and posts layer/highlighter messages unless this plan is updated.

Expected tests:

- Assert layer setting toggles from the current state.
- Assert highlighter selection value.
- If timestamp handling moves, assert the posted `sentAt` behavior does not regress.

### Checkpoint 6: Cleanup And Review

- Remove only imports and inline callbacks made obsolete by this slice.
- Keep panel prop names stable unless changing them removes a now-redundant local wrapper without changing behavior.
- Re-read the final `content.tsx` diff against the pre-slice version and look specifically for changed ordering,
  defaults, no-op branches, and message payload fields.
- Update this plan's status and completed checkpoints.
- Run the "Before merge" validation commands.

## Public Concepts

Preserve the existing public behavior and names for:

- `window.postMessage` payloads using `IITC_IRIS_MESSAGES`.
- COMM refresh/send/pagination and current tab behavior.
- Scores, inventory, missions, mission details, passcode redemption, and auth retry commands.
- Search request, clear, preview, select, active-result keyboard navigation, and map-focus close behavior.
- Portal selection, selected portal copy actions, selected portal focus, section open state, and image preview behavior.
- Map view, pan, zoom, geolocation, presets, data-source selection, and map context copy/center commands.
- Layer/highlighter setting intents and sent-at behavior.
- Sheet/menu toggles, close behavior, and panel-request cancellation.

Do not rename message types, storage keys, persisted ids, sheet ids, side-panel ids, or user-facing labels in this pass.

## Ownership/Lifecycle

- `content.tsx` keeps top-level Preact state, refs, browser effects, storage effects, inbound message listener,
  page-runtime message boundary, request lifecycle triggers, and stale-response guards.
- The new command-callback module may own pure callback assembly and callback routing where dependencies are passed in
  explicitly.
- The new module must not create long-lived state, timers, subscriptions, DOM listeners, storage effects, or global
  singletons.
- Browser APIs such as `window.postMessage`, `navigator.geolocation`, `document`, `performance`, `sessionStorage`, and
  `localStorage` must either remain in `content.tsx` or be passed in as narrow adapters for testability.
- Callback extraction must preserve ordering-sensitive behavior, especially:
  - sheet/panel state updates and `storeActiveSheet` / `storeSidePanelId`;
  - panel-request cancellation before opening/closing sheets;
  - passcode retry before sheet-level search retry when a passcode side panel is active;
  - layer/highlighter intent timestamps;
  - map-focus close behavior after selecting search results.

## Hook/Plugin Visibility

- Do not expose new `window.plugin.*`, `addHook`/`runHooks`, toolbox, or Leaflet.draw events.
- Do not add a global event bus or app-wide command registry.
- If a Preact hook is introduced, keep it app-local and dependency-injected. The hook must be documented here before
  implementation and tested through externally visible callback effects, not only returned function names.

## Scope

In scope:

- Extract callback wiring for commands that already delegate to existing focused helpers or outbound message builders.
- Prefer a small `createContentCommandCallbacks(...)` helper, or a narrowly named hook only if Preact memoization is
  needed to keep existing behavior.
- Keep `content.tsx` as the place where current state snapshots, setters, refs, and browser adapters are gathered.
- Add regression tests around callback effects that previously crossed `content.tsx` boundaries.

Out of scope:

- No UI redesign or panel prop redesign.
- No global store, event bus, command registry, or reducer migration.
- No move of inbound message handling or page-runtime lifecycle effects.
- No changes to `packages/iitc-core` unless a separate facade/parity plan is written first.
- No Draw Tools v2/plugin API work.
- No changes to request timing, retry policy, cancellation behavior, or storage semantics.

## Tests/Diagnostics

Add focused tests for command behavior that can regress during callback extraction:

- Auth retry routing, including passcode side-panel priority over search retry.
- Stable outbound message payloads for scores, inventory, missions, mission details, passcode, search, map view, pan,
  zoom, clear selection, layer settings, and highlighter settings.
- Storage-compatible commands, including data-source id normalization and sheet/side-panel persistence.
- Search active-result movement/select behavior and map-focus close behavior.
- Portal section open persistence and selected portal copy/focus command routing.

Existing tests may be reused when they already assert the public callback effect. Do not count tests that only assert
private helper shape as sufficient for moved runtime boundaries.

## Divergences

None intended. Any behavior difference found during this pass is a bug unless this plan is updated first with:

- the old behavior;
- the new behavior;
- why the divergence is necessary;
- how to compare it against IITC-CE or the previous IRIS branch.

## Validation

Before implementation:

```sh
git status --short
npm run test -w apps/iitc-iris
npm run typecheck:iitc-iris
```

After each focused slice:

```sh
npm run test -w apps/iitc-iris -- --run src/content-command-callbacks.test.ts
npm run test -w apps/iitc-iris -- --run src/content-auth-navigation.test.ts src/content-storage-settings.test.ts src/content-search-actions.test.ts src/content-portal-selection-actions.test.ts src/content-layer-actions.test.ts
npm run typecheck:iitc-iris
npm run lint:iitc-iris
npm run package:iitc-iris
git diff --check
```

Before merge:

```sh
npm run test -w apps/iitc-iris
npm run typecheck:iitc-iris
npm run lint:iitc-iris
npm run package:iitc-iris
git diff --check
```

## Stop Conditions

Stop and re-plan instead of continuing if:

- the extraction needs to move browser effects, inbound message handling, or stale-response guards out of `content.tsx`;
- callback dependencies become a large untyped bag that is harder to audit than the current inline handlers;
- tests require broad component mounting just to prove behavior that could be covered by a smaller helper contract;
- any persisted id, storage key, message shape, or sheet/side-panel lifecycle changes.
