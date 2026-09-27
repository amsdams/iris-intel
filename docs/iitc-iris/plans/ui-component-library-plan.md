# UI Component Library Extraction Plan

## Status

Checkpoints 0-6 complete. Next checkpoint requires planning before implementation.

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

No hook/plugin surface is exposed. No page-runtime globals, Leaflet APIs, message types, panel ids, sheet ids, or storage
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

- add shared base classes for a newly introduced component when two or more existing class rules are equivalent or nearly
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

Before any CSS consolidation or broad component variants, add focused tests for the shared UI primitives that are already
in use.

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

Do not edit CSS in this checkpoint unless Checkpoint 0 identifies an exact duplicate class consolidation and updates this
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

- `DiagnosticsChip`: wrapping `<span className="iitc-iris-diagnostics-chip"><b>{value}</b><small>{label}</small></span>`.
- `ControlRow`: wrapping `<div className="iitc-iris-map-control-row">`.
- `Section`: wrapping `<div className="iitc-iris-map-controls-section">` with an optional `<StatusText>` title heading.

Exact files for implementation:
- `apps/iitc-iris/src/ui/diagnostics-chip.tsx`
- `apps/iitc-iris/src/ui/control-row.tsx`
- `apps/iitc-iris/src/ui/section.tsx`
- Refactor target: `apps/iitc-iris/src/system/system-controls-panel.tsx` (to finish its extraction using Section/ControlRow).
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
- `SegmentedButton`: wrapping `<button className="iitc-iris-segmented-button is-active">` and supporting an `active?: boolean` prop.

Exact files for implementation:
- `apps/iitc-iris/src/ui/segmented-row.tsx`
- `apps/iitc-iris/src/ui/segmented-button.tsx`
- Refactor target: `apps/iitc-iris/src/comm/comm-panel-controls.tsx` (will also opportunistically apply ActionButton and ControlRow from CP1/CP2 to this file since it uses them).

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

- `npm run test -w apps/iitc-iris -- --run src/ui/action-button.test.tsx src/ui/clear-button.test.tsx src/ui/status-text.test.tsx src/ui/diagnostics-chip.test.tsx src/ui/segmented-button.test.tsx`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

### Checkpoint 5: Summary Grid and Cells

Status: complete.

Candidate scope:
- `SummaryGrid`: wrapping `<div className="iitc-iris-panel-summary">` or similar repeated summary wrappers.
- `SummaryCell`: wrapping the `<span><b>{value}</b><small>{label}</small></span>` structure commonly found inside panel summaries (which is structurally similar to `DiagnosticsChip` but often lacks the specific chip class).

Exact files for implementation:
- `apps/iitc-iris/src/ui/summary-grid.tsx`
- `apps/iitc-iris/src/ui/summary-cell.tsx`
- `apps/iitc-iris/src/ui/summary-grid.test.tsx`
- `apps/iitc-iris/src/ui/summary-cell.test.tsx`
- Refactor target: `apps/iitc-iris/src/comm/comm-panel-controls.tsx` (to replace the raw summary markup at the bottom of the panel).

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
- Refactor target: `apps/iitc-iris/src/shell/request-side-panel-container.tsx` (to replace its header and root structure)

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
  Search, passcode, comm draft, jump input, portals list filter, and marker labels are plain single-line text/search inputs.
- Which controls submit forms, and which are purely live filters?
  Submit forms: search, passcode, comm draft, jump input.
  Live filters/live edit: portals list filter, marker labels.
- Which use controlled `value` versus uncontrolled `defaultValue`?
  Most use controlled `value`. The active Draw Tools editing marker input uses uncontrolled `defaultValue`.
- Which need `onInput`, `onBlur`, `onKeyDown`, `autoFocus`, `aria-label`, `title`, `disabled`, or `rows`?
  `onInput` is needed by almost all. `onKeyDown` by search and marker edit. `onBlur` and `autoFocus` by marker edit. `aria-label` by portal filter and marker inputs. `title` by search and jump. `disabled` by passcode, comm, and marker creation. `rows` is only needed by the import textarea.
- Which classes can be preserved exactly without CSS edits?
  All of them: `.iitc-iris-search-input`, `.iitc-iris-passcode-input`, `.iitc-iris-jump-input`, `.iitc-iris-portals-list-search`, `.iitc-iris-draw-tools-label-input`.
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

Scope: Apply `TextInput` to the remaining single-line text inputs identified in the Checkpoint 7 audit. Since the `TextInput` component has been validated, this checkpoint will refactor multiple panels at once.

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
- Action: Create `Badge` in `apps/iitc-iris/src/ui/badge.tsx` that renders a `<span>` or `<b>` (via `as` prop or just `span` default). It should accept `className` and `style`. `iitc-iris-level-cell` is a `td` and inherently part of a table, so we will not refactor it into a `Badge` to avoid breaking table semantics.

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

### Later Candidates

These require a fresh checkpoint section before implementation:

- broader CSS consolidation.
