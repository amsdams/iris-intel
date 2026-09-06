# Panel Extraction Plan

Status: complete for the side-panel checkpoint. This is Phase 2, step 2 from [index.md](index.md).

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
- Missions: `missions-panel.tsx`.
- Search: `search-panel.tsx`.
- Portal details: `portal-details-panel.tsx`.
- Draw Tools: `draw-tools-panel.tsx`, with pure display/export helpers in `content-draw-tools.ts`.
- System diagnostics status/debug rows: `system-diagnostics-panel.tsx`.
- Portal Counts: `portal-counts-panel.tsx`.
- Portals List: `portals-list-panel.tsx`.
- Scoreboard: `scoreboard-panel.tsx`.
- Portal Analysis display/filter/sort helpers: `content-portal-analysis.ts`.
- Map Navigation & Context controls: `map-controls-panel.tsx`.
- Layers panel (base map, core overlays, portal filters, highlighters, detail overlays): `layers-panel.tsx`.
- System controls panel: `system-controls-panel.tsx`.
- Shortcuts help panel: `help-panel.tsx`.
- Portal image preview modal: `portal-image-modal.tsx`.

## Follow-up

- Continue app-surface extraction for the remaining map controls, layers, portal analysis, and scenario workflow UI.
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
