# IITC IRIS CSS Pretty Architecture — Track C Group C: Co-Locate Flat UI Helper Components

Status: Group C Complete. Flat UI helper components have been co-located into component subdirectories with barrel `index.ts` files, preserving public import paths and shared CSS dependencies.

Reference plans:
- [`docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md)
- [`docs/iitc-iris/plans/css-refactoring/26-track-c-group-a-implementation.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/26-track-c-group-a-implementation.md)
- [`docs/iitc-iris/plans/css-refactoring/27-track-c-group-b-segmented-controls.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/27-track-c-group-b-segmented-controls.md)

---

## 1. Overview & Strategy

Track C Group C moves flat UI helper components into dedicated component subfolders under `apps/iitc-iris/src/ui/`. This is a purely structural refactor:
- No numbered CSS chunks were moved or consolidated.
- No CSS classes or declarations were altered.
- Public import paths remain stable via `index.ts` barrels.
- Cross-domain stylesheet and component imports were updated to maintain correct relative paths.

---

## 2. Files Moved & Directory Structure

The following 11 files were moved into dedicated component directories, and 6 `index.ts` barrel files were added:

### A. `ActionButton`
- **Target folder:** [`apps/iitc-iris/src/ui/action-button/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/action-button/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/action-button.tsx` → [`apps/iitc-iris/src/ui/action-button/action-button.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/action-button/action-button.tsx)
  - `apps/iitc-iris/src/ui/action-button.test.tsx` → [`apps/iitc-iris/src/ui/action-button/action-button.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/action-button/action-button.test.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/action-button/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/action-button/index.ts) (`export * from './action-button';`)

### B. `TextInput`
- **Target folder:** [`apps/iitc-iris/src/ui/text-input/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/text-input/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/text-input.tsx` → [`apps/iitc-iris/src/ui/text-input/text-input.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/text-input/text-input.tsx)
  - `apps/iitc-iris/src/ui/text-input.test.tsx` → [`apps/iitc-iris/src/ui/text-input/text-input.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/text-input/text-input.test.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/text-input/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/text-input/index.ts) (`export * from './text-input';`)

### C. `SummaryGrid`
- **Target folder:** [`apps/iitc-iris/src/ui/summary-grid/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-grid/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/summary-grid.tsx` → [`apps/iitc-iris/src/ui/summary-grid/summary-grid.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-grid/summary-grid.tsx)
  - `apps/iitc-iris/src/ui/summary-grid.test.tsx` → [`apps/iitc-iris/src/ui/summary-grid/summary-grid.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-grid/summary-grid.test.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/summary-grid/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-grid/index.ts) (`export * from './summary-grid';`)

### D. `SummaryCell`
- **Target folder:** [`apps/iitc-iris/src/ui/summary-cell/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/summary-cell.tsx` → [`apps/iitc-iris/src/ui/summary-cell/summary-cell.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell/summary-cell.tsx)
  - `apps/iitc-iris/src/ui/summary-cell.test.tsx` → [`apps/iitc-iris/src/ui/summary-cell/summary-cell.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell/summary-cell.test.tsx)
  - `apps/iitc-iris/src/ui/summary-cell-label.css` → [`apps/iitc-iris/src/ui/summary-cell/summary-cell-label.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell/summary-cell-label.css)
- **Barrel created:** [`apps/iitc-iris/src/ui/summary-cell/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell/index.ts) (`export * from './summary-cell';`)

### E. `ControlRow`
- **Target folder:** [`apps/iitc-iris/src/ui/control-row/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/control-row/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/control-row.tsx` → [`apps/iitc-iris/src/ui/control-row/control-row.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/control-row/control-row.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/control-row/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/control-row/index.ts) (`export * from './control-row';`)

### F. `Section`
- **Target folder:** [`apps/iitc-iris/src/ui/section/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/section/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/section.tsx` → [`apps/iitc-iris/src/ui/section/section.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/section/section.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/section/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/section/index.ts) (`export * from './section';`)

---

## 3. Import Paths Changed & Preserved

### Public Import Paths (Preserved)
All external call sites across `side-panels/`, `portals/`, `search/`, and `system/` continue importing via stable module specifiers thanks to the `index.ts` barrels:
- `import {ActionButton, SubmitActionButton} from '../ui/action-button';`
- `import {TextInput} from '../ui/text-input';`
- `import {SummaryGrid} from '../ui/summary-grid';`
- `import {SummaryCell} from '../ui/summary-cell';`
- `import {ControlRow} from '../ui/control-row';`
- `import {Section} from '../ui/section';`

### Relative Import Path Updates
1. **`StatusText` dependency in `Section`:**
   In [`apps/iitc-iris/src/ui/section/section.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/section/section.tsx#L2):
   ```ts
   // Updated from './status-text'
   import {StatusText} from '../status-text';
   ```
2. **Cross-domain CSS import in `portal-details-panel.tsx`:**
   In [`apps/iitc-iris/src/portals/portal-details-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/portals/portal-details-panel.tsx#L13):
   ```ts
   // Updated from '../ui/summary-cell-label.css'
   import '../ui/summary-cell/summary-cell-label.css';
   ```
3. **Internal `summary-cell.tsx` CSS import:**
   In [`apps/iitc-iris/src/ui/summary-cell/summary-cell.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell/summary-cell.tsx#L2):
   ```ts
   // Remained local, as both files moved together into ui/summary-cell/
   import './summary-cell-label.css';
   ```

---

## 4. Files Intentionally Not Moved

Per project rules and plan scope, the following files were intentionally retained in `apps/iitc-iris/src/ui/`:
- **`badge.tsx`, `badge.test.tsx`, `badge.css`:** Retained flat; `badge.css` is cascade-sensitive and remains in the central manifest (`CASCADE_SENSITIVE_SHARED`).
- **`status-text.tsx`, `status-text.test.tsx`, `status-text.css`:** Retained flat; `status-text.css` is cascade-sensitive and remains in the central manifest (`CASCADE_SENSITIVE_SHARED`).
- **`panel.tsx`, `panel.test.tsx`:** Retained flat; panel mechanics and layouts interact directly with shell panels.
- **`layer-choice.tsx`, `layer-choice.test.tsx`:** Retained flat; interacts directly with layer system styles.
- **All numbered CSS chunks:** `002-ui.css`, `007-ui.css`, `009-ui.css`, `024-summary-layout.css`, `026-summary-cell.css`, `044-summary.css`, `046-ui.css`, `048-panel.css`, `050-panel.css`, `052-panel.css`, `054-ui.css`, `069-ui.css` were completely untouched.

---

## 5. Validation Results

All checks passed with zero defects:

| Command | Status | Details |
|---|---|---|
| `npm run typecheck:iitc-iris` | **PASS** | 0 TypeScript errors |
| `npm run lint:iitc-iris` | **PASS** | 0 ESLint warnings or errors |
| `npm run test:iitc-iris` | **PASS** | 60 test files passed (346 / 346 tests) |
| `npm run package:iitc-iris` | **PASS** | Built Chrome ZIP + Firefox XPI (`dist/iitc-iris.css` stable at 61.22 kB) |
| `git diff --check` | **PASS** | 0 whitespace or formatting issues |

---

## 6. Issues or Surprises

None. All moved components and tests functioned identically in their new subfolders, and the bundle size and CSS output matched the baseline byte-for-byte.
