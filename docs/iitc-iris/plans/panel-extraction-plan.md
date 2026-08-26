# Panel Extraction Plan

Status: started. This is Phase 2, step 2 from [index.md](index.md).

## Scope

Move side-panel JSX out of `apps/iitc-iris/src/content.tsx` in batches while preserving behavior.

`content.tsx` keeps state, storage, refs, request timing/cancellation, and page-runtime messages. Panel modules own
rendering and callback wiring only.

## Done

- COMM rendering extracted through `comm-display.ts`, `comm-panel-controls.tsx`, `comm-message-list.tsx`,
  `comm-panel-body.tsx`, and `comm-panel.tsx`.
- Passcode: `passcode-panel.tsx`.
- Scores: `scores-panel.tsx`.
- Agent/profile: `agent-panel.tsx`.
- Inventory: `inventory-panel.tsx`.

## Next

- Extract search, portal details, and missions.
- Prefer display-only moves first.
- Extract shared command/request helpers only when repeated across extracted panels.

## Guardrails

- No behavior, request, storage, cancellation, or UI redesign changes.
- No global store.
- No browser effects in `packages/iitc-core`.

## Validation

- Focused app tests for touched helpers.
- `npm run lint:iitc-iris`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`
