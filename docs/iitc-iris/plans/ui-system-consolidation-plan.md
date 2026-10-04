# UI System Consolidation Plan

## Plan Dashboard

Status: Active source of truth for IITC IRIS UI/CSS consolidation.

Use this plan instead of:

- `ui-component-library-plan.md`
- `css-consolidation-plan.md`
- `typography-spacing-consistency-plan.md`

Those files are historical records only. Do not continue their checkpoint lists.

Goal: reduce UI/CSS complexity by moving repeated visual behavior into a small set of generic UI primitives and their
owned CSS. Feature files should keep domain layout and domain color only.

Current user intent:

- fewer generic elements and components, not more one-off variants;
- less CSS overall, not just more tokens or selector groups;
- a more consistent look and feel across panels;
- a plan that another agent can execute one slice at a time.

## Current Worktree Note

At the time this plan was written, there may be uncommitted Checkpoint 5 truncation changes in
`apps/iitc-iris/src/iitc-iris.css`. Before starting Assignment 1, review that diff:

- keep it only if `.iitc-iris-text-truncate` is actually used by TSX or the selector grouping clearly deletes more CSS
  than it adds;
- otherwise remove the unused utility and leave truncation local until a real primitive owns it.

Do not start new UI-system work on top of unclear uncommitted cleanup.

## Design Rule

Each shared primitive owns a visual contract. A feature class may extend that contract, but should not restate it.

Shared primitive CSS owns:

- display mode and alignment;
- base padding, radius, border, font, and line-height;
- disabled/focus/hover behavior when generic;
- default truncation only when the primitive always needs it.

Feature CSS owns:

- domain layout, such as grid columns, row placement, or panel-specific gaps;
- domain color, such as faction, portal level, warning, danger, or map state;
- exceptional sizing when a feature genuinely differs;
- feature-specific responsive behavior.

If a feature class only repeats primitive CSS, delete that feature CSS.

## Existing UI Primitives

Keep these and consolidate around them:

- Buttons/actions: `ActionButton`, `SubmitActionButton`, `ClearButton`, `SegmentedButton`, `ChipButton`
- Form/control leaves: `TextInput`, `LayerCheckbox`, `LayerRadio`
- Compact display: `Badge`, `StatusText`, `DiagnosticsChip`, `PlainDiagnosticsChip`
- Layout/display wrappers: `Panel`, `PanelHeader`, `PanelTitle`, `PanelBody`, `PanelFooter`, `Section`, `ControlRow`,
  `SegmentedRow`, `SummaryGrid`, `SummaryCell`, `EmptyState`

New primitives are allowed only if they replace repeated markup/CSS in at least three places or remove a meaningful
behavior drift risk. Do not create a component just to move native HTML elsewhere.

## Execution Pattern

Every assignment must follow this exact pattern:

1. Read this plan, then inspect the exact CSS selectors and TSX call sites for the assignment.
2. List the current primitive contract and every feature class that duplicates it.
3. Make the shared primitive own the repeated visual contract.
4. Update call sites only where they become simpler or where a primitive is missing.
5. Delete duplicated feature CSS.
6. Preserve public labels, ARIA, button `type`, disabled state, click behavior, storage keys, panel ids, and class names
   unless this plan explicitly says to replace them.
7. Stop after one assignment and update this plan with completed selectors, CSS removed, and kept-local reasons.

Required validation for code-changing assignments:

- focused tests for touched shared UI components;
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`

Manual validation:

- inspect each touched panel at desktop width;
- inspect mobile/sheet width for side panels, sheet panels, and controls;
- compare before/after screenshots if a shared class changes visible shape.

## Assignment 0: Clean Planning State

Status: Complete on 2026-10-04.

Goal: make this file the only active UI-system plan.

Completed:

- `index.md` updated to list this plan as the active UI-system plan and move old plans to Superseded/Historical.
- `typography-spacing-consistency-plan.md` marked as historical and superseded.
- `css-consolidation-plan.md` and `ui-component-library-plan.md` were already deleted in a prior commit.
- Removed unused `.iitc-iris-text-truncate` selector from `iitc-iris.css` (it had no TSX users and added more CSS than
  it removed).

## Assignment 1: Button System Consolidation

Status: Complete on 2026-10-04.

Why this is first: buttons are highly visible and currently split across several local classes. Consolidating them
should
improve consistency and delete more CSS than selector grouping did.

Primary files:

- `apps/iitc-iris/src/ui/action-button.tsx`
- `apps/iitc-iris/src/ui/action-button.test.tsx`
- `apps/iitc-iris/src/iitc-iris.css`

Completed consolidation:

- Introduced `.iitc-iris-button` base class owning `appearance: none`, `border-radius: var(--iitc-iris-radius-control)`,
  and `cursor: pointer`.
- Added `.iitc-iris-button:disabled { cursor: default }` to the base.
- Updated `ActionButton` and `SubmitActionButton` to emit `iitc-iris-button iitc-iris-portal-action`.
- Removed `appearance: none`, `border-radius: 4px`, and `cursor: pointer` from:
    - `.iitc-iris-portal-action` (and `cursor: default` from `:disabled`)
    - `.iitc-iris-segmented-button`
    - `.iitc-iris-nav-button` (and `cursor: default` from `:disabled`)
    - `.iitc-iris-preset`
    - `.iitc-iris-login`
    - `.iitc-iris-layer-toggle`
    - `.iitc-iris-auth-recovery button` and `.iitc-iris-inline-auth button`
    - `.iitc-iris-chip-button` (`appearance: none` only; keeps `cursor: pointer` to override the DiagnosticsChip
      default)

Kept local:

- `.iitc-iris-table-action` / `.iitc-iris-portal-list-title button`: kept `cursor: pointer` local since these are native
  `<button>` elements used without a component wrapper; they still strip `appearance` via the shared rule.
- All domain colors, backgrounds, borders, font choices, and dimensions remain local to their variant classes.
- `.iitc-iris-table-action` keeps its `border-radius: 3px` since it intentionally uses a slightly tighter radius.

## Assignment 2: Form Controls As A Real Family

Status: Complete on 2026-10-04.

Goal: make text inputs, selects, and textareas look like one control family with fewer feature overrides.

Primary files:

- `apps/iitc-iris/src/ui/text-input.tsx`
- `apps/iitc-iris/src/ui/text-input.test.tsx`
- `apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`
- `apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`
- `apps/iitc-iris/src/iitc-iris.css`

Completed consolidation:

- Introduced `.iitc-iris-control` base class owning `min-width:0`, `box-sizing:border-box`, `border`,
  `border-radius: var(--iitc-iris-radius-control)`, `color:#e8f4ff`, `font:inherit`, `letter-spacing:0`, and
  `:disabled { color:#4f6575 }`.
- Unified border opacity from `30%` (text-input) and `24%` (select/textarea) to a single `30%` value across all
  controls.
- Unified text color from `#e8f4ff` (text-input) and `#d8e8f2` (select/textarea) to a single `#e8f4ff` value at the
  base.
- Removed the separate `.iitc-iris-text-input { ... }` block (7 declarations) and
  `.iitc-iris-text-input:disabled { ... }` block.
- Removed the combined `.iitc-iris-select-input, .iitc-iris-textarea-input { ... }` block (6 declarations).
- Updated `TextInput` to emit `iitc-iris-control iitc-iris-text-input` (base + identity).
- Added `iitc-iris-control` to the draw-tools `<textarea>` (already had `iitc-iris-textarea-input`).
- Added `iitc-iris-control` to all four `<select>` elements (portals-list ×2, draw-tools ×2).
- Removed redundant `font: inherit` from `.iitc-iris-portals-list-filters .iitc-iris-select-input` override.
- No new `SelectInput` or `TextareaInput` components needed — CSS-first consolidation was sufficient.

Kept local:

- `.iitc-iris-portals-list-filters .iitc-iris-select-input`: keeps `padding: 0 5px` (domain sizing) and `color: #d7e7f5`
  (intentional slight dimming for dense filter panel).
- `.iitc-iris-portals-list-search`: keeps `border-color: rgb(95 180 255 / 24%)` (softer border inside search-box) and
  `color: #d7e7f5` (domain color).
- `.iitc-iris-draw-tools-list-controls .iitc-iris-select-input`: keeps `width:100%`, `padding`, `background`, and
  explicit `font` (bold sm — overrides base inherit intentionally).
- `.iitc-iris-passcode-input`: keeps `background` and `padding` only; all structural contract now from base.
- `.iitc-iris-jump-input`: keeps `width`, `min-width`, `height`, `background`, and `padding`; structural contract from
  base.
- `.iitc-iris-draw-tools-label-input`: keeps `width` and `background`; structural contract from base.
- `.iitc-iris-draw-tools-import-input`: keeps `width`, `min-height`, `resize`, `padding`, `background`, and `font`
  (mono — domain typography).
- `.iitc-iris-search-input`: special search-box leaf — resets border and background; no base class applied (search-box
  provides the container shape).

## Assignment 3: Row/List Item Family

Status: Complete on 2026-10-04.

Goal: reduce repeated list-row CSS and improve consistent density across panels.

Introduced `.iitc-iris-list-item` base class owning the full visual contract:

- `display: grid`
- `min-width: 0`
- `padding: 5px 6px`
- `border: 1px solid rgb(95 180 255 / 16%)`
- `border-radius: 4px`
- `background: rgb(10 18 25 / 62%)`

Updated call sites (all emit `iitc-iris-list-item <variant>`):

- `search-panel.tsx` — `iitc-iris-search-result-row`
- `inventory-panel.tsx` — `iitc-iris-inventory-row` (3 instances including button variant)
- `passcode-panel.tsx` — `iitc-iris-inventory-row` (2 instances)
- `missions-panel.tsx` — `iitc-iris-mission-row` and `iitc-iris-mission-waypoint`
- `draw-tools-panel.tsx` — `iitc-iris-draw-tools-list-item` (link and marker)
- `comm-message-list.tsx` — `iitc-iris-comm-row`

Each variant now owns only:

- `grid-template-columns` (always unique)
- `gap` and `align-items` where they differ
- `border-color` override when it differs from the 16% base
- `border-radius: 5px` override for mission and search rows
- Domain colors (accent `box-shadow`, `border-left-color`, hover/active state colors)
- Button-specific resets (`font: inherit`, `cursor`, `text-align`)

Kept local (explicit per-variant overrides):

- `.iitc-iris-search-result-row`: `padding: 0; background: transparent; border-color: transparent; border-radius: 5px`
  — it is a transparent wrapper; background and padding live on its child `button.iitc-iris-search-result`.
- `.iitc-iris-inventory-row`: `border-color: rgb(95 180 255 / 14%)` + left-accent `box-shadow`
- `.iitc-iris-mission-row`/`.iitc-iris-mission-waypoint`: `border-radius: 5px`; yellow hover/active states
- `.iitc-iris-draw-tools-list-item`: `border-color: rgb(95 180 255 / 18%)`
- `.iitc-iris-comm-row`: `border-color: rgb(95 180 255 / 18%)` (18% vs base 16%)
- `portals-list-table` rows excluded (native `<tr>` — different semantic role)



## Assignment 4: Compact Metadata Family

Status: Complete on 2026-10-04.

Goal: finish compact display consistency around `Badge`, `StatusText`, `DiagnosticsChip`, and `SummaryCell`.

Completed consolidation:

- `SummaryGrid`: Component (`summary-grid.tsx`) and base `.iitc-iris-summary-grid` now own structural grid layout (`display: grid; min-width: 0`). Unified all 4 summary grid variants (`panel-summary`, `portal-summary`, `analysis-summary-grid`, `portals-list-summary`) into a single mobile media query rule.
- `SummaryCell`: Component (`summary-cell.tsx`) now emits `.iitc-iris-summary-cell` base class. Updated `portals-list-panel.tsx` and `portal-counts-panel.tsx` to use `<SummaryGrid>` and `<SummaryCell>` primitives.
- Absorbed `position: relative; overflow: hidden` directly into `.iitc-iris-summary-cell` base, eliminating the separate `.iitc-iris-portal-summary-cell` declaration block.
- Simplified `.iitc-iris-analysis-summary-grid` and `.iitc-iris-portals-list-summary-item` to inherit structural layout from `.iitc-iris-summary-cell`.
- `Badge`: Updated `agent-panel.tsx` core status badge (`<Badge className="iitc-iris-core-badge">`) and `inventory-panel.tsx` item badge (`<Badge as="b" className="iitc-iris-item-badge">`) to emit the `.iitc-iris-badge` primitive base.
- Stripped redundant flex, alignment, text-transform, and `box-sizing` declarations from `.iitc-iris-core-badge`, `.iitc-iris-item-badge`, `.iitc-iris-draw-tools-level-chip`, and `.iitc-iris-draw-tools-team-chip`.
- Truncation: Confirmed `.iitc-iris-text-truncate` remains deleted; individual components own text overflow behavior locally when needed.

Kept local:

- `Badge` vs `DiagnosticsChip`: Kept separate as required (distinct markup contracts).
- Portal-level and team chip background/color gradients remain local to domain classes (`is-enlightened`, `is-resistance`, `draw-tools-team-chip`).
- Sizing for specialized badges (`item-badge`, `draw-tools-level-chip`) stays local.

## Done Criteria

Stop UI-system consolidation when:

- buttons, form controls, row/list items, and compact metadata each have clear base contracts;
- feature CSS mostly owns layout and domain colors rather than repeated primitive shape;
- the total CSS line count is lower than before the assignment series;
- no active plan is competing with this file.

Do not continue polishing after the done criteria just because repeated literals remain. Some local CSS is the right
answer for domain-specific UI.
