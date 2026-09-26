# Source Directory Layout Plan

Status: Checkpoint 1 complete. The first move-only `search` folder checkpoint is done. No further folder moves are
approved until Checkpoint 1 is reviewed and this plan is updated with the next explicit checkpoint.

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

Move files into feature/domain folders after the Phase 2 closure audit approves this plan. The first approved checkpoint
must be a small folder move with import rewrites only.

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

## Candidate First Checkpoints

The Phase 2 closure audit must choose only one of these as the first move:

1. Search folder:
   - `content-search-actions.ts`
   - `content-search-actions.test.ts`
   - `search-panel.tsx`
2. Missions folder:
   - `missions-panel.tsx`
   - any future `content-mission-*` helpers and tests if already present.
3. Draw Tools folder:
   - `content-draw-tools*.ts`
   - `draw-tools-panel.tsx`
   - related tests.

Recommended first move is `search` because it has a small surface and existing focused tests. Do not start with Draw
Tools unless the audit confirms the larger import churn is acceptable.

## Tests/Diagnostics

For a move-only checkpoint, run:

- focused tests for moved modules;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- `git diff --check`.

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

### Checkpoint 2: Next Folder Move

Status: blocked pending review of Checkpoint 1.

Do not move another folder until a reviewer updates this section with one approved feature/domain, exact files, required
import rewrites, and focused validation commands.
