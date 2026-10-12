# IITC IRIS CSS Pretty Architecture — Track C Group E: UI CSS Path Cleanup

Status: Group E Complete. All 12 legacy numbered CSS chunk files in `apps/iitc-iris/src/ui/` have been moved to descriptive named paths. The central manifest import order in `apps/iitc-iris/src/iitc-iris.css` was preserved exactly. Zero numbered CSS files remain in the `apps/iitc-iris/src/ui/` root.

Reference plans:
- [`docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md)
- [`docs/iitc-iris/plans/css-refactoring/26-track-c-group-a-implementation.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/26-track-c-group-a-implementation.md)
- [`docs/iitc-iris/plans/css-refactoring/27-track-c-group-b-segmented-controls.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/27-track-c-group-b-segmented-controls.md)
- [`docs/iitc-iris/plans/css-refactoring/28-track-c-group-c-ui-helpers.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/28-track-c-group-c-ui-helpers.md)
- [`docs/iitc-iris/plans/css-refactoring/29-track-c-group-d-remaining-ui-components.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/29-track-c-group-d-remaining-ui-components.md)

---

## 1. Overview & Strategy

Track C Group E performed a pure filesystem cleanup and naming pass for the legacy numbered stylesheets that were previously located directly under `apps/iitc-iris/src/ui/`.
- No CSS selectors or declarations were modified.
- No new component-local CSS imports were added to TSX files.
- Manifest import order was preserved line-for-line in `apps/iitc-iris/src/iitc-iris.css`.
- Shared utility and control primitives were organized into [`apps/iitc-iris/src/ui/shared/`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/shared/).
- Component-specific styles were moved into their respective component folders (`action-button/`, `summary-grid/`, `summary-cell/`, `panel/`), or portal domain files (`portals/`).

---

## 2. File Path Mapping Table

All 12 numbered CSS files in `apps/iitc-iris/src/ui/` were relocated:

| Original Path | New Path | Manifest Position Preserved | Responsibility |
|---|---|---|---|
| `apps/iitc-iris/src/ui/002-ui.css` | [`apps/iitc-iris/src/ui/action-button/action-button.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/action-button/action-button.css) | Line 3 (after globals) | Action button base |
| `apps/iitc-iris/src/ui/007-ui.css` | [`apps/iitc-iris/src/ui/shared/control.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/shared/control.css) | Line 8 | Shared form control styling |
| `apps/iitc-iris/src/ui/009-ui.css` | [`apps/iitc-iris/src/ui/shared/list-item.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/shared/list-item.css) | Line 10 | Shared list item base |
| `apps/iitc-iris/src/ui/024-summary-layout.css` | [`apps/iitc-iris/src/ui/summary-grid/summary-layout.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-grid/summary-layout.css) | Line 23 | Summary grid layout |
| `apps/iitc-iris/src/ui/026-summary-cell.css` | [`apps/iitc-iris/src/ui/summary-cell/summary-cell.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell/summary-cell.css) | Line 24 | Summary cell base |
| `apps/iitc-iris/src/ui/044-summary.css` | [`apps/iitc-iris/src/portals/portal-section-summary.css`](file:///Users/jula/ittca/apps/iitc-iris/src/portals/portal-section-summary.css) | Line 36 | Portal detail section summary heading |
| `apps/iitc-iris/src/ui/046-ui.css` | [`apps/iitc-iris/src/portals/portal-slot.css`](file:///Users/jula/ittca/apps/iitc-iris/src/portals/portal-slot.css) | Line 38 | Portal detail slot layout base |
| `apps/iitc-iris/src/ui/048-panel.css` | [`apps/iitc-iris/src/ui/panel/panel-shell.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/panel/panel-shell.css) | Line 40 | Panel container base |
| `apps/iitc-iris/src/ui/050-panel.css` | [`apps/iitc-iris/src/ui/panel/panel-header.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/panel/panel-header.css) | Line 42 | Panel header styling |
| `apps/iitc-iris/src/ui/052-panel.css` | [`apps/iitc-iris/src/ui/panel/panel-body.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/panel/panel-body.css) | Line 44 | Panel body styling |
| `apps/iitc-iris/src/ui/054-ui.css` | [`apps/iitc-iris/src/ui/shared/scroll-region.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/shared/scroll-region.css) | Line 46 | Shared scroll container styling |
| `apps/iitc-iris/src/ui/069-ui.css` | [`apps/iitc-iris/src/ui/shared/warning.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/shared/warning.css) | Line 59 | Shared warning utility classes |

---

## 3. Central Manifest Load Order Confirmation

The updated [`apps/iitc-iris/src/iitc-iris.css`](file:///Users/jula/ittca/apps/iitc-iris/src/iitc-iris.css) retains the exact 75-stylesheet import sequence:
- 002-ui → `action-button/action-button.css`
- 007-ui → `shared/control.css`
- 009-ui → `shared/list-item.css`
- 024-summary-layout → `summary-grid/summary-layout.css`
- 026-summary-cell → `summary-cell/summary-cell.css`
- 044-summary → `portals/portal-section-summary.css`
- 046-ui → `portals/portal-slot.css`
- 048-panel → `ui/panel/panel-shell.css`
- 050-panel → `ui/panel/panel-header.css`
- 052-panel → `ui/panel/panel-body.css`
- 054-ui → `ui/shared/scroll-region.css`
- 069-ui → `ui/shared/warning.css`

Total imports in `iitc-iris.css`: **75** (22 named files, 53 numbered domain files).

---

## 4. CSS Files Still Centrally Loaded From Component Folders

The following stylesheets physically reside in component subfolders but remain centrally loaded in `iitc-iris.css` to safeguard cascade order:
1. `ui/action-button/action-button.css` (base button styling must precede feature-level and portal overrides)
2. `ui/badge/badge.css` (base badge styling must precede team-colored pills)
3. `ui/status-text/status-text.css` (base status text color must precede status warning/compare modifier highlights)
4. `ui/summary-grid/summary-layout.css` (layout grid mechanics)
5. `ui/summary-cell/summary-cell.css` (summary cell typography)
6. `ui/panel/panel-shell.css`, `ui/panel/panel-header.css`, `ui/panel/panel-body.css` (panel layout hierarchy)

None of these stylesheets are imported from their TSX component files.

---

## 5. Verification: Root `ui/` Directory State

Running the directory check:
```bash
find apps/iitc-iris/src/ui -maxdepth 1 -name '*[0-9]*.css' -print
```
Produced **zero output**. The root of `apps/iitc-iris/src/ui` now contains only component folders and the `shared/` directory:
- `action-button/`
- `badge/`
- `chip-button/`
- `clear-button/`
- `control-row/`
- `diagnostics-chip/`
- `empty-state/`
- `layer-choice/`
- `panel/`
- `section/`
- `segmented-button/`
- `segmented-row/`
- `shared/`
- `status-text/`
- `summary-cell/`
- `summary-grid/`
- `text-input/`

---

## 6. Validation Results

All checks passed with zero defects:

| Command | Status | Details |
|---|---|---|
| `find apps/iitc-iris/src/ui -maxdepth 1 -name '*[0-9]*.css' -print` | **PASS** | No output (zero numbered CSS files remaining in `ui/`) |
| `npm run typecheck:iitc-iris` | **PASS** | 0 TypeScript errors |
| `npm run lint:iitc-iris` | **PASS** | 0 ESLint warnings or errors |
| `npm run test:iitc-iris` | **PASS** | 60 test files passed (346 / 346 tests) |
| `npm run package:iitc-iris` | **PASS** | Built Chrome ZIP + Firefox XPI (`dist/iitc-iris.css` stable at 61.22 kB) |
| `git diff --check` | **PASS** | 0 whitespace or formatting issues |

---

## 7. Issues or Surprises

None. Moving the numbered stylesheets into named paths preserved the cascade order and bundle output bit-for-bit without impacting any component logic.
