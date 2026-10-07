# IITC-IRIS CSS Refactoring

## Driver + Independent NAV Verification Plan

### 1. Purpose

Refactor the monolithic `src/iitc-iris.css` into ownership-based CSS without changing UI design or behavior.

The existing CSS refactoring plan remains the source of truth for:

* ownership categories,
* target CSS structure,
* migration constraints,
* cascade/order preservation,
* verification requirements,
* and the separation of refactoring from future CSS cleanup.

The important addition in this version is the **two-agent verification model**:

* **Driver = Qwen local**: performs repository research, implementation, testing, and produces evidence.
* **NAV = GPT remote**: independently researches/verifies the Driver's conclusions and challenges them.
* **Human = final authority**: resolves material disagreements and approves phase gates.

NAV must not simply read Qwen's conclusions and decide whether they "look reasonable."

For important findings, NAV must independently investigate the repository and compare its findings with Qwen's.

---

# 2. Operating Model

For every substantial phase:

```text
                 PHASE QUESTION
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
       QWEN / DRIVER       GPT / NAV
       independent          independent
       investigation       investigation
             │                   │
             ▼                   ▼
        Driver report         NAV report
             │                   │
             └─────────┬─────────┘
                       ▼
                  COMPARISON
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          AGREEMENT           CONFLICT
             │                   │
             ▼                   ▼
         phase gate       resolve/research
```

The Driver must never treat NAV approval as a substitute for evidence.

NAV must never treat Driver output as authoritative evidence.

---

# 3. Core Rules

## 3.1 Evidence before modification

Before changing source files, determine what currently exists and record the evidence.

Do not infer ownership merely from filenames or visual similarity.

## 3.2 Independent verification

When NAV verifies research:

1. NAV receives the original task/specification.
2. NAV receives the Driver's research/report.
3. NAV independently investigates the relevant repository evidence.
4. NAV records its own conclusion.
5. Only then does NAV compare its conclusion with the Driver's.

NAV must explicitly distinguish:

* **AGREE**
* **DISAGREE**
* **PARTIAL**
* **UNVERIFIED**

## 3.3 Try to falsify, not confirm

NAV's objective is not:

> "Does Qwen's answer look correct?"

It is:

> "Can I find evidence that Qwen's answer is wrong, incomplete, or insufficiently supported?"

This is especially important for:

* "unused" selectors,
* dynamic class names,
* template literals,
* conditional class construction,
* selectors used only in tests,
* selectors interacting with external/IITC/Leaflet markup,
* cascade-sensitive rules,
* uncertain ownership.

The background analysis demonstrated why this matters: earlier selector-usage analysis missed actual usages such as `.iitc-iris-agent-card`, `.iitc-iris-agent-row`, `.iitc-iris-comm-row`, and others because simplistic searches were insufficient.

## 3.4 No silent scope expansion

Neither Driver nor NAV may turn this refactor into:

* visual redesign,
* selector renaming,
* CSS cleanup,
* specificity reduction,
* deduplication,
* formatting overhaul,
* dead-code removal,
* architecture redesign,
* or other future optimization.

The original plan explicitly separates future consolidation/cleanup from this refactor.

## 3.5 Uncertainty is a valid result

If evidence is insufficient:

> mark `UNCERTAIN` / `NOT VERIFIED`

Do not guess.

This is a hard requirement.

---

# 4. Persistent Artifacts

Create and maintain these artifacts:

```text
docs/iitc-iris/plans/css-refactoring/
├── 00-baseline.md
├── 01-css-inventory.md
├── 02-ownership-map.md
├── 03-migration-log.md
├── 04-verification.md
└── 05-follow-up.md
```

These artifacts are the project's audit trail.

The exact filenames are an explicit operationalization of the earlier plan's proposed artifacts.

---

# 5. Phase 0 — Baseline

## Driver objective

Establish the exact starting state before any CSS refactoring.

### Driver may

* inspect repository structure;
* inspect `src/iitc-iris.css`;
* inspect TS/TSX usage;
* inspect CSS import/loading/build configuration;
* inspect package scripts;
* inspect existing tests;
* inspect dynamic class construction;
* run read-only commands;
* run baseline verification commands.

### Driver must not

* modify source files;
* move CSS;
* create target CSS files;
* change imports.

### Driver deliverable

Create:

```text
docs/iitc-iris/plans/css-refactoring/00-baseline.md
```

Record at minimum:

* current git commit;
* working-tree status;
* `src/iitc-iris.css` size;
* line count;
* CSS rule count;
* at-rule count;
* CSS variable count;
* important declarations;
* import/loading mechanism;
* relevant package scripts;
* baseline typecheck;
* baseline lint;
* baseline tests;
* baseline production build;
* warnings/errors;
* anything that is already failing before the refactor.

Do not assume a command exists. Use the repository's actual scripts.

### Driver verification

Confirm:

* only `00-baseline.md` was created;
* no source files changed;
* baseline commands were actually executed;
* failures are recorded rather than hidden.

---

# 6. Phase 0 — NAV Independent Verification

NAV receives:

* original refactor requirements;
* `00-baseline.md`;
* repository state/evidence available to NAV.

NAV independently verifies the important baseline facts.

NAV should independently check:

* current entrypoint structure;
* actual CSS loading mechanism;
* relevant package scripts;
* baseline health;
* whether Driver's counts appear plausible;
* whether any important baseline condition was omitted.

NAV must not merely say:

> "The baseline looks good."

It should report:

```text
BASELINE VERIFICATION

Finding:
Evidence:
Driver result:
NAV result:
Status: AGREE / DISAGREE / PARTIAL / UNVERIFIED
```

### Phase 0 gate

Proceed only when:

* baseline artifact exists;
* Driver verification passed;
* NAV verification has no unresolved material disagreement;
* or the human has explicitly resolved the disagreement.

Then stop.

---

# 7. Phase 1 — CSS Inventory and Ownership Research

This is the most important research phase.

## Driver objective

Build a complete inventory and ownership map without modifying the CSS architecture.

### Driver deliverables

Create:

```text
docs/iitc-iris/plans/css-refactoring/01-css-inventory.md
docs/iitc-iris/plans/css-refactoring/02-ownership-map.md
```

### Inventory must account for

* every CSS rule;
* every selector;
* grouped selectors;
* at-rules;
* media queries;
* keyframes;
* CSS variables;
* `!important`;
* pseudo-elements;
* pseudo-classes;
* state selectors;
* duplicate selectors;
* overrides;
* specificity-sensitive rules;
* external/IITC/Leaflet selectors;
* dynamically generated selectors where applicable.

### Usage research must include

Do not rely on a single grep pattern.

Search for:

* ordinary string literals;
* JSX `className`;
* template literals;
* conditional classes;
* arrays joined into class names;
* helper functions;
* dynamic expressions;
* tests;
* generated markup where relevant;
* partial class names where the full selector is assembled dynamically.

The background ownership investigation provides concrete evidence that simplistic searches can produce false "unused" conclusions.

### Ownership map

Every selector/rule must receive:

| Field                  | Required      |
| ---------------------- | ------------- |
| Selector               | yes           |
| Current location       | yes           |
| Target owner/file      | yes           |
| Classification         | yes           |
| Reason                 | yes           |
| Confidence             | yes           |
| Usage evidence         | yes           |
| Cascade/order concerns | if applicable |
| Uncertainty            | if applicable |

Use the established ownership categories:

* `GLOBAL`
* `UI_COMPONENT`
* `UI_SHARED`
* `FEATURE`
* `KEEP_TEMPORARILY`
* `UNCERTAIN`

These categories are part of the original plan.

### Driver hard rule

If ownership cannot be established confidently:

```text
UNCERTAIN
```

Do not invent an owner.

---

# 8. Phase 1 — NAV Independent Research

This is **not a passive review**.

NAV must independently investigate the ownership questions.

### NAV procedure

For each high-risk or uncertain classification:

1. Read the original ownership requirement.
2. Independently search the repository.
3. Inspect relevant TS/TSX/tests.
4. Search dynamic/template usage.
5. Inspect surrounding CSS when cascade matters.
6. Determine NAV's own ownership conclusion.
7. Compare it with Qwen's conclusion.

### Mandatory independent verification categories

NAV must independently verify:

* every selector classified as unused;
* every `UNCERTAIN` selector;
* dynamic/template selectors;
* selectors appearing in multiple feature areas;
* external/IITC/Leaflet selectors;
* selectors with potentially important cascade/order dependencies;
* selectors whose target ownership is not obvious from the component structure.

For low-risk obvious selectors, NAV may sample rather than reproduce every search.

### NAV report

Add an explicit section to `02-ownership-map.md` or a clearly linked NAV review artifact containing:

```text
NAV INDEPENDENT VERIFICATION

Selector:
Driver classification:
NAV classification:
Independent evidence:
Agreement:
Conflict:
Required action:
```

Do not overwrite the Driver's original reasoning.

---

# 9. Phase 1 Conflict Resolution

If Driver and NAV disagree:

```text
DRIVER: UI_COMPONENT
NAV: FEATURE
```

do not silently choose one.

Record:

* both conclusions;
* evidence supporting each;
* exact reason for disagreement;
* final decision;
* who made the final decision.

Possible outcomes:

```text
DRIVER + NAV AGREE
DRIVER CORRECTED BY NAV
NAV CORRECTED BY DRIVER
HUMAN DECISION REQUIRED
UNRESOLVED / KEEP UNCERTAIN
```

### Phase 1 gate

Do not proceed until:

* inventory is complete;
* ownership map exists;
* high-risk findings have independent NAV verification;
* material disagreements are resolved;
* uncertain items are explicitly documented;
* no source CSS has been migrated.

**Human approval is required before migration begins.**

---

# 10. Phase 2 — Create Target Structure

Only after ownership approval.

## Driver

Create the target CSS files/directories required by the approved ownership map.

The entrypoint will ultimately become an import manifest rather than the monolithic stylesheet. The original plan requires the actual project/build conventions to be respected rather than assuming an import order.

Driver must:

* create only justified files;
* use the approved ownership map;
* avoid moving rules yet unless explicitly required for structure;
* avoid unrelated cleanup.

Update:

```text
docs/iitc-iris/plans/css-refactoring/03-migration-log.md
```

with the planned migration groups.

### NAV

NAV independently checks:

* whether each target file is justified by ownership;
* whether any target file is unnecessary;
* whether any ownership category was silently changed;
* whether architecture has expanded beyond the approved plan.

NAV does not redesign the architecture.

### Gate

Resolve disagreements, verify structure, then stop.

---

# 11. Phase 3 — CSS Migration

Now perform the actual relocation.

## Driver's primary rule

**Relocation, not rewriting.**

Preserve:

* selectors;
* values;
* declaration order;
* rule order;
* specificity;
* media queries;
* pseudo-selectors;
* state selectors;
* animations;
* CSS variables;
* `!important`;
* IITC/browser integration behavior.

These preservation requirements come directly from the original migration specification.

### Driver migration log

For each migration group record:

```text
Source:
Destination:
Selectors moved:
Rules moved:
Rules intentionally left:
Reason:
Potential cascade risk:
Verification:
```

### After each meaningful migration group

Run appropriate static checks and inspect the diff.

Do not wait until every CSS rule has moved before discovering a structural mistake.

---

# 12. Phase 3 — NAV Independent Verification

NAV should not merely review the final diff.

For important migration groups, NAV independently checks:

* source selector existed;
* destination selector exists;
* selector was not accidentally changed;
* rule wasn't duplicated;
* rule wasn't lost;
* relative ordering remains correct where relevant;
* media/pseudo/state rules remain attached;
* variables/keyframes remain available;
* component/feature ownership matches the approved map.

For cascade-sensitive migrations, NAV should inspect the surrounding rules and import order independently.

### NAV objective

Try to find:

```text
MISSING RULE
DUPLICATED RULE
CHANGED SELECTOR
CHANGED VALUE
CHANGED ORDER
BROKEN IMPORT
WRONG OWNER
LOST MEDIA QUERY
LOST STATE RULE
BROKEN VARIABLE/KEYFRAME DEPENDENCY
```

rather than merely confirming that files "look clean."

---

# 13. Phase 4 — Final Verification

The original plan requires typecheck, lint, tests, production build, diff review, selector coverage, import/order checks, and failure resolution.

## Driver runs

At minimum, using actual repository commands:

* typecheck;
* lint;
* tests;
* production build;
* `git diff --check`;
* CSS-specific verification;
* import verification;
* selector coverage verification;
* ordering/cascade verification.

### CSS-specific checks

Verify:

1. expected selectors exist;
2. moved selectors appear exactly once where expected;
3. moved selectors no longer remain in the old location;
4. no target CSS file is orphaned;
5. all target files are imported;
6. media queries remain intact;
7. pseudo/state selectors remain intact;
8. keyframes remain available;
9. variables remain available;
10. dynamic classes remain represented;
11. no unintended CSS was changed.

Record everything in:

```text
docs/iitc-iris/plans/css-refactoring/04-verification.md
```

Use:

| Check             | Command/evidence | Result | Status    |
| ----------------- | ---------------- | ------ | --------- |
| Typecheck         | ...              | ...    | PASS/FAIL |
| Lint              | ...              | ...    | PASS/FAIL |
| Tests             | ...              | ...    | PASS/FAIL |
| Build             | ...              | ...    | PASS/FAIL |
| Selector coverage | ...              | ...    | PASS/FAIL |
| Imports           | ...              | ...    | PASS/FAIL |
| Cascade/order     | ...              | ...    | PASS/FAIL |
| Diff check        | ...              | ...    | PASS/FAIL |

Never mark something `PASS` if it was not actually checked.

Use:

```text
NOT VERIFIED
```

when evidence is unavailable.

---

# 14. Phase 4 — NAV Final Independent Audit

NAV performs an independent audit of the finished result.

This should combine:

### A. Research verification

Did the implementation follow the approved ownership model?

### B. Diff verification

Does the actual diff correspond to the approved migration?

### C. Repository verification

Are there missed selectors/usages?

### D. Build/verification verification

Are Qwen's claimed checks supported by actual evidence?

### E. Risk analysis

Could CSS cascade/order/import behavior have changed?

NAV should specifically challenge:

> "What could Qwen have missed?"

rather than simply summarize Qwen's report.

### Final NAV result

```text
FINAL NAV RESULT

STATUS: PASS / PASS WITH WARNINGS / FAIL

Independent findings:
...

Driver findings confirmed:
...

Driver findings rejected:
...

Unverified claims:
...

Required corrections:
...
```

---

# 15. Phase 5 — Corrections

If NAV finds a real issue:

1. NAV reports the exact issue and evidence.
2. Driver fixes only the identified issue.
3. Driver reruns affected verification.
4. NAV independently checks the correction.
5. Repeat until the phase gate passes.

Do not reopen unrelated architecture decisions.

---

# 16. Phase 6 — Final Report

Create:

```text
docs/iitc-iris/plans/css-refactoring/05-follow-up.md
```

The final report must include:

### Completed

* files created;
* CSS moved into each file;
* CSS intentionally left in entrypoint;
* ownership decisions;
* verification performed.

### Driver verification

* typecheck;
* lint;
* tests;
* build;
* CSS checks.

### NAV verification

* independent research performed;
* disagreements found;
* disagreements resolved;
* remaining uncertainties.

### Risks

* visual/cascade risks;
* areas not independently verified;
* known limitations.

### Future work

Potential:

* selector consolidation;
* dead CSS cleanup;
* duplication reduction;
* specificity improvements;
* naming cleanup.

These must remain **future work**, not part of this refactor.

---

# 17. Definition of Done

The refactor is complete only when all of the following are true:

* [ ] Baseline recorded.
* [ ] CSS inventory complete.
* [ ] Ownership map complete.
* [ ] Dynamic selector usage investigated.
* [ ] High-risk ownership decisions independently verified by NAV.
* [ ] Material Driver/NAV disagreements resolved.
* [ ] Human approval obtained before migration.
* [ ] Target structure matches approved ownership.
* [ ] CSS moved without unintended rewriting.
* [ ] Selector/value/order/specificity preservation checked.
* [ ] Imports verified.
* [ ] No moved selector accidentally remains in its old location.
* [ ] No expected selector disappeared.
* [ ] Typecheck passes.
* [ ] Lint passes.
* [ ] Tests pass.
* [ ] Production build passes.
* [ ] Diff checked.
* [ ] NAV independently audits final result.
* [ ] All unresolved uncertainty is explicitly documented.
* [ ] No future cleanup was silently included.

**Never declare completion merely because the files were changed.**

A phase is complete only when:

```text
DELIVERABLE EXISTS
        +
DRIVER VERIFICATION PASSED
        +
INDEPENDENT NAV VERIFICATION PASSED
        +
REQUIRED HUMAN GATE PASSED
```

If a required check cannot be performed:

```text
NOT VERIFIED
```

not:

```text
PASS
```

---

# 18. Recommended Agent Roles

## Qwen / Driver

Prompt concept:

> You are the implementation driver. Investigate the repository thoroughly, perform the requested work, produce explicit evidence, and never guess when evidence is unavailable. Your output will be independently audited by another agent. Make your research reproducible.

## GPT / NAV

Prompt concept:

> You are an independent adversarial verifier. Do not assume the Driver's conclusions are correct. Independently investigate the repository and relevant evidence before comparing your findings with the Driver's. Try to falsify the Driver's conclusions, especially high-risk and uncertain claims. Report concrete evidence for disagreements. Do not perform unrelated implementation or redesign.

## Human

Resolve:

* material ownership disagreements;
* unresolved uncertainty;
* architecture questions;
* scope changes;
* final phase approval.

---

# 19. The Key Difference From the Previous Plan

The previous plan effectively had:

```text
Qwen → research/implement → GPT reviews
```

This version has:

```text
              ┌→ Qwen research ─────┐
TASK ─────────┤                      ├→ comparison → gate
              └→ NAV research ──────┘
```

The NAV therefore provides **independent evidence**, not just a second opinion based on Qwen's evidence.

That is the reason to spend GPT credits on the NAV at all.

The goal is not to minimize GPT usage to zero.

The goal is to use **local Qwen compute for the large volume of repository work**, while spending GPT capacity on the parts where an independent second reasoning path materially reduces the chance of a bad refactor.
