# Content Shell Extraction Plan

Status: first implementation slice started. This is Phase 2, step 1 from [index.md](index.md).

## Current IRIS Sources

- `apps/iitc-iris/src/content.tsx`
  - app state ownership
  - rendered shell and panels
  - outbound command posting
- `apps/iitc-iris/src/content-message-adapter.ts`
  - inbound page-runtime message dispatch
  - entity-fetch state projection from status messages
  - selection side effects from portal/context messages
- `apps/iitc-iris/src/content-message-adapter.test.ts`

## Ownership

- `content.tsx` still owns Preact state, rendered markup, refs, and local UI actions.
- `content-message-adapter.ts` owns the message-to-state adapter boundary for inbound runtime messages.
- This is an app-side extraction, not a core facade. It may call app selection helpers and post app messages.

## Completed Slice

- Moved `entityFetchStateFromMessage` out of `content.tsx`.
- Moved the `window` message handler dispatch body out of `content.tsx`.
- Added tests for entity status projection and stale map-context clearing when a normal portal selection arrives.
- Moved keyboard shortcut routing into `content-keyboard-shortcuts.ts` with focused shortcut tests.
- Moved repeated clipboard status/timeout handling into `content-feedback.ts` with success and failure feedback tests.
- Moved sheet open/close/toggle decisions into `content-sheet-navigation.ts` with focused cancellation behavior tests.
- Moved primary-menu routing decisions into `content-primary-menu.ts` with focused routing tests.

## Next Slices

- Extract outbound map/runtime command helpers once a second call site or panel split makes the repeated posting clearer.
- Extract panels one at a time after the shell no longer owns their message-adapter details.

## Non-goals

- Do not change rendered markup in this step.
- Do not introduce a global store.
- Do not move app message adapters into `packages/iitc-core`.

## Validation

For code changes, run:

- `npm run test:iitc-iris -- --run src/content-message-adapter.test.ts`
- `npm run lint:iitc-iris`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`
