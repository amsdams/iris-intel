# IITC-IRIS CSS Refactoring Plan

## Plan Dashboard

Status: Active source of truth for IITC IRIS CSS ownership refactoring.

Current phase: Phase 0, baseline only.

Artifact directory: `docs/iitc-iris/plans/css-refactoring/`.

Review gates:

* Phase 0: agent stops after creating `docs/iitc-iris/plans/css-refactoring/00-baseline.md`.
* Phase 1: human review is required after `01-css-inventory.md` and `02-ownership-map.md`.
* Later phases must not start until the previous phase gate is satisfied.

Supersedes:

* `ui-system-consolidation-plan.md` for future UI/CSS refactor work.
* `css-ownership.md`, which is an exploratory draft and not an approved ownership map.

## Execution Model

This plan is written for a navigator/driver split:

* The navigator/reviewer owns Phase 0 and Phase 1 completion decisions. Phase 0 and Phase 1 require audit judgment,
  selector accounting, and uncertainty handling; do not delegate phase completion to a weaker local driver.
* A local driver may gather evidence, run exact commands, fill exact templates, and later perform mechanical CSS moves
  from an approved manifest.
* A local driver must not decide that a selector is unused, decide final ownership, approve an ownership map, or declare
  a
  phase complete.
* Do not create numbered replacement artifacts such as `00-baseline-1.md` or `00-baseline-2.md` as final deliverables.
  Draft variants may be used during review, but the accepted artifact must be copied into the canonical filename listed
  for the phase.
* If a command was not run, write `NOT VERIFIED`. If a command failed, record `FAIL` with the failure. Never write
  `PASS` from expectation or from a different command.

## Objective

Refactor the current monolithic:

`src/iitc-iris.css`

into CSS organized according to the existing source architecture and ownership.

The goal is **not** to redesign the UI, reduce the number of CSS selectors, aggressively deduplicate CSS, or perform
unrelated cleanup.

The goal is to establish clear CSS ownership:

* application-wide CSS belongs in `src/styles/`
* reusable UI component CSS belongs next to its component
* shared UI CSS belongs in `src/ui/ui.css`
* feature-specific CSS belongs in the feature directory
* `src/iitc-iris.css` becomes the CSS entry point/import manifest

The existing visual appearance and behavior must remain unchanged.

---

# Operating Rules for the Agent

The agent must follow these rules throughout the migration.

## Rule 1 — Evidence before modification

The agent must understand the existing CSS and its usage before moving anything.

Do not infer that a selector is unused merely because one particular search pattern did not find it.

Class usage must account for:

* `className="..."`
* multiple classes in one `className`
* template literals
* conditional expressions
* concatenated strings
* helper functions/constants that construct class names
* dynamically generated class names
* test files
* selectors applied to external/IITC/Leaflet DOM

If usage cannot be established confidently, classify the selector as `UNCERTAIN` rather than `UNUSED`.

## Rule 2 — Do not silently reinterpret ownership

Ownership must be based on the existing source architecture and actual usage.

A selector used by a component does not automatically belong to that component.

For example:

`.iitc-iris-list-item`

may be used by several features. It must remain a shared abstraction if the evidence shows that it is shared.

## Rule 3 — No unrelated cleanup

Do not:

* redesign the UI
* change colors
* change spacing
* change typography
* change responsive behavior
* rename classes
* remove selectors because they appear unused
* merge semantically different selectors
* introduce abstractions solely because declarations are similar
* rewrite unrelated TypeScript
* perform future CSS consolidation

Potential improvements must be recorded in `05-follow-up.md`.

## Rule 4 — Never claim verification that was not performed

If a check cannot be run, record:

`NOT VERIFIED`

and explain why.

Never substitute an assumption for verification.

## Rule 5 — A phase is not complete merely because files were changed

A phase is complete only when:

1. its required work has been performed,
2. its required deliverable exists,
3. every required verification has been performed,
4. the verification results are recorded,
5. all exit criteria are satisfied.

Then the agent must stop at the phase gate.

---

# Persistent Refactoring Artifacts

Create:

```text
docs/iitc-iris/plans/css-refactoring/
├── 00-baseline.md
├── 01-css-inventory.md
├── 02-ownership-map.md
├── 03-migration-log.md
├── 04-verification.md
└── 05-follow-up.md
```

Do not create these all as empty placeholders at the beginning.

Each document is created or updated when its corresponding phase produces meaningful information.

These documents are part of the audit trail for the migration.

---

# PHASE 0 — Inspect Project and Establish Baseline

## Purpose

Understand the existing project before modifying anything.

## Inputs

Inspect:

* complete source tree
* `src/iitc-iris.css`
* all relevant `src/**/*.tsx`
* existing CSS imports
* dynamic class construction
* package scripts
* build configuration
* test configuration
* lint/typecheck configuration
* IITC/Leaflet integration points

## Allowed changes

Only create/update:

```text
docs/iitc-iris/plans/css-refactoring/00-baseline.md
```

Do not modify application source files.

## Required baseline

Record:

* current git commit
* working-tree status
* `src/iitc-iris.css` line count
* selector/rule count
* at-rules such as `@media`, `@keyframes`, `@supports`
* CSS variable count
* current CSS import/loading mechanism
* build command
* typecheck command
* lint command
* test command
* production build command
* results of each available check
* warnings
* known existing failures
* relevant environment limitations

If a command does not exist, record:

`NOT AVAILABLE`

Do not invent a result.

## Driver-safe Phase 0 command list

Run and record the exact command and result for each available check. If a command is intentionally skipped, record
`NOT VERIFIED` and the reason.

Required evidence commands:

```text
git rev-parse HEAD
git status --short
git diff --stat
git diff --check
wc -l apps/iitc-iris/src/iitc-iris.css
rg -n "^@media" apps/iitc-iris/src/iitc-iris.css
rg -n "^@keyframes" apps/iitc-iris/src/iitc-iris.css
rg -n "^@supports" apps/iitc-iris/src/iitc-iris.css
rg -n "^\s*--iitc-iris-[a-z0-9-]+:" apps/iitc-iris/src/iitc-iris.css
rg -n "iitc-iris.css|\.css'|\.css\"" apps/iitc-iris/src apps/iitc-iris -g "*.ts" -g "*.tsx" -g "*.js" -g "*.json"
npm run typecheck:iitc-iris
npm run lint:iitc-iris
npm run test:iitc-iris
npm run lint:css
npm run package:iitc-iris
```

Counting rules:

* `wc -l` records CSS line count.
* At-rule counts must be derived from the matching `rg` output above. Do not estimate.
* CSS variable count must be labeled either as `custom property declaration count` or
  `unique custom property name count`.
  If both are useful, record both.
* Do not call `grep -n "^\." ... | wc -l` a selector/rule count. It is only a count of CSS lines that begin with a dot,
  and it misses grouped selectors, id selectors, nested media selectors, pseudo selectors, and external selectors.
* If selector/rule count cannot be produced reliably in Phase 0, record `NOT VERIFIED` and defer complete selector
  accounting to Phase 1.

Phase 0 table template:

| Check          | Command/method                | Result        | Evidence                         | Status                 |
|----------------|-------------------------------|---------------|----------------------------------|------------------------|
| Current commit | `git rev-parse HEAD`          | `<hash>`      | exact output                     | PASS                   |
| Working tree   | `git status --short`          | `<summary>`   | exact output or summarized lines | PASS                   |
| Diff hygiene   | `git diff --check`            | `<pass/fail>` | exact output                     | PASS/FAIL              |
| Typecheck      | `npm run typecheck:iitc-iris` | `<result>`    | final output summary             | PASS/FAIL/NOT VERIFIED |
| Lint           | `npm run lint:iitc-iris`      | `<result>`    | final output summary             | PASS/FAIL/NOT VERIFIED |
| Tests          | `npm run test:iitc-iris`      | `<result>`    | final output summary             | PASS/FAIL/NOT VERIFIED |
| CSS lint       | `npm run lint:css`            | `<result>`    | final output summary             | PASS/FAIL/NOT VERIFIED |
| Package        | `npm run package:iitc-iris`   | `<result>`    | final output summary             | PASS/FAIL/NOT VERIFIED |

## Verification

Confirm:

* no application files changed
* baseline commands were actually executed
* reported results correspond to the current commit

Run:

```text
git status
git diff
```

## Deliverable

`docs/iitc-iris/plans/css-refactoring/00-baseline.md`

## Exit criteria

All baseline information that can be established has been recorded in the canonical
`docs/iitc-iris/plans/css-refactoring/00-baseline.md`.

The baseline is not complete if:

* any `PASS` row is based on a different command than the command shown;
* the package/production baseline is listed as available but not verified or explicitly marked `NOT VERIFIED`;
* working tree status does not match the current output of `git status --short`;
* `git diff --check` was not run;
* approximate values are recorded where exact command output was available;
* draft variant files exist but the canonical `00-baseline.md` has not been updated.

## HARD STOP

Stop after Phase 0.

Do not begin ownership analysis until the baseline exists.

---

# PHASE 1 — Complete CSS Inventory and Ownership Analysis

## Purpose

Determine where every existing CSS rule belongs before moving anything.

## Allowed changes

Create/update only:

```text
docs/iitc-iris/plans/css-refactoring/01-css-inventory.md
docs/iitc-iris/plans/css-refactoring/02-ownership-map.md
```

Do not modify application CSS or TSX.

## CSS inventory

`01-css-inventory.md` must record:

* total CSS lines
* total rules/selectors
* at-rule counts
* CSS variables
* media queries
* keyframes
* supports rules
* important declarations
* high-specificity selectors
* duplicate/near-duplicate rules
* rules overriding earlier declarations
* global/foundation rules
* IITC/Leaflet/external-DOM rules
* potentially dynamic selectors
* selectors with uncertain usage

## Driver-safe Phase 1 inventory method

Phase 1 must be evidence-first and selector-complete. A weak driver should not freehand this file.

Minimum required workflow:

1. Extract selectors from `apps/iitc-iris/src/iitc-iris.css` with a parser or a documented extraction command.
2. Preserve grouped selectors as individual selector entries while also recording the original group.
3. Record selector source locations using line numbers.
4. For each selector, search exact selector text and likely class-name fragments across:
   `apps/iitc-iris/src/**/*.tsx`, `apps/iitc-iris/src/**/*.ts`, and tests.
5. Record external selectors separately when usage is from Leaflet/IITC/browser DOM rather than TSX.
6. Mark unresolved usage as `UNCERTAIN`; do not mark it `UNUSED` unless the search method and external-DOM check support
   that conclusion.
7. Include a coverage summary proving that every extracted selector has an inventory row.

Required Phase 1 coverage table:

| Metric                          | Count     | Method               | Status |
|---------------------------------|-----------|----------------------|--------|
| CSS source lines                | `<count>` | command              | PASS   |
| Extracted selector entries      | `<count>` | parser/command name  | PASS   |
| Inventory rows                  | `<count>` | table row count      | PASS   |
| Selectors with TS/TSX evidence  | `<count>` | search method        | PASS   |
| External/IITC/Leaflet selectors | `<count>` | manual review/search | PASS   |
| UNCERTAIN selectors             | `<count>` | ownership table      | PASS   |
| Suspected unused selectors      | `<count>` | evidence-backed only | PASS   |

`01-css-inventory.md` must not say "complete inventory" unless `Extracted selector entries` equals `Inventory rows` or
the difference is explained.

## Usage analysis

For each selector, investigate the complete TSX tree.

Search for:

```text
className="selector"
className='selector'
className={`... selector ...`}
"selector"
'selector'
```

and equivalent construction patterns.

Also inspect:

* conditional classes
* template literals
* class-name helper functions
* constants
* arrays joined into class strings
* tests

A selector is **not** considered unused merely because a simple grep did not find it.

## Ownership map

`02-ownership-map.md` must contain at minimum:

| Selector | Current owner | Target | Classification | Reason | Confidence | Evidence |
|----------|---------------|--------|----------------|--------|------------|----------|

Classification must be one of:

```text
GLOBAL
UI_COMPONENT
UI_SHARED
FEATURE
KEEP_TEMPORARILY
UNCERTAIN
```

For component ownership, identify the exact component.

For feature ownership, identify the exact source directory.

For shared ownership, explain why it is genuinely shared.

For uncertain ownership, explain what evidence is missing.

## Verification

Before declaring Phase 1 complete:

* every CSS selector/rule has been accounted for
* every suspected unused selector has evidence
* dynamic class construction has been investigated
* grouped selectors have been considered individually
* external/IITC/Leaflet selectors have been identified
* cross-feature selectors have been identified
* uncertain cases are explicitly marked
* no application files have changed

Run:

```text
git status
git diff
```

The diff must contain no unintended source changes.

## Deliverables

```text
docs/iitc-iris/plans/css-refactoring/01-css-inventory.md
docs/iitc-iris/plans/css-refactoring/02-ownership-map.md
```

## Exit criteria

The ownership map is sufficiently complete to serve as the migration contract.

## HARD STOP — HUMAN REVIEW REQUIRED

The agent must stop here.

Do not create CSS files.

Do not move CSS.

Do not modify imports.

A human/reviewer must approve the ownership map before migration continues.

---

# PHASE 2 — Create Target CSS Structure

## Purpose

Create only the CSS files justified by the approved ownership map.

## Inputs

Use:

* approved `02-ownership-map.md`
* existing source architecture
* original `src/iitc-iris.css`

## Allowed changes

Create target CSS files.

Do not yet perform broad CSS relocation unless required to establish the file structure.

Possible files include:

```text
src/styles/variables.css
src/styles/reset.css
src/styles/globals.css
src/styles/utilities.css

src/ui/ui.css
src/ui/panel.css
src/ui/badge.css
...

src/comm/comm.css
src/draw-tools/draw-tools.css
src/layers/layers.css
...
```

Create only files with actual approved ownership.

Do not create empty placeholders.

Do not create a generic `components/` directory.

## Verification

Check:

* every created file has a documented owner
* no unapproved CSS architecture was introduced
* no unrelated source files changed
* no empty/unnecessary CSS files exist
* source directory structure remains consistent with the ownership plan

Run:

```text
git diff --stat
git diff --check
git status
```

## Deliverable

Update:

```text
docs/iitc-iris/plans/css-refactoring/03-migration-log.md
```

Record:

* files created
* reason for each file
* ownership-map entries represented by each file
* files intentionally not created and why

## Exit criteria

Target structure exists and matches the approved ownership map.

## HARD STOP

Stop and verify before moving to the next phase.

---

# PHASE 3 — Migrate CSS

## Purpose

Relocate CSS according to the approved ownership map without changing behavior.

## Allowed changes

Move/reorganize approved CSS.

Update the entry-point imports as required.

Do not change:

* class names
* declaration values
* selectors
* specificity
* media-query conditions
* pseudo selectors
* state selectors
* animations
* CSS variable semantics
* component behavior

## Cascade preservation

The agent must explicitly analyze whether changing file/import order changes cascade behavior.

If order matters:

1. identify the affected rules,
2. preserve their effective order,
3. document the decision in `03-migration-log.md`.

Do not assume that equivalent-looking rules are safe to reorder.

## `iitc-iris.css`

At the end of migration, it should contain only the required CSS imports, subject to the project's actual loading/build
conventions.

Do not assume a particular import syntax or order without checking the project.

## Required migration log

For each migrated ownership group, record:

| Source | Destination | Selectors/rules | Reason | Cascade risk | Verification |
|--------|-------------|-----------------|--------|--------------|--------------|

Also record anything intentionally left in `iitc-iris.css`.

## Verification after each meaningful migration group

Run appropriate checks before continuing:

* typecheck
* lint
* tests
* production build

Also verify:

* moved selectors exist in their destination
* moved selectors are no longer accidentally present in the old location
* required imports exist
* target CSS files are actually imported
* no CSS file is orphaned
* media queries remain intact
* pseudo/state selectors remain intact
* dynamic classes remain covered
* CSS variables remain defined/available
* cascade-sensitive rules retain required ordering

Run:

```text
git diff --check
git diff --stat
git diff
```

## Exit criteria

All approved CSS has been migrated, or every exception has been documented.

No unexplained source changes remain.

## HARD STOP

Do not continue to finalization until the migration has passed the verification gate.

---

# PHASE 4 — Final Verification

## Purpose

Demonstrate that the migration changed organization/ownership without changing behavior.

## Static verification

Verify:

* typecheck passes
* lint passes, if available
* tests pass, if available
* production build passes
* all expected CSS files are imported
* no migrated selector is missing
* no migrated selector remains accidentally in the old location
* no CSS file is orphaned
* no accidental class renames occurred
* no declarations were unintentionally changed

## CSS-specific verification

Compare before/after where practical:

* selector coverage
* declaration values
* CSS variables
* media queries
* keyframes
* pseudo selectors
* state selectors
* specificity
* cascade order
* IITC selectors
* Leaflet selectors
* dynamically constructed class names

The objective is not merely "build passes."

The objective is:

**same CSS behavior, reorganized ownership.**

## Diff verification

Inspect:

```text
git diff --check
git diff --stat
git diff
```

Explicitly record suspicious changes, even if the build passes.

## Behavioral/visual verification

If the project provides a practical way to run the application:

* load the application
* inspect representative panels/features affected by the migration
* verify representative global UI
* verify responsive behavior
* verify map/Leaflet integration
* verify states such as active/disabled/selected where applicable

If browser/UI verification cannot be performed, record:

`NOT VERIFIED`

and explain why.

Never report visual verification based solely on a successful build.

## Deliverable

Create:

```text
docs/iitc-iris/plans/css-refactoring/04-verification.md
```

It must contain:

| Check                 | Command/method | Result | Evidence | Status                 |
|-----------------------|----------------|--------|----------|------------------------|
| Typecheck             | ...            | ...    | ...      | PASS/FAIL/NOT VERIFIED |
| Lint                  | ...            | ...    | ...      | PASS/FAIL/NOT VERIFIED |
| Tests                 | ...            | ...    | ...      | PASS/FAIL/NOT VERIFIED |
| Production build      | ...            | ...    | ...      | PASS/FAIL/NOT VERIFIED |
| CSS selector coverage | ...            | ...    | ...      | ...                    |
| Import verification   | ...            | ...    | ...      | ...                    |
| Cascade verification  | ...            | ...    | ...      | ...                    |
| Visual verification   | ...            | ...    | ...      | ...                    |

## Exit criteria

The migration may be considered complete only when:

* all mandatory checks pass,
* no unexplained failures remain,
* all unavailable checks are explicitly marked `NOT VERIFIED`,
* all known risks are documented,
* the final diff has been inspected.

---

# PHASE 5 — Follow-up and Stop

## Purpose

Record improvements that deliberately were not performed.

Create:

```text
docs/iitc-iris/plans/css-refactoring/05-follow-up.md
```

Possible entries include:

* shared row abstractions
* shared grid primitives
* spacing tokens
* typography tokens
* border-radius tokens
* control-height tokens
* button base styles
* label/value primitives
* further component extraction
* consolidation opportunities
* questionable legacy selectors
* potential future cleanup

Do not implement these changes.

## Final report

The final report must state:

1. Files created.
2. Files modified.
3. CSS moved into each file.
4. CSS intentionally left in `iitc-iris.css`.
5. Ownership decisions.
6. Uncertain ownership cases.
7. Selectors requiring future review.
8. Verification results.
9. Visual/cascade risks.
10. Existing failures that predated the migration.
11. Follow-up opportunities.

## Final hard stop

After producing the final report, stop.

Do not perform additional cleanup.

---

# Definition of Done

The task is complete only if all of the following are true:

* [ ] baseline exists
* [ ] complete CSS inventory exists
* [ ] ownership map exists
* [ ] ownership map was reviewed/approved
* [ ] target CSS structure matches approved ownership
* [ ] migration log exists
* [ ] CSS migration is complete or every exception is documented
* [ ] imports are verified
* [ ] selectors are verified
* [ ] cascade-sensitive rules are verified
* [ ] typecheck verified
* [ ] lint verified where available
* [ ] tests verified where available
* [ ] production build verified
* [ ] visual verification performed or explicitly marked `NOT VERIFIED`
* [ ] final diff inspected
* [ ] final verification document exists
* [ ] follow-up document exists
* [ ] no unrelated cleanup was performed

**Never mark the migration complete merely because the requested files were changed or because the build passes.**

A phase is complete only when its deliverable exists and its verification/exit criteria are satisfied. If something
cannot be verified, report `NOT VERIFIED` rather than assuming success.
