# IITC IRIS CSS Pretty Architecture — Track B Spike 2: UI Component Imports (Corrected)

Status: Spike 2 Corrected. Three UI component stylesheets moved to component-local imports with explicit shared-dependency handling; `status-text.css` rolled back to the central manifest due to composed-class cascade risk with caller styling.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Track B)
- `docs/iitc-iris/plans/css-refactoring/14-track-a-final-report.md`
- `docs/iitc-iris/plans/css-refactoring/17-post-phase-5b-final-report.md`
- `docs/iitc-iris/plans/css-refactoring/18-track-b-spike-1-ui-primitive-imports.md`

---

## 1. Full Candidate Pool & Decisions

All pretty-named `src/ui/*.css` files evaluated in Spike 2:

| Candidate | In Manifest | Owning Component(s) | Decision | Rationale |
|---|---|---|---|---|
| `ui/status-text.css` | Yes (line 17) | `status-text.tsx` | **ROLLED BACK** | Composes equal-specificity caller classes such as `.iitc-iris-warning` and `.iitc-iris-compare`. Moving `.iitc-iris-status` to the component-local tail creates a cascade override risk. |
| `ui/diagnostics-chip.css` | No (moved) | `diagnostics-chip.tsx`, `chip-button.tsx` | **MOVED (Explicit Co-Import)** | Emits `.iitc-iris-diagnostics-chip`. Imported by `diagnostics-chip.tsx` and explicitly co-imported by `chip-button.tsx` (which also renders the chip class). No duplicate rules in output. |
| `ui/chip-button.css` | No (moved) | `chip-button.tsx` | **MOVED (Explicit Dependency)** | Emits `.iitc-iris-chip-button`. Imported by `chip-button.tsx` after `diagnostics-chip.css`. |
| `ui/segmented-button.css` | No (moved) | `segmented-button.tsx`, `segmented-row.tsx` | **MOVED (Shared Two-Component)** | Shared two-component stylesheet covering `.iitc-iris-segmented-button` and `.iitc-iris-segmented-row`. Explicitly imported by both components; bundler deduplication verified with zero duplicate rules. |

### Explicit Exclusions Kept in Central Manifest / Skipped

| File | Reason |
|---|---|
| `ui/badge.css` | Explicit exclusion — composes with specialized caller classes (Spike 1 rollback) |
| `ui/summary-mini.css` | Explicit exclusion |
| `ui/024-summary-layout.css` | Explicit exclusion (numbered) |
| `ui/026-summary-cell.css` | Explicit exclusion (numbered) |
| `ui/044-summary.css` | Explicit exclusion (numbered) |
| `ui/048-panel.css` | Panel CSS — excluded |
| `ui/050-panel.css` | Panel CSS — excluded |
| `ui/052-panel.css` | Panel CSS — excluded |
| All `ui/00N-ui.css` files | Numbered — excluded |

---

## 2. Ownership & Isolation Evidence

### `status-text.css` (Rolled Back)
- **Root selector:** `.iitc-iris-status { color: #c7d8e8; }`
- **Cascade Risk:** Callers compose `StatusText` with modifier classes such as `.iitc-iris-warning` (`<StatusText className="iitc-iris-warning">`) and `.iitc-iris-compare`. When `.iitc-iris-status` is moved to the tail of the bundle, its base `color` declaration risks overriding equal-specificity caller color declarations defined earlier in the stylesheet.
- **Resolution:** Restored `@import url('./ui/status-text.css');` to `apps/iitc-iris/src/iitc-iris.css` at its original cascade position after `auth/017-auth.css`. Removed component-local import from `status-text.tsx`.

### `diagnostics-chip.css` & `chip-button.css` (Explicit Dependency Handling)
- **Ownership:** `diagnostics-chip.tsx` emits `.iitc-iris-diagnostics-chip`. However, `chip-button.tsx` also emits `className="iitc-iris-diagnostics-chip iitc-iris-chip-button"`.
- **Dependency Solution:**
  1. `diagnostics-chip.tsx` imports `./diagnostics-chip.css`.
  2. `chip-button.tsx` explicitly imports `./diagnostics-chip.css` followed by `./chip-button.css`.
- **Duplicate Check:** Verified that Vite deduplicates module CSS imports. The bundled output contains exactly one instance of `.iitc-iris-diagnostics-chip{` and one instance of `.iitc-iris-chip-button{`.

### `segmented-button.css` (Shared Two-Component Stylesheet)
- **Ownership:** `segmented-button.css` contains rules for both `.iitc-iris-segmented-row` and `.iitc-iris-segmented-button`.
- **Dependency Solution:** Both `segmented-button.tsx` and `segmented-row.tsx` now explicitly import `./segmented-button.css`.
- **Duplicate Check:** Verified that the bundled output contains exactly one instance of `.iitc-iris-segmented-row{` and one instance of `.iitc-iris-segmented-button{`. Zero duplication occurred.

---

## 3. Files Changed

| File | Change |
|---|---|
| `apps/iitc-iris/src/iitc-iris.css` | Removed 3 central `@import` lines (`segmented-button.css`, `chip-button.css`, `diagnostics-chip.css`). Retained `status-text.css` and `badge.css`. |
| `apps/iitc-iris/src/ui/status-text.tsx` | Unmodified (no component-local CSS import; uses central manifest). |
| `apps/iitc-iris/src/ui/diagnostics-chip.tsx` | Added `import './diagnostics-chip.css';`. |
| `apps/iitc-iris/src/ui/chip-button.tsx` | Added `import './diagnostics-chip.css';` and `import './chip-button.css';`. |
| `apps/iitc-iris/src/ui/segmented-button.tsx` | Added `import './segmented-button.css';`. |
| `apps/iitc-iris/src/ui/segmented-row.tsx` | Added `import './segmented-button.css';`. |

---

## 4. Manifest Diff (`apps/iitc-iris/src/iitc-iris.css`)

```diff
@@ -12,7 +12,6 @@
 @import url('./map/011-map.css');
 @import url('./system/012-system.css');
 @import url('./map/013-map.css');
-@import url('./ui/segmented-button.css');
 @import url('./system/015-innerstatus.css');
 @import url('./auth/017-auth.css');
 @import url('./ui/status-text.css');
@@ -22,7 +21,6 @@
 @import url('./side-panels/022-side-panels.css');
 @import url('./portals/023-portals.css');
 @import url('./ui/024-summary-layout.css');
-@import url('./ui/chip-button.css');
 @import url('./ui/026-summary-cell.css');
 @import url('./portals/027-portals.css');
 @import url('./ui/summary-mini.css');
@@ -51,7 +49,6 @@
 @import url('./comm/056-comm.css');
 @import url('./side-panels/057-side-panels.css');
 @import url('./map/058-map.css');
-@import url('./ui/diagnostics-chip.css');
 @import url('./missions/060-missions.css');
 @import url('./comm/061-comm.css');
 @import url('./system/062-system.css');
```

---

## 5. Added Component-Local Imports

### `apps/iitc-iris/src/ui/diagnostics-chip.tsx`
```diff
 import {h, ComponentChildren, JSX} from 'preact';
+import './diagnostics-chip.css';
```

### `apps/iitc-iris/src/ui/chip-button.tsx`
```diff
 import {h, ComponentChildren, JSX} from 'preact';
+import './diagnostics-chip.css';
+import './chip-button.css';
```

### `apps/iitc-iris/src/ui/segmented-button.tsx`
```diff
 import {h, ComponentChildren, JSX} from 'preact';
+import './segmented-button.css';
```

### `apps/iitc-iris/src/ui/segmented-row.tsx`
```diff
 import {h, ComponentChildren, JSX} from 'preact';
+import './segmented-button.css';
```

---

## 6. Final Import Counts

| Metric | Baseline (Post-Spike 1) | Post-Spike 2 (Corrected) | Delta |
|---|---|---|---|
| **Total Imports in `iitc-iris.css`** | 80 | **77** | -3 |
| **Numbered Chunk Imports** | 65 | **65** | 0 |
| **Pretty Imports in `iitc-iris.css`** | 15 | **12** | -3 |
| **Component-Local CSS Stylesheets Moved** | 2 | **5** (`clear-button`, `empty-state`, `diagnostics-chip`, `chip-button`, `segmented-button`) | +3 |
| **Component-Local `import` Statements** | 2 | **6** | +4 |
| **Missing Manifest Imports** | 0 | **0** | 0 |

---

## 7. Validation Results

All static checks, tests, and build packaging executed from the repository root:

| Command | Status | Notes |
|---|---|---|
| `npm run lint:css` | **PASS** | Exit 0, clean Stylelint check |
| `npm run typecheck:iitc-iris` | **PASS** | Exit 0, clean TypeScript check |
| `npm run lint:iitc-iris` | **PASS** | Exit 0, clean ESLint check |
| `npm run test:iitc-iris` | **PASS** | Exit 0 — 60/60 test files, **346 tests** |
| `npm run package:iitc-iris` | **PASS** | Exit 0 — CSS 61.13 kB, Chrome ZIP + Firefox XPI built |
| `git diff --check` | **PASS** | Exit 0, zero whitespace defects |

---

## 8. CSS Output and Duplicate-Check Observations

### Deduplication Verification in `dist/iitc-iris.css`
- Total built CSS size: **61.13 kB** (61,134 bytes)
- `.iitc-iris-diagnostics-chip{` rule occurrences: **1** (no duplication despite co-import in `diagnostics-chip.tsx` and `chip-button.tsx`)
- `.iitc-iris-chip-button{` rule occurrences: **1**
- `.iitc-iris-segmented-row{` rule occurrences: **1** (no duplication despite co-import in `segmented-row.tsx` and `segmented-button.tsx`)
- `.iitc-iris-segmented-button{` rule occurrences: **1**

### Selector Positions in `dist/iitc-iris.css`

| Selector | Position (byte) | Location / Cascade Context |
|---|---|---|
| `.iitc-iris-badge` | 1,770 | Central manifest |
| `.iitc-iris-status` (standalone) | 11,270 | Central manifest (between `auth/017-auth.css` and `portals/019-portals.css`) |
| `.iitc-iris-clear-selection` | 59,208 | Tail (Spike 1 component-local) |
| `.iitc-iris-diagnostics-row` | 59,632 | Tail (`diagnostics-chip.css`) |
| `.iitc-iris-diagnostics-chip` | 59,726 | Tail (`diagnostics-chip.css`) |
| `.iitc-iris-empty-state` | 60,428 | Tail (Spike 1 component-local) |
| `.iitc-iris-chip-button` | 60,560 | Tail (`chip-button.css`) |
| `.iitc-iris-segmented-row` | 60,661 | Tail (`segmented-button.css`) |
| `.iitc-iris-segmented-button` | 60,786 | Tail (`segmented-button.css`) |

---

## 9. Recommendation for Next Track B Scope

- **Spike 1 + Spike 2 Status:** All standalone UI primitive stylesheets suitable for component-local imports (`clear-button.css`, `empty-state.css`, `diagnostics-chip.css`, `chip-button.css`, `segmented-button.css`) have been safely migrated.
- **Central Manifest Retention:** `badge.css` and `status-text.css` must remain in `iitc-iris.css` because their base selectors compose with equal-specificity caller-provided classes.
- **Next Step:** Allow these changes to be tested before proceeding to feature or domain CSS moves.

---

## Hard Stop

Spike 2 correction complete. No feature CSS, numbered CSS, badge CSS, summary CSS, or panel CSS was touched.
