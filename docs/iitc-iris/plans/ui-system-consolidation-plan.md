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

Status: Ready.

Goal: make this file the only active UI-system plan.

Files:

- `docs/iitc-iris/plans/index.md`
- `docs/iitc-iris/plans/ui-component-library-plan.md`
- `docs/iitc-iris/plans/css-consolidation-plan.md`
- `docs/iitc-iris/plans/typography-spacing-consistency-plan.md`

Required result:

- roadmap lists this plan as the active UI-system plan;
- old plans state they are historical and superseded by this plan;
- old plans do not advertise active or next checkpoints.

Validation:

- `git diff --check`

## Assignment 1: Button System Consolidation

Status: Next implementation assignment after Assignment 0.

Why this is first: buttons are highly visible and currently split across several local classes. Consolidating them should
improve consistency and delete more CSS than selector grouping did.

Primary files:

- `apps/iitc-iris/src/ui/action-button.tsx`
- `apps/iitc-iris/src/ui/action-button.test.tsx`
- `apps/iitc-iris/src/ui/segmented-button.tsx`
- `apps/iitc-iris/src/ui/chip-button.tsx`
- `apps/iitc-iris/src/iitc-iris.css`
- call sites using button classes listed below.

Candidate CSS families:

- `.iitc-iris-portal-action`
- `.iitc-iris-table-action`
- `.iitc-iris-preset`
- `.iitc-iris-login`
- `.iitc-iris-nav-button`
- `.iitc-iris-layer-toggle`
- `.iitc-iris-segmented-button`
- `.iitc-iris-diagnostics-chip.iitc-iris-chip-button`

Target shape:

- introduce one base button class, for example `.iitc-iris-button`;
- make `ActionButton` render the base class plus its existing compatibility class if needed;
- keep semantic variants as modifiers: action, table, nav, preset, login, toggle, danger, active, wide;
- move shared button declarations into the base class;
- delete duplicate declarations from variants.

Base button CSS may own:

- `appearance: none`;
- `box-sizing`;
- base border radius;
- base font;
- base cursor and disabled cursor;
- base transition/focus style if existing behavior supports it.

Variant CSS must keep:

- dimensions such as nav button square sizes;
- colors/backgrounds/borders for danger, active, login, layer toggle, table action, and nav;
- grid/flex placement and feature-specific width.

Rules:

- Preserve `type="button"` / `type="submit"` behavior.
- Preserve disabled behavior and visual states.
- Do not force toggles, nav buttons, and table actions to have identical size.
- Do not change user-facing text.
- Keep compatibility class names until every call site and CSS rule is audited.

Stop condition:

- stop after button CSS is consolidated once.
- update this assignment with completed selectors, deleted declarations, and kept-local variants.

## Assignment 2: Form Controls As A Real Family

Status: Deferred until Assignment 1 is reviewed.

Goal: make text inputs, selects, and textareas look like one control family with fewer feature overrides.

Primary files:

- `apps/iitc-iris/src/ui/text-input.tsx`
- optional new `SelectInput` / `TextareaInput` only if they remove repeated class composition or behavior;
- `apps/iitc-iris/src/iitc-iris.css`
- portal-list filters, Draw Tools filters/import, system jump/view inputs, passcode inputs.

Target shape:

- `.iitc-iris-control` or equivalent base class owns border, radius, color, font, disabled state, box sizing;
- `TextInput`, select, and textarea use that base contract;
- feature classes own width, height, background, and layout only.

Rules:

- Prefer CSS class consolidation before adding `SelectInput` or `TextareaInput`.
- Add components only when they reduce call-site repetition or preserve behavior such as labels/ARIA/default props.
- Do not change field labels, placeholders, form submit behavior, or keyboard behavior.

## Assignment 3: Row/List Item Family

Status: Deferred until Assignment 2 is reviewed.

Goal: reduce repeated list-row CSS and improve consistent density across panels.

Candidate areas:

- search result rows;
- inventory rows;
- missions rows/waypoints;
- Draw Tools list items;
- portal-analysis summary/list rows.

Target shape:

- one shared row/list item base class for repeated border, radius, padding, font, hover, and truncation behavior;
- feature classes keep grid columns, icons, team colors, active state meaning, and domain actions.

Rules:

- Do not extract domain row components first. Start CSS-first.
- Only add a `ListItem`/`DataRow` component after at least three call sites share markup and behavior.
- Do not flatten rows that have different accessibility roles: buttons, table rows, and passive spans are not the same
  element.

## Assignment 4: Compact Metadata Family

Status: Deferred until Assignment 3 is reviewed.

Goal: finish compact display consistency around `Badge`, `StatusText`, `DiagnosticsChip`, and `SummaryCell`.

Candidate work:

- remove any remaining local chip/status CSS that only restates base primitive shape;
- decide whether `.iitc-iris-text-truncate` should be real and used, or removed;
- unify summary metric cells only when they share structure and visual role.

Rules:

- Do not merge `Badge` and `DiagnosticsChip`; their markup and use are different.
- Do not introduce utility classes unless they are used by TSX or delete substantial CSS.
- Keep team/level/warning colors local.

## Done Criteria

Stop UI-system consolidation when:

- buttons, form controls, row/list items, and compact metadata each have clear base contracts;
- feature CSS mostly owns layout and domain colors rather than repeated primitive shape;
- the total CSS line count is lower than before the assignment series;
- no active plan is competing with this file.

Do not continue polishing after the done criteria just because repeated literals remain. Some local CSS is the right
answer for domain-specific UI.
