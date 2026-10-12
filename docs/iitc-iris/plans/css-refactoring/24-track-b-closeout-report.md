# IITC IRIS CSS Pretty Architecture — Track B Closeout Report

Status: Track B Completed for Named CSS. All eligible pretty-named stylesheets have been migrated to component-local imports. The remaining central named stylesheets have been audited, classified, and confirmed to belong in the central manifest.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md`
- `docs/iitc-iris/plans/css-refactoring/18-track-b-spike-1-ui-primitive-imports.md`
- `docs/iitc-iris/plans/css-refactoring/19-track-b-spike-2-ui-component-imports.md`
- `docs/iitc-iris/plans/css-refactoring/20-track-b-spike-3-feature-css.md`
- `docs/iitc-iris/plans/css-refactoring/21-track-b-spike-4-portal-analysis-actions.md`
- `docs/iitc-iris/plans/css-refactoring/22-track-b-spike-5-summary-mini-split.md`
- `docs/iitc-iris/plans/css-refactoring/23-track-b-final-named-css-audit.md`

---

## 1. Executive Summary

Track B investigated and implemented the component-local CSS import model for IITC IRIS. Across Spikes 1 through 6:
- **8 legacy central stylesheets** were eliminated from `apps/iitc-iris/src/iitc-iris.css` (`clear-button.css`, `empty-state.css`, `diagnostics-chip.css`, `chip-button.css`, `segmented-button.css`, `draw-tools.css`, `portal-analysis-table-actions.css`, and `summary-mini.css`).
- **9 modular stylesheets** are now imported directly by their owning or shared TS/TSX components.
- **1 isolated reset stylesheet** (`portal-list-title-reset.css`) was created to preserve critical cascade order before equal-specificity team styling rules.
- **Total imports in `iitc-iris.css`** dropped from 82 to **75** (10 named, 65 numbered).
- The built CSS bundle size remains stable at **61.22 kB** (within 0.1% of baseline, with zero duplicate rules).

---

## 2. Final Manifest Import Counts

| Metric | Pre-Track B (Post-Phase 5B) | Post-Track B (Closeout) | Delta |
|---|---|---|---|
| **Total Imports in `iitc-iris.css`** | 82 | **75** | -7 |
| **Numbered Chunk Imports** | 65 | **65** | 0 (untouched) |
| **Named (Non-Numbered) Imports** | 17 | **10** | -7 |
| **Component-Local CSS Stylesheets** | 0 | **9** | +9 |
| **Missing Manifest Imports** | 0 | **0** | 0 |

---

## 3. Component-Local CSS Imports in TS / TSX

The following component-local CSS imports are now active across the codebase:

| Stylesheet | Importing Component(s) | Role & Ownership Notes |
|---|---|---|
| `ui/clear-button.css` | [`apps/iitc-iris/src/ui/clear-button.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/clear-button.tsx) | Isolated primitive clear button |
| `ui/empty-state.css` | [`apps/iitc-iris/src/ui/empty-state.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/empty-state.tsx) | Isolated primitive empty state container |
| `ui/diagnostics-chip.css` | [`apps/iitc-iris/src/ui/diagnostics-chip.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/diagnostics-chip.tsx), [`apps/iitc-iris/src/ui/chip-button.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/chip-button.tsx) | Base chip styling; explicitly co-imported by `chip-button.tsx` |
| `ui/chip-button.css` | [`apps/iitc-iris/src/ui/chip-button.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/chip-button.tsx) | Chip button modifier styling (imported after `diagnostics-chip.css`) |
| `ui/segmented-button.css` | [`apps/iitc-iris/src/ui/segmented-button.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-button.tsx), [`apps/iitc-iris/src/ui/segmented-row.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/segmented-row.tsx) | Shared two-component segmented button and row styles |
| `draw-tools/draw-tools.css` | [`apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx) | Draw tools panel, controls, and marker styling |
| `portal-analysis/portal-analysis-table-actions.css` | [`apps/iitc-iris/src/portal-analysis/portal-counts-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/portal-analysis/portal-counts-panel.tsx), [`apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx) | Table sort, table action, and level 0-8 cell styling |
| `ui/summary-cell-label.css` | [`apps/iitc-iris/src/ui/summary-cell.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell.tsx), [`apps/iitc-iris/src/portals/portal-details-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/portals/portal-details-panel.tsx) | Summary cell label typography for both generic and portal cells |
| `portals/portal-summary-mini-track.css` | [`apps/iitc-iris/src/portals/portal-details-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/portals/portal-details-panel.tsx) | Portal details health indicator mini track |

---

## 4. Remaining Central Named CSS Files & Retention Rationale

The 10 remaining named files in `apps/iitc-iris/src/iitc-iris.css` stay central for the following concrete reasons:

1. **`styles/globals.css` (`GLOBAL_FOUNDATION`):**  
   Root CSS custom properties, global typography, reset, and design tokens. Must precede all other styles.
2. **`shell/shell.css` (`SHELL_LAYOUT`):**  
   Application root container, z-index hierarchy, and sheet dock geometry. Establishes the host layout.
3. **`ui/badge.css` (`CASCADE_SENSITIVE_SHARED`):**  
   Base `.iitc-iris-badge` styling is composed with specialized caller classes (`.iitc-iris-team-pill`, `.iitc-iris-item-badge`, chips). Moving it to the tail causes base badge rules to override equal-specificity specialized rules.
4. **`ui/status-text.css` (`CASCADE_SENSITIVE_SHARED`):**  
   Base `.iitc-iris-status` text color is composed with equal-specificity modifier classes (`.iitc-iris-warning`, `.iitc-iris-compare`). Moving it to the tail overrides caller highlight colors.
5. **`portal-analysis/portal-analysis-base.css` (`DEFER_TO_TRACK_C`):**  
   Base desktop analysis table styling. Overridden by media queries in `styles/mobile-sheet-analysis.css`. Moving it to the tail would place desktop styles after mobile overrides, breaking narrow viewport rendering.
6. **`portal-analysis/portal-list-title-reset.css` (`CASCADE_SENSITIVE_SHARED`):**  
   Reset rule for `.iitc-iris-portal-list-title button`. Must precede `portals/039-portals.css`, which targets the exact same selector at equal specificity with team colors and font-weight.
7. **`styles/mobile-dock-panels.css` (`RESPONSIVE_LAYER`):**  
   Media query viewport overrides for mobile dock panels and sheets.
8. **`shell/shell-panels.css` (`SHELL_LAYOUT`):**  
   Shared panel scrolling containers, bottom sheet placement, and panel transitions. Container mechanics across all side panels.
9. **`styles/mobile-sheet-analysis.css` (`RESPONSIVE_LAYER`):**  
   Media query viewport overrides for analysis tables. Must appear after `portal-analysis-base.css`.
10. **`layers/layer-toggle.css` (`CASCADE_SENSITIVE_SHARED`):**  
    Defines `.iitc-iris-layer-toggle`, `.iitc-iris-base-toggle`, and `.iitc-iris-source-toggle`. Shared across three separate panels; composes with active/invert rules in numbered layer CSS (`084-layers.css`, `086-layers.css`).

---

## 5. Known Deferred Work

With Track B complete for named CSS, subsequent phases can build on this stable foundation:

1. **Numbered CSS Migration / Consolidation:**  
   The 65 numbered chunk files (`002-ui.css`, `004-map.css`, ..., `090-player-tracker.css`) preserve the historical monolithic cascade. Future work can consolidate adjacent numbered chunks within feature domains (e.g. `portals`, `map`, `system`) or migrate isolated feature chunks to component-local imports.
2. **Track C: Component Folder Co-Location:**  
   Co-locating TSX components, CSS stylesheets, test files, and index exports into self-contained directories (e.g. `apps/iitc-iris/src/ui/clear-button/`).
3. **Responsive / Mobile Architecture Cleanup:**  
   Consolidating media-query stylesheets (`mobile-dock-panels.css`, `mobile-sheet-analysis.css`) with their desktop counterparts once CSS Cascade Layers (`@layer`) or container queries are established.

---

## 6. Validation Checklist

| Check | Tool / Command | Result |
|---|---|---|
| CSS Linting | `npm run lint:css` | **PASS** (zero Stylelint defects) |
| TypeScript Types | `npm run typecheck:iitc-iris` | **PASS** (zero compilation errors) |
| Code Linting | `npm run lint:iitc-iris` | **PASS** (zero ESLint warnings) |
| Unit Tests | `npm run test:iitc-iris` | **PASS** (60 test files, 346 tests passed) |
| Package Build | `npm run package:iitc-iris` | **PASS** (Chrome ZIP + Firefox XPI created; CSS bundle: 61.22 kB) |
| Git Whitespace | `git diff --check` | **PASS** (zero whitespace artifacts) |
