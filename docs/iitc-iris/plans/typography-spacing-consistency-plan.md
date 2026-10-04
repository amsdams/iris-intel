# IITC IRIS Typography And Spacing Consistency Plan

## Plan Dashboard

Status: Checkpoint 1 complete on 2026-10-04. Checkpoint 1b complete on 2026-10-04.

### Done

- Added a small CSS token layer for repeated font, line-height, spacing, and compact-control values.
- Migrated high-repeat typography and spacing declarations in shell controls, search, portal analysis, map controls, and
  Draw Tools where the computed values should remain unchanged.
- Migrated all remaining literal `10px` / `11px` / inline font-stack declarations to tokens across the full file
  (26 selectors: search, auth, portal, resonators, panel-state, diagnostics, missions, comm, image-preview, shortcut
  grid, scores, core-badge, inventory, sheet-tabs, media-query overrides).
- Added a typography-role reference comment block above the token definitions documenting the intended role of each
  text-size token (`text-xxs` through `text-xl`).

### Intentional one-offs (kept as literals)

- `.iitc-iris-mission-waypoint-marker` — map/SVG marker, `800` weight, domain-specific.
- `.iitc-iris-level-label` / `.iitc-iris-mission-waypoint-label` — `monospace` map SVG labels.

### Todo / Deferred

- Button-family density audit: only if `.iitc-iris-portal-action`, nav, login, table, layer, or preset buttons visibly
  drift.
- List/card density audit: only if search, inventory, missions, Draw Tools, or portal-analysis rows feel inconsistent in
  screenshots or manual use.
- Mobile-specific density fixes: only after APK/mobile visual testing finds concrete issues.

## Current IRIS Sources

Primary file:

- `apps/iitc-iris/src/iitc-iris.css`

Reference files when CSS class usage must be checked:

- `apps/iitc-iris/src/**/*.tsx`
- Existing focused UI/component tests next to touched modules.

## Public Concepts

Preserve all current:

- user-facing labels and concepts;
- CSS class names used by existing components and panels;
- panel, sheet, and side-panel density unless a checkpoint explicitly changes it;
- disabled, active, warning, danger, hover, focus, and selected visual roles.

## Scope

This is a CSS consistency pass, not a redesign.

Allowed:

- introduce semantic CSS custom properties for existing repeated values;
- replace repeated literal font, line-height, gap, and padding values with tokens that compute to the same value;
- document intended typography roles such as body, compact body, meta labels, button text, and metric numbers.

Not allowed:

- changing colors, visual hierarchy, or density for taste alone;
- resizing text globally;
- widening/narrowing panels or tables;
- changing responsive breakpoints;
- extracting more Preact components;
- converting every declaration in the file just because a token exists.

## Checkpoint 1: Token Baseline And High-Repeat Migration

Status: complete; verified on 2026-10-04. Extended (1b) on 2026-10-04.

Goal: make the compact UI scale explicit and reduce repeated hard-coded typography/spacing values without visual intent
changes.

Files:

- `apps/iitc-iris/src/iitc-iris.css`
- `docs/iitc-iris/plans/index.md`
- `docs/iitc-iris/plans/typography-spacing-consistency-plan.md`

Rules:

- Token values must initially match the existing repeated values.
- Migrate only declarations with obvious repeated roles or values.
- Keep map marker labels, SVG labels, and domain-specific one-offs local.

Verified result:

- The root defines font, text-size, line-height, weight, spacing, padding, and letter-spacing tokens.
- Repeated `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` shorthand declarations now use
  `var(--iitc-iris-font-ui)` in all UI controls (no remaining literal font stacks in UI selectors).
- Repeated compact spacing values now use `var(--iitc-iris-space-*)` or padding tokens in the touched areas.
- All literal `10px` / `11px` font-size declarations in UI selectors now use `var(--iitc-iris-text-sm)` /
  `var(--iitc-iris-text-md)` respectively (26 selectors migrated in 1b).
- A typography-role reference comment above the token block documents the intended role of each text-size token.
- Remaining literals are intentional domain-specific one-offs: `.iitc-iris-mission-waypoint-marker` (SVG map marker),
  `.iitc-iris-level-label` and `.iitc-iris-mission-waypoint-label` (monospace map SVG labels).

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`

## Future Checkpoints

### Checkpoint 2: Button-Family Density Audit

Trigger: repeated button families visibly drift or button CSS maintenance becomes painful.

Candidate classes:

- `.iitc-iris-portal-action`
- `.iitc-iris-table-action`
- `.iitc-iris-nav-button`
- `.iitc-iris-login`
- `.iitc-iris-layer-toggle`
- preset/scenario buttons

### Checkpoint 3: List/Card Density Audit

Trigger: screenshots or manual use show inconsistent row/card density in comparable panels.

Candidate areas:

- search results;
- portal-analysis summaries and tables;
- Draw Tools lists;
- inventory/passcode rows;
- missions rows.

### Checkpoint 4: Mobile Density Fixes

Trigger: APK/mobile testing identifies cramped, clipped, or hard-to-tap text/controls.

Rules:

- Fix concrete mobile findings directly.
- Do not reopen broad token work unless multiple panels need the same value change.
