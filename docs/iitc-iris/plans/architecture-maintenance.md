# Architecture Maintenance Plan

Status: planned, implementation not started. Created 2026-11-04 at the user's request.

This is the implementation tracker for the validated parts of the [architecture review](arch-review.md).
The [backlog](../backlog.md#architecture-maintenance-planned-2026-11-04) indexes the work; this file owns scope,
acceptance and progress. The [architecture guide](../architecture.md) owns lasting design rules, and the
[port plan](../port-plan.md) owns IITC behavior and intentional divergences. Creating this plan does not start the
refactors or authorize committing/publishing them.

## Goal And Constraints

Make feature ownership and dependencies easier to understand and test. LOC measurements identify places to inspect;
they are not reduction targets. Preserve UI, message/storage formats, request ordering, cancellation, cache policy,
retained Leaflet layers and performance unless a separately documented bug fix requires a behavior change.

Keep app composition explicit. Pure domain rules belong in core; UI formatting, SVG presentation, browser effects
and Leaflet adapters belong in the app. A hook extraction improves organization, but does not itself isolate
re-renders. Avoid replacement frameworks, universal controllers and large prop-forwarding layout components.

## Progress

All items are unchecked. Complete one bounded item at a time; record the change/PR, validation and remaining
device checks in the completion log below. Do not treat a partial move as completion of the entire hotspot.

| Done | ID | Work item | Acceptance |
| --- | --- | --- | --- |
| [ ] | ARCH-01 | Copy-feedback correctness and ownership | Older timers/late clipboard results cannot clear or overwrite newer feedback; each feedback area remains independent; cleanup has an owner. |
| [ ] | ARCH-02 | Remove genuine command forwarding wrappers | Direct delegation disappears; navigation/cancellation/ordering behavior and its meaningful tests remain at an explicit owner. |
| [ ] | ARCH-03 | Extract COMM UI workflow from `content.tsx` | Drafts, send acknowledgments and scroll/history coordination have a cohesive owner without moving transport or changing effect ordering. |
| [ ] | ARCH-04 | Extract portal styling from `map-renderer.ts` | Styling/radius calculations take explicit inputs and can be tested without initializing Leaflet; appearance and zoom thresholds match. |
| [ ] | ARCH-05 | Extract map-response adaptation from `map-request.ts` | Conversion/type guards have explicit clock/history dependencies; queue/cache/generation/cancellation behavior stays with the scheduler. |
| [ ] | ARCH-06 | Share portal types and organize message payload types | Common fields have one definition; required/optional distinctions, existing imports and wire contracts remain compatible. |
| [ ] | ARCH-07 | Consolidate storage I/O handling | Small read/write helpers retain feature parsers, legacy migrations, defaults, remove-item behavior and exact stored formats. |
| [ ] | ARCH-08 | Move remaining domain aggregation to core | List summarization has a core owner and equivalent results; presentation, filtering tied to UI choices, and SVG geometry stay in the app. |

Recommended first pickup: ARCH-01, followed by ARCH-02. The first structural extractions are ARCH-03 and ARCH-04;
they can be selected independently. ARCH-05 and broader message organization should be separate later batches.
ARCH-06 may start with the small portal-type deduplication before considering a wider module move.

## Boundaries For The Largest Files

### `content.tsx` — ARCH-03

Candidate owner: `comm/use-comm-ui-state.ts` (name can follow existing workflow conventions).

- Own per-channel drafts, matching send acknowledgments, older-history scroll preservation, stick-to-bottom and
  new-message indication, with the refs/actions/effects needed for those behaviors.
- Keep channel buffers, polling, send requests and map lifetime in `comm-runtime.ts`. Keep app-wide navigation,
  authentication composition and page-message dispatch explicit in `content.tsx`.
- Preserve late-send protection, channel isolation, reader position and panel close/reopen behavior. Document effect
  registration order before moving effects. Retain ownership tests and the existing COMM browser regressions.
- Consider shell-navigation extraction only after this move reveals a cohesive boundary. No `<250 LOC` target or
  mandatory `AppShell.tsx` extraction; moving JSX into a large prop bundle is not an acceptance criterion.

### `map-renderer.ts` — ARCH-04

Candidate owner: `map/entities/portal-marker-style.ts`.

- Extract level normalization, marker scale/radius/weight and fill color/opacity. Pass zoom/default values and render
  policy explicitly: radius and weight currently read the map through their closure.
- Keep Leaflet creation, entity diffing, indexes, retained layer identity, rendering order and disposal together.
  Reuse the existing `portal-label-canvas.ts` and `portal-image-canvas.ts` owners.
- Check level/health/placeholder/faction and zoom boundaries with focused tests; use existing map browser coverage
  for highlighters, layers and appearance. Do not claim a performance improvement without measuring it.
- Later label/decorations coordinators need an explicit state/disposal contract and a concrete maintenance need.
  They are not automatic follow-ups to extracting styling.

### `map-request.ts` — ARCH-05

Candidate owner: `map/map-entity-adapter.ts`; diagnostics can be considered separately.

- Start with type guards and response-to-render adaptation. `toRenderEntities` currently reads/writes portal history;
  `toArtifactRawGameEntity` can use `Date.now()`. Separate or explicitly pass those dependencies rather than declaring
  the existing functions pure without changing their boundary.
- Keep scheduling, generation guards, abort signals, cache reuse, refill/retry handling and stale-response bridging
  with the request coordinator. Preserve diagnostic publication and rendering order.
- Compare adapted entities and history updates on fixtures; retain existing retry/cache/map-replacement browser
  cases. A diagnostics extraction must preserve which fields reset, retain prior values or explicitly clear on null.
- `map-data-request.ts` remains the core state-machine owner. Extract retry/partition helpers only when they can
  be tested independently and make IITC comparison easier; its LOC alone is not a reason to split it.

### `messages.ts` — ARCH-06

- First share the common portal identity/summary fields. Selected portals require ornament/artifact arrays and
  topology information; rendered portals have different optional fields. Preserve those distinctions explicitly.
- If useful afterward, separate entity models and map/COMM/feature payload types with a compatibility export from
  `messages.ts`. Avoid introducing runtime dependency cycles while moving type-only definitions.
- A file split does not make the broad optional-field envelope safe. Strengthen individual message contracts and
  constructors incrementally when working on that feature; a complete discriminated-union migration is not required
  for this batch. Preserve message names, source checks and existing payloads.

## Review Corrections And Evidence Gates

- `content-command-callbacks.ts` contains real sheet/menu coordination as well as pass-throughs. Do not delete its
  entire test suite or promise the review's estimated 1,200-line saving. Keep behavioral tests at their new owner.
- Copy timers are already centralized in `shell/feedback.ts`. A controlled probe did confirm that the first copy's
  timeout clears the second copy's feedback. ARCH-01 addresses that bug; it must not merge three independent status
  areas into one global message. Add regression coverage for successive copies and late completion order.
- Portal counts/scoreboard aggregation already largely lives in core. ARCH-08 concerns remaining list summarization,
  not wholesale relocation of the app's analysis/presentation module.
- Message-listener re-subscription exists, but a performance problem or lost-message defect has not been established.
  Defer a persistent-context-ref change until evidence justifies its extra stale-context/ordering responsibilities.
- A generic diagnostics spread is not approved by this plan: absent and null fields currently have distinct semantics.

## Validation And Completion

Follow [SKILL.md](../../../SKILL.md): focused checks during edits, full applicable checks once the batch settles,
and verified build reuse where appropriate. Add tests for behavior/invariants, not wrappers or file layout.
Documentation-only planning requires link/path checks and `git diff --check`, not application builds.

For each completed item record its ID, concrete ownership change, tests run, any performance comparison and remaining
live/device checks. Update the architecture guide only with lasting ownership changes, and the port plan when an
observable behavior intentionally changes. Package/sign once when a downloadable build is needed.

### Completion Log

No implementation items completed yet.
