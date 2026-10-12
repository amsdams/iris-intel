# IITC IRIS CSS Pretty Architecture — Track B Final Named CSS Audit & Closeout

Status: Track B Complete for Named CSS. All 10 remaining named imports in `apps/iitc-iris/src/iitc-iris.css` have been audited and classified. No additional named CSS should be moved to component-local imports.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md`
- `docs/iitc-iris/plans/css-refactoring/18-track-b-spike-1-ui-primitive-imports.md`
- `docs/iitc-iris/plans/css-refactoring/19-track-b-spike-2-ui-component-imports.md`
- `docs/iitc-iris/plans/css-refactoring/20-track-b-spike-3-feature-css.md`
- `docs/iitc-iris/plans/css-refactoring/21-track-b-spike-4-portal-analysis-actions.md`
- `docs/iitc-iris/plans/css-refactoring/22-track-b-spike-5-summary-mini-split.md`

---

## 1. Inventory & Classification of Remaining Named Imports

There are exactly **10 non-numbered (named) imports** remaining in `apps/iitc-iris/src/iitc-iris.css`:

| # | Import Path in Manifest | Line | Classification | Primary Responsibility |
|---|---|---|---|---|
| 1 | `./styles/globals.css` | 2 | `GLOBAL_FOUNDATION` | CSS custom properties, resets, typography, root tokens |
| 2 | `./shell/shell.css` | 4 | `SHELL_LAYOUT` | Application root shell container, z-index layers, sheet docking base |
| 3 | `./ui/badge.css` | 6 | `CASCADE_SENSITIVE_SHARED` | Base badge styling composed with caller specialized badges |
| 4 | `./ui/status-text.css` | 17 | `CASCADE_SENSITIVE_SHARED` | Base status text styling composed with caller warning/compare modifiers |
| 5 | `./portal-analysis/portal-analysis-base.css` | 27 | `DEFER_TO_TRACK_C` | Analysis table baseline, overridden by mobile sheet media queries |
| 6 | `./portal-analysis/portal-list-title-reset.css` | 30 | `CASCADE_SENSITIVE_SHARED` | Title button reset, precedes equal-specificity `039-portals.css` rule |
| 7 | `./styles/mobile-dock-panels.css` | 58 | `RESPONSIVE_LAYER` | Viewport media query overrides for mobile dock panels |
| 8 | `./shell/shell-panels.css` | 61 | `SHELL_LAYOUT` | Panel placement, dock scroll containers, transition animations |
| 9 | `./styles/mobile-sheet-analysis.css` | 63 | `RESPONSIVE_LAYER` | Viewport media query overrides for analysis sheets on mobile |
| 10 | `./layers/layer-toggle.css` | 69 | `CASCADE_SENSITIVE_SHARED` | Shared layer toggle buttons, composes with numbered layer rules |

---

## 2. Detailed Rationale for Central Retention

### 1. `styles/globals.css` — `GLOBAL_FOUNDATION`
- **Why it stays central:** Establishes root CSS variables (`--iitc-iris-font-*`, `--iitc-iris-space-*`, color tokens), box-sizing defaults, and global typography.
- **Cascade risk:** Must execute before any component styling; moving to a component-local import would break variable resolution order or cause unpredictable base-rule reordering.

### 2. `shell/shell.css` — `SHELL_LAYOUT`
- **Why it stays central:** Defines the outermost host container (`.iitc-iris-shell`, `.iitc-iris-sheet-dock`, root positioning).
- **Cascade risk:** Establishes the stacking context and sizing framework for all nested panels. Belongs to the root shell lifecycle, not individual feature panels.

### 3. `ui/badge.css` — `CASCADE_SENSITIVE_SHARED`
- **Why it stays central:** Defines the base `.iitc-iris-badge` rule. In `draw-tools-panel.tsx`, `portals-list-panel.tsx`, and side panels, caller components compose `.iitc-iris-badge` with specialized classes (`.iitc-iris-team-pill`, `.iitc-iris-item-badge`, `.iitc-iris-draw-tools-level-chip`, `.iitc-iris-draw-tools-team-chip`).
- **Cascade risk:** Moving `.iitc-iris-badge` to the tail of the bundle places its base declarations *after* those specialized rules, overriding equal-specificity properties (established in Spike 1).

### 4. `ui/status-text.css` — `CASCADE_SENSITIVE_SHARED`
- **Why it stays central:** Defines the base `.iitc-iris-status` text color. Callers compose `StatusText` with modifier classes of equal specificity, such as `.iitc-iris-warning` and `.iitc-iris-compare`.
- **Cascade risk:** Moving `.iitc-iris-status` to the tail overrides caller highlight colors with default `#c7d8e8` (established in Spike 2 correction).

### 5. `portal-analysis/portal-analysis-base.css` — `DEFER_TO_TRACK_C`
- **Why it stays central:** Contains baseline table grid definitions, column alignments, and team cell colors for portal analysis (`.iitc-iris-portal-analysis-table`).
- **Cascade risk:** It is explicitly overridden by media query rules in `styles/mobile-sheet-analysis.css` (line 63). Moving `portal-analysis-base.css` to the tail would place desktop table styling *after* mobile media queries, risking broken mobile table displays.
- **Recommendation:** Defer to Track C co-location alongside a dedicated responsive analysis refactor.

### 6. `portal-analysis/portal-list-title-reset.css` — `CASCADE_SENSITIVE_SHARED`
- **Why it stays central:** Contains the reset rule `.iitc-iris-portal-list-title button { min-width: 0; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; }`.
- **Cascade risk:** Must execute immediately before `portals/039-portals.css`, which targets the exact same selector at equal specificity (0, 1, 1) with team colors and `font-weight: 800`. Moving it would clobber `039-portals.css` (established in Spike 4).

### 7. `styles/mobile-dock-panels.css` — `RESPONSIVE_LAYER`
- **Why it stays central:** Contains `@media (max-width: 768px)` and `@media (max-width: 480px)` responsive overrides for dock panel placements and sheet heights.
- **Cascade risk:** Responsive media query layers must load after desktop layouts in the manifest to ensure correct override behavior across viewport changes.

### 8. `shell/shell-panels.css` — `SHELL_LAYOUT`
- **Why it stays central:** Manages side panel scrolling containers, bottom sheet placement, and panel open/close slide transitions.
- **Cascade risk:** Shared container mechanics that apply across multiple panels (`portal-details`, `comm`, `missions`, `search`, `system`). No single component owns this container styling.

### 9. `styles/mobile-sheet-analysis.css` — `RESPONSIVE_LAYER`
- **Why it stays central:** Contains narrow-viewport media query overrides for the portal analysis bottom sheet and table layout.
- **Cascade risk:** Must appear after `portal-analysis-base.css` in the cascade to correctly apply responsive table styling on small viewports.

### 10. `layers/layer-toggle.css` — `CASCADE_SENSITIVE_SHARED`
- **Why it stays central:** Defines `.iitc-iris-layer-toggle`, `.iitc-iris-base-toggle`, and `.iitc-iris-source-toggle`. The active and inverted states (`.iitc-iris-layer-toggle-active` and `.iitc-iris-layer-toggle-invert`) remain in numbered layer CSS (`084-layers.css`, `086-layers.css`).
- **Cascade risk:** Shared across `layers-panel.tsx`, `system-controls-panel.tsx`, and `system-diagnostics-panel.tsx`. Composes with those later numbered rules; moving base toggle styling to the component tail would decouple it from active/invert overrides. No single component owns it.

---

## 3. Retrospective: Track B Migrations Summary (Spikes 1–5)

Throughout Spikes 1–5, every stylesheet with clean component ownership and cascade safety was migrated:

| Moved Stylesheet | Owning Component(s) | Spike | Notes |
|---|---|---|---|
| `ui/clear-button.css` | `ui/clear-button.tsx` | Spike 1 | Isolated primitive button |
| `ui/empty-state.css` | `ui/empty-state.tsx` | Spike 1 | Isolated empty state container |
| `ui/diagnostics-chip.css` | `ui/diagnostics-chip.tsx`, `ui/chip-button.tsx` | Spike 2 | Explicit co-import by `chip-button.tsx` |
| `ui/chip-button.css` | `ui/chip-button.tsx` | Spike 2 | Explicit dependency after `diagnostics-chip.css` |
| `ui/segmented-button.css` | `ui/segmented-button.tsx`, `ui/segmented-row.tsx` | Spike 2 | Shared two-component stylesheet |
| `draw-tools/draw-tools.css` | `draw-tools/draw-tools-panel.tsx` | Spike 3 | Verified map runtime safety |
| `portal-analysis-table-actions.css` | `portal-counts-panel.tsx`, `portals-list-panel.tsx` | Spike 4 | Split from title button reset |
| `ui/summary-cell-label.css` | `ui/summary-cell.tsx`, `portals/portal-details-panel.tsx` | Spike 5 | Split from `summary-mini.css` |
| `portals/portal-summary-mini-track.css` | `portals/portal-details-panel.tsx` | Spike 5 | Split from `summary-mini.css` |

**Eliminated from Central Manifest:** 8 legacy files removed (`clear-button.css`, `empty-state.css`, `diagnostics-chip.css`, `chip-button.css`, `segmented-button.css`, `draw-tools.css`, `summary-mini.css` [deleted], and `portal-analysis-table-actions.css` [split/pruned]).

---

## 4. Final Import Counts

| Metric | Post-Phase 5B Baseline | Post-Track B (Spike 6) | Total Delta |
|---|---|---|---|
| **Total Imports in `iitc-iris.css`** | 82 | **75** | -7 |
| **Numbered Chunk Imports** | 65 | **65** | 0 |
| **Named (Non-Numbered) Imports** | 17 | **10** | -7 |
| **Component-Local CSS Stylesheets** | 0 | **9** | +9 |
| **Missing Manifest Imports** | 0 | **0** | 0 |

---

## 5. Final Recommendation

**Track B is COMPLETE for all named CSS files.**

- Every pretty-named candidate capable of safe component-local migration has been migrated and validated.
- All 10 remaining named files in `apps/iitc-iris/src/iitc-iris.css` are either global foundations, shell layout containers, responsive media layers, or cascade-sensitive shared selectors.
- No further named CSS moves should be attempted without restructuring component architectures or resolving cross-viewport cascade coupling.
- **Next Phase:** Track B closeout is achieved. Further CSS refactoring should focus either on consolidation of the 65 numbered chunk files or Track C component-directory co-location.

---

## 6. Validation Results

| Command | Status | Notes |
|---|---|---|
| `npm run lint:css` | **PASS** | Exit code 0, clean Stylelint |
| `npm run package:iitc-iris` | **PASS** | Exit code 0 (Chrome ZIP + Firefox XPI created; CSS 61.22 kB) |
| `git diff --check` | **PASS** | Exit code 0, zero whitespace defects |
