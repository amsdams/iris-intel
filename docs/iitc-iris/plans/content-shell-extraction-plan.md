# Content Shell Extraction Plan

Status: complete for the Phase 2 shell checkpoint. See [index.md](index.md).

## Scope

Split non-rendering shell decisions out of `apps/iitc-iris/src/content.tsx` without changing app behavior.

`content.tsx` still owns Preact state, refs, storage, request lifecycle, and outbound page-runtime messages. Extracted
modules own routing/display decisions or JSX composition only.

## Completed

- Inbound message adaptation: `content-message-adapter.ts`.
- Keyboard/menu/sheet/feedback helpers: `content-keyboard-shortcuts.ts`, `content-primary-menu.ts`,
  `content-sheet-navigation.ts`, `content-feedback.ts`.
- Sheet tabbar navigation: `sheet-tabbar.tsx`.
- Auth recovery banner: `auth-recovery-banner.tsx`.
- Scenario diagnostics helpers and tests: `content-scenarios.ts`, `content-scenarios.test.ts`.
- Storage and persistence helpers: `content-storage-settings.ts`, `content-storage-settings.test.ts`.
- Map status and tile progress helpers: `content-map-status.ts`, `content-map-status.test.ts`.
- Map context and Intel URL helpers: `content-map-context.ts`, `content-map-context.test.ts`.
- Outbound message creation helpers: `content-outbound-messages.ts`, `content-outbound-messages.test.ts`.
- First panel components: COMM and passcode rendering moved into focused app modules.
- Shared elapsed request formatting moved to `ui-status.ts`.
- Draw Tools display helpers and panel JSX moved to `content-draw-tools.ts` and `draw-tools-panel.tsx`.
- System diagnostics status/debug rows moved to `system-diagnostics-panel.tsx`.
- System dock diagnostics creation helper: `content-dock-diagnostics.ts`, `content-dock-diagnostics.test.ts`.
- Draw Tools payload action builders: `content-draw-tools-actions.ts`, `content-draw-tools-actions.test.ts`.
- Clipboard copy feedback helpers: `content-copy-helpers.ts`, `content-copy-helpers.test.ts`.
- COMM action & scroll helpers: `content-comm-actions.ts`, `content-comm-actions.test.ts`.
- Auth recovery & login navigation helpers: `content-auth-navigation.ts`, `content-auth-navigation.test.ts`.

## Follow-up Plans

Continue broader app-surface work in [panel-extraction-plan.md](panel-extraction-plan.md). Extract runtime command
helpers only after multiple extracted panels share the same command assembly.

## Guardrails

- Behavior-preserving extraction only.
- No global store.
- No UI redesign.
- No browser effects in `packages/iitc-core`.

## Validation

- Focused app tests for extracted helpers.
- `npm run lint:iitc-iris`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`
