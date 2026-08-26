# Panel Extraction Plan

Status: started. This continues Phase 2, step 2 from [index.md](index.md), after the completed
[content-shell-extraction-plan.md](content-shell-extraction-plan.md).

## Current IRIS Sources

- `apps/iitc-iris/src/content.tsx`
  - app state ownership
  - side-panel request lifecycle
  - rendered shell and remaining inline panels
- `apps/iitc-iris/src/comm-panel.tsx`
  - COMM panel composition
- `apps/iitc-iris/src/passcode-panel.tsx`
  - passcode panel composition
- `apps/iitc-iris/src/scores-panel.tsx`
  - scores panel composition

## Ownership

- `content.tsx` owns state, request side effects, refs, storage, and outbound page-runtime messages.
- Extracted panel modules own rendering composition and callback wiring only.
- This is app-side extraction, not a new `packages/iitc-core` facade pass.

## Completed Slices

- COMM rendering extracted through `comm-display.ts`, `comm-panel-controls.tsx`, `comm-message-list.tsx`,
  `comm-panel-body.tsx`, and `comm-panel.tsx`.
- Passcode rendering extracted into `passcode-panel.tsx`.
- Scores rendering extracted into `scores-panel.tsx`.

## Next Slices

- Extract inventory, agent/profile, search, portal details, and missions one at a time.
- Prefer smaller display-only extractions before moving request helpers.
- Extract outbound runtime command helpers only after repeated command assembly is visible across at least two extracted
  panels.

## Non-goals

- Do not change panel behavior, request timing, storage, or cancellation rules in this pass.
- Do not introduce a global store.
- Do not redesign panel UI while extracting modules.
- Do not move browser effects into `packages/iitc-core`.

## Validation

For code changes, run:

- `npm run test -w apps/iitc-iris -- --run src/comm-display.test.ts src/content-message-adapter.test.ts src/content-keyboard-shortcuts.test.ts src/content-feedback.test.ts src/content-sheet-navigation.test.ts src/content-primary-menu.test.ts`
- `npm run lint:iitc-iris`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`
