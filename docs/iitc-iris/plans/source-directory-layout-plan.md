# Source Directory Layout Plan

Status: complete. All move-only source directory layout checkpoints are done.

## IITC Sources

This is not an IITC behavior port. IITC-CE sources are relevant only for preserving recognizable domain names when
choosing folder names, such as `comm`, `portalDetails`, `search`, `missions`, `draw-tools`, `map`, `layers`, and
`playerTracker`.

## Current IRIS Sources

- `apps/iitc-iris/src/*`
- Phase 2 extracted app modules and tests.
- `tsconfig`, Vite, Vitest, ESLint, and package entry points if import paths require validation.

## Public Concepts

- Existing module exports, message types, storage keys, panel ids, sheet ids, CSS class names, build artifacts, and test
  paths.
- Existing IITC-aligned domain names. Folder names should make comparison easier, not invent generic architecture.

## Ownership/Lifecycle

This is a move-only refactor. Ownership does not change. Files keep the same responsibilities they had before the move.
No state, effects, runtime boundaries, helper behavior, or rendering behavior should change.

## Hook/Plugin Visibility

No new hook/plugin surface is exposed. No page-runtime globals, plugin APIs, Leaflet APIs, message types, or app settings
are changed.

## Scope

Move files into feature/domain folders after the Phase 2 closure audit approves this plan. This queue is now completed
history; keep it as a record of the move-only scopes.

Preferred folder vocabulary:

- `comm`
- `search`
- `portals`
- `missions`
- `draw-tools`
- `map`
- `layers`
- `auth`
- `shell`
- `system`

Avoid generic layer buckets such as `components`, `hooks`, `utils`, or `lib` unless a later plan documents why a domain
folder is worse.

## Execution Rules

- Move one feature/domain at a time.
- Do not move `content.tsx` in the first layout pass.
- Do not combine file moves with logic changes, formatting churn, UI changes, test rewrites, or cleanup.
- Do not rename exported functions/types unless import paths force a local alias update.
- Do not change CSS class names, storage keys, message ids, panel ids, sheet ids, or user-facing labels.
- Keep test files with the modules they test where practical.
- After each feature/domain move, run focused tests for moved files plus typecheck/lint/package.
- If a move needs behavior changes to make imports work, stop and create a separate extraction plan instead.

## Move Queue

Completed one domain per checkpoint. These entries are retained as the historical move-only scope.

1. Search folder, done:
   - `content-search-actions.ts`
   - `content-search-actions.test.ts`
   - `search-panel.tsx`
2. Missions folder, done:
   - `missions-panel.tsx`
   - `content-mission-refresh.ts`
   - `content-mission-refresh.test.ts`
3. COMM folder:
   - COMM display, panel, input, scroll, and panel-action helpers.
4. Draw Tools folder:
   - `content-draw-tools*.ts`
   - `draw-tools-panel.tsx`
   - related tests.
5. Portal Analysis folder:
   - portal counts/list/scoreboard panels and portal-analysis helpers.
6. Portals folder:
   - portal details, portal image modal, portal selection, portal detail section registry, and selection lifecycle.
7. Layers folder, done:
   - layer/highlighter registries, layer update routing, layer settings actions, and layers panel.
8. Map folder, done:
   - map controls, map navigation/camera/location/context/status helpers, geodesic helpers, and map context runtime.
9. System folder, done:
   - system panels, diagnostics, scenarios, dock diagnostics, help panel, and copy/feedback helpers if still root-local.
10. Auth folder, done:
   - auth recovery/navigation and login/logout related helpers.
11. Side request panels, done:
   - agent, inventory, passcode, and scores panels if they have not naturally moved with another domain.
12. Shell/shared app folder, done:
   - menu/sheet/keyboard/storage/message-adapter/outbound-message helpers and panel containers, after all feature
     folders are stable.

Do not move `content.tsx`, `page-map-runtime.ts`, `messages.ts`, `global.d.ts`, or `iitc-iris.css` in these checkpoints.
Those files are app/runtime roots and need a separate plan if they ever move.

## Tests/Diagnostics

For a move-only checkpoint, run:

- focused tests for moved modules;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- `git diff --check`

#### Checkpoint 12 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- Focused Shell tests: 10 files and 48 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 12 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Typecheck, lint, package, and `git diff --check` pass. 
All checkpoints in this source-layout refactor are now complete!
.

Manual live testing is not required for import-only moves unless package/build output changes unexpectedly.

## Divergences

None intended. Any behavior, API, or UI difference means the checkpoint is no longer move-only and must stop.

## Validation

For Checkpoint 1:

- `npm run test -w apps/iitc-iris -- --run src/search/content-search-actions.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

## Checkpoints

### Checkpoint 1: Search Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/content-search-actions.ts` to `apps/iitc-iris/src/search/content-search-actions.ts`
- `apps/iitc-iris/src/content-search-actions.test.ts` to `apps/iitc-iris/src/search/content-search-actions.test.ts`
- `apps/iitc-iris/src/search-panel.tsx` to `apps/iitc-iris/src/search/search-panel.tsx`

Required import rewrites:

- Update `content.tsx` imports for `IitcIrisSearchPanel`, `buildSearchClearMessage`, and `getSearchDebounceAction`.
- Update any local imports inside the moved files from `./messages` to `../messages` or equivalent relative paths.
- Update tests to import from the moved module path only by relative path inside `search/`.

Strict rules:

- Do not edit logic while moving.
- Do not rename exported functions or types.
- Do not move unrelated search references from other modules.
- Do not move CSS.
- Do not create barrel files.
- Do not change the public display of the Search panel.
- Do not continue to a second folder in the same branch.

#### Checkpoint 1 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Files with updated import paths:
- `search/content-search-actions.ts`: `./messages` → `../messages` (×2)
- `search/search-panel.tsx`: `./comm-display`, `./messages`, `./ui-status` → `../` equivalents
- `search/content-search-actions.test.ts`: `./messages` → `../messages` (×2); `./content-search-actions` unchanged (same folder)
- `src/content.tsx`: `./search-panel` → `./search/search-panel`; `./content-search-actions` → `./search/content-search-actions`
- `src/content-command-callbacks.ts`: `./content-search-actions` → `./search/content-search-actions`

Validation results:
- `npm run test -w apps/iitc-iris -- --run src/search/content-search-actions.test.ts`: 10 tests passed
- `npm run typecheck:iitc-iris`: pass
- `npm run lint:iitc-iris`: pass
- `npm run package:iitc-iris`: pass (Chrome + Firefox artifacts built)
- `git diff --check`: clean

### Checkpoint 2: Missions Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/missions-panel.tsx` to `apps/iitc-iris/src/missions/missions-panel.tsx`
- `apps/iitc-iris/src/content-mission-refresh.ts` to `apps/iitc-iris/src/missions/content-mission-refresh.ts`
- `apps/iitc-iris/src/content-mission-refresh.test.ts` to `apps/iitc-iris/src/missions/content-mission-refresh.test.ts`

Required import rewrites:

- Update `content.tsx` import for `shouldRefreshPortalMissions`.
- Update `request-side-panel-container.tsx` import for `IitcIrisMissionsPanel`.
- Update any local imports inside moved files from `./messages`, `./format`, `./ui-status`, or other root-local modules
  to `../` equivalents.
- Update tests to import from the moved module path by relative path inside `missions/`.

Strict rules:

- Do not edit logic while moving.
- Do not rename exported functions or types.
- Do not move unrelated mission request/action modules unless the move fails without them; if that happens, stop and
  update this plan before continuing.
- Do not move CSS.
- Do not create barrel files.
- Do not change the public display of the Missions panel.
- Do not continue to Draw Tools or any second folder in the same branch.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/missions/content-mission-refresh.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 2 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Files with updated import paths:
- `missions/missions-panel.tsx`: root-local `comm-display`, `messages`, and `ui-status` imports now use `../`.
- `missions/content-mission-refresh.ts`: root-local `messages` and `menu-registry` imports now use `../`.
- `src/content.tsx`: `./content-mission-refresh` → `./missions/content-mission-refresh`.
- `src/request-side-panel-container.tsx`: `./missions-panel` → `./missions/missions-panel`.

Validation results:
- Focused test: 7 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 2 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The staged moves preserve all three file bodies; the working-tree changes are limited to the required parent-relative imports and the two approved consumer imports. `git diff --check` passes. After dependencies were installed, the focused test passed; typecheck, lint, and package also pass. Checkpoint 3 is unblocked.

### Checkpoint 3: COMM Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/comm-display.ts` to `apps/iitc-iris/src/comm/comm-display.ts`
- `apps/iitc-iris/src/comm-display.test.ts` to `apps/iitc-iris/src/comm/comm-display.test.ts`
- `apps/iitc-iris/src/comm-message-list.tsx` to `apps/iitc-iris/src/comm/comm-message-list.tsx`
- `apps/iitc-iris/src/comm-panel-body.tsx` to `apps/iitc-iris/src/comm/comm-panel-body.tsx`
- `apps/iitc-iris/src/comm-panel-controls.tsx` to `apps/iitc-iris/src/comm/comm-panel-controls.tsx`
- `apps/iitc-iris/src/comm-panel.tsx` to `apps/iitc-iris/src/comm/comm-panel.tsx`
- `apps/iitc-iris/src/content-comm-actions.ts` to `apps/iitc-iris/src/comm/content-comm-actions.ts`
- `apps/iitc-iris/src/content-comm-actions.test.ts` to `apps/iitc-iris/src/comm/content-comm-actions.test.ts`
- `apps/iitc-iris/src/content-comm-input-actions.ts` to `apps/iitc-iris/src/comm/content-comm-input-actions.ts`
- `apps/iitc-iris/src/content-comm-input-actions.test.ts` to `apps/iitc-iris/src/comm/content-comm-input-actions.test.ts`
- `apps/iitc-iris/src/content-comm-panel-actions.ts` to `apps/iitc-iris/src/comm/content-comm-panel-actions.ts`
- `apps/iitc-iris/src/content-comm-panel-actions.test.ts` to `apps/iitc-iris/src/comm/content-comm-panel-actions.test.ts`

Expected import rewrites:

- Update `content.tsx`, `content-command-callbacks.ts`, `request-side-panel-container.tsx`, `sheet-tabbar.tsx`, and any
  panel files that import COMM helpers.
- Inside moved files, rewrite root-local imports such as `./messages`, `./ui-status`, and
  `./content-storage-settings` to `../` equivalents.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/comm/comm-display.test.ts src/comm/content-comm-actions.test.ts src/comm/content-comm-input-actions.test.ts src/comm/content-comm-panel-actions.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 3 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- Focused COMM tests: 4 files and 16 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 3 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The twelve moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Focused COMM tests (16 tests), typecheck, lint, package, and `git diff --check` pass. Checkpoint 4 is unblocked.

### Checkpoint 4: Draw Tools Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/content-draw-tools.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools.ts`
- `apps/iitc-iris/src/content-draw-tools.test.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools.test.ts`
- `apps/iitc-iris/src/content-draw-tools-actions.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools-actions.ts`
- `apps/iitc-iris/src/content-draw-tools-actions.test.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools-actions.test.ts`
- `apps/iitc-iris/src/content-draw-tools-lifecycle.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools-lifecycle.ts`
- `apps/iitc-iris/src/content-draw-tools-lifecycle.test.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools-lifecycle.test.ts`
- `apps/iitc-iris/src/content-draw-tools-panel-actions.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools-panel-actions.ts`
- `apps/iitc-iris/src/content-draw-tools-panel-actions.test.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools-panel-actions.test.ts`
- `apps/iitc-iris/src/content-draw-tools-workflow.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools-workflow.ts`
- `apps/iitc-iris/src/content-draw-tools-workflow.test.ts` to `apps/iitc-iris/src/draw-tools/content-draw-tools-workflow.test.ts`
- `apps/iitc-iris/src/draw-tools-panel.tsx` to `apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`

Do not port new Draw Tools behavior in this checkpoint.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/draw-tools/content-draw-tools.test.ts src/draw-tools/content-draw-tools-actions.test.ts src/draw-tools/content-draw-tools-lifecycle.test.ts src/draw-tools/content-draw-tools-panel-actions.test.ts src/draw-tools/content-draw-tools-workflow.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 4 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- Focused Draw Tools tests: 5 files and 34 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 4 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The eleven moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Focused Draw Tools tests (34 tests), typecheck, lint, package, and `git diff --check` pass. Checkpoint 5 is unblocked.

### Checkpoint 5: Portal Analysis Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/content-portal-analysis.ts` to `apps/iitc-iris/src/portal-analysis/content-portal-analysis.ts`
- `apps/iitc-iris/src/content-portal-analysis.test.ts` to `apps/iitc-iris/src/portal-analysis/content-portal-analysis.test.ts`
- `apps/iitc-iris/src/content-portal-analysis-actions.ts` to `apps/iitc-iris/src/portal-analysis/content-portal-analysis-actions.ts`
- `apps/iitc-iris/src/content-portal-analysis-actions.test.ts` to `apps/iitc-iris/src/portal-analysis/content-portal-analysis-actions.test.ts`
- `apps/iitc-iris/src/content-portal-analysis-workflow.ts` to `apps/iitc-iris/src/portal-analysis/content-portal-analysis-workflow.ts`
- `apps/iitc-iris/src/content-portal-analysis-workflow.test.ts` to `apps/iitc-iris/src/portal-analysis/content-portal-analysis-workflow.test.ts`
- `apps/iitc-iris/src/portal-counts-panel.tsx` to `apps/iitc-iris/src/portal-analysis/portal-counts-panel.tsx`
- `apps/iitc-iris/src/portals-list-panel.tsx` to `apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`
- `apps/iitc-iris/src/scoreboard-panel.tsx` to `apps/iitc-iris/src/portal-analysis/scoreboard-panel.tsx`

Validation:

- `npm run test -w apps/iitc-iris -- --run src/portal-analysis/content-portal-analysis.test.ts src/portal-analysis/content-portal-analysis-actions.test.ts src/portal-analysis/content-portal-analysis-workflow.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 5 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- Focused Portal Analysis tests: 3 files and 12 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 5 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The nine moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Focused Portal Analysis tests (12 tests), typecheck, lint, package, and `git diff --check` pass. Checkpoint 6 is unblocked.

### Checkpoint 6: Portals Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/portal-details-panel.tsx` to `apps/iitc-iris/src/portals/portal-details-panel.tsx`
- `apps/iitc-iris/src/portal-image-modal.tsx` to `apps/iitc-iris/src/portals/portal-image-modal.tsx`
- `apps/iitc-iris/src/portal-detail-section-registry.ts` to `apps/iitc-iris/src/portals/portal-detail-section-registry.ts`
- `apps/iitc-iris/src/portal-detail-section-registry.test.ts` to `apps/iitc-iris/src/portals/portal-detail-section-registry.test.ts`
- `apps/iitc-iris/src/content-portal-selection-actions.ts` to `apps/iitc-iris/src/portals/content-portal-selection-actions.ts`
- `apps/iitc-iris/src/content-portal-selection-actions.test.ts` to `apps/iitc-iris/src/portals/content-portal-selection-actions.test.ts`
- `apps/iitc-iris/src/selection-lifecycle.ts` to `apps/iitc-iris/src/portals/selection-lifecycle.ts`
- `apps/iitc-iris/src/selection-lifecycle.test.ts` to `apps/iitc-iris/src/portals/selection-lifecycle.test.ts`

Validation:

- `npm run test -w apps/iitc-iris -- --run src/portals/portal-detail-section-registry.test.ts src/portals/content-portal-selection-actions.test.ts src/portals/selection-lifecycle.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 6 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- Focused Portals tests: 3 files and 12 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 6 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The eight moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Focused Portals tests (12 tests), typecheck, lint, package, and `git diff --check` pass. Checkpoint 7 is unblocked.

### Checkpoint 7: Layers Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/layer-registry.ts` to `apps/iitc-iris/src/layers/layer-registry.ts`
- `apps/iitc-iris/src/layer-registry.test.ts` to `apps/iitc-iris/src/layers/layer-registry.test.ts`
- `apps/iitc-iris/src/layer-update-routing.ts` to `apps/iitc-iris/src/layers/layer-update-routing.ts`
- `apps/iitc-iris/src/layer-update-routing.test.ts` to `apps/iitc-iris/src/layers/layer-update-routing.test.ts`
- `apps/iitc-iris/src/highlighter-registry.ts` to `apps/iitc-iris/src/layers/highlighter-registry.ts`
- `apps/iitc-iris/src/highlighter-registry.test.ts` to `apps/iitc-iris/src/layers/highlighter-registry.test.ts`
- `apps/iitc-iris/src/content-layer-actions.ts` to `apps/iitc-iris/src/layers/content-layer-actions.ts`
- `apps/iitc-iris/src/content-layer-actions.test.ts` to `apps/iitc-iris/src/layers/content-layer-actions.test.ts`
- `apps/iitc-iris/src/layers-panel.tsx` to `apps/iitc-iris/src/layers/layers-panel.tsx`

Validation:

- `npm run test -w apps/iitc-iris -- --run src/layers/layer-registry.test.ts src/layers/layer-update-routing.test.ts src/layers/highlighter-registry.test.ts src/layers/content-layer-actions.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 7 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- Focused Layers tests: 4 files and 14 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 7 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The nine moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Focused Layers tests (14 tests), typecheck, lint, package, and `git diff --check` pass. Checkpoint 8 is unblocked.

### Checkpoint 8: Map Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/content-camera-actions.ts` to `apps/iitc-iris/src/map/content-camera-actions.ts`
- `apps/iitc-iris/src/content-camera-actions.test.ts` to `apps/iitc-iris/src/map/content-camera-actions.test.ts`
- `apps/iitc-iris/src/content-location-actions.ts` to `apps/iitc-iris/src/map/content-location-actions.ts`
- `apps/iitc-iris/src/content-map-context.ts` to `apps/iitc-iris/src/map/content-map-context.ts`
- `apps/iitc-iris/src/content-map-context.test.ts` to `apps/iitc-iris/src/map/content-map-context.test.ts`
- `apps/iitc-iris/src/content-map-navigation.ts` to `apps/iitc-iris/src/map/content-map-navigation.ts`
- `apps/iitc-iris/src/content-map-navigation.test.ts` to `apps/iitc-iris/src/map/content-map-navigation.test.ts`
- `apps/iitc-iris/src/content-map-status.ts` to `apps/iitc-iris/src/map/content-map-status.ts`
- `apps/iitc-iris/src/content-map-status.test.ts` to `apps/iitc-iris/src/map/content-map-status.test.ts`
- `apps/iitc-iris/src/map-controls-panel.tsx` to `apps/iitc-iris/src/map/map-controls-panel.tsx`
- `apps/iitc-iris/src/map-controls-panel-container.tsx` to `apps/iitc-iris/src/map/map-controls-panel-container.tsx`
- `apps/iitc-iris/src/map-controls-panel-container.test.ts` to `apps/iitc-iris/src/map/map-controls-panel-container.test.ts`
- `apps/iitc-iris/src/map-context-runtime.ts` to `apps/iitc-iris/src/map/map-context-runtime.ts`
- `apps/iitc-iris/src/iitc-geodesic.ts` to `apps/iitc-iris/src/map/iitc-geodesic.ts`
- `apps/iitc-iris/src/leaflet-geodesic.ts` to `apps/iitc-iris/src/map/leaflet-geodesic.ts`
- `apps/iitc-iris/src/leaflet-geodesic.test.ts` to `apps/iitc-iris/src/map/leaflet-geodesic.test.ts`

Do not move `page-map-runtime.ts` in this checkpoint.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/map/content-camera-actions.test.ts src/map/content-map-context.test.ts src/map/content-map-navigation.test.ts src/map/content-map-status.test.ts src/map/map-controls-panel-container.test.ts src/map/leaflet-geodesic.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 8 implementation notes (done)

Moved with `git mv` including the initially omitted `content-location-actions.test.ts` file to keep tests with the modules they test. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- Focused Map tests: 7 files and 31 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 8 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Focused Map tests (31 tests), typecheck, lint, package, and `git diff --check` pass. Checkpoint 9 is unblocked.

### Checkpoint 9: System Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/system-controls-panel.tsx` to `apps/iitc-iris/src/system/system-controls-panel.tsx`
- `apps/iitc-iris/src/system-diagnostics-panel.tsx` to `apps/iitc-iris/src/system/system-diagnostics-panel.tsx`
- `apps/iitc-iris/src/system-panel-container.tsx` to `apps/iitc-iris/src/system/system-panel-container.tsx`
- `apps/iitc-iris/src/content-dock-diagnostics.ts` to `apps/iitc-iris/src/system/content-dock-diagnostics.ts`
- `apps/iitc-iris/src/content-dock-diagnostics.test.ts` to `apps/iitc-iris/src/system/content-dock-diagnostics.test.ts`
- `apps/iitc-iris/src/content-scenarios.ts` to `apps/iitc-iris/src/system/content-scenarios.ts`
- `apps/iitc-iris/src/content-scenarios.test.ts` to `apps/iitc-iris/src/system/content-scenarios.test.ts`
- `apps/iitc-iris/src/content-scenario-actions.ts` to `apps/iitc-iris/src/system/content-scenario-actions.ts`
- `apps/iitc-iris/src/content-scenario-actions.test.ts` to `apps/iitc-iris/src/system/content-scenario-actions.test.ts`
- `apps/iitc-iris/src/content-scenario-management.ts` to `apps/iitc-iris/src/system/content-scenario-management.ts`
- `apps/iitc-iris/src/content-scenario-management.test.ts` to `apps/iitc-iris/src/system/content-scenario-management.test.ts`
- `apps/iitc-iris/src/content-scenario-workflow.ts` to `apps/iitc-iris/src/system/content-scenario-workflow.ts`
- `apps/iitc-iris/src/content-scenario-workflow.test.ts` to `apps/iitc-iris/src/system/content-scenario-workflow.test.ts`
- `apps/iitc-iris/src/help-panel.tsx` to `apps/iitc-iris/src/system/help-panel.tsx`

Validation:

- `npm run test -w apps/iitc-iris -- --run src/system/content-dock-diagnostics.test.ts src/system/content-scenarios.test.ts src/system/content-scenario-actions.test.ts src/system/content-scenario-management.test.ts src/system/content-scenario-workflow.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

### Checkpoint 10: Auth Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/content-auth-navigation.ts` to `apps/iitc-iris/src/auth/content-auth-navigation.ts`
- `apps/iitc-iris/src/content-auth-navigation.test.ts` to `apps/iitc-iris/src/auth/content-auth-navigation.test.ts`
- `apps/iitc-iris/src/auth-recovery-banner.tsx` to `apps/iitc-iris/src/auth/auth-recovery-banner.tsx`

Validation:

- `npm run test -w apps/iitc-iris -- --run src/auth/content-auth-navigation.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 10 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- Focused Auth test: 1 file and 5 tests passed.
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 10 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Focused Auth tests (5 tests), typecheck, lint, package, and `git diff --check` pass. Checkpoint 11 is unblocked.

### Checkpoint 11: Side Request Panel Folder Move

Status: done.

Move only these files:

- `apps/iitc-iris/src/agent-panel.tsx` to `apps/iitc-iris/src/side-panels/agent-panel.tsx`
- `apps/iitc-iris/src/inventory-panel.tsx` to `apps/iitc-iris/src/side-panels/inventory-panel.tsx`
- `apps/iitc-iris/src/passcode-panel.tsx` to `apps/iitc-iris/src/side-panels/passcode-panel.tsx`
- `apps/iitc-iris/src/scores-panel.tsx` to `apps/iitc-iris/src/side-panels/scores-panel.tsx`

Do not move `request-side-panel-container.tsx` here; keep container moves for Checkpoint 12.

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

#### Checkpoint 11 implementation notes (done)

Moved with `git mv`. Import rewrites only — no logic, export, CSS, or test changes.

Validation results:
- `npm run typecheck:iitc-iris`: pass.
- `npm run lint:iitc-iris`: pass.
- `npm run package:iitc-iris`: pass; Chrome ZIP and Firefox XPI built.
- `git diff --check`: clean.

#### Checkpoint 11 review (2026-09-26)

Reviewed against the approved file list and import-rewrite scope. The moves preserve file bodies; the only changes are required parent-relative imports and consumer import paths. Typecheck, lint, package, and `git diff --check` pass. Checkpoint 12 is unblocked.

### Checkpoint 12: Shell And Shared App Folder Move

Status: done.

This is the highest-churn move-only checkpoint. Re-review this file list before assigning it.

Move only these files:

- `apps/iitc-iris/src/menu-registry.ts` to `apps/iitc-iris/src/shell/menu-registry.ts`
- `apps/iitc-iris/src/menu-registry.test.ts` to `apps/iitc-iris/src/shell/menu-registry.test.ts`
- `apps/iitc-iris/src/content-primary-menu.ts` to `apps/iitc-iris/src/shell/content-primary-menu.ts`
- `apps/iitc-iris/src/content-primary-menu.test.ts` to `apps/iitc-iris/src/shell/content-primary-menu.test.ts`
- `apps/iitc-iris/src/content-sheet-navigation.ts` to `apps/iitc-iris/src/shell/content-sheet-navigation.ts`
- `apps/iitc-iris/src/content-sheet-navigation.test.ts` to `apps/iitc-iris/src/shell/content-sheet-navigation.test.ts`
- `apps/iitc-iris/src/content-keyboard-shortcuts.ts` to `apps/iitc-iris/src/shell/content-keyboard-shortcuts.ts`
- `apps/iitc-iris/src/content-keyboard-shortcuts.test.ts` to `apps/iitc-iris/src/shell/content-keyboard-shortcuts.test.ts`
- `apps/iitc-iris/src/sheet-tabbar.tsx` to `apps/iitc-iris/src/shell/sheet-tabbar.tsx`
- `apps/iitc-iris/src/request-side-panel-container.tsx` to `apps/iitc-iris/src/shell/request-side-panel-container.tsx`
- `apps/iitc-iris/src/content-storage-settings.ts` to `apps/iitc-iris/src/shell/content-storage-settings.ts`
- `apps/iitc-iris/src/content-storage-settings.test.ts` to `apps/iitc-iris/src/shell/content-storage-settings.test.ts`
- `apps/iitc-iris/src/content-message-adapter.ts` to `apps/iitc-iris/src/shell/content-message-adapter.ts`
- `apps/iitc-iris/src/content-message-adapter.test.ts` to `apps/iitc-iris/src/shell/content-message-adapter.test.ts`
- `apps/iitc-iris/src/content-outbound-messages.ts` to `apps/iitc-iris/src/shell/content-outbound-messages.ts`
- `apps/iitc-iris/src/content-outbound-messages.test.ts` to `apps/iitc-iris/src/shell/content-outbound-messages.test.ts`
- `apps/iitc-iris/src/content-side-panel-auto-requests.ts` to `apps/iitc-iris/src/shell/content-side-panel-auto-requests.ts`
- `apps/iitc-iris/src/content-side-panel-auto-requests.test.ts` to `apps/iitc-iris/src/shell/content-side-panel-auto-requests.test.ts`
- `apps/iitc-iris/src/content-feedback.ts` to `apps/iitc-iris/src/shell/content-feedback.ts`
- `apps/iitc-iris/src/content-feedback.test.ts` to `apps/iitc-iris/src/shell/content-feedback.test.ts`
- `apps/iitc-iris/src/content-copy-helpers.ts` to `apps/iitc-iris/src/shell/content-copy-helpers.ts`
- `apps/iitc-iris/src/content-copy-helpers.test.ts` to `apps/iitc-iris/src/shell/content-copy-helpers.test.ts`

Do not move `content.tsx`, `messages.ts`, `ui-status.ts`, `iitc-colors.ts`, `global.d.ts`, `page-map-runtime.ts`, or
`iitc-iris.css` in this checkpoint.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/shell/menu-registry.test.ts src/shell/content-primary-menu.test.ts src/shell/content-sheet-navigation.test.ts src/shell/content-keyboard-shortcuts.test.ts src/shell/content-storage-settings.test.ts src/shell/content-message-adapter.test.ts src/shell/content-outbound-messages.test.ts src/shell/content-side-panel-auto-requests.test.ts src/shell/content-feedback.test.ts src/shell/content-copy-helpers.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`
