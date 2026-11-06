# Architecture Maintenance Plan

Status: complete for the selected implementation scope (nine tracked items, ten slices). General IRIS smoke is
accepted after ARCH-08. General Android usage is accepted on 2026-11-06 after the user used APK 1871 for a while
and reported that everything looks good. Validation and specific coverage limits are recorded below.
Follow-up ARCH-10–18 is implemented on `refactor/renderer-maintenance` and remains uncommitted for review.
The earlier Android acceptance covers the prior merged batch, not this new renderer/navigation/request work.

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

ARCH-09 and ARCH-01 are committed as `64cdfb2`; ARCH-03 is committed as `db6ac6b` after user COMM smoke.
ARCH-04 is committed as `3820481` after user portal smoke; ARCH-05 is committed as `d457c62` after user map/portal smoke.
ARCH-06a/b are committed as `455a0fd`; ARCH-02 is committed as `98eaf2e` after user acceptance of the checked change.
ARCH-07 is committed as `248d409`. ARCH-08 is committed as `f0fae7a` after the user's general IRIS smoke test.
Complete one bounded item at a time; record the change/PR, validation and remaining
device checks in the completion log below. Do not treat a partial move as completion of the entire hotspot.

| Done | ID | Work item | Acceptance |
| --- | --- | --- | --- |
| [x] | ARCH-09 | Harden COMM response/acknowledgment boundaries | Recognized failures and unconfirmed replies preserve drafts; supported acknowledgments are evidence-based; invalid timestamps cannot alter buffers/cursors or throw in rendering. |
| [x] | ARCH-01 | Copy-feedback correctness and ownership | Older timers/late clipboard results cannot clear or overwrite newer feedback; each feedback area remains independent; cleanup has an owner. |
| [x] | ARCH-02 | Remove genuine command forwarding wrappers | Direct delegation disappears; navigation/cancellation/ordering behavior and its meaningful tests remain at an explicit owner. |
| [x] | ARCH-03 | Extract COMM UI workflow from `content.tsx` | Drafts, send acknowledgments and scroll/history coordination have a cohesive owner without moving transport or changing effect ordering. |
| [x] | ARCH-04 | Extract portal styling from `map-renderer.ts` | Styling/radius calculations take explicit inputs and can be tested without initializing Leaflet; appearance and zoom thresholds match. |
| [x] | ARCH-05 | Extract map-response adaptation from `map-request.ts` | Conversion/type guards have explicit clock/history dependencies; queue/cache/generation/cancellation behavior stays with the scheduler. |
| [x] | ARCH-06 | Share portal types and organize message payload types | Common fields have one definition; required/optional distinctions, existing imports and wire contracts remain compatible. |
| [x] | ARCH-07 | Consolidate storage I/O handling | Small read/write helpers retain feature parsers, legacy migrations, defaults, remove-item behavior and exact stored formats. |
| [x] | ARCH-08 | Move remaining domain aggregation to core | List summarization has a core owner and equivalent results; presentation, filtering tied to UI choices, and SVG geometry stay in the app. |

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
| `messages/scores.ts`, `messages/inventory.ts`, `messages/passcode.ts` | Other panel payloads; Inventory imports the shared subscription model from Agent using a type-only dependency. |
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
finding stays in the testing plan. Current implementation status is tracked in Progress above.

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


### 2026-11-04 — ARCH-03: COMM UI workflow

`comm/use-comm-ui-state.ts` owns per-channel drafts, matching send acknowledgments, list/older-history scroll refs,
stick-to-bottom/new-message UI state, send/mention/history actions and their effect implementations. App retains the
received COMM state for bridge/auth composition, navigation and panel assembly; channel buffers/transport/polling stay
in `comm-runtime.ts`. The feature now calls its existing panel actions directly, rather than importing generic root
forwarders; full command-wrapper cleanup remains ARCH-02.

The workflow registers no effects during its construction. `useCommRequestEffects` stays at the former
acknowledgment → automatic request/retry → visibility position, after the content message subscription and before
Scores/Inventory effects. `useCommScrollEffects` stays after Missions/Search effects, with the same scroll invalidation
signals and frame scheduling. This preserves ordering while moving ownership. Hook extraction does not claim render
isolation or a performance gain.

App entry: 1,162 → 1,036 LOC (-126). New feature owner: 148 LOC. Whole production source: 24,536 → 24,558 (+22).
The small net addition consists of the typed UI contract and explicit effect-registration seams; the navigation task
now reads the App assembly while COMM draft/scroll work reads its feature owner, rather than both sharing the large
App body. Styling, payload/storage contracts and user-visible behavior are unchanged by intent.

Validation: `npm run check` passes (701 app/core tests, release/build gates, CSS and workbench); all 65 Chrome cases
pass. Existing tests cover history/scroll, channel isolation, failed drafts, late-send edit protection, visibility,
shared polling and versioned sends. A new browser regression covers a send completing while Faction is active and
retains independent drafts across COMM close/reopen. No hook-implementation mirror tests or new test dependencies.
Committed as `db6ac6b` after the user reports a quick test confirms COMM still works. General COMM smoke is accepted,
without claiming exhaustive individual paths or platform coverage. The extraction XPI was prepared for this smoke;
APK unchanged. Continued with ARCH-04 portal styling below.

### 2026-11-04 — ARCH-04: portal marker styling

`map/entities/portal-marker-style.ts` owns base marker scale, level normalization, radius, stroke weight, faction/level/
health fill and opacity, and placeholder appearance. It receives portal appearance fields, fill policy and zoom
explicitly, with no Leaflet runtime or map dependency. The renderer supplies current/default zoom, applies highlighter
overrides last and retains its radius adapter for selection, ornaments and key badges. Leaflet allocation, incremental
entity diffing, indexes, label/image caches, visibility, rendering order and disposal remain in the renderer.

Renderer: 1,644 → 1,567 LOC (-77). New styling owner: 108 LOC. Whole production source: 24,558 → 24,589 (+31).
The extra lines are the explicit input/output contract and module boundary. Appearance calculations can now be read
and tested independently; the extraction does not claim a rendering performance gain or finish the renderer hotspot.

Validation: seven focused unit tests cover zoom/level boundaries, faction palette, strict health thresholds and opacity,
fill priority, placeholder appearance and complete reset values. A temporary comparison against the pre-extraction
implementation matched all 23,520 combinations of faction, level, health, zoom, placeholder and fill settings. The
existing real-Leaflet browser case now checks complete base marker dimensions/styles and restoration after a highlighter
change while retaining marker identity. `npm run check` passes: 708 app/core tests, 6 release checks, 18 build-guard
checks, lint/types, CSS and workbench build. All 65 Chrome browser cases pass (50.6 seconds).

Committed as `3820481` after the portal smoke below. Verified web assets were reused to package XPI/ZIP
`2026-11-04T19-20-12`, served on port 6969; APK unchanged. The user reports a quick test confirms portals still work; general portal smoke is accepted,
without claiming exhaustive styling paths or platform coverage.

Checkpoint after the first four slices: keep ARCH-05 next. Reinspection confirms response adaptation still reads/writes
portal history and artifact conversion still obtains a fallback timestamp from `Date.now()`. The planned explicit
history updates and clock boundary remain useful; queue/cache/generation/retry/cancellation ownership must stay with
`map-request.ts`. Do not expand this into label/decorations extraction: those later candidates still require a concrete
maintenance need and their own map-lifetime/disposal contract. ARCH-06a/b and the remaining order stay unchanged.


### 2026-11-04 — ARCH-05: map-response adaptation

`map/map-entity-adapter.ts` owns raw/decoded response-to-render projection, artifact result shape guards and tuple
conversion, and artifact-type projection for diagnostics. `adaptMapEntities` receives response, generation, read-only
cached portal history and optional artifact entities; it returns render entities plus explicit history updates without
mutating the cache. The coordinator's `prepareRenderEntities` applies these updates at the existing fixture, fresh-cache,
batch-progress and final-render points, before publishing entities. This small wrapper owns a state change rather than
merely forwarding arguments. `adaptArtifactPortalEntities` receives its fallback clock explicitly; the transport passes
`Date.now`, called once per summary lacking a finite timestamp, as before.

Request coordinator: 947 → 859 LOC (-88). New adapter: 115 LOC. Whole production source: 24,589 → 24,616 (+27).
Queue/cache/generation/retry/refill/cancellation, stale-response bridging, transport/envelope handling, artifact error
isolation and diagnostic publication remain in the coordinator. Core decoding remains in core. Artifact portal override
priority, history fallback (including explicit zero), payload shapes and property/iteration ordering are preserved;
there is no intentional behavior change or performance claim. Diagnostics extraction remains a later candidate.

Validation: seven adapter tests cover render projection/placeholders, read-only history plus explicit updates, artifact
overrides and metadata, empty results, supported artifact shapes, lazy fallback-clock calls and sorted unique types.
A coordinator regression checks history application before publication and summary fallback after explicit zero;
the existing old-map rejection case now also checks that late history cannot enter the page cache. All 25 focused
adapter/coordinator tests pass. A temporary comparison against the prior implementation matched 21 captured-fixture/
edge/history scenarios and seven artifact result shapes, including resulting cache updates. `npm run check` passes:
716 app/core tests, 6 release checks, 18 build guards, lint/types, CSS and workbench build. All 65 Chrome cases pass
(50.3 seconds). XPI/ZIP `2026-11-04T19-26-28` reuse the verified web build; all 23 archive files match dist and the
port-6969 downloads match the archives. APK unchanged. The user reports a quick test confirms portals and the map still work; general map/portal smoke
is accepted without claiming exhaustive paths or platform coverage.

Committed as `d457c62` after the map/portal smoke above. Continued with ARCH-06a/b below.

### 2026-11-04 — ARCH-06a/b: shared portal fields and feature payload types

Both planned type slices are implemented together, sharing final validation and packaging. ARCH-06a introduces
`IitcIrisPortalSummary` in `messages/entities.ts`: the twelve common identity/summary fields have one definition.
Rendered portals retain optional ornaments/artifacts/history. Selected portals retain required ornament/artifact
arrays and link/field topology; they do not acquire render-only history. Core models and decoding stay in core.

ARCH-06b moves entity/portal models to `messages/entities.ts`; settings, map status/queue/render/timing/transport and
tracker diagnostics to `messages/map.ts`; and feature payload types to `comm.ts`, `agent.ts`, `inventory.ts`, `scores.ts`,
`passcode.ts`, `missions.ts`, `search.ts` and `draw-tools.ts` within `messages/`. Agent owns the subscription state shared
with Inventory. These modules contain declarations and type-only imports; Inventory → Agent is the sole sibling
module dependency. They do not import the bridge. `messages.ts` retains the bridge constants, message type/envelope
and explicit compatible type exports, so current consumer imports still work. The envelope remains broad and optional;
file organization does not add runtime validation or justify a discriminated-union migration here.

Bridge entry: 813 → 230 LOC (-583). Ten payload modules total 621 LOC (17–214 each); the entity owner is 115 LOC.
Whole production source: 24,616 → 24,654 (+38), covering module/import/export seams after removing duplicated portal
fields. A feature payload change can now be read at its named owner; message wiring stays at the bridge entry.

Validation: a temporary TypeScript compatibility probe compares all 55 existing exported type contracts against the
pre-change definitions, including keys/requiredness and selected/rendered portal distinctions. All match. Bridge
constant and envelope declarations match exactly; every new module contains only types and has no dependency back
to the bridge. All 23 rebuilt shipped assets are byte-identical to ARCH-05. No implementation-mirroring tests or new
test dependencies were added. `npm run check` passes with 716 app/core tests, 6 release checks, 18 build guards,
lint/types, CSS and workbench build; all 65 Chrome cases pass (50.4 seconds). XPI/ZIP `2026-11-04T19-36-10` reuse
the verified build; archive contents match dist and port-6969 downloads match the archives. APK unchanged. The prior
map/portal smoke covers identical shipped runtime assets; no separate ARCH-06 device test is claimed.

Committed as `455a0fd` after the user accepted the type-only change based on validation; no additional device test
was requested or claimed. Continued with ARCH-02 below.

### 2026-11-04 — ARCH-02: selective command-wrapper cleanup

Removed 21 commands that added no behavior: seventeen direct forwarders to existing COMM/Passcode, portal selection,
copy and auth owners, plus four panel/camera builder-and-post wrappers. App now calls those feature actions directly
or posts the existing Scores/Inventory/SetView/PanBy message builders. Its state-bound UI callbacks and callback
dependencies remain in place. The unused send/nickname forwarders disappear too; the ARCH-03 COMM owner already
calls those actions directly. No replacement dispatcher, re-export aliases or dependency bundle was introduced.

`content-command-callbacks.ts` retains eleven commands with actual coordination, guards or argument adaptation:
context centering and portal anchors; cancellation plus ordered sheet/side-panel persistence; COMM open/tab/toggle;
Missions toggle; and primary-menu routing. A temporary declaration comparison confirms all eleven retained function
signatures/bodies match the prior code exactly. Feature action implementations and message builders are unchanged.

Command module: 441 → 157 LOC (-284). App: 1,036 → 1,036. Whole production source: 24,654 → 24,370 (-284).
The root module now describes orchestration rather than requiring a second lookup through feature forwarders.

Validation: the command test file keeps its 28 context/navigation/cancellation/order cases. Nineteen unique boundary
cases move to the existing COMM, portal, clipboard and auth tests; twenty duplicate wrapper cases are removed.
Passcode draft-before-post and focus-before-close ordering assertions remain at their action owners. Copy null guards
now assert no clipboard write. All 80 focused tests across the seven command/action/builder suites pass.
`npm run check` passes: 696 app/core tests, 6 release checks, 18 build guards, lint/types, CSS and workbench build.
All 65 Chrome browser cases pass (50.1 seconds). The app/core count drops by twenty because duplicate wrapper tests
were removed. XPI/ZIP `2026-11-04T19-41-44` reuse verified assets; all 23 archive files match dist and served downloads
match the archives. APK unchanged; live UI smoke is pending. No new test dependency or implementation-mirroring test was added.

Committed as `98eaf2e` after the user accepted the checked change without requesting an additional device test.
Continued with ARCH-07 below.

### 2026-11-04 — ARCH-07: optional preference storage boundary

`platform/storage.ts` owns safe local-storage acquisition, read/parse failure fallback and optional write/removal
failure handling. `readLocalStorage` receives a read/parser operation and a lazy fallback; `writeLocalStorage`
receives a persistence operation. Operation callbacks deliberately retain multi-key reads and serialization within
the same failure boundary, rather than independently defaulting each key or parsing every preference as JSON.
There is no storage registry or feature parser in the platform module.

The 23 shell preference operations use this boundary, along with four page-map preference operations and the two
each for panel visibility and theme. Feature owners retain keys, normalization, defaults, legacy layer/highlighter/
tracker/key-count migrations, raw-string versus JSON formats and side-panel key removal. In particular, a failed
first highlighter read still skips the legacy read; malformed legacy JSON still fails that entire load even if the
new highlighter value is valid. The active-sheet fallback can still read a saved side panel. URL/cookie/history
synchronization, session/auth storage, mission caches, ornament configuration and Draw Tools persistence keep their
existing boundaries: their error reporting or state/cache behavior differs from optional preferences.

Shell storage settings: 387 → 307 LOC (-80); page map-view: 66 → 50; panel visibility: 46 → 45; theme: 31 → 30.
New platform owner: 22 LOC. Whole production source: 24,370 → 24,294 (-76). The 31 repeated optional-preference
boundaries now share an implementation while each feature's parser remains readable at its owner. Stored formats
and UI behavior are unchanged by intent; no performance gain is claimed.

Validation: six preference regressions exercise missing window, a throwing storage getter/getItem, malformed JSON,
legacy migration precedence, active-sheet fallback, exact raw/JSON writes, side-panel removal, quota/removal errors
and serialization failures. The 26 focused storage/map-view/panel/theme tests pass. A temporary comparison against
the prior shell implementation matches all 816 read and 60 write/removal scenarios, including storage-method order
and resulting bytes. `npm run check` passes with 702 app/core tests, 6 release checks, 18 build guards, lint/types,
CSS and workbench build. All 65 Chrome browser cases pass (50.5 seconds). XPI/ZIP `2026-11-04T19-46-58` reuse the
verified build; all 23 archive files match dist and served downloads match the archives. APK unchanged; live preference
persistence smoke is pending.

Committed as `248d409` after the user accepted the checked change without requesting an additional device test.
Continued with the final planned slice, ARCH-08, below.

### 2026-11-04 — ARCH-08: portal-list aggregation in core

`packages/iitc-core/src/portal-analysis.ts` now owns `IitcPortalsListSummary` and `summarizeIitcPortalsList`, alongside
existing portal counts/list/AP/scoreboard domain logic. The reducer and result shape move unchanged, with a read-only
input contract. The app workflow calls core directly on its filtered list. Panel/control props use the core result
type; there is no forwarding wrapper or compatibility alias in the app presentation module.

Team/level/text filter choices, sorting and tie-breaking, state/memoization, labels/percentages/number formatting,
colors and chart/SVG geometry remain in the app. Link/field totals still sum each supplied row's topology; they do not
deduplicate shared links/fields or portal identities. Missing key counts still contribute zero, and history flags are
counted independently. No domain behavior, UI or wire/storage format change is intended.

App presentation helper: 311 → 270 LOC (-41); core analysis: 340 → 382 (+42). Whole production source:
24,294 → 24,292 (-2), including changed imports/props at consumers. This slice moves ownership rather than claiming a
large LOC saving or relocating domain logic that already lived in core.

Validation: aggregation coverage moves from the app to core. Three core cases check all factions/AP/topology/history,
missing/zero keys, frozen inputs, independent empty results and duplicate-row semantics. The app workflow regression
now verifies summarization of the UI-filtered subset and an empty filter result. All 18 focused core/app analysis
cases pass. A temporary comparison against the former app reducer matches 390 captured-fixture, faction-subset,
empty, key/history and duplicate-row scenarios. `npm run check` passes with 704 app/core tests (137 core, 567 app),
6 release checks, 18 build guards, lint/types, CSS and workbench build. All 65 Chrome browser cases pass (50.6 seconds).
XPI/ZIP `2026-11-04T19-51-47` reuse verified assets; all 23 archive files match dist and served downloads match the
archives. APK unchanged. The user reports a quick IRIS smoke test passed; general smoke is accepted without
claiming exhaustive portal-list paths or platform coverage.

Committed as `f0fae7a` after the general IRIS smoke above. All selected plan items are complete; no further
slice is automatically queued by this plan.

### Final implementation checkpoint — 2026-11-04

The four original largest files now have explicit domain/feature boundaries. Relative to the `6a8c9a4` baseline:
renderer 1,644 → 1,567; App 1,161 → 1,036; map requests 947 → 859; bridge messages 813 → 230. Their combined
reduction is 873 LOC, with new owners recorded above. Whole production source is 24,453 → 24,292 (-161); most work
improves where responsibilities live rather than deleting functionality. Command wrappers additionally shrink
441 → 157 and storage settings 387 → 307. Earlier completion-log measurements use each slice's immediate input,
so the App extraction starts at 1,162 after the preceding correctness work.

Ranked production inventory at `f0fae7a` (same source scope, excluding tests):

| Rank | File | LOC | Responsibilities retained / future boundary |
| --- | --- | --- | --- |
| 1 | `apps/iitc-iris/src/map/entities/map-renderer.ts` | 1,567 | Leaflet layers/diffs/visibility, labels/decorations, rendering/disposal; later overlay owners need a concrete maintenance case. |
| 2 | `apps/iitc-iris/src/content.tsx` | 1,036 | Explicit App/bridge/auth/navigation composition; feature workflows have their own owners. |
| 3 | `apps/iitc-iris/src/map/map-request.ts` | 859 | Transport, scheduling/cache/generation/retry/refill, history publication and diagnostics; response adaptation is separate. |
| 4 | `packages/iitc-core/src/map-data-request.ts` | 787 | Request lifecycle and pure queue/retry/partition algorithms; keep state-machine ownership. |
| 5 | `apps/iitc-iris/src/page-map-runtime.ts` | 664 | Page/map lifecycle, feature wiring and message routing; retain composition. |
| 6 | `packages/iitc-core/src/comm.ts` | 476 | COMM parsing, validation and channel/domain rules. |
| 7 | `apps/iitc-iris/src/comm/comm-runtime.ts` | 445 | Buffers, transport coordination, polling and activity adaptation. |
| 8 | `apps/iitc-iris/src/map/draw-tools/draw-tools-runtime.ts` | 434 | Persistence/error reporting, mutations, highlighting and rendering; watch item. |
| 9 | `apps/iitc-iris/src/map/missions/missions-runtime.ts` | 431 | Requests/status, cache lifetimes, navigation and overlays; watch item. |
| 10 | `packages/iitc-core/src/portal-analysis.ts` | 382 | Domain models and counts/list/AP/scoreboard/summary aggregation. |
| 11 | `apps/iitc-iris/src/portals/portal-details-panel/portal-details-panel.tsx` | 358 | Portal presentation/section composition; no new split selected. |
| 12 | `apps/iitc-iris/src/map/controls-panel/controls-panel-container.tsx` | 352 | Control/panel assembly and explicit feature props; no new split selected. |

Large files remain because this plan selected bounded ownership improvements, not arbitrary size limits. Later label/
decoration coordinators, request-diagnostic extraction or listener-lifetime changes need a new concrete task and their
own behavior/lifetime evidence. Branch review/commit/merge and device testing remain separate from implementation
completion; existing smoke acceptance and its limits are recorded per slice above.


### Completed-branch review — 2026-11-04

Reviewed the changed COMM validation/UI effect handoffs, copy-feedback lifetime, renderer/style precedence,
response/history/clock adaptation, message type exports, optional storage boundaries and core list-summary callers
against local main and the selected plan. No functional regression was identified in these reviewed boundaries.
The type compatibility probe was rerun: all 55 prior type contracts, bridge constants and envelope still match;
new payload modules remain type-only without imports back to the bridge.

One minor check issue was found and fixed: the new marker-style module ended with an extra blank line, visible only
when checking the whole branch against main. `git diff --check main` now passes. The cleanup changes no runtime code;
the final slice's passing 704 app/core tests and 65 browser cases remain the validation evidence. No full suite or
artifact rebuild was repeated for the blank-line/documentation cleanup. The production count is one line lower than
the final implementation snapshot above.

Known limits remain: Playwright is not yet invoked by GitHub Actions (already tracked in `comm-ui-testing.md`), and
local Chrome/fixture checks plus the user's general smoke do not establish every Firefox/Android/live endpoint path.
No new feature, CI workflow, merge or push was included in this review.


### Renderer follow-up — 2026-11-06

The user accepted general use of APK `0.4.1-alpha+cb83390` (1871) and authorized integration plus a new branch for
ARCH-10–12. The completed batch is fast-forward merged into local main at `050da9d`;
`refactor/renderer-maintenance` starts there. The three slices below are implemented in the working tree, pending review. They
follow the completed ARCH-01–09 batch. This file remains the single scope/progress owner; roadmap/backlog only index it.

| Done | ID | New owner | Scope and evidence |
| --- | --- | --- | --- |
| [x] | ARCH-10 | `map/entities/entity-visibility.ts` | Move filter definitions/matching and closely related changed-setting scope decisions into explicit-input app functions. Test faction, level, placeholder and combined changes without Leaflet; preserve the existing browser filter/layer-identity checks. Keep actual layer mutation, bucket-cache lifetime and render-path selection with the renderer. |
| [x] | ARCH-11 | `map/entities/portal-label-overlays.ts` | Own level/key candidate selection, indexes, previous snapshots and synchronization together. Reuse label Canvas adapters and shared diff logic; preserve their shared label-layer list, collision selection and inventory-only refresh. Specify clear versus reference reset and map replacement before moving state. |
| [x] | ARCH-12 | `map/entities/portal-decoration-overlays.ts` | Own ornament settings reads, ornament/artifact specifications, indexes, synchronization and diagnostics. Reuse the image Canvas/cache adapter. Preserve full-entity versus filtered-label input semantics, image order/opacity/anchors, failed/late loads, toggles and map replacement. |

Keep core portal/link/field creation, retained layer identity, incremental/full render decisions and overall update
ordering explicit in `map-renderer.ts`. Avoid passing the whole renderer closure to new owners or duplicating the
generic reconciliation algorithm. Extract a small shared layer-sync utility only where the overlay owners need it.

Reassess after each slice; no line-count target or performance gain is promised. During edits use focused checks;
once a slice settles, run the full applicable checks and browser suite. Compare existing combined-toggle timing and
layer-mutation evidence to catch accidental full rebuilds; package only for a requested review checkpoint. Runtime
feature activation/menu customization and speculative state-machine/listener changes remain separate tasks.


### 2026-11-06 — ARCH-10: explicit visibility and update policy

`entity-visibility.ts` owns the existing filter descriptors/matching, level/faction classification, changed-setting
core scope and secondary-work decisions. Settings are explicit inputs. Current-map adapters, Leaflet mutations,
entity bucket WeakMap and render-path selection remain in the renderer. No filter semantics were redesigned.
Renderer: 1,567 → 1,275 LOC; policy owner: 308 LOC. Production source: 24,291 → 24,307 (+16).

Five focused policy tests cover per-kind/faction visibility, level/neutral/placeholder rules, combined change scopes,
whole-overlay precedence and secondary-work invalidation. A temporary comparison matched 49,152 visibility/planning
results against the prior implementation. Full checks passed with 709 app/core tests; all 65 Chrome cases passed
(52.7 seconds), including filter restoration, retained identity and combined-toggle timing/order assertions.

### 2026-11-06 — ARCH-11: level and key label owner

`portal-label-overlays.ts` owns level/key indexes and previous snapshots, projection/collision candidates, marker
creation through existing Canvas adapters, synchronization and orphan cleanup. Both label kinds stay together
because they share `layers.labels`. Root inventory-only refresh passes filtered portals to the same key-label owner.
Level candidates are still selected before the core render, with the same timing field. Selection/drawing callbacks
remain after overlay synchronization.

`entity-layer-sync.ts` extracts the existing generic indexed reconciler and small index/list utilities once. Core
entities, labels and decorations use it without duplicate algorithms. It receives only the layer-add adapter; each
caller keeps its own state/indexes. Group membership, unchanged identity, creation/removal order and mutation counts
are preserved. Three focused tests exercise replacement/removal, grouped and unattached layers, and shared-label
orphan cleanup; a temporary comparison matched 4,000 lifecycle transitions against the old reconciler.

Renderer: 1,275 → 1,081 LOC; label owner: 115 LOC; shared helper initially 136 LOC (146 after signature formatting
in ARCH-12). Production source: 24,307 → 24,364 (+57). Full checks passed with 712 app/core tests; all 65 Chrome cases
passed (52.5 seconds). Existing real-Leaflet tests cover label/key coexistence, collision/filter/zoom decisions,
inventory updates, Canvas identity, animated movement, full clear and map replacement. No new wrapper-mirroring tests.

### 2026-11-06 — ARCH-12: decoration owner and final checkpoint

`portal-decoration-overlays.ts` owns the independent ornament storage reads/fallbacks, ornament/artifact specifications,
indexes and previous snapshots, image synchronization/order and ornament diagnostic accumulation. It receives the
full portal list, preserving the distinction from filtered label input. The existing image Canvas retains map-keyed
caches, stacking, failed/late-load handling and eviction. No image/Canvas implementation changes were made.

The renderer still reads ornament settings at the original timing point, synchronizes labels before decorations,
renders selected portal/object/Draw Tools afterward and publishes the accumulated diagnostics at the same point.
Resetting render diagnostics retains the previous ornament diagnostic snapshot, as before. The new owner resets
references only; full clears and map disposal retain their prior layer-removal ordering. Invalidation orphan cleanup
still occurs before overlay synchronization, including after references have been reset.

Renderer: 1,081 → 964 LOC; decoration owner: 161 LOC; shared helper signature formatting adds 10 LOC. Production
source: 24,364 → 24,418 (+54). Across all three slices the renderer shrinks 1,567 → 964 (-603), while whole production
source grows 24,291 → 24,418 (+127) for explicit interfaces/module wiring. The four new owners are 308/146/115/161 LOC.
This is an ownership improvement, not a claim of deleted functionality or faster rendering. The three largest files
are now App (1,036), renderer (964) and map requests (859); no further extraction is automatically queued.

A temporary comparison matched 700 decoration transitions, including independent storage failures, dimensions,
anchors/opacity/order, diagnostics, toggles, reference reset and map replacement. Existing browser cases verify actual
image pixels, cache bounds, superseded/failed loads and replacement-map rendering. Final `npm run check` passes:
712 app/core tests (137 core, 575 app), 6 release checks, 18 build guards, lint/types, CSS and workbench build.
All 65 Chrome browser cases pass (50.4 seconds), including combined layer/highlighter/base-map timing/order and
retained-layer assertions. Markdown links and whole-change whitespace checks pass. No runtime performance gain
is claimed; no timing thresholds or browser retries were relaxed.

All three slices remain uncommitted for review. Device evidence for this renderer batch remains separate from the
prior merged batch's Android acceptance.

### 2026-11-06 — review follow-ups and downloadable checkpoint

Render-scope flags and bucket sets, including the shared default plans, now have read-only TypeScript contracts.
Only a private builder can mutate a scope; this is compile-time protection, not runtime freezing of Set instances.
Both overlay owners call their reference-only operation `resetReferences()`, matching the documented distinction
between forgetting indexes/snapshots and removing layers or disposing map-owned resources.

The shared-label lifecycle regression now also recreates both label kinds after reference reset/orphan cleanup,
asserting that removed layers are not reused and newly indexed layers survive cleanup. Existing real-browser cases
already cover full clear, retained Canvas identity, asynchronous image completion and map replacement; no duplicate
Canvas harness was added. Focused policy/reconciliation tests, affected lint/type checks and full repository checks
pass. Final policy owner: 314 LOC; renderer remains 964 LOC. Whole production source is now 24,424 (+133 from baseline).

Returning decoration diagnostics instead of mutating the render-local accumulator is optional future interface
polish. Finer label/decoration invalidation should follow measurements showing unnecessary work; neither is queued
as a required extraction. No additional framework or numbered architecture slice is needed for these follow-ups.


Final validation after hardening passes `npm run check` (712 app/core tests, release/build guards, lint/types, CSS
and workbench), all 65 Chrome cases (51.3 seconds) and whole-change whitespace checks. `package:reuse` produced
XPI/ZIP `2026-11-06T18-41-37`; Android reused the same verified web output. Signed APK
`0.4.1-alpha+85a4c9d` (1874) includes this uncommitted working tree, rather than only its named HEAD commit.
Release checks pass 15 JavaScript tests, 31 native JUnit tests, lint and signed assembly. Application identity and
pinned certificate match; all 22 APK assets match generated assets and web output, and the served APK hash matches.
Local download: `http://192.168.0.169:6969/downloads/iitc-iris-android.apk`. Phone smoke is pending; prioritize
layer/filter toggles, level/key labels, ornaments/artifacts, pan/zoom, inventory refresh and map reload.
No commit, push or merge was performed for ARCH-10–12 or these follow-ups.


### 2026-11-06 — authorized maintainability follow-ups (ARCH-13–16)

The user authorized all four follow-ups before completing the ARCH-10–12 phone smoke. These changes remain on
`refactor/renderer-maintenance`; the existing signed APK 1874 still represents the earlier renderer checkpoint.
This plan owns progress; architecture.md owns lasting contracts, and roadmap/backlog only link here.

| Done | ID | Improvement | Implementation / acceptance |
| --- | --- | --- | --- |
| [x] | ARCH-13 | Dependency boundaries | Local ESLint rule enforces core independence, UI primitive isolation and private runtime entry points. Resolve relative paths; check imports, exports, literal dynamic imports, require and TS import types. Explicit page-composition and type-only diagnostic/settings exceptions; regression tests run in `npm run check`. |
| [x] | ARCH-14 | Shell navigation owner | `shell/use-shell-navigation.ts` owns sheet/panel/image state, restore/persistence, visibility guards and deferred search focus. `shell/sheet-navigation-actions.ts` owns cancellation/setter/storage ordering; existing action tests move with it. Feature requests/primary-menu composition and message-adapter ordering remain explicit in App. |
| [x] | ARCH-15 | Request diagnostic helpers | `map/map-request-diagnostics.ts` owns payload types, render occurrence/unique-key accumulation and fresh artifact defaults. Request coordinator retains timers, generation/cancellation/cache ownership, artifact success/error handling and publication timing. |
| [x] | ARCH-16 | Lifecycle contracts | Architecture guide records owner lifetimes, triggers, stop/invalidate operations, retained data and cleanup responsibilities. Preserve current activation behavior and direct typed owners; no common base class or feature engine. Record the existing Missions cancellation/loading limitation before future dormancy work. |

Navigation regressions use real Preact state/effects and cover restored panels, cancellation before persistence,
hidden-sheet rejection/closure, image-and-sheet closure, deferred focus replacement, navigation-away and unmount
cleanup. Search focus now has an explicit frame owner; pending focus cannot survive navigation away or App unmount.
Existing cancellation/setter/storage order is unchanged. Diagnostic regressions distinguish render occurrences from
unique tile keys and verify independent defaults/prior snapshots. Four lint-rule test groups exercise allowed and
rejected dependencies, TypeScript type-only exceptions, and alternate import forms.

App: 1,036 → 993 LOC; command callbacks: 157 → 95; map requests: 859 → 767. New navigation hook/actions:
82/64 LOC; diagnostic helper: 84 LOC. Production source grows 24,424 → 24,458 (+34) across this batch, for explicit ownership
and focus cleanup; no runtime performance improvement is claimed.

Browser validation caught a Search-focus regression in an initial cleanup effect: an older pending effect could
cancel a newly requested frame. Cancellation now belongs to the sheet setter, including message-adapter transitions;
unmount cleanup only releases the outstanding frame. A fifth navigation regression covers opening before pending
mount effects flush. All six Search browser cases pass with the fix; no timeout or retry allowance was changed.
Final repository checks pass with 719 app/core tests (137 core, 582 app), 6 release checks, 18 build guards,
4 architecture-rule test groups, lint/types, CSS and workbench. All 65 Chrome cases pass on the final source (47.4 seconds). `package:reuse` refreshes XPI/ZIP
`2026-11-06T19-47-21` from the verified web output; shared assets match. Markdown targets and whole-change
whitespace checks pass. No new APK was built: APK 1874 covers the earlier ARCH-10–12 renderer checkpoint, and
its phone smoke remains pending. ARCH-13–16 and ARCH-10–12 remain uncommitted; no push or merge was performed.


### 2026-11-06 — request coordinator review and improvement (ARCH-17–18)

The user authorized investigation and implementation of the request-coordinator improvements. Review found that
endpoint formatting/parsing and per-refresh cache/queue/response accounting still shared the coordinator closure.
The existing generation checks, five-slot refill execution, delays, cancellation and publication order form a
cohesive lifecycle owner and remain together. No renderer extraction or general request framework is included.

| Done | ID | Owner | Scope / acceptance |
| --- | --- | --- | --- |
| [x] | ARCH-17 | `map/map-entity-transport.ts` | Own getEntities/getArtifactPortals endpoint inputs/decoding and fixture reads; retain CSRF read timing, groups, headers, version/signal arguments, HTTP/HTML/empty/JSON error semantics and artifact empty-result behavior. Coordinator controls request timing and cancellation. |
| [x] | ARCH-18 | `map/map-refresh-session.ts` | Own one refresh's fresh-cache selection, tile/render queues, filtered response merging, retry accounting, stale fallback and diagnostic snapshots. Inject the page-owned cache. No timers, DOM, network, generation state or render callbacks. Coordinator checks generations before applying a batch, chooses delays/refills and publishes entities/history/status. |

The session is a concrete state owner, not a moved closure taking the coordinator's callbacks. Its queue mutations
are explicit start/apply/stale/complete operations; the queue getter is for coordinator decisions. The page cache
and old-response handoff stay with the coordinator. Superseded network results are filtered to still-wanted tiles
before current-session application; unrelated stale cache warming remains disabled. Existing core retry/queue/cache
algorithms are reused. Transport/session entry points are protected by the architecture import rule.

A new regression reproduced an existing bug: after a newer refresh completed, an older artifact success/failure
could overwrite its artifact diagnostic snapshot, even though obsolete entities themselves were rejected. The
coordinator now checks the generation before artifact loading/completion/error snapshot writes. Late success and
failure cases verify the newer snapshot/publications remain intact; artifact work still starts with the first
progress render and is awaited before final ready publication. The prior failing output is recorded locally at
`/tmp/iris-artifact-generation-repro.log`; the lasting regression is in `map-request.test.ts`.

Focused evidence: the existing coordinator/diagnostics tests pass. Three session tests cover fresh/stale cache
selection, initial versus outstanding tile diagnostics, filtered external delivery without active-slot consumption,
retry recovery/counters and prior snapshots. Four transport tests cover exact request inputs, auth versus ordinary
failure classification, artifact error/empty semantics and current-map fixture reads. Both obsolete-artifact
regressions pass. Focused type checks, affected lint and import-boundary regressions pass.

Coordinator: 767 → 530 LOC; `refreshEntities()`: 396 → 269 LOC. Transport/session: 105/140 LOC. Across these
production files, 767 → 775 (+8) for explicit contracts and the artifact generation fix. No performance gain is
claimed. Remaining refill execution and progress publication stay explicit in the coordinator; another extraction
is not automatically required just to make it smaller. Changes remain uncommitted on `refactor/renderer-maintenance`.


Final validation passes `npm run check`: 728 app/core tests (137 core, 591 app), 6 release checks, 18 build guards,
4 architecture-rule test groups, lint/types, CSS and workbench. All 65 Chrome browser cases pass (50.8 seconds),
including concurrent/refill/cache recovery, map replacement and combined update timing/identity checks. No browser
timeout, retry or performance threshold was relaxed. `package:reuse` produces XPI/ZIP `2026-11-06T19-58-21`;
all 22 shared asset files in each package match the verified web output. Local Markdown links, new source endings
and whole-change whitespace checks pass. Whole app/core production source is 24,466 LOC (+8 in this batch).
APK 1874 remains the earlier renderer checkpoint and does not contain ARCH-13–18. Phone smoke remains deferred;
no new APK, commit, push or merge was performed.
