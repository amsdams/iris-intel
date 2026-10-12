# IITC IRIS CSS Pretty Architecture — Track B Spike 1: UI Primitive Component-Local Imports

Status: Spike 1 Corrected. Two isolated UI primitive CSS imports remain component-local; `badge.css` was attempted and rolled back because its base selector composes with later specialized badge classes.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Track B)
- `docs/iitc-iris/plans/css-refactoring/14-track-a-final-report.md`
- `docs/iitc-iris/plans/css-refactoring/17-post-phase-5b-final-report.md`

---

## 1. Candidate Evaluation & Status

All 3 candidates were evaluated against ownership, selector isolation, and app usage criteria. Two were accepted for component-local imports. `badge.css` was rejected after build-order inspection showed a cascade risk.

| Candidate | Owning TSX File | Selectors in CSS | App Usage | Decision |
|---|---|---|---|---|
| `apps/iitc-iris/src/ui/badge.css` | `apps/iitc-iris/src/ui/badge.tsx` | `.iitc-iris-badge` | Used in 5 panels (`draw-tools`, `portals-list`, `agent`, `inventory`, `passcode`) | **ROLLED BACK** |
| `apps/iitc-iris/src/ui/empty-state.css` | `apps/iitc-iris/src/ui/empty-state.tsx` | `.iitc-iris-empty-state` | Used in 8 panels (`comm`, `missions`, `portal-counts`, `portals-list`, `scoreboard`, `portal-details`, `agent`, `passcode`) | **MOVED** |
| `apps/iitc-iris/src/ui/clear-button.css` | `apps/iitc-iris/src/ui/clear-button.tsx` | `.iitc-iris-clear-selection`, `.iitc-iris-clear-selection:hover` | Used in 7 panels (`map-controls`, `portal-details`, `portal-image-modal`, `search`, `request-side-panel`, `help`, `system-diagnostics`) | **MOVED** |

**Rejected Candidate:** `badge.css` remains in `iitc-iris.css` at its original cascade position.

---

## 2. Removed Central Import Lines (`apps/iitc-iris/src/iitc-iris.css`)

Two `@import url(...)` lines were removed from the central stylesheet manifest:

```diff
@@ -14,7 +13,6 @@
 @import url('./map/013-map.css');
 @import url('./ui/segmented-button.css');
 @import url('./system/015-innerstatus.css');
-@import url('./ui/clear-button.css');
 @import url('./auth/017-auth.css');
 @import url('./ui/status-text.css');
 @import url('./portals/019-portals.css');
@@ -58,7 +56,6 @@
 @import url('./system/062-system.css');
 @import url('./portals/063-portals.css');
 @import url('./system/064-system.css');
-@import url('./ui/empty-state.css');
 @import url('./side-panels/066-side-panels.css');
 @import url('./styles/067-team.css');
 @import url('./styles/mobile-dock-panels.css');
```

---

## 3. Added Component-Local Imports

Component-local CSS imports remain at the top of the accepted owning TSX modules:

### `apps/iitc-iris/src/ui/empty-state.tsx`
```diff
@@ -1,4 +1,5 @@
 import {h} from 'preact';
+import './empty-state.css';

 /**
  * Renders a standard empty state container.
```

### `apps/iitc-iris/src/ui/clear-button.tsx`
```diff
@@ -1,4 +1,5 @@
 import {h, ComponentChildren, JSX} from 'preact';
+import './clear-button.css';

 export interface ClearButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
   children?: ComponentChildren;
```

---

## 4. Manifest Counts Summary

| Metric | Pre-Spike 1 (Post-Phase 5B) | Post-Spike 1 | Delta |
|---|---|---|---|
| **Total Imports in `iitc-iris.css`** | 82 | **80** | -2 |
| **Numbered Chunk Imports** | 65 | **65** | 0 |
| **Pretty Imports in `iitc-iris.css`** | 17 | **15** | -2 |
| **Component-Local CSS Imports** | 0 | **2** | +2 |
| **Missing Manifest Imports** | 0 | **0** | 0 |

---

## 5. CSS Bundling & Cascade Order Observations

### Bundling Mechanism
- In `apps/iitc-iris/src/content.tsx`, the entry module imports:
  ```ts
  import './iitc-iris.css';
  ```
  followed by UI feature and panel imports.
- Vite bundles all remaining `@import` statements inside `iitc-iris.css` first in manifest order.
- CSS files imported by TSX components (`empty-state.css`, `clear-button.css`) are bundled into `dist/iitc-iris.css` after the manifest imports during module dependency graph evaluation.
- `badge.css` remains in the central manifest because its base class is intentionally composed with feature-specific classes.

### Output Size & Selector Presence
- **Built CSS output size:** `61.13 kB` (exactly `61,134` bytes, identical to baseline).
- **Selector verification in `dist/iitc-iris.css`:**
  - `.iitc-iris-badge`: present before specialized badge classes.
  - `.iitc-iris-clear-selection`: present.
  - `.iitc-iris-empty-state`: present.
- **Cascade impact:** `clear-button.css` and `empty-state.css` are acceptable component-local imports in this spike. `badge.css` is not acceptable because `.iitc-iris-badge` is composed with later specialized classes such as `.iitc-iris-team-pill`, `.iitc-iris-item-badge`, `.iitc-iris-draw-tools-level-chip`, and `.iitc-iris-draw-tools-team-chip`; emitting `.iitc-iris-badge` after those rules can override equal-specificity declarations.

---

## 6. Validation Results

All static checks, tests, and build packaging commands executed from the repository root:

| Command | Status | Notes |
|---|---|---|
| `npm run lint:css` | **PASS** | Exit code 0, clean Stylelint check |
| `npm run typecheck:iitc-iris` | **PASS** | Exit code 0, clean TypeScript check |
| `npm run lint:iitc-iris` | **PASS** | Exit code 0, clean ESLint check |
| `npm run test:iitc-iris` | **PASS** | Exit code 0, 60/60 test files passed (346 tests) |
| `npm run package:iitc-iris` | **PASS** | Exit code 0, packages built; CSS bundle: 61.13 kB |
| `git diff --check` | **PASS** | Exit code 0, zero whitespace defects |

---

## 7. Recommendations for Next Steps

### Recommendation: Expand Track B Cautiously
1. **Low-Risk Next Slice (Spike 2):**
   - Only move candidates that do not compose a base primitive class with caller-provided styling classes, or require explicit cascade proof first.
   - `status-text.css` and `diagnostics-chip.css` are likely better candidates than primitives with heavy class composition.
   - Treat `segmented-button.css` and `chip-button.css` as candidates for review, not automatic moves.
2. **Caution for Feature Panels:**
   - Feature panel stylesheets (e.g. `side-panels`, `portals`, `map`) should NOT be moved until all primitives are complete and panel cascade relationships with shell layout rules are formally analyzed.
3. **Track C Layout:**
   - Co-locating components and styles into directories (`ui/badge/badge.tsx`, etc.) should only occur after Track B component-local imports are proven across all primitives.

---

## Hard Stop

Spike 1 is corrected. `clear-button.css` and `empty-state.css` remain component-local; `badge.css` is restored to the central manifest. No additional CSS imports were moved, and no component directories were restructured.
