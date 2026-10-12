# IITC IRIS CSS Pretty Architecture Phase 5A — Responsive CSS Planning

Status: Planning only. No application CSS files modified.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Phase 5)
- `docs/iitc-iris/plans/css-refactoring/06-pretty-architecture-baseline.md`
- `docs/iitc-iris/plans/css-refactoring/12-phase-4a-interleaved-owner-plan.md`
- `docs/iitc-iris/plans/css-refactoring/14-track-a-final-report.md`

---

## 1. Current Commit Hash

`90e3ce72031cb058168cc1d1277fce5decdfe914`

---

## 2. Working Tree Status (`git status --short`)

```text
(clean — no uncommitted changes prior to creating this document)
```

---

## 3. Exact Import Positions in `apps/iitc-iris/src/iitc-iris.css`

In `apps/iitc-iris/src/iitc-iris.css` (82 total imports, lines 1–83 with line 1 comment):

- **`068-temporary.css`**: Manifest position **line 64** (import index 63):
  ```css
  @import url('./styles/068-temporary.css');                              /* line 64 */
  ```
- **`075-temporary.css`**: Manifest position **line 69** (import index 68):
  ```css
  @import url('./styles/075-temporary.css');                              /* line 69 */
  ```

---

## 4. Complete Selector Inventory

Both files contain a single outer `@media (width <= 760px)` wrapper enclosing all rules.

### Inventory for `apps/iitc-iris/src/styles/068-temporary.css` (93 lines, 2189 bytes)

1. `.iitc-iris-dock` (lines 4–10)
2. `.iitc-iris-dock > .iitc-iris-dock-row:not(:first-child, .iitc-iris-debug-row)` (lines 12–14)
3. `.iitc-iris-dock-row:first-child .iitc-iris-copy:not(:first-of-type)`,
   `.iitc-iris-dock-row:first-child .iitc-iris-preset`,
   `.iitc-iris-dock-row:first-child .iitc-iris-jump` (lines 16–20)
4. `.iitc-iris-innerstatus` (lines 22–25)
5. `.iitc-iris-map-controls` (lines 27–37)
6. `.iitc-iris-portal-side-panel` (lines 39–49)
7. `.iitc-iris-portal-side-panel-stacked` (lines 51–53)
8. `.iitc-iris-portal-summary` (lines 55–57)
9. `.iitc-iris-request-side-panel` (lines 59–68)
10. `.iitc-iris-resonator-grid`, `.iitc-iris-mod-grid` (lines 70–73)
11. `.iitc-iris-resonator-grid` (lines 75–77)
12. `.iitc-iris-summary-grid`, `.iitc-iris-portal-summary`, `.iitc-iris-panel-summary`, `.iitc-iris-analysis-summary-grid`, `.iitc-iris-portals-list-summary` (lines 79–85)
13. `.iitc-iris-mission-metrics` (lines 87–89)
14. `.iitc-iris-comm-row` (lines 91–93)

### Inventory for `apps/iitc-iris/src/styles/075-temporary.css` (84 lines, 1649 bytes)

1. `.iitc-iris-sheet-tabbar` (lines 4–9)
2. `.iitc-iris-map-controls`,
   `.iitc-iris-portal-side-panel`,
   `.iitc-iris-request-side-panel`,
   `.iitc-iris-search` (lines 11–20)
3. `.iitc-iris-map-search-badge` (lines 22–27)
4. `.iitc-iris-portal-analysis` (lines 29–32)
5. `.iitc-iris-counts-visuals` (lines 34–36)
6. `.iitc-iris-counts-visuals svg` (lines 38–41)
7. `.iitc-iris-portals-list-filters` (lines 43–45)
8. `.iitc-iris-portals-list-search` (lines 47–49)
9. `.iitc-iris-portals-list-summary-item` (lines 51–53)
10. `.iitc-iris-portals-list-summary-item b` (lines 55–57)
11. `.iitc-iris-portal-analysis-table` (lines 59–62)
12. `.iitc-iris-portal-analysis-table th`, `.iitc-iris-portal-analysis-table td` (lines 64–67)
13. `.iitc-iris-portal-counts-table` (lines 69–71)
14. `.iitc-iris-portals-list-table` (lines 73–75)
15. `.iitc-iris-scoreboard-table` (lines 77–79)
16. `.iitc-iris-scoreboard-table th`, `.iitc-iris-scoreboard-table td` (lines 81–84)

---

## 5. Selectors Grouped by Feature / Owner

| Feature / Domain | Selectors in `068-temporary.css` | Selectors in `075-temporary.css` |
|---|---|---|
| **Shell & Dock** | `.iitc-iris-dock`<br>`.iitc-iris-dock > .iitc-iris-dock-row:not(...)`<br>`.iitc-iris-dock-row:first-child ...` | `.iitc-iris-sheet-tabbar` |
| **System** | `.iitc-iris-innerstatus` | — |
| **Side Panels & Panels** | `.iitc-iris-portal-side-panel`<br>`.iitc-iris-portal-side-panel-stacked`<br>`.iitc-iris-request-side-panel` | `.iitc-iris-portal-side-panel`<br>`.iitc-iris-request-side-panel` |
| **Map & Controls** | `.iitc-iris-map-controls` | `.iitc-iris-map-controls`<br>`.iitc-iris-map-search-badge` |
| **Search** | — | `.iitc-iris-search`<br>`.iitc-iris-portals-list-search` |
| **Portals & Details** | `.iitc-iris-portal-summary`<br>`.iitc-iris-resonator-grid`<br>`.iitc-iris-mod-grid` | — |
| **UI Summaries** | `.iitc-iris-summary-grid`<br>`.iitc-iris-panel-summary` | `.iitc-iris-portals-list-summary-item`<br>`.iitc-iris-portals-list-summary-item b` |
| **Portal Analysis** | `.iitc-iris-analysis-summary-grid`<br>`.iitc-iris-portals-list-summary` | `.iitc-iris-portal-analysis`<br>`.iitc-iris-counts-visuals`<br>`.iitc-iris-counts-visuals svg`<br>`.iitc-iris-portals-list-filters`<br>`.iitc-iris-portal-analysis-table`<br>`.iitc-iris-portal-analysis-table th/td`<br>`.iitc-iris-portal-counts-table`<br>`.iitc-iris-portals-list-table`<br>`.iitc-iris-scoreboard-table`<br>`.iitc-iris-scoreboard-table th/td` |
| **Missions** | `.iitc-iris-mission-metrics` | — |
| **Comm** | `.iitc-iris-comm-row` | — |

---

## 6. Cascade Separators Between the Two Responsive Files

Exactly 4 imports separate `068-temporary.css` (line 64) from `075-temporary.css` (line 69):

```css
@import url('./styles/068-temporary.css');                              /* line 64 */
@import url('./ui/069-ui.css');                                         /* line 65 */
@import url('./system/070-system.css');                                 /* line 66 */
@import url('./shell/shell-panels.css');                                /* line 67 */
@import url('./portals/074-portals.css');                               /* line 68 */
@import url('./styles/075-temporary.css');                              /* line 69 */
```

### Analysis of the 4 Separator Files:

1. **`ui/069-ui.css` (line 65):**
   - Targets `.iitc-iris-warning` (`color`, `font-weight`).
   - Disjoint from all selectors in `068` and `075`. No cascade conflict.

2. **`system/070-system.css` (line 66):**
   - Targets `.iitc-iris-compare`, `.iitc-iris-copy`, `.iitc-iris-preset`, `.iitc-iris-debug-active`, `.iitc-iris-debug-row`.
   - Note: `068` has rules for `.iitc-iris-dock-row:first-child .iitc-iris-copy:not(:first-of-type)` and `.iitc-iris-preset` (`display: none`).
   - Because `068` sets `display: none` and `070` sets colors/borders/padding, properties are disjoint.

3. **`shell/shell-panels.css` (line 67):**
   - Formed in Phase 3B from `071`, `072`, `073`.
   - Defines desktop layout for `.iitc-iris-sheet-tabbar`, `.iitc-iris-map-controls`, `.iitc-iris-portal-side-panel`, `.iitc-iris-request-side-panel`, `.iitc-iris-system-panel` with:
     ```css
     bottom: 104px;
     width: min(560px, calc(100vw - 24px));
     max-height: min(64vh, 520px);
     ```
   - **Crucial Cascade Interaction:**
     - `068-temporary.css` (line 64) sets `bottom: 56px` for `map-controls`, `portal-side-panel`, and `request-side-panel`.
     - `shell-panels.css` (line 67) sets desktop `bottom: 104px`.
     - `075-temporary.css` (line 69) sets mobile `bottom: var(--iitc-iris-tabbar-clearance, 96px)` for `map-controls`, `portal-side-panel`, `request-side-panel`, and `search`.
     - Because `075` is declared *after* `shell-panels.css`, its mobile `bottom: var(...)` and `max-height: min(64vh, 480px)` win on mobile screens.

4. **`portals/074-portals.css` (line 68):**
   - Contains a single rule:
     ```css
     .iitc-iris-portal-side-panel-stacked {
         max-height: min(64vh, 520px);
     }
     ```
   - **Crucial Cascade Interaction:**
     - In `068-temporary.css` (line 64), `.iitc-iris-portal-side-panel-stacked` is set to `max-height: min(64vh, 480px)` within `@media (width <= 760px)`.
     - Both rules have equal specificity `(0, 1, 0)`.
     - Because `074-portals.css` appears at line 68 (AFTER line 64) and is not scoped to a media query, its declaration `max-height: min(64vh, 520px)` takes cascade precedence over `068`!
     - `075-temporary.css` does not style `.iitc-iris-portal-side-panel-stacked`.
     - If `068` were moved down past line 68 (e.g. combined into a file at line 69), `068`'s `max-height: min(64vh, 480px)` would now follow line 68, **reversing the winning declaration on mobile** from 520px to 480px!

---

## 7. Strategic Decision Evaluation

We evaluated four strategies for Phase 5:

### Strategy A: Merge Both Files into a Single `styles/mobile.css`
- **Assessment:** **UNSAFE without cascade refactoring.**
- Merging at line 64 would place `075`'s mobile rules before desktop `shell-panels.css` (line 67), causing desktop rules to override mobile rules.
- Merging at line 69 would move `068`'s rules past `074-portals.css` (line 68), which alters mobile precedence for `.iitc-iris-portal-side-panel-stacked`.

### Strategy B: Split Selectors into Owner-Local Files (e.g., `portals/portals-mobile.css`, etc.)
- **Assessment:** **DEFER to Track B.**
- Splitting selectors by domain creates 8+ new fragmented files, each needing careful placement relative to both desktop and mobile cascades. This is contrary to Track A's goal of reducing fragmentation.
- True component-local media queries naturally belong in Track B (co-located component styles like `badge.css` or `portal-analysis.css`).

### Strategy C: Keep Both Files As-Is with Numbered Names
- **Assessment:** Safe, but leaves `068-temporary.css` and `075-temporary.css` with legacy "temporary" names.

### Strategy D: Rename to Block-Local Mobile Stylesheets (Preserve Positions)
- **Assessment:** **RECOMMENDED (Safest & Cleanest).**
- Rename `068-temporary.css` &rarr; `styles/mobile-panels-early.css` (or `styles/mobile-dock-panels.css`).
- Rename `075-temporary.css` &rarr; `styles/mobile-sheet-analysis.css`.
- Keep exact import positions (lines 64 and 69).
- Guarantees byte-for-byte output equivalence and 100% cascade safety while removing the "temporary" naming smell.

---

## 8. Recommended Safest Next Implementation Slice (Phase 5B)

The recommended next step is:

1. **Phase 5B — Rename Two Responsive Files at Stable Anchor Positions:**
   - Rename `apps/iitc-iris/src/styles/068-temporary.css` &rarr; `apps/iitc-iris/src/styles/mobile-dock-panels.css`
   - Rename `apps/iitc-iris/src/styles/075-temporary.css` &rarr; `apps/iitc-iris/src/styles/mobile-sheet-analysis.css`
   - Update lines 64 and 69 in `apps/iitc-iris/src/iitc-iris.css` in-place.
2. **Track B / Future:**
   - Reserve `styles/mobile.css` for when component-local CSS imports in Track B absorb component-specific rules, leaving only true global responsive breakpoints.

---

## 9. Explicit Confirmation

**No CSS or application files were modified, renamed, merged, or deleted in this planning assignment.**
The current repository remains clean and byte-for-byte identical to the Track A checkpoint.

---

## Hard Stop

Phase 5A planning is complete. Do not perform any renames or CSS modifications without a new assignment.
