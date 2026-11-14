# Documentation Compression and Streamlining Plan

Status: reviewed; ready for a future cleanup session (planning only, no compression executed).

Date: 2026-11-14

## Review and next-session handoff — 2026-11-14

- UI 0.6.0 is committed and fast-forward merged into local main at `cd12f8a`. Continue documentation work on
  `docs/documentation-cleanup`. No remote push or archive tag is requested; the user deferred execution to another session.
- Use **`docs/ROADMAP.md`** as the single status/backlog location. Keep release history in CHANGELOG and durable
  behavioral, architecture, setup and testing contracts in their existing guides.
- Reconcile every unresolved task before retiring a plan. In particular, `comm-ui-testing.md` still contains open
  browser-CI, fixture and platform coverage proposals; its implementation is only partly complete. Check current
  workflows/tests and move surviving work to the roadmap before deletion.
- Recheck backlog examples against 0.6.0: configurable panel visibility already exists. Do not promote stale sample
  tasks or old acceptance/pending statements into the new roadmap.
- Preserve porting behavior, known limits and ownership contracts, including supported behavior as well as divergences.
  A reduction percentage or line budget is a target, not a reason to remove unique useful information.
- Use the existing `cd12f8a` commit to retrieve retired documents: `git show cd12f8a:<path>`. No new tag is necessary.
- Update references in SKILL, GEMINI, agent entry points, README, docs and test guides together. Search the whole
  tracked repository for retired paths/anchors and verify replacement links before committing deletions.
- Baseline before this review: 34 Markdown files under `docs/`, 6,037 lines; the roadmap is 809 lines and the UI plan
  is 299 lines. These measurements exclude root/app guides and will change; recalculate the same scope after cleanup.
- First next-session action: reconcile the current handoff/backlog/optional-feature/testing work into the compact
  roadmap. Then retire only documents whose remaining tasks and durable content have been migrated. No application
  tests or artifact builds are required for documentation-only changes; check whitespace and affected links.

This plan outlines the strategy to compress and limit the documentation in IITC IRIS, reducing total documentation volume by ~65–70% while keeping essentials intact: public README, release changelog, architecture guide, and a single source of truth for **what has been done**, **what is in progress**, and **what is todo**.

---

## 1. Context and Problem Statement

The original estimate was **~6,300 lines across 35+ Markdown files**. The reviewed baseline above defines the
current measured scope; refresh it before using the reduction target.

### Key Drivers of Documentation Bloat

1. **Micro-Diary Logging in Long-Running Files**:
   [`plans/index.md`](index.md) has grown to nearly 800 lines because every development session appends extensive diary entries including unit test pass counts, commit hashes, temporary log file paths (`/private/tmp/...`), and ephemeral local IP addresses.
2. **Completed Plans Retained Indefinitely**:
   Several files in `docs/iitc-iris/plans/` describe merged investigations or refactor slices; verify remaining work before retiring them (e.g., [`architecture-maintenance.md`](architecture-maintenance.md) at 745 lines, [`comm-review.md`](comm-review.md), [`dependency-smoke-review.md`](dependency-smoke-review.md)).
3. **Triplicated Task and Status Tracking**:
   Status is currently tracked across three separate places: [`CHANGELOG.md`](../../../CHANGELOG.md), [`plans/index.md`](index.md), and [`backlog.md`](../backlog.md), with partial mentions in individual plan files.
4. **Context Window Overhead**:
   Large documentation sets consume significant LLM context tokens and create risks of contradictory or stale instructions.

---

## 2. Core Principles & Desired End State

1. **Keep Essentials**:
   - [`README.md`](../../../README.md): Project overview, installation, downloads, build/dev commands.
   - [`CHANGELOG.md`](../../../CHANGELOG.md): High-level record of shipped user-facing and developer changes per version (**What Has Been Done**).
   - Single Unified Status / Roadmap (**What Is In Progress** & **What Is Todo**): One authoritative document that tracks active WIP, immediate next steps, and prioritized backlog.
   - [`architecture.md`](../architecture.md): Lasting system boundaries, package contracts, and state-machine ownership.
   - [`SKILL.md`](../../../SKILL.md): Shared developer and agent rules.
2. **Live Work vs. History**:
   - Completed plans, historical benchmarks, and dead research should live in Git history, adhering to the project's stated guideline in [`docs/README.md`](../../README.md): *"Completed plans and obsolete research live in Git history; the roadmap records how to retrieve them."*
3. **Strict Anti-Bloat Policy for Agents**:
   - No unit test pass counts, temporary log paths, or artifact hashes in persistent tracking files.

---

## 3. File Inventory and Proposed Action

| Path | Current LOC | Status | Proposed Action |
|---|---|---|---|
| `docs/iitc-iris/plans/index.md` | 809 | Bloated diary | **Replace** with compact single-page `ROADMAP.md` (~100–150 LOC). |
| `docs/iitc-iris/plans/architecture-maintenance.md` | 745 | Completed | **Archive / Retire** to Git history. Core rules are already in `architecture.md`. |
| `docs/iitc-iris/plans/android-apk-installable-plan.md` | 437 | Completed | **Archive / Retire** to Git history. Essential Android notes live in `apps/android-intel-spike/README.md`. |
| `docs/iitc-iris/backlog.md` | 311 | Redundant | **Consolidate** active items into the unified `ROADMAP.md` Todo section; retire file. |
| `docs/iitc-iris/plans/ui-improvements.md` | 299 | Accepted / merged locally | **Retire** after moving durable UI guidance and any remaining device-verification items. |
| `docs/iitc-iris/plans/optional-features-plan.md` | 155 | Pending | **Fold** candidates into the unified `ROADMAP.md` backlog. |
| `docs/iitc-iris/plans/comm-review.md` | 143 | Completed | **Archive / Retire** to Git history. |
| `docs/iitc-iris/plans/comm-ui-testing.md` | 128 | Partly complete | **Migrate** unresolved work to the roadmap and durable guidance to the browser guide before retiring. |
| `docs/iitc-iris/plans/comm-map-refresh-investigation.md` | 121 | Completed | **Archive / Retire** to Git history. Regressions live in tests. |
| `docs/iitc-iris/plans/arch-review.md` | 103 | Completed | **Archive / Retire** to Git history. |
| `docs/iitc-iris/plans/architecture-current-state-review.md` | 112 | Completed | **Archive / Retire** to Git history. |
| `docs/iitc-iris/plans/dependency-smoke-review.md` | 89 | Completed | **Archive / Retire** to Git history. |
| `docs/iitc-iris/plans/missing-core-features.md` | 75 | Completed | **Archive / Retire** to Git history. Features merged in 0.5.0. |
| `docs/iitc-iris/plans/play-store-readiness.md` | 61 | Paused | **Keep** as a focused checklist or fold into distribution backlog. |
| `docs/iitc-iris/port-plan.md` | 601 | Mixed | **Compress** into a compact parity reference (~150 LOC) preserving supported behavior, intentional divergences and known limits. |
| `docs/iitc-iris/features/*.md` (12 files) | ~1,050 | Mixed | **Condense** into short behavioral notes; prune dated comparison checkpoints. |
| `docs/IITC_CORE_REVIEW_MAY_2026.md` | 65 | Historical | **Archive / Retire** to Git history. |
| `docs/README.md` | 23 | Active | **Update** links to reflect consolidated structure. |
| `README.md` | 148 | Active | **Keep** as primary public repo guide. |
| `CHANGELOG.md` | 53 | Active | **Keep** as primary release history. |
| `SKILL.md` | 52 | Active | **Keep** and enhance with anti-bloat documentation policy. |

---

## 4. Proposed Target Structure

### Single Status Document: `docs/ROADMAP.md`

```markdown
# Project Roadmap & Status

## In Progress
- Branch: `docs/documentation-cleanup`
- Task: consolidate status/backlog, then retire redundant documentation.
- Status: reviewed plan; cleanup has not started.
- Next: reconcile unresolved tasks and durable guidance before deleting source documents.

## Todo
- Populate from the reconciled backlog and active plans, keeping priorities and known limits.
- Preserve unfinished testing/distribution work and distinguish it from completed implementation.

## Release History
See [CHANGELOG.md](../CHANGELOG.md).

```

---

## 5. Phased Execution Steps (When Authorized)

### Phase 1: Create the Unified Roadmap
1. Extract all active tasks from [`backlog.md`](../backlog.md), [`plans/optional-features-plan.md`](optional-features-plan.md), and current handoff from [`plans/index.md`](index.md).
2. Author `docs/ROADMAP.md` following the concise structure above.
3. Update SKILL, GEMINI, agent entry points and README/docs/test-guide references to the consolidated roadmap.
4. Check referenced paths and section anchors across the tracked repository.

### Phase 2: Retire Completed Historical Plans
1. Record the existing baseline commit `cd12f8a`; removed plans remain recoverable via `git show cd12f8a:<path>`. Do not create an archive tag.
2. Confirm each document's unresolved tasks and unique durable content have a destination before deleting it.
3. Delete only reconciled plan files:
   - `docs/iitc-iris/plans/architecture-maintenance.md`
   - `docs/iitc-iris/plans/arch-review.md`
   - `docs/iitc-iris/plans/architecture-current-state-review.md`
   - `docs/iitc-iris/plans/comm-review.md`
   - `docs/iitc-iris/plans/comm-map-refresh-investigation.md`
   - `docs/iitc-iris/plans/comm-ui-testing.md`
   - `docs/iitc-iris/plans/dependency-smoke-review.md`
   - `docs/iitc-iris/plans/missing-core-features.md`
   - `docs/iitc-iris/plans/android-apk-installable-plan.md`
   - `docs/IITC_CORE_REVIEW_MAY_2026.md`
   - `docs/iitc-iris/plans/index.md`
   - `docs/iitc-iris/backlog.md`

### Phase 3: Condense Port & Feature Notes
1. Condense [`port-plan.md`](../port-plan.md) while preserving supported behavior, intentional divergences, known limits and contract references.
2. Review [`docs/iitc-iris/features/`](../features/) to strip dated verification diary entries and retain only interface contracts.

### Phase 4: Cement Agent Documentation Rules
1. Update [`SKILL.md`](../../../SKILL.md) to explicitly forbid appending session logs, test counts, temporary file paths, or build hashes to project documentation.
2. Direct all release-worthy additions to [`CHANGELOG.md`](../../../CHANGELOG.md) under `## Unreleased` and WIP state changes to `docs/ROADMAP.md`.

---

## 6. Expected Outcome

- **Documentation reduction**: Aim for roughly 65–70% less documentation after remeasuring the same scope; preserving unique useful guidance takes priority.
- **Reduced maintenance burden**: Status is updated in exactly one place (`ROADMAP.md`).
- **Preserved history**: Git retains all historical plans and investigation notes without cluttering the active workspace.
