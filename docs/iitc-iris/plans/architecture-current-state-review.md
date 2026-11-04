# Current-State Architecture Review — 2026-11-04

Reviewed commit `6a8c9a4` on `refactor/architecture-maintenance`. The working tree was clean; no architecture slices
had been implemented at review time. Follow-up: R1/R2 are now addressed by ARCH-09 and R3 by ARCH-01 in the
[completion log](architecture-maintenance.md#completion-log); R4 remains a testing follow-up. Findings below retain
the reviewed baseline and reproduction evidence. This assessment compares the current code with the
[maintenance plan](architecture-maintenance.md), rather than repeating the original LOC-based review.

## Confirmed Findings

### R1 — P2: Unconfirmed/failed COMM sends can still erase a draft

`comm/comm-runtime.ts:218–249` accepts any parsed HTTP-200 JSON unless `error` is a nonempty string. `sendComm`
then publishes `sendStatus: sent`; `content.tsx:769–774` clears matching draft text on that status.

A browser probe through the real compiled UI/request path returned these three local fixture responses:

| Response | Published send status | Draft after response |
| --- | --- | --- |
| `null` | `sent` | empty |
| `{"result":false}` | `sent` | empty |
| `{"error":{"message":"denied"}}` | `sent` | empty |

The explicit structured-error case demonstrates a failure being treated as success. Null/false responses also show
that lack of a recognized error is being equated with confirmation. The reviewed IITC-CE send callback checks truthy
`response.error`, including structured errors, but is not evidence for an exhaustive success-response schema.

Recommended fix: recognize failure envelopes and define confirmation from supported endpoint evidence. Preserve the
draft for ambiguous responses, with explicit delivery-uncertain feedback and no automatic resend. Do not arbitrarily
declare `{result:true}` the only possible valid acknowledgment without checking the endpoint contract/fixtures.

Plan comparison: ARCH-03 protects draft acknowledgment behavior while moving UI ownership, but transport validation
is explicitly outside its scope. Add a small correctness item before that extraction; moving the current code alone
would preserve this defect.

### R2 — P2: Invalid COMM timestamps pass validation and throw during rendering

`packages/iitc-core/src/comm.ts:176–180` accepts any JavaScript number as a timestamp. `validateIitcCommResponse`
only checks whether that parser returns null. Both the COMM row and portal activity call `Date.toISOString()`.

A local browser response with timestamp `8640000000000001` was accepted and advanced the published continuation
timestamp. Rendering then raised `RangeError: Invalid time value`. This number is finite but outside JavaScript's
valid Date range, so a finite-number check alone would be insufficient.

Recommended fix: reject unsupported timestamps before applying the response, preserving buffers/cursors, and make
date presentation defensive. Cover invalid numeric values and Date-range limits. The probe establishes a rendering
exception, not a claim that the entire application DOM disappears or that live Intel has returned this value.

Plan comparison: this is runtime boundary validation, not the structural type organization covered by ARCH-06.
Include it in the same proposed COMM correctness item as R1.

### R3 — P3: Old copy-feedback timers clear newer feedback

`shell/feedback.ts:11–24` schedules independent clears without cancellation or operation ownership. A direct probe
performed two successful copies using the same status setter, then executed the first scheduled clear:
`second` became an empty status. Clipboard copying itself was not shown to fail.

Plan comparison: ARCH-01 already covers this accurately. Keep its regressions for successive copies, late completion
order, separate feedback areas and cleanup. Timer ownership belongs to the feedback owner, not to a generic global
status shared by all panels.

### R4 — P2 quality gap: Browser acceptance is not enforced by CI

The current `.github/workflows` run workspace/release/native checks and packaging, but do not invoke Playwright.
Local browser coverage is valuable, yet its assertions are not an automatic merge gate. Pure helper tests added
during extraction cannot replace the existing real-browser lifecycle/rendering checks.

Plan comparison: this is already recorded in the [testing follow-up](comm-ui-testing.md). Keep it there as a separate
testing task and make its relationship to architecture acceptance explicit; do not count it as a new renderer split.

## Comparison With ARCH-01–08

| Item | Assessment | Adjustment |
| --- | --- | --- |
| ARCH-01 copy feedback | Confirmed correctness issue; still pending. | Keep. |
| ARCH-02 wrappers | Real delegation duplication; the same file also owns navigation/cancellation ordering. | Remove only forwarding; retain behavior tests at their owner. |
| ARCH-03 COMM UI | Good ownership boundary; drafts, acknowledgments and scroll effects remain in App. | Fix/characterize R1–R2 first, then preserve the corrected behavior during extraction. |
| ARCH-04 portal styles | Good small extraction; map-dependent radius/weight need explicit zoom inputs. | Keep, without expanding into a canvas rewrite. |
| ARCH-05 response adaptation | Useful later; conversion still mutates history and can read the clock. | Keep explicit dependencies and scheduler/cache ownership. |
| ARCH-06 types/messages | Shared portal fields remain duplicated; the bridge remains a broad optional-field envelope. | Type sharing is useful; file organization does not validate runtime JSON. |
| ARCH-07 storage | Repeated I/O handling remains, with real feature migrations/defaults. | Keep narrow, and preserve stored formats/removal semantics. |
| ARCH-08 analysis | Remaining list summarization is a plausible core move; counts/scoreboard aggregation already live there. | Keep limited to domain aggregation. |

The major hotspot sizes are unchanged: renderer 1,644 lines; App entry 1,161; map requests 947; messages 813;
core map-data requests 787. These are inspection signals, not new bug findings or evidence for a rewrite.

Existing canvas owners and the core/app boundary are useful foundations. The plan correctly keeps retained layer
identity, scheduling, generation/cancellation invariants and presentation ownership explicit. Persistent listener refs,
generic diagnostic spreading, an AppShell prop funnel and broad state-machine splitting still lack sufficient benefit.

## Recommended Sequence

1. Add a bounded COMM response/acknowledgment correctness item covering R1–R2, with regressions through the actual
   runtime/UI boundary. Follow-up: the user accepted this addition; it is now ARCH-09 in the maintenance plan.
2. Complete ARCH-01 and the bounded wrapper cleanup in ARCH-02.
3. Extract COMM UI ownership and portal styling as independent structural batches (ARCH-03/04).
4. Continue later items when they provide a concrete maintenance benefit. Keep CI browser enforcement and measured
   long-session retention/render-cost work in their existing testing/COMM follow-ups.

One additional correctness item would take the previous estimate of nine slices to roughly ten; it does not require
reopening the whole architecture plan.

## Evidence And Limits

The review used source inspection, direct copy-feedback probes, and temporary Chrome probes against the existing
verified compiled assets and local Intel fixture server. No live messages were sent. It also tested filtering a
100-message feed down to one while scrolled; no additional COMM history request was observed in that scenario,
so the suspected filter/scroll network coupling is not reported as a finding.

No application code or permanent tests were changed, and no full-suite rerun, package/sign operation, commit or push
was needed. Fixes need permanent regressions; the temporary probes report defects rather than codifying them as
desired behavior. No new performance regression or live Intel failure is claimed.
