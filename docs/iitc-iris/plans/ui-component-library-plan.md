# UI Component Library Extraction Plan

## Status

Checkpoints 0-16 complete. Next recommended checkpoint is `EmptyState` and `ChipButton`, followed by narrow form
controls.

This is an internal IITC IRIS UI-shell refactor. It is allowed to introduce shared Preact components and limited CSS
consolidation, but it must not redesign the app, rename user-facing concepts, change panel behavior, or obscure
IITC-aligned domain names.

Do not implement this plan as one broad sweep. Execute one checkpoint at a time, review it, then update this plan before
continuing.

## IITC Sources

Not directly applicable. This pass does not port new IITC-CE behavior.

IITC concepts still matter indirectly: panel names, sheet names, side-panel names, layer names, diagnostics labels, and
user-facing controls must remain recognizable and comparable to the current IITC IRIS UI.

## Current IRIS Sources

Primary sources:

- `apps/iitc-iris/src/**/*.tsx`
- `apps/iitc-iris/src/iitc-iris.css`
- Existing tests next to touched modules.

New shared components may live in:

- `apps/iitc-iris/src/ui/`

Do not move existing feature files as part of this plan.

## Public Concepts

Preserve all current:

- user-facing labels and titles;
- keyboard shortcuts;
- `aria-*` labels, roles, and pressed/selected state;
- button `type`, disabled state, form behavior, and click behavior;
- CSS class names used as public styling contracts unless a checkpoint explicitly replaces them with equivalent shared
  class contracts;
- panel ids, sheet ids, side-panel ids, storage keys, message types, and IITC-aligned domain names.

## Ownership/Lifecycle

Shared UI components are pure presentational Preact components.

They may:

- receive props such as `children`, `className`, `title`, `disabled`, `aria-*`, `onClick`, `onInput`, and `type`;
- compose existing `iitc-iris-*` class names;
- provide narrow variants for already-existing visual treatments.

They must not:

- own app state;
- read or write storage;
- post messages;
- call browser extension APIs;
- know about map, COMM, portal, inventory, mission, or scenario state;
- create new lifecycle hooks beyond normal Preact rendering.

## Hook/Plugin Visibility

No hook/plugin surface is exposed. No page-runtime globals, Leaflet APIs, message types, panel ids, sheet ids, or
storage
keys are changed.

## Scope

Create a small shared UI component layer only where repeated markup already exists.

Candidate primitive families:

- `ActionButton`: repeated `.iitc-iris-portal-action` buttons and compatible variants.
- `ClearButton`: repeated `.iitc-iris-clear-selection` close/clear buttons.
- `StatusText`: repeated `.iitc-iris-status` labels, including optional warning/panel-state classes.
- `DiagnosticsChip`: repeated `.iitc-iris-diagnostics-chip` chips.
- `ControlRow`: repeated `.iitc-iris-map-control-row` wrappers.
- `Section`: repeated `.iitc-iris-map-controls-section` wrappers with a status heading.
- `SegmentedControl` / `SegmentedButton`: `.iitc-iris-segmented-row` and `.iitc-iris-segmented-button`.
- `TextInput`: only after input variants are audited; do not force search, passcode, view, and Draw Tools inputs into
  one abstraction unless their props and CSS contracts truly match.

Current extracted component families:

- Buttons/actions: `ActionButton`, `SubmitActionButton`, `ClearButton`, `SegmentedButton`.
- Text and form leaves: `TextInput`, `LayerCheckbox`, `LayerRadio`.
- Status/chips/badges: `StatusText`, `DiagnosticsChip`, `PlainDiagnosticsChip`, `Badge`.
- Layout wrappers: `Panel`, `PanelHeader`, `PanelTitle`, `PanelBody`, `PanelFooter`, `Section`, `ControlRow`,
  `SegmentedRow`, `SummaryGrid`, `SummaryCell`.

## Extraction Roadmap

This roadmap answers "how much is left" and helps choose the next checkpoint. Counts are approximate because some
families should remain domain-specific rather than becoming generic UI.

### Tier 1: Highest Value, Low Risk

These are likely worth extracting soon because they repeat, have simple semantics, and should improve consistency.

| Candidate                      | Priority | Likely Component Type | Main Files                                                             | Expected CSS Payoff | Notes                                                                                    |
|--------------------------------|----------|-----------------------|------------------------------------------------------------------------|---------------------|------------------------------------------------------------------------------------------|
| `EmptyState`                   | High     | generic               | COMM, missions, portal analysis, portal details, agent/passcode panels | Medium              | Repeated `.iitc-iris-empty-state`; likely the best next component.                       |
| `ChipButton`                   | High     | generic               | search clear-overlay chip                                              | Low                 | Button-shaped diagnostics chip; keeps clickable chip semantics separate from span chips. |
| `SelectInput` / `FilterSelect` | High     | generic/narrow form   | portal list filters                                                    | Medium              | Preserve select-specific semantics; pairs with text input CSS cleanup.                   |
| `TextareaInput`                | High     | generic/narrow form   | Draw Tools import                                                      | Medium              | Single current textarea, but clarifies input CSS and future import forms.                |
| `CheckboxField`                | High     | generic/narrow form   | Draw Tools import merge                                                | Low                 | Layer choices are already special; this covers normal checkbox-label fields.             |

### Tier 2: Valuable, Needs Domain Shape

These should probably be extracted, but not as generic `List` or `Table` first.

| Candidate                                  | Priority | Likely Component Type | Main Files                              | Expected CSS Payoff | Notes                                                         |
|--------------------------------------------|----------|-----------------------|-----------------------------------------|---------------------|---------------------------------------------------------------|
| `PortalAnalysisTable` shell                | Medium   | domain/generic hybrid | portal counts, scoreboard, portals list | Medium              | Share table wrapper/classes, but keep row/cell content local. |
| `TableSortButton`                          | Medium   | table-specific        | portals list                            | Low                 | Must preserve sort labeling and accessible button behavior.   |
| `TableActionButton`                        | Medium   | table-specific        | portals list `Zoom`                     | Low                 | Useful if more table actions appear.                          |
| `SearchResultRow`                          | Medium   | domain-specific       | search panel                            | Medium              | Result preview/focus semantics are specialized.               |
| `MissionListRow` / `MissionWaypointButton` | Medium   | domain-specific       | missions panel                          | Medium              | Avoid generic row abstraction.                                |
| `InventoryListSection` / `InventoryRow`    | Medium   | domain-specific       | inventory/passcode panels               | Medium              | Shares list visual language, but key rows are buttons.        |
| `DrawToolsList` / `DrawToolsListItem`      | Medium   | domain-specific       | Draw Tools panel                        | High                | Likely the biggest remaining Draw Tools cleanup.              |
| `DrawToolsImportForm`                      | Medium   | domain-specific       | Draw Tools panel                        | Medium              | Groups textarea, merge checkbox, import button/status.        |

### Tier 3: Specialized or CSS-Only First

These are visible, but a generic component may not be the right first move.

| Candidate                                | Priority   | Likely Component Type | Main Files                      | Expected CSS Payoff | Notes                                                                       |
|------------------------------------------|------------|-----------------------|---------------------------------|---------------------|-----------------------------------------------------------------------------|
| `PortalSummaryCell`                      | Low/Medium | portal-specific       | portal details                  | Medium              | Current portal summary is not the same as generic `SummaryCell`.            |
| `PortalDetailPanelSection`               | Low/Medium | portal-specific       | portal details                  | Medium              | Details/mods/resonators/facts differ enough to audit first.                 |
| `AuthActionButton`                       | Low/Medium | generic/domain hybrid | auth recovery, diagnostics auth | Medium              | Possible CSS consolidation with action buttons, but semantics differ.       |
| `PresetButton` / system scenario buttons | Low/Medium | system-specific       | system controls/diagnostics     | Medium              | Many `.iitc-iris-preset`/copy buttons; audit with button CSS consolidation. |
| `MapNavButton`                           | Low        | map-specific          | map controls                    | Low                 | Pan/zoom layout is specialized and stable.                                  |
| `LayerToggleButton`                      | Low        | layer-specific        | layers/system diagnostics       | Low                 | Active/pressed toggle semantics differ from action buttons.                 |
| `SheetTabButton`                         | Low        | shell-specific        | sheet tabbar                    | Low                 | Navigation/tab semantics; leave until shell UI pass.                        |
| COMM token buttons                       | Low        | COMM-specific         | COMM message list               | Low                 | Portal/player tokens have custom behavior.                                  |

### Rough Progress

- Extracted shared families: about 18.
- Remaining generic high-value candidates: about 5.
- Remaining medium-value domain candidates: about 8.
- Remaining specialized/CSS-first candidates: about 9.
- Expected remaining implementation checkpoints before the UI library feels "mostly extracted": about 5-6.

"Mostly extracted" means Tier 1 complete plus the useful Tier 2 domain components chosen by audit. Tier 3 can remain raw
unless CSS consolidation or a feature change makes it worth touching.

### Suggested Next Checkpoints

1. `EmptyState` and `ChipButton`.
2. Form controls: `SelectInput`, `TextareaInput`, `CheckboxField`.
3. Portal analysis table audit and table shell/buttons.
4. Search result row component.
5. Draw Tools import/list components.
6. Button-family CSS consolidation.

Do not introduce a generic `List` or `Table` component until after checkpoints 3-5 prove which parts are genuinely
shared.

## Actionable Assignments

Use these assignments for the remaining work. Each assignment should be implemented and reviewed separately unless the
files and behavior overlap heavily.

### Assignment A: Empty States and Chip Button

Status: ready.

Goal: finish the remaining small generic display primitives.

Components:

- `EmptyState`
- `ChipButton`

Files:

- Add `apps/iitc-iris/src/ui/empty-state.tsx`
- Add `apps/iitc-iris/src/ui/empty-state.test.tsx`
- Add `apps/iitc-iris/src/ui/chip-button.tsx`
- Add `apps/iitc-iris/src/ui/chip-button.test.tsx`
- Replace `.iitc-iris-empty-state` in:
    - `apps/iitc-iris/src/comm/comm-panel.tsx`
    - `apps/iitc-iris/src/missions/missions-panel.tsx`
    - `apps/iitc-iris/src/portal-analysis/portal-counts-panel.tsx`
    - `apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`
    - `apps/iitc-iris/src/portal-analysis/scoreboard-panel.tsx`
    - `apps/iitc-iris/src/portals/portal-details-panel.tsx`
    - `apps/iitc-iris/src/side-panels/agent-panel.tsx`
    - `apps/iitc-iris/src/side-panels/passcode-panel.tsx`
- Replace the search clear-overlay diagnostics button in `apps/iitc-iris/src/search/search-panel.tsx`.

Rules:

- `EmptyState` is a presentational wrapper only; no status/error logic.
- `ChipButton` must render a real `<button type="button">` and preserve
  `.iitc-iris-diagnostics-chip iitc-iris-chip-button`.
- Do not touch CSS unless tests or markup reveal a class composition issue.

Done when:

- App code no longer directly uses `.iitc-iris-empty-state`.
- The only app-level raw `.iitc-iris-diagnostics-chip` button usage is gone.

Validation:

- focused UI tests;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- `git diff --check`.

### Assignment B: Narrow Form Controls

Status: ready after Assignment A.

Goal: finish non-text form leaves without inventing a generic all-input abstraction.

Components:

- `SelectInput`
- `TextareaInput`
- `CheckboxField`

Files:

- Add `apps/iitc-iris/src/ui/select-input.tsx`
- Add `apps/iitc-iris/src/ui/select-input.test.tsx`
- Add `apps/iitc-iris/src/ui/textarea-input.tsx`
- Add `apps/iitc-iris/src/ui/textarea-input.test.tsx`
- Add `apps/iitc-iris/src/ui/checkbox-field.tsx`
- Add `apps/iitc-iris/src/ui/checkbox-field.test.tsx`
- Refactor portal list selects in `apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`
- Refactor Draw Tools import textarea and merge checkbox in `apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`

Rules:

- Keep native `<select>`, `<textarea>`, and `<input type="checkbox">` semantics.
- Do not reuse `LayerCheckbox`; layer choices have a different visual/ARIA contract.
- CSS consolidation is allowed only for exact shared form-control base rules.

Done when:

- Remaining raw `<select>` usages are intentionally domain-specific or documented.
- Draw Tools import textarea and merge checkbox no longer own ad hoc class composition in TSX.

Validation:

- focused UI tests;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- manual visual check of portal filters and Draw Tools import.

### Assignment C: Portal Analysis Tables

Status: needs implementation plan before code.

Goal: reduce table wrapper/button duplication without hiding table semantics.

Candidate components:

- `PortalAnalysisTable`
- `TableSortButton`
- `TableActionButton`

Files:

- `apps/iitc-iris/src/portal-analysis/portal-counts-panel.tsx`
- `apps/iitc-iris/src/portal-analysis/scoreboard-panel.tsx`
- `apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`
- possible new files under `apps/iitc-iris/src/ui/` or `apps/iitc-iris/src/portal-analysis/`

Rules:

- Do not abstract rows/cells generically in the first table checkpoint.
- Preserve `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` semantics.
- Preserve sort button behavior and visible sort indicators.

Done when:

- Table wrapper/class repetition is centralized.
- Portals list sort/action buttons are either extracted or explicitly deferred with reason.

Validation:

- portal-analysis focused tests if available;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- manual visual check of Portal Counts, Scoreboard, and Portals List.

### Assignment D: Search Results

Status: after Assignment C or if search work is active.

Goal: make search result rows maintainable without making a generic row component.

Candidate components:

- `SearchResultGroup`
- `SearchResultRow`
- `SearchResultZoomButton`

Files:

- `apps/iitc-iris/src/search/search-panel.tsx`
- possible new files under `apps/iitc-iris/src/search/`

Rules:

- Preserve hover preview, focus preview, blur clearing, active row styling, disabled empty rows, and zoom behavior.
- Do not share this with mission/inventory rows.

Done when:

- Search row rendering is readable without changing keyboard/mouse behavior.

Validation:

- focused search tests if available;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- manual search interaction check.

### Assignment E: Draw Tools Import and Lists

Status: after Assignment B or when Draw Tools work is active.

Goal: extract the largest remaining local component cluster.

Candidate components:

- `DrawToolsImportForm`
- `DrawToolsList`
- `DrawToolsListItem`
- `DrawToolsListActions`
- `DrawToolsMarkerSwatch`

Files:

- `apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`
- possible new files under `apps/iitc-iris/src/draw-tools/`

Rules:

- Keep Draw Tools JSON/import behavior unchanged.
- Keep link and marker lists domain-specific; do not use a generic `List`.
- Preserve marker edit `defaultValue`, blur save, Enter/Escape behavior, swatch colors, and portal marker chips.

Done when:

- Draw Tools panel has a small top-level render shape and repeated list action markup is centralized.

Validation:

- Draw Tools focused tests if available;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- manual Draw Tools import/list/marker-edit check.

### Assignment F: Inventory and Missions Rows

Status: optional after Assignments C-E.

Goal: extract remaining repeated row/list structures only if they still feel noisy.

Candidate components:

- `InventoryList`
- `InventoryRow`
- `InventoryKeyRow`
- `MissionListRow`
- `MissionWaypointButton`

Files:

- `apps/iitc-iris/src/side-panels/inventory-panel.tsx`
- `apps/iitc-iris/src/side-panels/passcode-panel.tsx`
- `apps/iitc-iris/src/missions/missions-panel.tsx`

Rules:

- Keep inventory key rows and mission rows as buttons where they are buttons.
- Do not merge inventory and mission row components.

Done when:

- Repeated row skeletons are centralized, or the assignment is explicitly deferred as not worth the churn.

Validation:

- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- manual inventory/passcode/missions visual check.

### Assignment G: Portal Details Domain Components

Status: optional; do after higher-value assignments.

Goal: reduce portal-details file size and isolate portal-specific layout.

Candidate components:

- `PortalSummaryCell`
- `PortalDetailPanel`
- `PortalFactsGrid`
- mod/resonator helpers
- mission enrichment block

Files:

- `apps/iitc-iris/src/portals/portal-details-panel.tsx`
- possible new files under `apps/iitc-iris/src/portals/`

Rules:

- Keep portal semantics explicit; do not generalize this to other panels.
- Preserve details section open-state ownership and all existing class names.

Done when:

- Portal details is easier to scan, or extraction is deferred as domain-heavy.

Validation:

- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- manual portal details visual check.

### Assignment H: CSS Consolidation Passes

Status: after Assignments A-C at minimum.

Goal: reduce CSS after component boundaries are stable.

Candidate consolidation areas:

- form controls after Assignment B;
- table styles after Assignment C;
- search/inventory/draw-tools row styles after Assignments D-F;
- button families: `.iitc-iris-portal-action`, `.iitc-iris-preset`, `.iitc-iris-copy`, `.iitc-iris-login`, nav/layer
  toggles;
- diagnostics/chip variants after `ChipButton`.

Rules:

- One CSS family per checkpoint.
- Preserve old specialized classes until visual parity is confirmed.
- No redesign.

Done when:

- duplicated rules are removed or aliased through shared base classes with no visual behavior changes.

Validation:

- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- visual checks of every affected panel.

Avoid broad abstractions at first:

- Do not introduce a generic `Panel` wrapper until repeated panel structure is proven across at least two reviewed
  checkpoints.
- Do not introduce generic `Badge`, `List`, `Row`, or `SummaryGrid` components until the exact repeated shapes and class
  contracts are listed in this plan.
- Do not introduce one generic "all inputs" component. Text inputs, textareas, selects, checkboxes, and radios have
  different accessibility and layout contracts and must be planned separately.

## CSS Rules

CSS edits are allowed, but only in explicitly scoped checkpoints.

Allowed CSS edits:

- add shared base classes for a newly introduced component when two or more existing class rules are equivalent or
  nearly
  equivalent;
- make existing specialized classes compose with the new shared class without changing computed appearance;
- delete duplicated CSS only after visual parity is verified for every touched usage.

Disallowed CSS edits:

- redesigning spacing, colors, typography, border radius, layout density, or responsive behavior;
- broad `iitc-iris.css` reorganization;
- changing class names used by untouched markup;
- combining visually similar but semantically different controls merely to reduce lines.

If a component needs CSS consolidation, the checkpoint must list:

- exact old classes;
- exact new/shared classes;
- exact selectors changed in `iitc-iris.css`;
- touched `.tsx` files;
- visual states to compare: normal, hover/focus if practical, disabled, active/selected, warning/danger where relevant.

Before any CSS consolidation or broad component variants, add focused tests for the shared UI primitives that are
already
in use.

CSS consolidation order:

- audit remaining raw markup and stylesheet duplication first;
- consolidate only one component family per checkpoint;
- prefer components that already exist in `apps/iitc-iris/src/ui/`;
- preserve existing specialized classes as aliases until every touched usage has visual parity notes;
- do not turn CSS consolidation into broad selector reorganization.

## Non-Goals

- No visual redesign.
- No broad UI/CSS/mobile polish.
- No feature work or parity work.
- No behavior changes.
- Do not use `ActionButton` for form submit buttons; it intentionally defaults to `type="button"`.
- No extraction from `content.tsx` beyond replacing markup imports/usages required by an approved checkpoint.
- No barrel files unless a checkpoint explicitly approves one and explains why direct imports are worse.

## Tests/Diagnostics

TypeScript alone is not enough.

Each checkpoint must include whichever focused checks are relevant:

- component unit tests for conditional class composition, default `type="button"`, disabled state, `aria-*` forwarding,
  and event forwarding;
- focused tests for touched modules when they already have tests;
- before/after grep or review notes proving old classes/attributes are preserved or intentionally consolidated;
- screenshots or manual visual inspection notes for every touched visible panel when markup/CSS changes could affect
  layout.

## Divergences

None intended.

Any visual, behavior, accessibility, storage, message, or panel-id difference must be documented here with:

- reason;
- expected effect;
- how to compare against the pre-refactor UI;
- whether the difference should be fixed before continuing.

## Validation

Every code-changing checkpoint must run:

- focused tests for touched components/modules;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- `git diff --check`.

If CSS or visible markup changes, also run or record:

- manual visual inspection of the exact touched panels via `npm run dev -w apps/iitc-iris`;
- screenshots when practical for desktop and narrow/mobile widths;
- confirmation that there is no intentional layout shift.

## Checkpoints

### Checkpoint 0: UI Pattern Audit

Status: complete.

Documentation only. Do not change app code.

Audit Results:

- Top repeated classes and usage counts:
    - `iitc-iris-status`: 102 usages
    - `iitc-iris-portal-action`: 44 usages
    - `iitc-iris-map-controls-section`: 25 usages
    - `iitc-iris-diagnostics-chip`: 24 usages
    - `iitc-iris-map-control-row`: 14 usages
    - `iitc-iris-clear-selection`: 7 usages
    - `iitc-iris-segmented` (including segmented-row/segmented-button): 2 files

- Candidate components sorted by lowest risk first:
    1. `StatusText` (`iitc-iris-status`) - pure span/div styling.
    2. `ActionButton` (`iitc-iris-portal-action`) - pure button styling.
    3. `ClearButton` (`iitc-iris-clear-selection`) - pure icon button.
    4. `DiagnosticsChip` (`iitc-iris-diagnostics-chip`).

- First implementation checkpoint exact files:
  `apps/iitc-iris/src/system/system-controls-panel.tsx` (contains a mix of action buttons and status text).

- Scope:
  Markup-only. No CSS consolidation is needed or approved for Checkpoint 1.

Validation:

- Documentation review only.
- `git diff --check`.

### Checkpoint 1: Leaf Button/Status Components

Status: complete.

Preferred first implementation slice:

- add `apps/iitc-iris/src/ui/action-button.tsx`;
- add `apps/iitc-iris/src/ui/clear-button.tsx`;
- add `apps/iitc-iris/src/ui/status-text.tsx`;
- add focused component tests if these components contain any conditional logic;
- replace usages in one small, low-risk panel file only: `apps/iitc-iris/src/system/system-controls-panel.tsx`.

Do not edit CSS in this checkpoint unless Checkpoint 0 identifies an exact duplicate class consolidation and updates
this
section first (none identified yet, so no CSS edits).

Validation:

- focused component tests and touched panel tests, if any;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- `git diff --check`;
- manual visual check of the touched panel.

### Checkpoint 2: Chips And Control Rows

Status: complete.

Candidate components:

- `DiagnosticsChip`: wrapping
  `<span className="iitc-iris-diagnostics-chip"><b>{value}</b><small>{label}</small></span>`.
- `ControlRow`: wrapping `<div className="iitc-iris-map-control-row">`.
- `Section`: wrapping `<div className="iitc-iris-map-controls-section">` with an optional `<StatusText>` title heading.

Exact files for implementation:

- `apps/iitc-iris/src/ui/diagnostics-chip.tsx`
- `apps/iitc-iris/src/ui/control-row.tsx`
- `apps/iitc-iris/src/ui/section.tsx`
- Refactor target: `apps/iitc-iris/src/system/system-controls-panel.tsx` (to finish its extraction using
  Section/ControlRow).
- Refactor target: `apps/iitc-iris/src/portal-analysis/portal-counts-panel.tsx` (for DiagnosticsChip usages).

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection of system-controls-panel and portal-counts-panel.

### Checkpoint 3: Segmented Controls

Status: complete.

Candidate scope:

- `SegmentedRow`: wrapping `<div className="iitc-iris-segmented-row">`.
- `SegmentedButton`: wrapping `<button className="iitc-iris-segmented-button is-active">` and supporting an
  `active?: boolean` prop.

Exact files for implementation:

- `apps/iitc-iris/src/ui/segmented-row.tsx`
- `apps/iitc-iris/src/ui/segmented-button.tsx`
- Refactor target: `apps/iitc-iris/src/comm/comm-panel-controls.tsx` (will also opportunistically apply ActionButton and
  ControlRow from CP1/CP2 to this file since it uses them).

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection of the COMM panel controls.

### Checkpoint 4: UI Primitive Tests

Status: complete.

Add focused tests for shared UI primitives before introducing additional variants or CSS consolidation.

Exact files:

- `apps/iitc-iris/src/ui/action-button.test.tsx`
- `apps/iitc-iris/src/ui/clear-button.test.tsx`
- `apps/iitc-iris/src/ui/status-text.test.tsx`
- `apps/iitc-iris/src/ui/diagnostics-chip.test.tsx`
- `apps/iitc-iris/src/ui/segmented-button.test.tsx`

Test expectations:

- default class names are present;
- extra `className` values are composed without dropping the base class;
- `ActionButton`, `ClearButton`, and `SegmentedButton` render `type="button"`;
- `disabled`, `title`, `aria-*`, and event props are forwarded where applicable;
- `SegmentedButton active` adds `is-active`;
- `DiagnosticsChip` preserves the `<b>` value and `<small>` label structure.

Do not refactor additional app panels in this checkpoint.

Validation:

-
`npm run test -w apps/iitc-iris -- --run src/ui/action-button.test.tsx src/ui/clear-button.test.tsx src/ui/status-text.test.tsx src/ui/diagnostics-chip.test.tsx src/ui/segmented-button.test.tsx`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

### Checkpoint 5: Summary Grid and Cells

Status: complete.

Candidate scope:

- `SummaryGrid`: wrapping `<div className="iitc-iris-panel-summary">` or similar repeated summary wrappers.
- `SummaryCell`: wrapping the `<span><b>{value}</b><small>{label}</small></span>` structure commonly found inside panel
  summaries (which is structurally similar to `DiagnosticsChip` but often lacks the specific chip class).

Exact files for implementation:

- `apps/iitc-iris/src/ui/summary-grid.tsx`
- `apps/iitc-iris/src/ui/summary-cell.tsx`
- `apps/iitc-iris/src/ui/summary-grid.test.tsx`
- `apps/iitc-iris/src/ui/summary-cell.test.tsx`
- Refactor target: `apps/iitc-iris/src/comm/comm-panel-controls.tsx` (to replace the raw summary markup at the bottom of
  the panel).

Validation:

- `npm run test -w apps/iitc-iris -- --run src/ui/summary-grid.test.tsx src/ui/summary-cell.test.tsx`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection of the COMM panel controls.

### Checkpoint 6: Panel Wrappers

Status: complete.

Candidate scope:

- `Panel`: wrapping `<aside className="iitc-iris-request-side-panel">`
- `PanelHeader`: wrapping `<div className="iitc-iris-request-panel-header">`
- `PanelTitle`: wrapping `<span className="iitc-iris-selected-title">`
- `PanelBody`: wrapping `<div className="iitc-iris-request-panel-body">`
- `PanelFooter`: wrapping `<div className="iitc-iris-panel-footer">`

Exact files for implementation:

- `apps/iitc-iris/src/ui/panel.tsx` (containing all the above exports)
- `apps/iitc-iris/src/ui/panel.test.tsx`
- Refactor target: `apps/iitc-iris/src/search/search-panel.tsx` (to replace its root structure)
- Refactor target: `apps/iitc-iris/src/shell/request-side-panel-container.tsx` (to replace its header and root
  structure)

Validation:

- `npm run test -w apps/iitc-iris -- --run src/ui/panel.test.tsx`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection of the search panel and a side panel (like COMM or info).

### Checkpoint 7: Text/Input Pattern Audit

Status: complete.

Documentation only. Do not change app code.

Audit Results:

- Which controls are plain single-line text/search inputs?
  Search, passcode, comm draft, jump input, portals list filter, and marker labels are plain single-line text/search
  inputs.
- Which controls submit forms, and which are purely live filters?
  Submit forms: search, passcode, comm draft, jump input.
  Live filters/live edit: portals list filter, marker labels.
- Which use controlled `value` versus uncontrolled `defaultValue`?
  Most use controlled `value`. The active Draw Tools editing marker input uses uncontrolled `defaultValue`.
- Which need `onInput`, `onBlur`, `onKeyDown`, `autoFocus`, `aria-label`, `title`, `disabled`, or `rows`?
  `onInput` is needed by almost all. `onKeyDown` by search and marker edit. `onBlur` and `autoFocus` by marker edit.
  `aria-label` by portal filter and marker inputs. `title` by search and jump. `disabled` by passcode, comm, and marker
  creation. `rows` is only needed by the import textarea.
- Which classes can be preserved exactly without CSS edits?
  All of them: `.iitc-iris-search-input`, `.iitc-iris-passcode-input`, `.iitc-iris-jump-input`,
  `.iitc-iris-portals-list-search`, `.iitc-iris-draw-tools-label-input`.
- Which controls should remain raw because their structure is domain-specific?
  Checkboxes/radios in layers panel, selects in portal list, and the import textarea in draw tools.

First implementation slice confirmed:

- create `apps/iitc-iris/src/ui/text-input.tsx`;
- create `apps/iitc-iris/src/ui/text-input.test.tsx`;
- refactor only `.iitc-iris-passcode-input` usages in:
    - `apps/iitc-iris/src/comm/comm-panel-body.tsx`;
    - `apps/iitc-iris/src/side-panels/passcode-panel.tsx`.

Validation:

- Documentation review only.
- `git diff --check`.

### Checkpoint 8: TextInput Leaf Component

Status: complete.

Candidate scope:

- `TextInput`: a thin wrapper around `<input>` for single-line text/search-like controls.
- It must preserve exact class names through `className`.
- It must forward `value`, `defaultValue`, `placeholder`, `title`, `disabled`, `aria-*`, `autoFocus`, `onInput`,
  `onBlur`, and `onKeyDown`.
- It must not own state.
- It must not be used for checkboxes, radios, selects, or textareas.

Exact files:

- `apps/iitc-iris/src/ui/text-input.tsx`
- `apps/iitc-iris/src/ui/text-input.test.tsx`
- `apps/iitc-iris/src/comm/comm-panel-body.tsx`
- `apps/iitc-iris/src/side-panels/passcode-panel.tsx`

Do not edit CSS in this checkpoint.

Test expectations:

- base/custom class composition preserves the supplied class;
- default `type` is text unless an explicit type is passed;
- `value` and `defaultValue` can both be forwarded;
- `disabled`, `placeholder`, `title`, `aria-label`, and `autoFocus` are forwarded;
- `onInput`, `onBlur`, and `onKeyDown` are forwarded.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/ui/text-input.test.tsx`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`
- manual visual inspection of COMM send input and Passcode panel.

### Checkpoint 9: Remaining TextInput Usages

Status: complete.

Scope: Apply `TextInput` to the remaining single-line text inputs identified in the Checkpoint 7 audit. Since the
`TextInput` component has been validated, this checkpoint will refactor multiple panels at once.

Exact files to refactor:

- `apps/iitc-iris/src/search/search-panel.tsx` (replace `.iitc-iris-search-input`)
- `apps/iitc-iris/src/system/system-controls-panel.tsx` (replace `.iitc-iris-jump-input`)
- `apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx` (replace `.iitc-iris-portals-list-search`)
- `apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx` (replace `.iitc-iris-draw-tools-label-input` usages)

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection.

### Checkpoint 10: Layer Choices and Badges

Status: complete.

Scope: Introduce generic components for layer checkboxes/radios and badges, then apply them to the relevant panels.

**Layer Choices Audit:**

- Checkbox/Radio structure in `layers-panel.tsx`:
  `<label className="iitc-iris-layer-choice [is-checked]"><input type="checkbox/radio" /> <span className="iitc-iris-layer-choice-label">...</span></label>`
- Action: Create `LayerCheckbox` and `LayerRadio` in `apps/iitc-iris/src/ui/layer-choice.tsx`.

**Badges Audit:**

- `.iitc-iris-item-badge`: `<b>` badge for item levels in `passcode-panel.tsx`.
- `.iitc-iris-team-pill`: `<span>` pill for faction in `portals-list-panel.tsx`.
- `.iitc-iris-draw-tools-team-chip`: `<span>` chip for faction in `draw-tools-panel.tsx`.
- `.iitc-iris-draw-tools-level-chip`: `<span>` chip for level in `draw-tools-panel.tsx`.
- `.iitc-iris-level-cell`: `<td>` class for level in `portals-list-panel.tsx`.
- Action: Create `Badge` in `apps/iitc-iris/src/ui/badge.tsx` that renders a `<span>` or `<b>` (via `as` prop or just
  `span` default). It should accept `className` and `style`. `iitc-iris-level-cell` is a `td` and inherently part of a
  table, so we will not refactor it into a `Badge` to avoid breaking table semantics.

Implementation files:

- `apps/iitc-iris/src/ui/layer-choice.tsx`
- `apps/iitc-iris/src/ui/layer-choice.test.tsx`
- `apps/iitc-iris/src/ui/badge.tsx`
- `apps/iitc-iris/src/ui/badge.test.tsx`

Refactor files:

- `apps/iitc-iris/src/layers/layers-panel.tsx`
- `apps/iitc-iris/src/side-panels/passcode-panel.tsx`
- `apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`
- `apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`

Validation:

- `npm run test -w apps/iitc-iris`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection.

### Checkpoint 11: Residual Markup and CSS Audit

Status: complete.

Documentation only. Do not change app code.

Purpose: decide whether the next implementation checkpoint should be CSS consolidation or another small component
extraction. Checkpoint 10 did not finish the UI extraction pass; it only covered layer choices and small badge-like
elements.

Audit Results:

Remaining raw markup that should become shared UI components:

- `ActionButton`: non-submit `.iitc-iris-portal-action` buttons in `draw-tools-panel.tsx`, `missions-panel.tsx`,
  `portal-details-panel.tsx`, `portals-list-panel.tsx`, `map-controls-panel.tsx`, `scores-panel.tsx`, and
  `inventory-panel.tsx`
- `StatusText`: `portal-details-panel.tsx`, `inventory-panel.tsx`, `missions-panel.tsx`, `search-panel.tsx`,
  `scoreboard-panel.tsx`, `agent-panel.tsx`, `comm-panel.tsx`, `system-diagnostics-panel.tsx`, `scores-panel.tsx`,
  `layers-panel.tsx`, `system-panel-container.tsx`, `portals-list-panel.tsx`
- `DiagnosticsChip`: `portal-details-panel.tsx`, `missions-panel.tsx`, `agent-panel.tsx`, `search-panel.tsx`,
  `comm-panel.tsx`, `scores-panel.tsx`, `passcode-panel.tsx`, `inventory-panel.tsx`, `portals-list-panel.tsx`
- `ClearButton`: `map-controls-panel-container.tsx`, `portal-image-modal.tsx`, `portal-details-panel.tsx`,
  `help-panel.tsx`, `system-diagnostics-panel.tsx`, `search-panel.tsx`
- `ControlRow` / `Section`: `draw-tools-panel.tsx`, `map-controls-panel.tsx`, `system-diagnostics-panel.tsx`,
  `layers-panel.tsx`, `portals-list-panel.tsx`, `scoreboard-panel.tsx`, `missions-panel.tsx`, `inventory-panel.tsx`,
  `scores-panel.tsx`
- `SummaryGrid` / `SummaryCell`: `missions-panel.tsx`, `agent-panel.tsx`, `passcode-panel.tsx`, `scores-panel.tsx`,
  `inventory-panel.tsx`

Remaining raw markup that should intentionally stay raw:

- Table structures, map/canvas layers, base layer toggle buttons (`iitc-iris-layer-toggle`), COMM special links
  (`iitc-iris-comm-portal`), sheet tabs (`iitc-iris-sheet-tab`), auth login buttons, submit buttons that intentionally
  use `.iitc-iris-portal-action`, anchor links styled as `.iitc-iris-portal-action`, and other highly specialized
  domain-specific controls. Portal list `<select>` filters and table sort/action buttons wait until a table semantics
  audit.

Exact CSS selectors duplicated or nearly duplicated:

- Inputs: `.iitc-iris-passcode-input`, `.iitc-iris-draw-tools-label-input`, and `.iitc-iris-jump-input` share very
  similar properties for border, radius, background, color, and box-sizing.
- Buttons: `.iitc-iris-portal-action` vs `.iitc-iris-copy`/`.iitc-iris-preset` vs `.iitc-iris-login` have similar
  background, border, color, and border-radius.

Next implementation step:
CSS consolidation remains deferred until the remaining duplicated selectors are reviewed. Free-text
`.iitc-iris-diagnostics-chip` usages were intentionally not forced through `DiagnosticsChip`, because the current
component models the `<b>{value}</b><small>{label}</small>` shape only.

Validation:

- Documentation review.
- `git diff --check`.

### Checkpoint 12: ActionButton Application

Status: complete.

Scope: Apply `ActionButton` to compatible remaining `.iitc-iris-portal-action` buttons.

Exact files:

- `apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`
- `apps/iitc-iris/src/map/map-controls-panel.tsx`
- `apps/iitc-iris/src/missions/missions-panel.tsx`
- `apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`
- `apps/iitc-iris/src/portals/portal-details-panel.tsx`
- `apps/iitc-iris/src/side-panels/inventory-panel.tsx`
- `apps/iitc-iris/src/side-panels/scores-panel.tsx`

Rules:

- Do not apply `ActionButton` to form submit buttons if `type="submit"` is intended.
- Do not apply `ActionButton` to anchors such as the mission authoring link.
- Keep CSS untouched.
- After this checkpoint, the only remaining `.iitc-iris-portal-action` usages should be submit buttons, anchors, the
  `ActionButton` component itself, and tests.

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection of the panels.

### Checkpoint 13: Remaining Primitive Application

Status: complete.

Scope: Apply the already-extracted shared components (`StatusText`, `DiagnosticsChip`, `ClearButton`, `ControlRow`,
`Section`, `SummaryGrid`, `SummaryCell`) to the remaining compatible raw markup identified in Checkpoint 11.

Rules:

- Keep CSS untouched.
- Do not replace table structure, map/canvas layers, base layer toggles, COMM token buttons, auth buttons, or other
  domain-specific controls without a narrower audit.
- Keep free-text diagnostics chips raw until a `PlainDiagnosticsChip` or equivalent component is planned.

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection of the touched panels.

### Checkpoint 14: CSS Consolidation - Inputs

Status: complete.

Scope: Consolidate the duplicate CSS rules for text inputs identified in Checkpoint 11.

- Exact old classes: `.iitc-iris-search-input`, `.iitc-iris-passcode-input`, `.iitc-iris-jump-input`,
  `.iitc-iris-portals-list-search`, `.iitc-iris-draw-tools-label-input`.
- Exact new class: `.iitc-iris-text-input`.
- Keep existing classes composed alongside the new class for backwards compatibility during transition.

Implementation notes:

- `TextInput` now always emits `.iitc-iris-text-input` and composes any specialized class passed by callers.
- `.iitc-iris-text-input` owns the shared min-width, box-sizing, border, radius, color, font, letter-spacing, and
  disabled
  color rules.
- Specialized classes still own visual differences such as search-box transparency, portal-list text color, jump width,
  background, padding, height, and placeholder styling.

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- manual visual inspection of the touched panels.

### Checkpoint 15: Submit Actions and Plain Diagnostics Chips

Status: complete.

Scope:

- Add `SubmitActionButton` for submit-safe `.iitc-iris-portal-action` form buttons.
- Add `PlainDiagnosticsChip` for free-text diagnostics chips that do not fit the structured
  `<b>{value}</b><small>{label}</small>` `DiagnosticsChip` shape.
- Keep anchor-styled action links raw.
- Keep clickable chip buttons raw until a button-shaped chip component is planned.

Exact files:

- `apps/iitc-iris/src/ui/action-button.tsx`
- `apps/iitc-iris/src/ui/action-button.test.tsx`
- `apps/iitc-iris/src/ui/diagnostics-chip.tsx`
- `apps/iitc-iris/src/ui/diagnostics-chip.test.tsx`
- `apps/iitc-iris/src/comm/comm-panel-body.tsx`
- `apps/iitc-iris/src/side-panels/passcode-panel.tsx`
- footer chip call sites in COMM, portal details, missions, search, agent, inventory, scores, and passcode panels.

Validation:

- focused UI component tests;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- manual visual inspection of submit buttons and footer chips.

### Checkpoint 16: List/Table/Domain-Control Pattern Audit

Status: complete.

Documentation only. Do not change app code.

Purpose: decide which remaining raw lists, tables, rows, and domain-specific buttons should become shared components and
which should stay local.

Audit groups:

- Empty states: repeated `.iitc-iris-empty-state` blocks.
- Tables: portal list table wrapper, sortable headers, portal title buttons, and table action buttons.
- Lists: mission list/rows/waypoints, inventory lists/key rows, Draw Tools list rows/actions, COMM message token rows,
  agent/top-agent rows.
- Form controls: portal list selects, Draw Tools import textarea, Draw Tools import merge checkbox.
- Button-like domain controls: search result rows/zoom buttons, clear-overlay chip button, map pan/zoom/location
  buttons,
  layer base toggles, system debug toggle, auth login buttons, mission authoring anchor, marker swatches, sheet tabs.
- Portal details structures: portal summary cells, portal panels, mod grid, resonator grid, facts grid, mission
  enrichment.

Audit output must classify each item as:

- generic shared component now;
- domain-specific component now;
- CSS-only consolidation candidate;
- intentionally raw.

Likely first candidates after the audit:

- `EmptyState`;
- `ChipButton` for clickable diagnostics chips;
- `TableActionButton` / `TableSortButton` after table semantics are confirmed;
- Draw Tools-specific row/import components rather than a generic list.

Validation:

- Documentation review.
- `git diff --check`.

Audit Results:

Generic shared component candidates now:

- `EmptyState`: repeated in COMM, missions, portal analysis, portal details, agent, and passcode flows.
  Expected files: `ui/empty-state.tsx`, optional test, and simple replacements.
  Value: high consistency, medium CSS cleanup.
- `ChipButton`: the search clear-overlay chip is a clickable diagnostics-style chip. This should be separate from
  `PlainDiagnosticsChip` because it is a button.
  Expected files: `ui/chip-button.tsx`, optional test, and `search-panel.tsx`.
  Value: small but cleans up the last raw `.iitc-iris-diagnostics-chip` app usage.
- `SelectInput` / `FilterSelect`: portal list faction and level filters are the only current select controls.
  Expected files: `ui/select-input.tsx`, optional test, and `portals-list-panel.tsx`.
  Value: medium CSS cleanup; keep native select semantics.
- `TextareaInput`: Draw Tools import JSON textarea is the only current textarea.
  Expected files: `ui/textarea-input.tsx`, optional test, and `draw-tools-panel.tsx`.
  Value: medium CSS cleanup; useful if more import/edit forms appear.
- `CheckboxField`: Draw Tools import merge checkbox is a normal label+checkbox field, unlike layer choices.
  Expected files: `ui/checkbox-field.tsx`, optional test, and `draw-tools-panel.tsx`.
  Value: low CSS cleanup, but clarifies checkbox semantics.

Domain-shaped candidates now:

- Portal analysis table family:
  `PortalAnalysisTable` shell can cover portal counts, scoreboard, and portals list table wrappers/classes.
  `TableSortButton` and `TableActionButton` are candidates for portals list only.
  Do not abstract table rows/cells generically yet.
- Search result family:
  `SearchResultGroup`, `SearchResultRow`, and `SearchResultZoomButton` are possible, but preview/focus behavior makes
  them search-domain components rather than generic rows.
- Draw Tools family:
  `DrawToolsImportForm`, `DrawToolsList`, `DrawToolsListItem`, `DrawToolsListActions`, and marker swatch components are
  likely worthwhile. This is the largest remaining local cleanup opportunity.
- Inventory/passcode family:
  `InventoryList`, `InventoryRow`, and `InventoryKeyRow` could share list structure, but key rows are buttons and need
  domain-specific handling.
- Missions family:
  `MissionListRow` and `MissionWaypointButton` are useful domain components. Do not merge with search/inventory rows.
- Portal details family:
  `PortalSummaryCell`, `PortalDetailPanel`, `PortalFactsGrid`, mod/resonator helpers, and mission enrichment are
  portal-specific. Extract only if portal-details file size or CSS repetition becomes painful.
- System controls family:
  Preset/scenario/source buttons repeat, but they are closer to button-family CSS consolidation than generic components.
- Shell/map/COMM controls:
  map pan/zoom/location buttons, layer toggles, sheet tabs, auth buttons, and COMM portal/player token buttons should
  remain raw or become domain-specific components only when those areas are worked on.

Classification Summary:

- Generic shared components left: `EmptyState`, `ChipButton`, `SelectInput`, `TextareaInput`, `CheckboxField`.
- Domain components worth considering: portal analysis table shell/buttons, search results, Draw Tools import/list,
  inventory/passcode rows, mission rows/waypoints, portal-details structures, system preset/source buttons.
- Intentionally raw for now: map nav buttons, layer toggles, sheet tabs, auth buttons, COMM tokens, mission authoring
  anchor, portal image button, map context anchor button.
- CSS-only consolidation candidates: button families (`portal-action`, `preset`, `copy`, `login`, nav/layer toggles),
  table styles, inventory/draw-tools/search row styles, and diagnostics/chip variants.

Work Remaining Estimate:

- To finish the generic library layer: about 2 checkpoints.
    1. `EmptyState` + `ChipButton`.
    2. `SelectInput` + `TextareaInput` + `CheckboxField`.
- To make repeated domain UI substantially cleaner: about 3-4 more checkpoints.
    1. Portal analysis table shell/buttons.
    2. Search result rows.
    3. Draw Tools import/list components.
    4. Inventory/mission rows if still valuable after the first three.
- To reduce CSS meaningfully after components: 1-2 CSS consolidation checkpoints.
    1. Form/table/list CSS cleanup.
    2. Button-family CSS cleanup.

Definition of "mostly done":

- Tier 1 complete.
- Portal analysis table and Draw Tools list/import either extracted or explicitly deferred.
- CSS consolidation has removed obvious duplicated form/button/table/list rules without changing visual behavior.

### Remaining Backlog

Use the Extraction Roadmap above as the source of truth for what remains. These notes call out important boundaries for
future checkpoints:

- Anchor-styled action links: the mission authoring link remains an `<a>` with `.iitc-iris-portal-action`; do not
  convert
  it to a button component.
- Portal list form/table controls need a table/form semantics audit before extraction.
- Search results, Draw Tools, portal details, missions, inventory, and COMM rows should use domain-shaped components
  rather than a generic `Row`/`List` first.
- Map/domain controls, layer base toggles, system debug toggle, auth login buttons, COMM token buttons, inventory key
  rows, mission rows/waypoints, and sheet tabs may remain raw unless a domain checkpoint proves value.
- CSS consolidation candidates still open: button families (`.iitc-iris-portal-action`, `.iitc-iris-preset`,
  `.iitc-iris-copy`, `.iitc-iris-login`) and diagnostics chip variants, after exact selector/state audits.
