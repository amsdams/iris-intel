# CSS Consolidation Plan: Compact UI Consistency

## Plan Dashboard

Status: Checkpoint 2 complete on 2026-10-04. Ready for Checkpoint 3.

Goal: make the IITC IRIS UI CSS more consistent and smaller by consolidating existing shared UI primitives one family at
a time. The cleanup should delete duplicated declarations where the UI role is truly shared, while preserving feature
classes for domain color, state, layout, and labels.

Next approved slice:

- Checkpoint 3: `DiagnosticsChip` / `ChipButton` consolidation.

Deferred until Checkpoint 3 is reviewed:
- Checkpoint 4: control shell tokens for inputs, selects, buttons, and panel-like boxes.
- Checkpoint 5: safe truncation utility audit and one-feature migration.

Do not start more than one checkpoint at a time. After each checkpoint, update this plan with what was changed, what was
kept local, deleted CSS line count if practical, and any visual/manual findings.

## Current Decision

The original "39 truncation / 45 chip" sweep is the wrong execution unit. Those grep counts include mixed
responsibilities: inputs, selects, panels, buttons, search rows, map badges, diagnostics chips, table cells, portal
slots, and compact metadata. They share some declarations, but they do not all share the same UI role.

The right pattern is:

1. Start from an existing shared primitive or repeated CSS role.
2. Add or strengthen one base class contract.
3. Keep feature-specific classes for domain differences.
4. Delete only declarations now owned by the base class.
5. Stop after one family and validate.

This keeps the UI moving toward consistency without creating a second design system or hiding important IITC-specific
visual meaning.

## Relationship To Other Plans

Primary governing plans:

- [ui-component-library-plan.md](ui-component-library-plan.md): owns shared Preact component decisions. This plan may
  extend existing primitives such as `Badge`, `DiagnosticsChip`, `PlainDiagnosticsChip`, `StatusText`, and `ChipButton`,
  but must not start a broad component extraction.
- [typography-spacing-consistency-plan.md](typography-spacing-consistency-plan.md): owns typography and spacing tokens.
  This plan may add compact UI shape tokens only when a checkpoint proves the values are intentionally shared.
- [index.md](index.md): no broad refactor is active unless a detailed plan names exact scope, files, stop conditions,
  and validation.

This plan must not introduce a second design system beside `apps/iitc-iris/src/ui/`.

## Current IRIS Sources

Primary files:

- `apps/iitc-iris/src/iitc-iris.css`
- `apps/iitc-iris/src/**/*.tsx`
- `apps/iitc-iris/src/ui/badge.tsx`
- `apps/iitc-iris/src/ui/diagnostics-chip.tsx`
- `apps/iitc-iris/src/ui/status-text.tsx`
- `apps/iitc-iris/src/ui/chip-button.tsx`

Reference docs:

- `docs/iitc-iris/plans/ui-component-library-plan.md`
- `docs/iitc-iris/plans/typography-spacing-consistency-plan.md`

## Public Concepts

Preserve all current:

- user-facing labels, titles, and abbreviations;
- `aria-*` labels, roles, status regions, pressed/selected states, disabled states, and button `type`;
- panel ids, sheet ids, side-panel ids, storage keys, message types, and IITC-aligned domain names;
- existing feature CSS class names unless a checkpoint explicitly replaces them with an equivalent shared class contract
  and updates all call sites.

## Slice Pattern

Every checkpoint must follow this pattern.

1. **Choose one family.** Examples: Badge, StatusText, DiagnosticsChip, control shells, truncation.
2. **List exact selectors and TSX call sites.** Do this before editing.
3. **Define the base contract.** Name which declarations the base class owns.
4. **Keep variants small.** Feature classes should own color, state, layout, domain sizing, and exceptional behavior.
5. **Delete duplicate declarations.** Do not move declarations into a base class unless at least two real users share
   them and the computed behavior should remain identical.
6. **Validate.** Run focused tests when component class composition changes, then the standard commands.
7. **Stop and update the plan.** Record completed selectors and explicitly defer the next family.

Standard validation for code-changing checkpoints:

- focused tests for touched shared components or feature components;
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`

Manual/visual validation:

- inspect each touched panel at desktop width;
- inspect mobile/sheet width if the changed class appears in side panels or sheet panels;
- compare before/after screenshots when changing shared compact UI classes.

## Non-Goals

- Do not run a repo-wide utility-class migration.
- Do not convert all rounded bordered elements into chips.
- Do not rename public or feature-specific class names just for tidiness.
- Do not redesign colors, density, radius, or hierarchy.
- Do not extract new Preact components unless `ui-component-library-plan.md` is reopened and updated.
- Do not remove `min-width: 0`, grid/flex sizing, `display`, or alignment rules while extracting truncation.

## Checkpoint 1: Badge Base Class Consolidation

Status: Complete and verified on 2026-10-04.

Goal: make `Badge` the shared owner of true badge shape CSS, then delete duplicated badge declarations from feature
classes.

Files:

- `apps/iitc-iris/src/ui/badge.tsx`
- `apps/iitc-iris/src/ui/badge.test.tsx`
- `apps/iitc-iris/src/iitc-iris.css`
- TSX call sites that render `<Badge>`, currently including portal list team pills, passcode item badges, and Draw
  Tools marker chips.

Candidate base class:

```css
.iitc-iris-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    padding: var(--iitc-iris-chip-padding);
    border-radius: 4px;
    font: var(--iitc-iris-label-font);
    letter-spacing: var(--iitc-iris-letter-meta);
    line-height: var(--iitc-iris-line-tight);
    text-transform: uppercase;
    white-space: nowrap;
}
```

Expected component contract:

- `Badge` always includes `iitc-iris-badge`.
- Caller `className` is appended after the base class.
- `as="span"` and `as="b"` behavior stays unchanged.
- Existing feature classes continue to exist for colors and domain-specific tweaks.

Completed variant classes audited and cleaned:

- `.iitc-iris-team-pill`: Removed duplicated flex layout, padding, and border-radius rules. Preserved min-width, border color, background, and specific font-weight.
- `.iitc-iris-item-badge`: Removed duplicated flex, padding, sizing, and line-height. Kept background, text, and border colors.
- `.iitc-iris-draw-tools-level-chip` / `.iitc-iris-draw-tools-team-chip`: Removed redundant display, padding, border-radius, and nowrap rules. Preserved `text-xs` font size and normal letter spacing since Draw Tools uses a slightly tighter badge style.

Rules:

- move only shared badge-shape declarations into `.iitc-iris-badge`;
- keep team color, level color, border color, background, and text color in feature classes;
- keep layout owned by parent containers, such as `.iitc-iris-draw-tools-marker-chips`;
- do not include diagnostics chips or status labels in this checkpoint;
- do not touch non-`Badge` rounded controls.

Validation:

- focused `Badge` tests must cover default class composition, appended `className`, and `as="b"`;
- run the standard validation commands;
- manually inspect portal list, passcode results, and Draw Tools marker chips.

Stop condition:

- stop after `Badge` users are consolidated. Update this checkpoint with completed selectors and any kept-local reasons
  before starting Checkpoint 2.

## Checkpoint 2: StatusText And Panel-State Labels

Status: Complete and verified on 2026-10-04.

Goal: consolidate repeated compact status-label declarations around `StatusText` while preserving semantic state classes.

Candidate selectors:

- `.iitc-iris-status`
- `.iitc-iris-panel-state`
- `.iitc-iris-warning`
- `.iitc-iris-compare`
- `.iitc-iris-map-control-status`
- feature-specific `StatusText` variants such as `.iitc-iris-agent-name` only if the audit shows they share the same
  compact-label contract.

Likely base contract:

- typography;
- compact padding only where the existing status label is boxed;
- uppercase/letter-spacing only for labels that already use that role;
- no color or state ownership unless already shared.

Rules:

- preserve `is-loading`, `is-ready`, `is-muted`, and `is-warning` state colors;
- keep unboxed text statuses unboxed;
- avoid forcing all `StatusText` usages into one visual shape.

Completed consolidation:

- Upgraded `.iitc-iris-status` base class to establish the default shared `text-sm` font size and `line-compact` height while keeping it unboxed.
- Converted all scattered raw `<span className="iitc-iris-warning">` and `iitc-iris-map-control-status` instances in TSX to use the `<StatusText>` component.
- Removed now-redundant font-size and line-height declarations from `.iitc-iris-map-control-status` and `.iitc-iris-map-controls-section > .iitc-iris-status`.
- Verified `.iitc-iris-warning` and `.iitc-iris-compare` now inherit standard text sizes properly when combined with `<StatusText>`.

Stop condition:

- stop after one status family, preferably panel-state labels or map-control statuses, not all `StatusText` usages.

## Checkpoint 3: DiagnosticsChip And ChipButton

Status: Deferred until Checkpoint 2 is reviewed or skipped with a documented reason.

Goal: centralize diagnostics chip box styling and delete duplicate analysis-chip overrides that repeat the base shape.

Candidate selectors:

- `.iitc-iris-diagnostics-chip`
- `.iitc-iris-diagnostics-chip.iitc-iris-chip-button`
- `.iitc-iris-analysis-chip`
- `.iitc-iris-analysis-chip b`
- `.iitc-iris-analysis-chip small`

Rules:

- keep `DiagnosticsChip` value/label structure unchanged;
- keep `PlainDiagnosticsChip` flexible for inline diagnostic text;
- keep button-specific cursor, hover, and focus behavior in `ChipButton`;
- do not merge this with `Badge`; diagnostics chips have different structure and use.

Stop condition:

- stop after diagnostics chip CSS is consolidated and tests confirm class composition.

## Checkpoint 4: Control Shell Shape Tokens

Status: Deferred.

Goal: reduce repeated border/radius declarations for controls without pretending controls are chips.

Candidate buckets:

- text/select/textarea inputs;
- nav/preset/table/action buttons;
- segmented controls;
- panel or row shells.

Allowed:

- add tokens such as `--iitc-iris-radius-control`, `--iitc-iris-radius-chip`, or `--iitc-iris-border-control` only after
  auditing the candidate bucket;
- replace repeated literals with tokens where computed values stay unchanged.

Not allowed:

- one global rounded-border class for every element;
- changing hover, active, disabled, danger, warning, or team-color states for consistency alone.

Stop condition:

- stop after one bucket, such as inputs/selects/textareas or segmented controls.

## Checkpoint 5: Safe Truncation Utility

Status: Deferred.

Goal: consolidate only mechanical single-line truncation declarations where computed behavior remains unchanged.

Candidate utility shape:

```css
.iitc-iris-text-truncate {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
```

Audit each candidate before editing:

- selector;
- owning TSX file;
- parent layout type (`grid`, `flex`, table, absolute badge, etc.);
- whether `min-width: 0` is required on the same element or an ancestor;
- whether truncation applies to inline text only or to a compound element containing chips/buttons;
- expected screenshot/manual validation target.

Rules:

- apply only to elements that already truncate today;
- preserve local layout, color, font, display, spacing, and state rules;
- keep local selectors when truncation targets descendants, for example search result `span` and `small` rules;
- do not add the utility to table cells or compound rows until manual rendering is checked.

Stop condition:

- stop after one feature area, such as search or map context rows. Do not migrate the full file in one pass.
