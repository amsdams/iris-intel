# GPT‑OSS Plan

This file tracks the progress of the ongoing refactor, the current state of
checkpoints defined in the original plan documents, and the next actionable
steps.  It is meant to be human‑readable and to serve as a single source of
truth for the team.

## Project Goals

| Goal | What it means |
|---|---|
| **Build a clean IITC‑IRIS track** | Deliver an IITC‑compatible IRIS app with a modern TypeScript boundary and a Mini‑IRIS‑sized UI shell. |
| **Maintain IITC parity** | Preserve IITC‑CE public concepts, data models, and runtime behavior; divergences must be documented and justified. |
| **Incremental refactor** | Extract UI primitives, reorganise source layout, and polish CSS in a controlled, feature‑by‑feature manner. |
| **Robust testing & validation** | Each change must have focused tests, type‑checks, linting, packaging, and a `git diff --check` pass. |

## Definition of Done

1. Behavioural parity – all new or refactored features pass diagnostics or fixture/live comparisons against IITC‑CE.
2. Tests – new or touched modules have unit tests that cover all public interfaces.
3. Type‑check & lint – `npm run typecheck:iitc-iris` and `npm run lint:iitc-iris` succeed.
4. Packaging – `npm run package:iitc-iris` produces a ZIP/XPI without errors.
5. Code style – `git diff --check` shows no whitespace or formatting issues.
6. Documentation – plan files reflect the work and any intentional divergences.
7. No unintended side‑effects – no new public API changes, storage keys, or UI element names unless explicitly documented.

## Current Status

### Assignment A
* **Done** – `EmptyState` and `ChipButton` components created, tested, and used in:
  * `portal-details-panel.tsx`
  * `comm/comm-panel.tsx`
  * Various side‑panels (`passcode-panel`, `agent-panel`, etc.)

### Source‑layout Extraction Checkpoints
| Checkpoint | Status | Notes |
|---|---|---|
| Layers | **Incomplete** | Still in progress; not yet touched by the latest changes. |
| Map | **Incomplete** | Awaiting next assignment. |
| System | **Incomplete** | Awaiting next assignment. |
| Auth | **Incomplete** | Awaiting next assignment. |
| Side‑Panels | **Complete** | Updated to use `EmptyState` and `ChipButton` where applicable. |
| Shell | **Incomplete** | Awaiting next assignment. |

### Next Assignment
**Assignment B** – Proceed to the next checkpoint in the
[`content‑runtime‑effects‑extraction‑plan.md`](../content-runtime-effects-extraction-plan.md). The next task is to extract the `ActionButton`, `ClearButton`, `StatusText`, `DiagnosticsChip`, `ControlRow`, `Section`, `SegmentedButton`, and `TextInput` components following the “at least three occurrences” rule.

## Next Steps
1. Run the full test & validation suite to confirm that the changes above do not introduce regressions.
2. Commit the changes and mark the relevant checkpoints as **complete** in the original plan documents.
3. Begin work on Assignment B.

---
*Prepared by GPT‑OSS on 2026‑09‑28*

