# Architecture Maintenance Plan

Status: in progress. ARCH-09 and ARCH-01 implemented on 2026-11-04; remaining items are pending.

This is the implementation tracker for the validated parts of the [architecture review](arch-review.md).
The [backlog](../backlog.md#architecture-maintenance-planned-2026-11-04) indexes the work; this file owns scope,
acceptance and progress. The [architecture guide](../architecture.md) owns lasting design rules, and the
[port plan](../port-plan.md) owns IITC behavior and intentional divergences. Creating this plan does not start the
refactors or authorize committing/publishing them.

## Goal And Constraints

Make feature ownership and dependencies easier to understand and test. A routine feature change should require
reading its owner and a small explicit interface, rather than repeatedly loading a thousand-line composition file.
This reduces developer navigation, review effort and agent context/token costs. Preserve a ranked hotspot inventory
and concrete destination modules so progress is visible. LOC measurements identify places to inspect and track;
they are not standalone reduction targets. Preserve UI, message/storage formats, request ordering, cancellation, cache policy,
retained Leaflet layers and performance unless a separately documented bug fix requires a behavior change.

Keep app composition explicit. Pure domain rules belong in core; UI formatting, SVG presentation, browser effects
and Leaflet adapters belong in the app. A hook extraction improves organization, but does not itself isolate
re-renders. Avoid replacement frameworks, universal controllers and large prop-forwarding layout components.

## Ranked Production Hotspots

Baseline: `6a8c9a4`, counted from `apps/iitc-iris/src` and `packages/iitc-core/src` `.ts`/`.tsx` files, excluding
`.test.*` and `.spec.*`. Counts include comments and blank lines. This replaces the original review's selective
inventory with the actual ranking for that scope. Recompute after relevant slices and record before/after figures
and remaining responsibilities in the completion log; do not improve one file's number by creating opaque forwarding.

| Rank | Production file | Baseline LOC | Responsibilities concentrated there | Planned treatment |
| --- | --- | --- | --- | --- |
| 1 | `apps/iitc-iris/src/map/entities/map-renderer.ts` | 1,644 | Entity diffing/layers, marker styling, decoration synchronization, level/key overlays | ARCH-04 first; explicit later overlay boundaries below. |
| 2 | `apps/iitc-iris/src/content.tsx` | 1,161 | App composition, COMM drafts/scroll/effects, shell actions, message subscription | ARCH-03; keep cross-feature composition explicit. |
| 3 | `apps/iitc-iris/src/map/map-request.ts` | 947 | Queue/cache/generation ownership, response adaptation, history updates, diagnostics | ARCH-05; preserve scheduling invariants. |
| 4 | `apps/iitc-iris/src/messages.ts` | 813 | Bridge constants/envelope, feature payloads and shared entity models | ARCH-06, split into two slices. |
| 5 | `packages/iitc-core/src/map-data-request.ts` | 787 | Request lifecycle, retry decisions and tile partitioning | Retain state-machine ownership; inspect helpers when changing that subsystem. |
| 6 | `apps/iitc-iris/src/page-map-runtime.ts` | 664 | Feature composition, map lifecycle/events and message routing | Keep composition root; no broad split selected. |
| 7 | `packages/iitc-core/src/comm.ts` | 458 | COMM parsing, markup and channel/domain rules | ARCH-09 validation hardening; preserve domain ownership. |
| 8 | `apps/iitc-iris/src/comm/comm-runtime.ts` | 443 | Buffers, transport, polling and activity adaptation | ARCH-09; transport stays separate from ARCH-03 UI extraction. |
| 9 | `apps/iitc-iris/src/content-command-callbacks.ts` | 441 | Forwarders mixed with navigation/cancellation ordering | ARCH-02, selectively. |
| 10 | `apps/iitc-iris/src/map/draw-tools/draw-tools-runtime.ts` | 434 | Storage/JSON, drawing actions, Leaflet layers and crossing integration | Watch item; no new extraction selected. |
| 11 | `apps/iitc-iris/src/map/missions/missions-runtime.ts` | 431 | Mission requests, state/cache, navigation and overlay coordination | Watch item; retain existing feature owner. |
| 12 | `apps/iitc-iris/src/shell/storage-settings.ts` | 387 | Storage I/O plus feature normalization, defaults and migrations | ARCH-07. |

## Progress

ARCH-09 and ARCH-01 are complete in the working tree. Complete one bounded item at a time; record the change/PR, validation and remaining
device checks in the completion log below. Do not treat a partial move as completion of the entire hotspot.

| Done | ID | Work item | Acceptance |
| --- | --- | --- | --- |
| [x] | ARCH-09 | Harden COMM response/acknowledgment boundaries | Recognized failures and unconfirmed replies preserve drafts; supported acknowledgments are evidence-based; invalid timestamps cannot alter buffers/cursors or throw in rendering. |
| [x] | ARCH-01 | Copy-feedback correctness and ownership | Older timers/late clipboard results cannot clear or overwrite newer feedback; each feedback area remains independent; cleanup has an owner. |
| [ ] | ARCH-02 | Remove genuine command forwarding wrappers | Direct delegation disappears; navigation/cancellation/ordering behavior and its meaningful tests remain at an explicit owner. |
| [ ] | ARCH-03 | Extract COMM UI workflow from `content.tsx` | Drafts, send acknowledgments and scroll/history coordination have a cohesive owner without moving transport or changing effect ordering. |
| [ ] | ARCH-04 | Extract portal styling from `map-renderer.ts` | Styling/radius calculations take explicit inputs and can be tested without initializing Leaflet; appearance and zoom thresholds match. |
| [ ] | ARCH-05 | Extract map-response adaptation from `map-request.ts` | Conversion/type guards have explicit clock/history dependencies; queue/cache/generation/cancellation behavior stays with the scheduler. |
| [ ] | ARCH-06 | Share portal types and organize message payload types | Common fields have one definition; required/optional distinctions, existing imports and wire contracts remain compatible. |
| [ ] | ARCH-07 | Consolidate storage I/O handling | Small read/write helpers retain feature parsers, legacy migrations, defaults, remove-item behavior and exact stored formats. |
| [ ] | ARCH-08 | Move remaining domain aggregation to core | List summarization has a core owner and equivalent results; presentation, filtering tied to UI choices, and SVG geometry stay in the app. |

## Slice Order

Approximately ten bounded slices, keeping correctness work brief and prioritizing the four largest files:

1. ARCH-09: COMM response/acknowledgment correctness.
2. ARCH-01: copy-feedback ownership and timing.
3. ARCH-03: COMM UI workflow out of App.
4. ARCH-04: portal styling out of the renderer.
5. ARCH-05: map-response adaptation out of the request coordinator.
6. ARCH-06a: shared portal identity/summary types.
7. ARCH-06b: organize entity and feature message payload modules behind compatible exports.
8. ARCH-02: remove remaining genuine command forwarders, retaining behavioral coordination.
9. ARCH-07: common storage I/O handling.
10. ARCH-08: remaining domain aggregation in core.

ARCH-06a/b are two slices of the single tracked ARCH-06 item; complete that item only when its selected scope is
done. Reassess after the first four slices. Each structural completion must name the new owner/interface, list what
left the hotspot and what remains, and record before/after source size plus whole-change production LOC where useful.
The test/behavior evidence and reduced context needed for a task matter alongside the counts. A new module that
merely forwards a large argument/state bundle does not meet the ownership goal.

## COMM Correctness Before Extraction — ARCH-09

The [current-state review](architecture-current-state-review.md) reproduced structured send errors being treated as
success (clearing drafts), and out-of-range timestamps reaching `toISOString()` and throwing during rendering.

- Recognize error envelopes and establish supported success acknowledgments from endpoint/reference/fixture evidence.
  Preserve channel drafts when delivery is unconfirmed, and keep retries explicit. Do not assume `{result:true}` is
  the only valid success form without verifying that contract.
- Validate timestamps before accepting messages or advancing cursors, including finite values outside the valid Date
  range. Make both COMM-row and portal-activity date presentation defensive.
- Add permanent regressions for structured errors, ambiguous replies and invalid timestamps; preserve valid empty
  history, channel isolation and late-send protection. Transport/parser fixes remain at their existing owners.
- Finish this correctness slice before ARCH-03 moves acknowledgment/UI coordination. It is separate from reorganizing
  message types and does not introduce extra polling or resend behavior.

## Boundaries For The Largest Files

### `content.tsx` — ARCH-03

Target module map:

| Module | Responsibility / boundary |
| --- | --- |
| `comm/use-comm-ui-state.ts` | Drafts, acknowledgment bookkeeping, scroll/history state and their UI actions/effects; explicit inputs from COMM state and callbacks for requests/navigation. |
| `content.tsx` | App assembly, bridge subscription and cross-feature coordination; consumes the workflow's small UI contract. |
| `shell/use-shell-navigation.ts` (later candidate) | Only cohesive navigation state/actions if a subsequent ownership review supports it; no feature transport. |

The first two boundaries are ARCH-03 scope; shell navigation is a later candidate, not a requirement to shrink App
below an arbitrary line count.

- Own per-channel drafts, matching send acknowledgments, older-history scroll preservation, stick-to-bottom and
  new-message indication, with the refs/actions/effects needed for those behaviors.
- Keep channel buffers, polling, send requests and map lifetime in `comm-runtime.ts`. Keep app-wide navigation,
  authentication composition and page-message dispatch explicit in `content.tsx`.
- Preserve late-send protection, channel isolation, reader position and panel close/reopen behavior. Document effect
  registration order before moving effects. Retain ownership tests and the existing COMM browser regressions.
- Consider shell-navigation extraction only after this move reveals a cohesive boundary. No `<250 LOC` target or
  mandatory `AppShell.tsx` extraction; moving JSX into a large prop bundle is not an acceptance criterion.

### `map-renderer.ts` — ARCH-04

Target module map:

| Module | Responsibility / boundary |
| --- | --- |
| `map/entities/portal-marker-style.ts` | Pure level, scale, radius, weight and fill calculations; receives zoom and policy explicitly. ARCH-04 scope. |
| `map/entities/portal-label-overlays.ts` (later candidate) | Level/key candidate selection, overlay indexes and synchronization; uses existing label-canvas adapters. |
| `map/entities/portal-decoration-overlays.ts` (later candidate) | Ornament/artifact visibility, indexes, synchronization and diagnostics; uses existing image-canvas adapters. |
| `map/entities/map-renderer.ts` | Core entity diffing, retained Leaflet layer identity and coordinated render ordering; invokes explicit overlay owners. |

The later overlay candidates define the intended decomposition, not additional hidden work in ARCH-04. Before
selecting either, specify map-lifetime creation/reset/disposal and the callbacks/settings it owns, then retain the
existing gesture, replacement and performance evidence. Each would be its own additional slice.

- Extract level normalization, marker scale/radius/weight and fill color/opacity. Pass zoom/default values and render
  policy explicitly: radius and weight currently read the map through their closure.
- Keep Leaflet creation, entity diffing, indexes, retained layer identity, rendering order and disposal together.
  Reuse the existing `portal-label-canvas.ts` and `portal-image-canvas.ts` owners.
- Check level/health/placeholder/faction and zoom boundaries with focused tests; use existing map browser coverage
  for highlighters, layers and appearance. Do not claim a performance improvement without measuring it.
- Later label/decorations coordinators need an explicit state/disposal contract and a concrete maintenance need.
  They are not automatic follow-ups to extracting styling.

### `map-request.ts` — ARCH-05

Target module map:

| Module | Responsibility / boundary |
| --- | --- |
| `map/map-entity-adapter.ts` | Type guards and raw/decoded response-to-render conversion; explicit clock/history inputs and explicit history updates. ARCH-05 scope. |
| `map/map-request-diagnostics.ts` (later candidate) | Diagnostic accumulation/mapping if it forms an independent owner; preserve reset/retain/null semantics. |
| `map/map-request.ts` | Queue, cache, generation, retry/refill and cancellation coordination; applies history updates at the existing lifecycle point. |

Diagnostics is a later candidate rather than a prerequisite for the response-adapter slice.

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

Target module map for ARCH-06b:

| Module | Responsibility / boundary |
| --- | --- |
| `messages/entities.ts` | Shared render/selected portal, link and field models, building on ARCH-06a. |
| `messages/map.ts` | Map command/status and rendering payload types. |
| `messages/comm.ts` | COMM requests/status/send and portal-activity payload types. |
| `messages/agent.ts`, `messages/missions.ts`, `messages/search.ts`, `messages/draw-tools.ts` | Existing feature-domain payload types, separated by their owners rather than one miscellaneous features file. |
| `messages.ts` | Compatible public exports, bridge constants and envelope composition during incremental migration. |

Keep type-only dependencies explicit. Confirm which genuinely shared settings/status types need a common owner during
implementation; do not introduce a runtime registry or abstraction solely to support moving declarations.

- First share the common portal identity/summary fields. Selected portals require ornament/artifact arrays and
  topology information; rendered portals have different optional fields. Preserve those distinctions explicitly.
- If useful afterward, separate entity models and map/COMM/feature payload types with a compatibility export from
  `messages.ts`. Avoid introducing runtime dependency cycles while moving type-only definitions.
- A file split does not make the broad optional-field envelope safe. Strengthen individual message contracts and
  constructors incrementally when working on that feature; a complete discriminated-union migration is not required
  for this batch. Preserve message names, source checks and existing payloads.

## Review Corrections And Evidence Gates

The [current-state review](architecture-current-state-review.md) rechecks this plan at `6a8c9a4` and records two
additional COMM response/acknowledgment gaps. These are now included in ARCH-09 before ARCH-03. Its browser-CI
finding stays in the testing plan. ARCH-09 and ARCH-01 are implemented; the structural items remain pending.

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

### 2026-11-04 — ARCH-09: COMM response boundaries

Implemented `isIitcCommTimestamp` and send-acknowledgment validation in core; the COMM runtime validates before
publishing success or changing buffers/cursors. Structured/truthy errors take precedence, including an error paired
with an otherwise positive result. Unknown/negative replies retain the per-channel draft and explain delivery
uncertainty; retries remain explicit. Accepted affirmative forms are boolean true and literal success/SUCCESS tokens.
The boolean form comes from repository fixtures; token support is an explicit compatibility policy. The reviewed
IITC/stock callbacks do not document an exhaustive current response schema, so live send acknowledgment smoke remains
pending rather than claiming only these forms can ever be valid. This deliberate behavior change is in the port plan.

Both COMM and portal activity use shared safe timestamp presentation. Invalid dates cannot throw during rendering,
even when supplied through an internal bridge message. Timestamp formatting is computed once per displayed COMM row
and reused for day grouping. Parsing, transport and UI presentation keep their existing owners; polling is unchanged.
Phone feedback then reported `out of date`. Inspection found the send transport omitted Intel's required `v` field,
although COMM reads and other Intel requests supplied it. Sends now include the extracted version and retain the
text with an auth error if no version is available. Unit coverage asserts the actual send payload; browser send
fixtures reject a missing/wrong version, matching the reported failure. Full checks pass (701 app/core tests), as do
13 focused COMM/request browser cases. The updated XPI was rebuilt, and the user confirmed sending succeeds
after the version-field fix. Platform/channel details and exhaustive acknowledgment forms were not separately recorded.

Core COMM file: 458 → 476 lines. Regression coverage includes invalid Date bounds, cursor/history retention, structured
errors, uncertain replies, positive acknowledgments and malformed internal date presentation.

### 2026-11-04 — ARCH-01: copy-feedback ownership

`shell/feedback.ts` now guards each area's active operation and scheduled clear; `shell/use-copy-feedback.ts` owns
status/disposal for System, context, portal and Draw Tools. Late promise results and canceled timer callbacks cannot
replace/clear newer feedback. New non-copy status (such as an import result) cancels pending copy feedback too.
Clipboard/scheduling remain injectable, and setter-based copy helpers/commands retain their compatible API.
Feedback module: 33 → 74 lines; new hook: 10 lines; App entry: 1,161 → 1,162 lines. The two correctness slices together
change production source LOC from 24,453 to 24,534 (+81). This establishes correct ownership/cleanup; the larger
hotspot reductions start with ARCH-03 rather than being claimed for these fixes.

Validation: `npm run check` passes (700 app/core tests, six release gates and 18 build-verification cases). The full
Chrome suite passes all 64 cases; eight COMM/copy cases also pass three repeated runs (24 executions). The first full
run exposed an existing timeline-fixture race: an empty authoritative response could remove the selected synthetic
portal. The fixture now retains the portal entities; no production selection behavior was changed to satisfy it.
Final focused UI, type/lint and whitespace checks pass. No commit/push or signed APK was requested. An XPI was subsequently rebuilt for user testing. User smoke confirms COMM sending succeeds after the version-field fix. Dedicated copy/Android smoke remains pending.
Next slice: ARCH-03.
