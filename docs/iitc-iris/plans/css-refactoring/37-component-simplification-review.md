# IITC IRIS Component Simplification Review

Status: complete. A–C, cleanup, Button, Table, and subsequent organization/UI follow-ups implemented with user acceptance and passing automated checks.

## Next-Session Handoff — 2026-10-20

- The goal remains a simple, manageable CSS/component architecture: explicit ownership, fewer competing defaults and
  variants, native semantics, and small reusable primitives. Shared UI exports: 22; central infrastructure imports: 10.
- The user accepted the Table/segmented/domain batch and subsequent panel organization with “looks good” / “looks better.”
  No separate agent-run browser, keyboard, or narrow-layout audit was performed; these statements record user acceptance.
- Inventory now shows separate rarity/level badges using shared palettes, type-only labels, and neutral item counts.
  Inventory and Passcode explicitly load their common styles from `agent/item-list.css`.
- Panels follow application/menu areas. Panel exports and helper filenames were aligned; panel entry points are explicit.
  Shared map logic lives outside panels in `map/layers/`, `map/search/`, and `map/missions/`. Exact organization changes
  and validation are in the [source layout record](../source-directory-layout-plan.md).
- Markers now filter by saved marker color, with preset/default colors and custom imported hex colors available.
  Filtering is independent of portal ownership; faction sorting and portal metadata chips retain their existing meaning.
  User confirmed the Color filter works on 2026-10-20.
- Latest app checks: 391 tests, lint/typecheck, and Chrome/Firefox packaging pass. CSS lint and workbench build passed
  for the preceding organization batch. The earlier domain-helper move preserved emitted JavaScript and CSS byte-for-byte.
- The [content.tsx composition pass](../index.md#contenttsx-composition-review) is complete as of 2026-10-20: Search,
  Layers, Missions, and location controls own their workflows. App effect order, JSX, bootstrap, and message contracts
  are preserved. The user reported the combined smoke test passed on 2026-10-20; the Search/Display/Missions/location
  smoke scope is recorded in the roadmap. Shared app coordination and COMM remain in the app; scrolling remains deferred. No further
  generic component, folder, or CSS cleanup is queued without a concrete need; keep workbench discovery automatic with
  generic previews. Prefer combined implementation/checks and brief notes over more planning slices.

## Goal And Authority

Keep the CSS and component architecture easy to understand and change: fewer overlapping components and visual
variants, sensible defaults, explicit styling ownership, and simple feature composition.

This document is the current CSS/component architecture reference and completed review record. It carries forward the
accepted loading contract from [plan 36](36-component-css-ownership-plan.md); that document retains the implementation
inventory and validation evidence. Plans 34–36 are completed records. Older consolidation plans remain historical;
their unfinished checklists are not active assignments. [The port plan](../../port-plan.md) still governs IITC behavior
and public domain concepts.

## Architecture Contract

1. **Dependencies point toward shared UI.** Features compose shared primitives. Shared primitives must not import
   feature modules or depend on unrelated feature styles. Shared CSS helpers have explicit consumers and dependencies;
   a feature-specific helper should stay with its feature rather than make `ui/shared` a miscellaneous collection.
2. **Appearance belongs to its owner.** A component imports its appearance, interaction states, and intrinsic responsive
   rules. The caller owns placement, surrounding gaps, and feature layout. Shell coordination and styles for map-generated
   DOM remain application/runtime responsibilities. Every central import needs a concrete infrastructure purpose.
3. **Customization is deliberate.** Use a small, documented set of variants or CSS custom properties for supported
   customization. Feature classes can control composition and domain presentation; avoid reaching into a primitive's
   internal DOM or restating its base skin. Base defaults yield to supported overrides without incidental import order,
   escalating specificity, or routine `!important`. CSS imports alone do not provide selector scoping.
4. **APIs have useful defaults.** Prefer native HTML semantics and attributes, a few meaningful variants, and children
   for content composition. Avoid combinations of flags and feature-named props that serve individual callers. Generic
   UI should not absorb feature state, request lifecycles, or domain decisions.
5. **Share a real contract.** Consolidate when actual callers share purpose, behavior, and styling responsibilities.
   Similar padding or grid declarations alone do not justify a component. Prefer an existing primitive or ordinary HTML
   when that is clearer. Fewer components is a direction, not a numeric target; a universal component with many exceptions
   is not a successful simplification.
6. **Keep tokens small and meaningful.** Reuse established typography, spacing, size, radius, and color roles. Add a token
   when repeated uses have a shared meaning, rather than turning every literal into a variable. Legitimate one-offs and
   domain colors can remain local. Token consolidation must not silently change visual density or hierarchy.
7. **Finish each migration.** Migrate affected callers together and remove replaced components, obsolete selectors,
   unused exports, and unnecessary compatibility wrappers. Verify dynamic classes and runtime-created DOM before deleting
   CSS. Keep markup, CSS, and focused tests together; avoid splitting a readable owner stylesheet into tiny fragments.
8. **Verify the visible contract.** Check affected primitives with theme foundations and explicit dependencies in the
   workbench, then their real feature composition. Preserve labels, semantics, keyboard/focus behavior, disabled/active
   states, and narrow layouts. Structural CSS checks supplement browser inspection.

## Review Scope

This is a review and recommendation pass first. It does not yet authorize component/API or visual changes.

- Inspect `apps/iitc-iris/src/ui/`: all 16 non-test TSX files, their exports, owned CSS, shared helpers, and focused tests.
  File count is a starting inventory, not a component count; some files export several components.
- Trace actual callers across `apps/iitc-iris/src/`, including raw consumers of shared primitive classes. Inspect owning
  feature CSS where it overrides or repeats primitive appearance.
- Start with action/chip/clear/segmented buttons, badge/status/diagnostic treatments, and repeated list/row structures.
  Then check panel/section/control-row/summary composition and form controls for concrete overlap.
- Use `apps/iitc-iris/wb/index.html` and `wb/workbench.ts` as the existing browsing surface. Keep automatic discovery and
  generic previews; a new example catalogue or workbench framework is outside this pass.
- Use `src/iitc-iris.css` and plan 36's inventory to check ownership boundaries. Do not reopen the accepted CSS loading
  migration or change map/runtime behavior as incidental cleanup.

No new IITC behavior is being ported. Request/state ownership, storage keys, panel IDs, hooks/plugins, user-facing domain
names, and runtime lifecycle remain unchanged. If a candidate touches those contracts, record it as a separate task with
the relevant IITC reference files before implementation.

## Review Method And Deliverable

1. Inventory exported components and their real callers; record current defaults, variants, semantics, and CSS dependencies.
2. For each overlapping family, distinguish shared appearance from different behavior, domain meaning, or layout.
3. Produce one compact table in this document: candidate, exact component/CSS/caller paths, keep/merge/simplify decision,
   proposed API or styling contract, concrete complexity removed, retained exceptions, and risk/validation.
4. Recommend a short, ordered set of bounded implementation slices. Each slice must name exact files and callers,
   migration/removal steps, stop conditions, and checks. Keep uncertain candidates as findings rather than inventing APIs.

Judge success by simpler callers, fewer competing defaults and override rules, and less duplicated responsibility.
Record before/after components, variants, and CSS only where useful evidence; do not optimize file or line counts alone.

The review ends with recommendations and proposed slices. Implementation follows selection of those slices; do not use
this general contract as permission for a broad rewrite. Appearance and behavior are preserved by default. Any proposed
visual standardization must describe its visible effect separately.

## Validation And Completion

For this documentation/review pass, verify referenced paths, distinguish inspected evidence from hypotheses, and run
`git diff --check`. No app build is required for documentation-only changes.

For a later code-changing slice, run relevant existing behavior tests, app typecheck/lint, CSS lint, packaging via
`npm run package:iitc-iris`, and `git diff --check`. Add tests for meaningful behavior or semantic risks, not CSS moves
alone. Inspect affected states in the workbench and actual panels at desktop/narrow widths, including keyboard focus;
record the checks performed and any limits. Use plan 36's regression checklist when a change crosses multiple features.

The review is complete when all shared UI exports have been considered, recommendations cite actual callers, and the
selected next slice is concrete and independently reviewable. No component merge or List/ListItem abstraction is
predetermined.

## Progress

- Architecture contract and review scope recorded following user approval.
- Reviewed all 16 non-test UI TSX files, their barrel exports, owned/shared CSS, and 13 focused test files; traced all
  23 exported components to production callers and inspected relevant feature markup and overrides.
- Recommendations and exact proposed slices are below. Recommended first slice: A, action/submit consolidation.
- This was source review and documentation only. No application code, component APIs, styles, or visual variants changed.

## Reviewed Inventory

Source paths in this review are relative to `apps/iitc-iris/src` unless prefixed otherwise. In the first table, a family
means `ui/<family>/<family>.tsx` and its adjacent CSS/tests/barrel; exceptions are explicit. Counts are static JSX opening
sites in production feature TSX, excluding tests and primitive internals, not the number of runtime instances. Loops can
render many instances. All 23 exports have callers; no unused exported component was found.

| Family                               | Exports and JSX sites                                            | Current contract and dependencies                                                                                                                      | Decision                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `action-button`                      | ActionButton 42; SubmitActionButton 2                            | Same button/classes/props/CSS; only fixed native type differs. Team-tinted skin with hover/danger/disabled states.                                     | Merge exports through native `type`; slice A.                                                     |
| `chip-button`                        | ChipButton 1                                                     | Search's clear-overlay action; native button plus explicit diagnostics-chip CSS dependency and chip hover modifier.                                    | Keep compact action; do not turn it into a clickable span or add a universal Button API.          |
| `clear-button`                       | ClearButton 7                                                    | 18px icon-like button with default X; close/clear-selection callers supply title and accessible label.                                                 | Keep distinct sizing/purpose; no action-button variant needed now.                                |
| `segmented-button` / `segmented-row` | SegmentedButton 1; SegmentedRow 1                                | COMM maps three tabs; active class and caller-supplied tab ARIA; row imports the same CSS for a three-column grid.                                     | Keep as a small selection family; do not absorb COMM state or invent generic tab navigation.      |
| `badge`                              | Badge 6                                                          | Inline content, span by default or b; feature item/team/level/CORE skins. Own CSS gives alignment/type/truncation defaults.                            | Keep; feature skins represent different domain information.                                       |
| `diagnostics-chip`                   | DiagnosticsChip 12; PlainDiagnosticsChip 11                      | Identical span shell/CSS. First renders b + small from value/label; second renders children. Title has help cursor; ChipButton consumes the same CSS.  | Merge content forms under DiagnosticsChip; slice C.                                               |
| `status-text`                        | StatusText 87                                                    | Inline span with a default foreground and explicit shared warning CSS; used for ordinary text, warnings, team-colored names, and panel-state classes.  | Keep separate from badges/chips; do not make all status text boxed or uppercase.                  |
| `summary-cell` / `summary-grid`      | SummaryCell 27; SummaryGrid 9                                    | b value + small label in stacked cells; grid defaults to three columns/two narrow. Cell imports base and label CSS; grid imports `summary-layout.css`. | Keep; analysis overrides and raw portal summaries need distinct treatment below.                  |
| `panel`                              | Panel 3; PanelHeader 4; PanelTitle 7; PanelBody 8; PanelFooter 8 | Aside shell plus independently composed header/title/body/footer; shared CSS also supports raw map/system shells and panel-state classes.              | Keep composition; replacing five slots with one large configuration API would complicate callers. |
| `section`                            | Section 25                                                       | Grid/divider wrapper; optional titleHeading renders StatusText, while title remains native tooltip. Own CSS and StatusText dependency.                 | Keep; portal details/summary disclosures have different behavior and remain feature-owned.        |
| `control-row`                        | ControlRow 14                                                    | Wrapping flex row; owns `control-row.css`.                                                                                                             | Keep; summary/segmented grids and feature column layouts differ.                                  |
| `empty-state`                        | EmptyState 13                                                    | Dashed message container; takes element/string children. Own CSS.                                                                                      | Keep; there is no demonstrated need for an expanded prop API or a generic surface wrapper.        |
| `text-input`                         | TextInput 7                                                      | Native text/search input, default text, shared `control.css`; feature classes supply background/padding/height.                                        | Keep; leave native selects and textarea with explicit shared CSS.                                 |
| `layer-choice`                       | LayerCheckbox 1; LayerRadio 1                                    | Same labeled native input structure/styles, checked class, title routing; only input type differs. Both sites are render helpers in LayersPanel.       | Merge exports through required native `type`; slice B.                                            |

The low site counts for segmented/layer controls reflect loops. They do not make those controls unused or justify
replacing their semantic behavior with ordinary action buttons.

## Candidate Decisions And Caller Evidence

| Candidate and exact source/CSS paths                                                                                                                                                                                          | Actual callers                                                                                                                                                                                                                                                                                                                                                                                                                                           | Proposed contract and complexity removed                                                                                                                                                                                | Exceptions, risk, and checks                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Merge:** `ui/action-button/action-button.tsx`, `ui/action-button/action-button.css`                                                                                                                                     | `comm/comm-panel-body/comm-panel-body.tsx`; `side-panels/passcode-panel/passcode-panel.tsx` use SubmitActionButton; other 42 ActionButton sites remain unchanged.                                                                                                                                                                                                                                                                                        | ActionButton accepts native `type` with default button; forms explicitly use submit. Removes one export, duplicated renderer, and separate import choice; no new visual variant.                                        | Low risk if default stays button. Preserve submit handlers, Enter submission, disabled guards, classes and CSS. Focused button tests plus COMM/passcode form smoke.                                                                                                                                                                               |
| **B — Merge:** `ui/layer-choice/layer-choice.tsx`, `ui/layer-choice/layer-choice.css`                                                                                                                                         | `layers/layers-panel.tsx`, `renderBooleanLayerCheckbox` and `renderHighlighterRadio`                                                                                                                                                                                                                                                                                                                                                                     | One LayerChoice with required `type="checkbox"` or `type="radio"`; keep label/native input props. Removes duplicate labeled-input renderer and one export.                                                              | Low risk; preserve radio name, checked state, callbacks, title placement, and accessible labels. Existing layer-choice tests plus real overlay/radio interactions.                                                                                                                                                                                |
| **C — Merge:** `ui/diagnostics-chip/diagnostics-chip.tsx`, `ui/diagnostics-chip/diagnostics-chip.css`                                                                                                                         | Plain form: `comm/comm-panel/comm-panel.tsx`, `missions/missions-panel/missions-panel.tsx`, `portals/portal-details-panel.tsx`, `search/search-panel/search-panel.tsx`, and `side-panels/{agent,inventory,passcode,scores}-panel/{agent,inventory,passcode,scores}-panel.tsx` (matching folder/file names). Structured form: `portal-analysis/portal-counts-panel/portal-counts-panel.tsx`, `portal-analysis/portals-list-panel/portals-list-panel.tsx`. | One DiagnosticsChip supports either children or the existing value/label pair as mutually exclusive typed content forms. Removes PlainDiagnosticsChip and its duplicated shell while preserving concise metric callers. | Low/medium risk: preserve b/small order, zero/empty values, arbitrary children, title and classes. Keep diagnostics CSS independent and ChipButton dependency intact; no Badge/SummaryCell merger.                                                                                                                                                |
| **Keep separate:** `ui/badge/badge.css`, `ui/status-text/status-text.css`, `ui/summary-cell/summary-cell.css`, `ui/diagnostics-chip/diagnostics-chip.css`                                                                     | Badge skins in Draw Tools, portals list, agent, inventory/passcodes; unboxed status throughout system/portal panels; stacked summaries versus inline analysis chips.                                                                                                                                                                                                                                                                                     | Retain distinct information/display roles. No combined Badge/Status/Metric component and no new size/tone matrix.                                                                                                       | Their font, border, alignment, content order, and hover contracts differ. Combining them would preserve exceptions as more props rather than remove complexity.                                                                                                                                                                                   |
| **Defer List/ListItem:** `ui/shared/list-item.css`, `ui/shared/scroll-region.css`; `search/search-panel/search.css`, `comm/comm.css`, `missions/missions.css`, `side-panels/side-panels.css`, `draw-tools/draw-tools.css`     | SearchPanel result rows; CommMessageList; MissionsPanel mission/waypoint buttons; inventory and passcode reward/key rows; DrawToolsPanel link/marker rows.                                                                                                                                                                                                                                                                                               | Keep the existing shared CSS shell with feature-owned markup/layout. Do not add wrappers in this pass.                                                                                                                  | Search rows contain two buttons and preview/focus callbacks; COMM rows contain inline actions; mission/key rows are buttons; Draw Tools rows contain editing and action controls. Scrolling also differs (COMM ref/onScroll, bounded search/Draw Tools, shared scroll region for missions/inventory). A universal row would need many exceptions. |
| **Keep composition:** `ui/panel/panel.tsx`, `ui/section/section.tsx`, `ui/control-row/control-row.tsx`, `ui/segmented-row/segmented-row.tsx` and adjacent CSS (segmented row uses `ui/segmented-button/segmented-button.css`) | `shell/request-side-panel-container.tsx`, SearchPanel, HelpPanel; map/system containers; portal image modal; feature section/control callers.                                                                                                                                                                                                                                                                                                            | Preserve children-based slots and native markup. Avoid configurable universal Panel/Row components or new layout flags.                                                                                                 | Panel's placement defaults are a retained legacy exception to the preferred caller-layout boundary; shell already overrides them. Reworking shell geometry is outside these consolidation slices.                                                                                                                                                 |
| **Keep form base:** `ui/text-input/text-input.tsx`, `ui/shared/control.css`, `ui/shared/compact-input.css`                                                                                                                    | COMM/passcode text inputs, search, system jump input, Draw Tools text/select/textarea, portals-list text/select filters.                                                                                                                                                                                                                                                                                                                                 | Keep shared control foundation and native semantics. No universal Input with textarea/select branches, and no new Select/Textarea wrappers merely to relocate HTML.                                                     | Background, height, padding, and font differ intentionally by caller; any standardization needs a visible before/after proposal.                                                                                                                                                                                                                  |

### Other CSS Findings And Limits

- **Context-dependent action colors:** `ui/action-button/action-button.css` references `--portal-team-soft` and
  `--portal-team-color` without fallbacks. Definitions are supplied by faction classes and portal-side-panel CSS, not
  `styles/tokens.css` or `styles/globals.css`. Non-portal action callers and the generic workbench preview do not always
  supply that context. This is an existing incomplete default, not a loading regression established by this review.
  Inspect computed normal/hover borders in a browser before selecting neutral defaults; adding fallback colors would
  be an intentional visual correction, separate from slice A's behavior-preserving API change.
- **Reset assumptions differ between button families:** `.iitc-iris-button` owns appearance/radius/cursor defaults, but
  ChipButton, SegmentedButton, and raw nav/layer/preset buttons do not emit that class. Their own CSS supplies different
  subsets. Do not attach the action class everywhere: its skin and states are not a generic reset. A common reset or
  focus treatment needs browser comparison, including host-page styles, before a separate visual change is proposed.
- **Summary customization reaches into children:** `portal-analysis/portal-analysis.css` targets summary-cell b/small
  for larger values/uppercase labels; portals-list summary cells also have faction tinting and different narrow sizes.
  Keep this as an explicit existing boundary exception for now. Portal details' four raw cells render labels before
  values and include a health track, unlike SummaryCell. Do not force them through the current value/label API or add
  numerous layout flags. A shared size contract can be revisited if those appearances are deliberately standardized.
- **Small CSS cleanup is possible later:** SummaryCell base and label sheets have the same owner and could become one
  readable sheet after checking label override precedence and raw portal imports. The identical grid declarations in
  `.iitc-iris-panel-topbar` and `.iitc-iris-request-panel-header` can be grouped without adding a component. Neither is a
  prerequisite for the proposed API slices; avoid combining unrelated cleanup with them.
- **Shared helper names still reflect their origins:** compact input uses `.iitc-iris-passcode-input` in COMM as well;
  selection summary uses `.iitc-iris-inventory-selected` in missions as well. Their actual consumers are explicit after
  plan 36. Rename only alongside a concrete owning-contract improvement; spelling changes alone do not reduce complexity.
- **Workbench is a browser, not an exhaustive visual harness:** it eagerly imports every UI module, so it cannot prove
  each component's dependencies in isolation. Its 360px preview changes container width, while CSS media queries still
  use viewport width. It also supplies generic children rather than real state/data combinations. Use an actual narrow
  browser viewport and affected app panels for responsive/focus/state checks; no new explicit example catalogue is needed.
- All UI components currently depend only on Preact, other shared UI, and explicit CSS, rather than feature TS modules.
  This satisfies the dependency direction. It does not prove every existing selector or prop contract is ideal.

## Proposed Implementation Slices

These are recommendations for selection, not implementations made by this review. A → B → C is the suggested order;
each is independently useful and should preserve appearance. Together they would reduce exports **23 → 20**, without
claiming to remove visual variants or requiring further reductions.

### A — One ActionButton With Native Type (Recommended First)

- Change `ui/action-button/action-button.tsx` and `ui/action-button/action-button.test.tsx`; migrate the two submit
  imports/usages in `comm/comm-panel-body/comm-panel-body.tsx` and `side-panels/passcode-panel/passcode-panel.tsx`.
  The existing `ui/action-button/index.ts` wildcard export needs no replacement alias.
- Expose the native button type union (button/submit/reset), default to button, and remove SubmitActionButton. Preserve
  all class names and props. Keep `action-button.css` unchanged, including the existing tint behavior.
- Check default non-submission, explicit submit/reset forwarding, disabled state, and form submission through Enter/click;
  run existing COMM input action tests in `comm/content-comm-input-actions.test.ts` alongside the UI tests and required
  app checks. Smoke COMM send, passcode redeem, and an ordinary portal/Draw Tools action.
- Stop after migration/removal and checks. No other button family, global reset, fallback-color, danger API, or density
  change belongs in this slice. Search for remaining source references; historical documentation need not be rewritten.

### B — One LayerChoice With Explicit Input Type

- Change `ui/layer-choice/layer-choice.tsx` and `ui/layer-choice/layer-choice.test.tsx`; migrate both render helpers in
  `layers/layers-panel.tsx`. Retain the existing wildcard barrel in `ui/layer-choice/index.ts` and existing CSS.
- Export LayerChoice with required checkbox/radio type. Preserve label structure, tooltip on the outer label, native
  input attributes, radio name, checked class, keys, and onChange callbacks. Remove LayerCheckbox/LayerRadio exports.
- Validate checkbox independence and mutually exclusive highlighter radios, title/ARIA forwarding, and checked/unchecked
  rendering. Run existing layer action tests in `layers/content-layer-actions.test.ts`, required app checks, and a
  desktop/narrow Display panel smoke with keyboard operation.
- Stop if the merge needs custom selection state, changes layer registry IDs, or adds a new selection framework.

### C — One DiagnosticsChip With Two Content Forms

- Change `ui/diagnostics-chip/diagnostics-chip.tsx` and `ui/diagnostics-chip/diagnostics-chip.test.tsx`; rename the 11
  PlainDiagnosticsChip sites/imports in these eight files: `comm/comm-panel/comm-panel.tsx`,
  `missions/missions-panel/missions-panel.tsx`, `portals/portal-details-panel.tsx`, `search/search-panel/search-panel.tsx`,
  `side-panels/agent-panel/agent-panel.tsx`, `side-panels/inventory-panel/inventory-panel.tsx`,
  `side-panels/passcode-panel/passcode-panel.tsx`, and `side-panels/scores-panel/scores-panel.tsx`.
- Keep existing value/label callers unchanged. Define a typed union of value+label or children, rather than independent
  optional props or an extra boolean mode. Detect the content form by prop presence, not value truthiness, so zero and
  empty values render correctly. Preserve the span, classes, inner element order, title and event/ARIA forwarding.
- Remove PlainDiagnosticsChip and its props export; keep the wildcard barrel and CSS file. ChipButton's CSS dependency
  must continue to resolve. No Badge, SummaryCell, or feature formatting consolidation belongs here.
- Run diagnostics-chip and ChipButton tests plus required app checks. Smoke counts/list value-label chips, plain/cached
  request footers, subscription messages, and search's clear-overlay chip action, including hover and narrow wrapping.
- Stop if preserving current output requires feature-specific props or a new palette/density variant.

## Review Validation And Handoff

- All 23 shared exports were accounted for by source inspection and static caller searches. Relevant feature selectors,
  raw shared-class consumers, and the existing 13 UI test files were inspected; tests were not executed in this
  documentation-only pass.
- No browser computed-style, screenshot, keyboard, or app smoke checks were performed for this review. The visual
  findings above distinguish source evidence from changes that still need browser confirmation.
- Referenced source/plan paths and component counts checked; `git diff --check`: pass.
- Review complete. Recommended next action is slice A; B and C can follow separately. Defer universal Button, List/ListItem,
  Badge/Status unification, broad token conversion, and visual-default changes until a concrete need selects them.

## Completion

A–C were subsequently implemented together: one ActionButton with native type, one LayerChoice, and one DiagnosticsChip
with either children or value/label. Shared exports reduced 23 → 20; all callers migrated and CSS remained unchanged.
Lint/typecheck, 352 tests, packaging, and workbench build passed. The user reported “smoke test passed,” closing the batch.
The preceding review and proposed slices remain the historical rationale. Future authorized small changes can be batched
with shared validation and brief progress notes, without separate planning turns for each slice.

### Architecture Cleanup Batches — 2026-10-19

- **Styling contracts:** ActionButton has neutral normal/hover border fallbacks outside portal themes. Existing action,
  chip, clear, segmented, navigation, layer, preset, auth, and analysis button owners explicitly load one small shared
  appearance/cursor reset; each family retains its own shape and skin. Native focus remains intact. Disabled chip
  buttons now use the default cursor. These default corrections were included in the combined user acceptance below.
- **Summary and CSS cleanup:** SummaryCell owns value/label typography through five root custom properties; Counts/List
  callers no longer target its nested b/small elements. Merged summary labels and portal-title resets into their owning
  sheets, grouped identical panel headers, removed superseded table-button declarations and five confirmed unused classes
  (diagnostics-row, copy, debug-active, divider, layer-toggle-invert). Shared exports remain 20; central imports remain 10.
- App lint/typecheck, all 352 tests, CSS lint, packaging, workbench build, and `git diff --check` pass. A temporary structural
  cascade comparison preserved generic/counts/faction/raw-portal summary styles at 380/760/761/1200px; this is not browser
  rendering evidence. Packaging still reports its three pre-existing missing-fixture fallbacks.
- Scrolling is explicitly deferred and unchanged. Smoke: Counts/List summaries at desktop/narrow widths; ordinary and
  team-tinted actions, chip/clear/COMM tabs, map navigation, Display/System toggles and auth controls; hover, disabled,
  keyboard focus and activation. No new component framework or further refactor slice is required before that check.

### Shared Button — 2026-10-19

Following user approval, `ui/button` now owns the reset CSS, base class, native attributes, and default non-submitting
button type. ActionButton, ChipButton, ClearButton, and SegmentedButton compose it; 32 feature button sites migrated
without an extra DOM element. Explicit submit buttons remain explicit. Removed the ten reset imports from visual
stylesheets; Button loads its own CSS. Shared exports are now 21, including this infrastructure primitive.
App lint/typecheck, all 360 tests, CSS lint, packaging, workbench build, and `git diff --check` pass. Production CSS
selectors/declarations are unchanged from the preceding cleanup; only the two reset rules moved in import order.
Workbench discovers Button automatically; no example catalogue added.

The user subsequently reported “ok, looks good,” accepting the combined cleanup and Button follow-up. This closes
plan 37; its architecture contract remains guidance for future changes. No additional agent-run browser checks were
performed. Scrolling remains deferred; further cleanup should follow concrete usage findings.

### Shared Table And Remaining Ownership Cleanup — 2026-10-19

User authorized all four recommendations as one batch. Replaced PortalAnalysisTable with `ui/table`: native table props,
children, and separate table/container classes; no feature-named variants. The three analysis callers retain their
column widths, numeric alignment, faction colors, and existing scroll constraints in feature CSS. Shared table skin,
headers, and intrinsic responsive spacing load through Table. Removed the replaced component/tests and obsolete counts
wrapper marker; added focused generic table semantics/forwarding tests. Shared UI exports are now 22.

Grouped SegmentedRow/Button under `ui/segmented-control/` with one stylesheet and entry point. Moved map-context CSS to
`map/` and the portal agent-name helper beside PortalDetailsPanel. Moved Agent, Inventory, Scores, and Passcode into
`domain/domain-panel/`, splitting the old mixed stylesheet by actual consumer; removed `side-panels/`. Runtime side-panel
IDs, navigation/request lifecycle, domain logic, and scrolling remain unchanged.

All 360 tests, app lint/typecheck, CSS lint, packaging, workbench build, and `git diff --check` pass. A temporary structural
cascade comparison passed 172,560 element comparisons across 20 sheets, four widths, and normal/hover/focus states;
all non-table emitted CSS selector/declaration sets are unchanged. This supplements browser inspection; it does not
prove browser rendering. Packaging retains its three pre-existing missing-fixture fallbacks.
The user subsequently reported “looks good,” accepting this batch. The original suggested smoke covered
Counts/List/Scoreboard at desktop/narrow widths, Agent/Inventory/Scores/Passcode presentation/actions, COMM tabs,
Map/Draw Tools context, and portal owner names; no separate agent-run browser audit was performed.
