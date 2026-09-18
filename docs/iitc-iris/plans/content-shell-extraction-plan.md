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
- Scenario execution & history helpers: `content-scenario-actions.ts`, `content-scenario-actions.test.ts`.
- Map navigation & view input jump helpers: `content-map-navigation.ts`, `content-map-navigation.test.ts`.
- Draw Tools lifecycle helpers: `content-draw-tools-lifecycle.ts`, `content-draw-tools-lifecycle.test.ts`.
- Portal Analysis sorting action helpers: `content-portal-analysis-actions.ts`, `content-portal-analysis-actions.test.ts`.
- Layer & Highlighter settings action helpers: `content-layer-actions.ts`, `content-layer-actions.test.ts`.
- Scenario snapshot & run lifecycle management: `content-scenario-management.ts`, `content-scenario-management.test.ts`.
- Search request & navigation action helpers: `content-search-actions.ts`, `content-search-actions.test.ts`.
- COMM input submission & passcode redeem helpers: `content-comm-input-actions.ts`, `content-comm-input-actions.test.ts`.
- Map camera view, pan & portal selection action helpers: `content-camera-actions.ts`, `content-camera-actions.test.ts`.
- Auth recovery, side-panel status & login navigation helpers: `content-auth-navigation.ts`, `content-auth-navigation.test.ts`.
- Map location presets, view input jump & browser geolocation actions: `content-location-actions.ts`, `content-location-actions.test.ts`.
- Draw Tools UI panel actions: `content-draw-tools-panel-actions.ts`, `content-draw-tools-panel-actions.test.ts`.
- COMM panel scrolling, pagination & passcode actions: `content-comm-panel-actions.ts`, `content-comm-panel-actions.test.ts`.
- Portal section, selection, clear & focus actions: `content-portal-selection-actions.ts`, `content-portal-selection-actions.test.ts`.
- Scenario workflow state & execution custom hook: `content-scenario-workflow.ts`, `content-scenario-workflow.test.ts`.
- Portal Analysis workflow state & filter/sort custom hook: `content-portal-analysis-workflow.ts`, `content-portal-analysis-workflow.test.ts`.
- Draw Tools workflow state and callback wiring custom hook: `content-draw-tools-workflow.ts`,
  `content-draw-tools-workflow.test.ts`, plus supporting coverage in `content-draw-tools-panel-actions.test.ts`,
  `content-draw-tools-lifecycle.test.ts`, and `content-message-adapter.test.ts`.

## Draw Tools Workflow Extraction Checkpoint

- IITC sources: Draw Tools behavior remains aligned with IITC-CE's Draw Tools plugin concepts under
  `reference/ingress-intel-total-conversion/plugins/draw-tools*`; this pass did not port new Draw Tools behavior.
- Current IRIS sources: `apps/iitc-iris/src/content.tsx`, `apps/iitc-iris/src/content-draw-tools-workflow.ts`,
  `apps/iitc-iris/src/content-draw-tools-panel-actions.ts`, `apps/iitc-iris/src/content-draw-tools-lifecycle.ts`,
  `apps/iitc-iris/src/content-draw-tools-actions.ts`, `apps/iitc-iris/src/content-map-context.ts`, and
  `apps/iitc-iris/src/content-message-adapter.ts`.
- Public concepts: existing Draw Tools v1 link and marker actions, import/export text, marker labels, selected/context
  target handling, and page-runtime `IITC_IRIS_MESSAGES.drawTools` messages.
- Ownership/lifecycle: `content-draw-tools-workflow.ts` owns only Preact-local Draw Tools UI workflow state and callback
  wiring. `content.tsx` still owns page message handling, selected portal/map context state, map camera state, and the
  runtime message boundary. Page-runtime Draw Tools storage and Leaflet mutation remain outside the hook.
- Hook/plugin visibility: no new plugin-facing `window.plugin.drawTools` or Leaflet.draw event surface is exposed.
- Scope: move Draw Tools link-start, import text/status, clear-confirm, marker-label, editing-index state, target
  derivation, list filtering, and callback wiring out of `content.tsx` without changing behavior.
- Non-goals: polygons, circles, DrawTools Opt, stock Intel `pls`, plugin-facing Draw Tools API parity, and broader UI
  redesign remain deferred.
- Tests/diagnostics: `content-draw-tools-workflow.test.ts` covers hook-owned target derivation, list filtering,
  runtime import-status setter wiring, and posted Draw Tools message shape. Supporting focused unit tests cover action
  payloads/statuses, lifecycle payload builders, and inbound message adapter import-status updates.
- Divergences: none intended; this is a behavior-preserving app-surface extraction.
- Validation: `npm run lint:iitc-iris`, `npm run typecheck:iitc-iris`,
  `npm run test -w apps/iitc-iris -- --run src/content-draw-tools-workflow.test.ts src/content-draw-tools-panel-actions.test.ts src/content-draw-tools-lifecycle.test.ts src/content-message-adapter.test.ts`,
  `npm run package:iitc-iris`, and `git diff --check`.

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
