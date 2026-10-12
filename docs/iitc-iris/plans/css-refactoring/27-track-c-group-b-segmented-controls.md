# IITC IRIS CSS Pretty Architecture — Track C Group B: Segmented Controls

Status: Group B Complete. Segmented controls (`SegmentedButton` and `SegmentedRow`) have been co-located into component folders while preserving shared stylesheet evaluation and existing import paths.

Reference plans:
- [`docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md)
- [`docs/iitc-iris/plans/css-refactoring/26-track-c-group-a-implementation.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/26-track-c-group-a-implementation.md)

---

## 1. Overview & Strategy

`SegmentedButton` and `SegmentedRow` are a tightly-coupled pair of components that share a single stylesheet (`segmented-button.css`). In Track B (Spike 2), this stylesheet was moved out of the central manifest and imported by both components.

In Track C Group B, the components were co-located into separate directories while keeping physical ownership of `segmented-button.css` inside `apps/iitc-iris/src/ui/segmented-button/`:
- `segmented-button.tsx` imports `./segmented-button.css`.
- `segmented-row.tsx` imports `../segmented-button/segmented-button.css`.

This preserves explicit stylesheet sharing and eliminates duplicate bundling without modifying CSS selectors or declarations.

---

## 2. Files Moved & Directory Structure

### A. `SegmentedButton`
- **Target folder:** [`apps/iitc-iris/src/ui/segmented-button/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-button/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/segmented-button.tsx` → [`apps/iitc-iris/src/ui/segmented-button/segmented-button.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-button/segmented-button.tsx)
  - `apps/iitc-iris/src/ui/segmented-button.css` → [`apps/iitc-iris/src/ui/segmented-button/segmented-button.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-button/segmented-button.css)
  - `apps/iitc-iris/src/ui/segmented-button.test.tsx` → [`apps/iitc-iris/src/ui/segmented-button/segmented-button.test.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-button/segmented-button.test.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/segmented-button/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-button/index.ts) (`export * from './segmented-button';`)

### B. `SegmentedRow`
- **Target folder:** [`apps/iitc-iris/src/ui/segmented-row/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-row/)
- **Files moved:**
  - `apps/iitc-iris/src/ui/segmented-row.tsx` → [`apps/iitc-iris/src/ui/segmented-row/segmented-row.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-row/segmented-row.tsx)
- **Barrel created:** [`apps/iitc-iris/src/ui/segmented-row/index.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-row/index.ts) (`export * from './segmented-row';`)

---

## 3. Import Paths Preserved & Dependency Adjustments

### Public Import Paths
Existing caller imports continue to resolve without modifications across the codebase:
- `import {SegmentedButton} from '../ui/segmented-button';`
- `import {SegmentedRow} from '../ui/segmented-row';`

### Shared CSS Import Relationship
- In [`apps/iitc-iris/src/ui/segmented-button/segmented-button.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-button/segmented-button.tsx#L2):
  ```ts
  import './segmented-button.css';
  ```
- In [`apps/iitc-iris/src/ui/segmented-row/segmented-row.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-row/segmented-row.tsx#L2):
  ```ts
  import '../segmented-button/segmented-button.css';
  ```

---

## 4. Constraint Adherence

- **CSS Selectors & Declarations:** Zero CSS selectors or declarations modified.
- **Central Manifest:** `apps/iitc-iris/src/iitc-iris.css` was untouched.
- **Scope Discipline:** Excluded `SummaryCell`, `Badge`, `StatusText`, and numbered CSS.
- **Numbered CSS:** Untouched.

---

## 5. Validation Results

All required verification suites passed cleanly:

| Command | Status | Output / Details |
|---|---|---|
| `npm run typecheck:iitc-iris` | **PASS** | TypeScript compilation completed with 0 errors |
| `npm run lint:iitc-iris` | **PASS** | ESLint completed with 0 warnings/errors |
| `npm run test:iitc-iris` | **PASS** | 60 test files passed (346 / 346 tests) |
| `npm run package:iitc-iris` | **PASS** | Built Chrome ZIP and Firefox XPI (`dist/iitc-iris.css` stable at 61.22 kB) |
| `git diff --check` | **PASS** | Zero whitespace or formatting defects |

---

## 6. Issues Encountered

None. Both components continue to compile, test, and bundle cleanly with the shared stylesheet.
