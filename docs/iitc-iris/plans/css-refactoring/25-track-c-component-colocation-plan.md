# IITC IRIS CSS Pretty Architecture - Track C Component Co-Location Plan

Status: Proposed next-session plan. Do not implement until the current Track B closeout branch is accepted.

Track C is a source-layout refactor that builds on Track B. Track B proved that component-local CSS imports are viable for isolated or explicitly shared stylesheets. Track C should make that ownership visible in the filesystem by moving stable leaf components into small co-located folders.

## Goal

Co-locate component TSX, CSS, tests, and exports for stable components without changing runtime behavior, selectors, declarations, or visual output.

Target shape example:

```text
apps/iitc-iris/src/ui/clear-button/
├── clear-button.tsx
├── clear-button.css
├── clear-button.test.tsx
└── index.ts
```

External import paths should remain stable where practical:

```ts
import {ClearButton} from '../ui/clear-button';
```

That means each moved component directory should provide an `index.ts` barrel export.

## Preconditions

- Track B closeout is committed and reviewed.
- Working tree is clean before starting.
- No CSS manifest changes are required for this track.
- No numbered CSS migration is included in this track.

## Non-Goals

- Do not redesign UI.
- Do not rename CSS selectors.
- Do not change CSS declarations.
- Do not move central CSS files.
- Do not move numbered CSS files.
- Do not change persisted ids, storage keys, message types, panel ids, or user-visible behavior.
- Do not combine component co-location with CSS cleanup or responsive/mobile redesign.

## Candidate Groups

### Group A - First Slice, Preferred

Small leaf UI components that already own or explicitly import their CSS:

| Component | Current files | Notes |
|---|---|---|
| `ClearButton` | `ui/clear-button.tsx`, `ui/clear-button.css`, `ui/clear-button.test.tsx` | Lowest-risk first candidate. Many callers, but import path can remain `../ui/clear-button` via `index.ts`. |
| `EmptyState` | `ui/empty-state.tsx`, `ui/empty-state.css`, `ui/empty-state.test.tsx` | Isolated primitive. |
| `DiagnosticsChip` | `ui/diagnostics-chip.tsx`, `ui/diagnostics-chip.css`, `ui/diagnostics-chip.test.tsx` | Shared with `ChipButton`; keep dependency explicit. |
| `ChipButton` | `ui/chip-button.tsx`, `ui/chip-button.css`, `ui/chip-button.test.tsx` | Depends on `diagnostics-chip.css`; update relative import after moving. |

### Group B - Later Slice

Shared two-component or cross-domain styles that need more care:

| Component(s) | Reason to defer |
|---|---|
| `SegmentedButton` / `SegmentedRow` | Shared stylesheet imported by both components. Move together only. |
| `SummaryCell` | Shared stylesheet also imported by `portals/portal-details-panel.tsx`; moving requires updating a cross-domain CSS import. |

### Excluded From Track C First Pass

| File / Component | Reason |
|---|---|
| `Badge` | CSS remains central for cascade safety. Moving TSX without CSS co-location would be confusing. |
| `StatusText` | CSS remains central for cascade safety. |
| `Panel` components | Panel CSS remains numbered/central and is shared broadly. |
| `Layer toggle` styles | Shared across layers/system and cascade-sensitive. |
| Shell and responsive styles | Application layout and media layers remain central. |

## Phase 0 - Track C Baseline

Allowed changes:

- Create `docs/iitc-iris/plans/css-refactoring/26-track-c-baseline.md`.
- Record current git commit, working tree status, and current component-local CSS imports.
- Record importers for Group A files using `rg`.
- Run:
  - `npm run typecheck:iitc-iris`
  - `npm run lint:iitc-iris`
  - `npm run test:iitc-iris`
  - `npm run package:iitc-iris`
  - `git diff --check`

Hard stop after Phase 0.

## Phase 1 - Move One Leaf Component

Preferred first candidate: `ClearButton`.

Allowed source moves:

```text
apps/iitc-iris/src/ui/clear-button.tsx
apps/iitc-iris/src/ui/clear-button.css
apps/iitc-iris/src/ui/clear-button.test.tsx
```

Target:

```text
apps/iitc-iris/src/ui/clear-button/
├── clear-button.tsx
├── clear-button.css
├── clear-button.test.tsx
└── index.ts
```

Implementation requirements:

- Keep the public import path `../ui/clear-button` working through `index.ts`.
- Keep `import './clear-button.css';` local to `clear-button.tsx`.
- Update only test-relative imports if needed.
- Do not edit CSS selector text or declarations.
- Do not change call-site behavior.

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run test:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

Hard stop after Phase 1.

## Phase 2 - Move Remaining Group A Components

Only proceed after Phase 1 is reviewed.

Move:

- `EmptyState`
- `DiagnosticsChip`
- `ChipButton`

Rules:

- Move one component directory at a time.
- Preserve external import paths through `index.ts` barrels.
- For `ChipButton`, preserve the explicit dependency order after moving:

```ts
import '../diagnostics-chip/diagnostics-chip.css';
import './chip-button.css';
```

- For `DiagnosticsChip`, keep its own CSS import local.
- After each move, run focused tests for that component; after the full phase, run the full validation set.

Hard stop after Phase 2.

## Review Questions For The Next Session

Before coding, decide:

1. Is Track C the next priority, or should numbered CSS consolidation be planned first?
2. Should imports continue to use `../ui/clear-button`, or should Track C also introduce a top-level `ui/index.ts` barrel? Default: keep existing per-component import paths.
3. Should Group A move as one branch or one component per commit? Default: one component per reviewed phase until the pattern is proven.

## Done Criteria

Track C first pass is done when:

- Group A components live in co-located folders.
- Existing external import paths still work.
- No CSS selectors or declarations changed.
- Static checks, tests, package build, and diff check pass.
- A follow-up report documents any components intentionally left flat.
