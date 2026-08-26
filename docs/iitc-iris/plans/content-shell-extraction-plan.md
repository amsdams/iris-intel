# Content Shell Extraction Plan

Status: complete for the Phase 2 shell-extraction checkpoint. This is Phase 2, step 1 from [index.md](index.md).

## Current IRIS Sources

- `apps/iitc-iris/src/content.tsx`
  - app state ownership
  - rendered shell and panels
  - outbound command posting
- `apps/iitc-iris/src/content-message-adapter.ts`
  - inbound page-runtime message dispatch
  - entity-fetch state projection from status messages
  - selection side effects from portal/context messages
- `apps/iitc-iris/src/content-keyboard-shortcuts.ts`
  - keyboard shortcut routing decisions
- `apps/iitc-iris/src/content-feedback.ts`
  - clipboard feedback and timeout decisions
- `apps/iitc-iris/src/content-sheet-navigation.ts`
  - sheet open/close/toggle decisions
- `apps/iitc-iris/src/content-primary-menu.ts`
  - primary-menu routing effects
- `apps/iitc-iris/src/comm-display.ts`
  - COMM display formatting and message-part shaping
- `apps/iitc-iris/src/comm-panel-controls.tsx`
  - COMM channel controls, request controls, and summary markup
- `apps/iitc-iris/src/comm-message-list.tsx`
  - COMM message list and message-row markup
- `apps/iitc-iris/src/comm-panel-body.tsx`
  - COMM composer markup
- `apps/iitc-iris/src/comm-panel.tsx`
  - COMM panel composition, empty/error/send feedback, and request diagnostics markup
- `apps/iitc-iris/src/passcode-panel.tsx`
  - passcode redemption form, reward summary/list, empty/error state, and request diagnostics markup
- `apps/iitc-iris/src/content-message-adapter.test.ts`

## Ownership

- `content.tsx` still owns Preact state, rendered shell markup, refs, request lifecycle, and local UI actions.
- `content-message-adapter.ts` owns the message-to-state adapter boundary for inbound runtime messages.
- COMM components own only rendering composition and event callback wiring. COMM request ownership, scroll refs, draft
  state, tab persistence, and outbound page-runtime messages remain in `content.tsx`.
- Passcode panel owns only rendering composition and form callback wiring. Passcode sanitization, request state, and
  outbound page-runtime messages remain in `content.tsx`.
- This is an app-side extraction, not a core facade. It may call app selection helpers and post app messages.

## Completed Slice

- Moved `entityFetchStateFromMessage` out of `content.tsx`.
- Moved the `window` message handler dispatch body out of `content.tsx`.
- Added tests for entity status projection and stale map-context clearing when a normal portal selection arrives.
- Moved keyboard shortcut routing into `content-keyboard-shortcuts.ts` with focused shortcut tests.
- Moved repeated clipboard status/timeout handling into `content-feedback.ts` with success and failure feedback tests.
- Moved sheet open/close/toggle decisions into `content-sheet-navigation.ts` with focused cancellation behavior tests.
- Moved primary-menu routing decisions into `content-primary-menu.ts` with focused routing tests.
- Started the COMM panel extraction by moving its display formatting and message-part shaping into `comm-display.ts` with focused tests.
- Moved the COMM channel controls, request controls, and summary markup into `comm-panel-controls.tsx`.
- Moved the COMM message list and message-row markup into `comm-message-list.tsx`.
- Moved the COMM composer markup into `comm-panel-body.tsx`.
- Moved the COMM panel composition, empty/error/send feedback, and request diagnostics markup into `comm-panel.tsx`.
- Moved shared elapsed request formatting into `ui-status.ts` so extracted panels can reuse the shell's existing display
  rule.
- Moved the passcode redemption form, reward summary/list, empty/error state, and request diagnostics markup into
  `passcode-panel.tsx`.

## Follow-up Plans

- Extract outbound map/runtime command helpers once a second call site or panel split makes the repeated posting clearer.
- Continue remaining panel extraction under a separate panel-extraction plan rather than extending this shell checkpoint.
  Good next candidates are search, portal details, missions, scores, inventory, and agent/profile panels.
- Keep panel extraction behavior-preserving: move markup and local display helpers first, then consider request helper
  extraction only when repeated command assembly is visible across panels.

## Non-goals

- Do not change rendered markup in this step.
- Do not introduce a global store.
- Do not move app message adapters into `packages/iitc-core`.

## Validation

For code changes, run:

- `npm run test -w apps/iitc-iris -- --run src/comm-display.test.ts src/content-message-adapter.test.ts src/content-keyboard-shortcuts.test.ts src/content-feedback.test.ts src/content-sheet-navigation.test.ts src/content-primary-menu.test.ts`
- `npm run lint:iitc-iris`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`
