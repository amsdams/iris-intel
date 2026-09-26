# UI Component Library Extraction Plan

## Status

Planned, not started.

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

## Non-Goals

- No visual redesign.
- No broad UI/CSS/mobile polish.
- No feature work or parity work.
- No behavior changes.
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

Status: planned.

Documentation only. Do not change app code.

Update this plan with:

- the top repeated classes and their usage counts;
- candidate components sorted by lowest risk first;
- the first implementation checkpoint's exact files;
- whether that checkpoint is markup-only or includes CSS consolidation.

Suggested audit commands:

- `rg "iitc-iris-portal-action|iitc-iris-clear-selection|iitc-iris-status|iitc-iris-diagnostics-chip|iitc-iris-map-control-row|iitc-iris-map-controls-section|iitc-iris-segmented" apps/iitc-iris/src -g '*.tsx'`
- `rg "<button|<input|<aside|<label" apps/iitc-iris/src -g '*.tsx'`

Validation:

- Documentation review only.
- `git diff --check`.

### Checkpoint 1: Leaf Button/Status Components

Status: planned, blocked until Checkpoint 0 identifies exact files.

Preferred first implementation slice:

- add `apps/iitc-iris/src/ui/action-button.tsx`;
- add `apps/iitc-iris/src/ui/clear-button.tsx`;
- add `apps/iitc-iris/src/ui/status-text.tsx`;
- add focused component tests if these components contain any conditional logic;
- replace usages in one small, low-risk panel file only.

Do not edit CSS in this checkpoint unless Checkpoint 0 identifies an exact duplicate class consolidation and updates this
section first.

Validation:

- focused component tests and touched panel tests, if any;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- `git diff --check`;
- manual visual check of the one touched panel.

### Checkpoint 2: Chips And Control Rows

Status: planned, blocked until Checkpoint 1 is reviewed.

Candidate components:

- `DiagnosticsChip`;
- `ControlRow`;
- possibly `Section` if repeated heading + body markup is identical in the chosen files.

Exact files must be listed before implementation.

### Checkpoint 3: Segmented Controls

Status: planned, blocked until Checkpoint 2 is reviewed.

Candidate scope:

- COMM tab segmented control first, because it has a focused repeated class pattern.

Exact files must be listed before implementation.

### Later Candidates

These require a fresh checkpoint section before implementation:

- text/input components;
- summary cells/grids;
- badges;
- panel wrappers;
- broader CSS consolidation.
