# IITC IRIS CSS Pretty Architecture — Track C Group D: Remaining UI Component Folders

Status: Group D Complete. All flat UI component files have now been organized into dedicated component folders with `index.ts` barrel exports. The `apps/iitc-iris/src/ui/` folder shape is fully established, leaving only the legacy numbered chunk stylesheets at the `ui/` root.

Reference plans:
- [`docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md)
- [`docs/iitc-iris/plans/css-refactoring/26-track-c-group-a-implementation.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/26-track-c-group-a-implementation.md)
- [`docs/iitc-iris/plans/css-refactoring/27-track-c-group-b-segmented-controls.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/27-track-c-group-b-segmented-controls.md)
- [`docs/iitc-iris/plans/css-refactoring/28-track-c-group-c-ui-helpers.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/28-track-c-group-c-ui-helpers.md)

---

## 1. Overview & Strategy

Track C Group D completes the source-layout reorganization for all remaining UI components:
- `Badge`
- `StatusText`
- `Panel`
- `LayerChoice`

A critical architectural constraint was observed for `Badge` and `StatusText`: their CSS stylesheets (`badge.css` and `status-text.css`) are cascade-sensitive shared rules. While physically moved into their respective component folders alongside their TSX files, they are **intentionally not imported from their TSX components**. Instead, they remain loaded strictly via the central manifest `apps/iitc-iris/src/iitc-iris.css` to guarantee cascade positioning relative to earlier and later rules.

---

## 2. Files Moved & Directory Structure

A total of 10 files were moved, and 4 `index.ts` barrels were created:

### A. `Badge`
- **Target folder:** [`apps/iitc-iris/src/ui/badge/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/badge/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/badge.tsx` → [`apps/iitc-iris/src/ui/badge/badge.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/badge/badge.tsx)
  - `apps/iitc-iris/src/ui/badge.test.tsx` → [`apps/iitc-iris/src/ui/badge/badge.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/badge/badge.test.tsx)
  - `apps/iitc-iris/src/ui/badge.css` → [`apps/iitc-iris/src/ui/badge/badge.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/badge/badge.css)
- **Barrel created:** [`apps/iitc-iris/src/ui/badge/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/badge/index.ts) (`export * from './badge';`)

### B. `StatusText`
- **Target folder:** [`apps/iitc-iris/src/ui/status-text/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/status-text/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/status-text.tsx` → [`apps/iitc-iris/src/ui/status-text/status-text.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/status-text/status-text.tsx)
  - `apps/iitc-iris/src/ui/status-text.test.tsx` → [`apps/iitc-iris/src/ui/status-text/status-text.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/status-text/status-text.test.tsx)
  - `apps/iitc-iris/src/ui/status-text.css` → [`apps/iitc-iris/src/ui/status-text/status-text.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/status-text/status-text.css)
- **Barrel created:** [`apps/iitc-iris/src/ui/status-text/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/status-text/index.ts) (`export * from './status-text';`)

### C. `Panel`
- **Target folder:** [`apps/iitc-iris/src/ui/panel/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/panel/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/panel.tsx` → [`apps/iitc-iris/src/ui/panel/panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/panel/panel.tsx)
  - `apps/iitc-iris/src/ui/panel.test.tsx` → [`apps/iitc-iris/src/ui/panel/panel.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/panel/panel.test.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/panel/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/panel/index.ts) (`export * from './panel';`)

### D. `LayerChoice`
- **Target folder:** [`apps/iitc-iris/src/ui/layer-choice/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/layer-choice/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/layer-choice.tsx` → [`apps/iitc-iris/src/ui/layer-choice/layer-choice.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/layer-choice/layer-choice.tsx)
  - `apps/iitc-iris/src/ui/layer-choice.test.tsx` → [`apps/iitc-iris/src/ui/layer-choice/layer-choice.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/layer-choice/layer-choice.test.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/layer-choice/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/layer-choice/index.ts) (`export * from './layer-choice';`)

---

## 3. Central Manifest Updates & CSS Retention Model

In [`apps/iitc-iris/src/iitc-iris.css`](file:///Users/jula/ittca/apps/iitc-iris/src/iitc-iris.css#L6-L17), the import locations were updated to point to the relocated files inside their new component directories:

```css
/* Updated from ./ui/badge.css */
@import url('./ui/badge/badge.css');

/* Updated from ./ui/status-text.css */
@import url('./ui/status-text/status-text.css');
```

### CSS Files Intentionally Kept Central-Loaded
- **`badge.css`:** Retained in central manifest because `.iitc-iris-badge` composes with team pills and item chips. Moving it to component-local loading would append it to the tail of the cascade, inadvertently overriding equal-specificity team pills and caller modifiers.
- **`status-text.css`:** Retained in central manifest because `.iitc-iris-status` text colors are overridden by equal-specificity modifier classes (`.iitc-iris-warning`, `.iitc-iris-compare`). Tail loading would break highlight coloring.

Neither `badge.tsx` nor `status-text.tsx` imports its stylesheet directly.

---

## 4. Import Paths Preserved

All consumer imports continue working without edits via the barrel `index.ts` files:
- `import {Badge} from '../ui/badge';`
- `import {StatusText} from '../ui/status-text';`
- `import {Panel, PanelHeader, PanelTitle, PanelBody, PanelFooter} from '../ui/panel';`
- `import {LayerCheckbox, LayerRadio} from '../ui/layer-choice';`

All test files import their respective components from the same folder (`./badge`, `./status-text`, `./panel`, `./layer-choice`).

---

## 5. Excluded From Move

- Numbered panel CSS files (`048-panel.css`, `050-panel.css`, `052-panel.css`) were not moved.
- Layer CSS files (`084-layers.css`, `086-layers.css`, `layer-toggle.css`) were not moved.
- Numbered UI CSS chunks (`002-ui.css`, `007-ui.css`, `009-ui.css`, `024-summary-layout.css`, `026-summary-cell.css`, `044-summary.css`, `046-ui.css`, `054-ui.css`, `069-ui.css`) remain at `src/ui/`.

---

## 6. Validation Results

All validation commands passed with zero defects:

| Command | Status | Details |
|---|---|---|
| `npm run typecheck:iitc-iris` | **PASS** | 0 TypeScript errors |
| `npm run lint:iitc-iris` | **PASS** | 0 ESLint warnings or errors |
| `npm run test:iitc-iris` | **PASS** | 60 test files passed (346 / 346 tests) |
| `npm run package:iitc-iris` | **PASS** | Built Chrome ZIP + Firefox XPI (`dist/iitc-iris.css` stable at 61.22 kB) |
| `git diff --check` | **PASS** | 0 whitespace or formatting issues |

---

## 7. Issues or Surprises

None. The split between physical co-location and central cascade loading for `badge.css` and `status-text.css` worked seamlessly. The final CSS bundle size remains strictly identical at 61.22 kB with zero duplicate declarations.
