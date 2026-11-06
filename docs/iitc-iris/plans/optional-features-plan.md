# UI Customization & Feature Activation Plan

Status: proposed backlog work, reviewed against source on 2026-11-04. No implementation has started. This plan does
not expand the completed [architecture maintenance plan](architecture-maintenance.md) or the current APK smoke scope.

## 1. Direction & Principles

IRIS can serve different users through menu customization, progressive disclosure and explicit feature activation.
A third-party plugin engine is unnecessary for this goal; independently distributed extensions would be a separate
product requirement. Keep existing typed feature owners and direct callbacks. Do not introduce an `IrisFeatureModule`
lifecycle engine, dynamic registration or a generic dispatcher without repeated, demonstrated lifecycle needs.

- Keep the five primary domains: `Selected`, `Map`, `Agent`, `COMM`, `System`. The existing Selected label can still
  become Portal, Link or Field according to selection. Customize secondary access rather than changing that structure.
- Offer platform-neutral starting presets. Mobile use does not imply casual use, and desktop use does not imply
  planning. Preserve existing installations; do not change presets automatically on resize, rotation or upgrade.
- Keep menu placement, map-layer visibility and runtime activation separate. Moving a tool into More tools must not
  alter drawings, layers, tracking, requests or stored feature data.
- Keep essential portal information easy to reach; use disclosures selectively for secondary controls and technical
  detail. Reuse existing UI primitives and native `details`/`summary`. For custom disclosure buttons, retain keyboard
  activation and expanded-state semantics described by the [W3C disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
  Verify focus restoration and Android Back for the More tools surface. This plan does not silently change existing
  portal-section preferences or force every section open.
- Measure computation and rendering costs before adding further dormancy. No battery, CPU or frame-rate benefit is
  established merely by hiding a menu item.

## 2. Current Evidence & Runtime Boundaries

| Feature | Current ownership and behavior | Gap / invariant |
| --- | --- | --- |
| Portal Analysis | [postEntityStatus](../../../apps/iitc-iris/src/map/map-diagnostics.ts#L218) computes `getIitcPortalAnalysis` whenever entities and viewport bounds exist, including status republication; there is no panel-visibility guard. Core owns aggregation; the app owns filtering, sorting and presentation. | It is not currently on-demand. Measure initial tile batches, movement and repeated status publications before proposing caching or lazy calculation. |
| Player Tracker | [COMM](../../../apps/iitc-iris/src/comm/comm-runtime.ts#L377) passes the entire retained public buffer. [Page composition](../../../apps/iitc-iris/src/page-map-runtime.ts#L204) supplies tracker polling interest from layer/zoom visibility, then separately processes tracker history, renders markers and publishes portal activity. | Layer visibility already limits tracker-owned polling, but public data fetched for COMM still reaches tracker processing. Gate tracker work without suppressing shared COMM buffers or portal activity. |
| Draw Tools | [Crossing checks](../../../apps/iitc-iris/src/map/draw-tools/draw-tools-runtime.ts#L366) already skip disabled drawn-link/Intel-link layers and empty drawn-polyline lists. Menu hiding preserves stored drawings and their selected layer visibility. | Measure remaining work before adding guards that already exist. Source does not establish a sheet-lifetime click-to-draw mode; audit actual actions/gesture ownership before proposing one. |
| Missions | [The runtime](../../../apps/iitc-iris/src/map/missions/missions-runtime.ts#L323) requests `getTopMissionsInBounds`, `getTopMissionsForPortal` and details, with persistent caches. `cancelRequests` aborts active list/detail requests; abort handlers return without resetting loading state. | Close-during-loading/reopen recovery needs a regression before calling the lifecycle complete. This is a cancellation risk identified from source, not a reproduced user-visible failure in this review. |

Current System → Panels is genuinely a visibility control: [panel-visibility.ts](../../../apps/iitc-iris/src/shell/panel-visibility.ts)
recognizes only Counts, List, Scoreboard, Links and Markers. Existing navigation/restoration guards reject hidden sheets.
Do not reuse that rejection behavior for an unpinned tool: More tools and shortcuts must still be able to open it.

## 3. Menu Customization Contract

### Availability and pinning

Use “Show in quick menu” or “Pin” wording instead of “Enable” for placement controls. All tools remain available.
The primary domains and baseline utilities remain accessible: Search, Display, Controls, selected-object Details,
Profile, Inventory, COMM, Appearance, Customize, Diagnostics, Shortcuts and About. Native recovery remains unchanged.

The initial customizable IDs are:

- Map: `drawLinks`, `drawMarkers`, `portalCounts`, `portalsList`, `scoreboard`, `scores`, `missions`.
- Agent: `passcode`.

Reuse [menu-registry.ts](../../../apps/iitc-iris/src/shell/menu-registry.ts) for eligibility/domain metadata. Keep stable
sheet IDs, including `panelSettings`; rename its visible label to Customize without breaking restored navigation.

Pinned tools appear in the existing secondary row. Unpinned tools appear in More tools for the current domain, with
no extra primary tab. Only show the More tools action when that domain has overflow entries. Opening an overflow tool
must preserve the normal sheet behavior and active indication without pinning it. Unpinning the currently open tool
must not close it or cancel its requests. Existing shortcuts and contextual actions remain usable.

Missions has both Map/view and Selected/portal entry points. Its pin preference applies to both placements; overflow
must retain the correct source and selected portal, rather than always opening the viewport list.

### Presets

- Compact unpins all eight customizable tools; baseline utilities remain available.
- Planning pins all eight, including Passcode. This matches current full menu visibility.
- Custom is derived when the normalized pinned set matches neither preset. It is not a third preset button.

Preset buttons apply a menu configuration once. They never change layer settings, tracker activation or feature data.
An individual edit that returns to an exact preset set restores that preset's label.

### Storage and migration

Use `iitc-iris:menu-preferences:v1` with `{pinnedTools: CustomizableToolId[]}`. Derive the preset label; do not persist
both a label and a potentially contradictory selection. Restrict IDs to the customizable set, normalize duplicates
and unknown IDs, and use registry order for display. Newly introduced optional tools absent from an existing valid
selection belong in More tools until pinned.

- A valid new preference takes precedence over the legacy key, including an intentionally empty pinned list.
- When the new key is absent, a valid legacy `iitc-iris:hidden-panels` array seeds all eight pins minus the known
  legacy hidden panels. Other tools retain their existing visibility. Keep the legacy key for older builds.
- With no usable preference, retain current full visibility (Planning). A valid legacy empty array also means full
  visibility. Do not select Compact automatically for existing or new installations in this first phase.
- A malformed new value may recover from valid legacy data; otherwise use full visibility. Do not overwrite corrupt
  stored data during fallback reads. On a valid migration, write the new format through the optional storage boundary;
  on explicit user edits, persist the normalized selection.
- Missing/blocked/quota-limited storage must leave the current page usable. Persist only menu choices here; feature
  data and activation settings retain separate owners/keys.

## 4. Player Tracker Activation Contract

This is a later phase, independent of menu presets. Proposed control: a dedicated “Track players” activation flag in
Display, defaulting on for compatibility. Existing faction/zoom choices still control marker visibility and eligibility
for tracker-owned polling. Decide and document its storage migration before implementation; do not silently reinterpret
all existing layer switches as a new global activation setting.

When inactive, skip coordinate/player-history processing, clear visible tracker markers/traces, and remove only
tracker-owned public polling interest. Preserve existing history data, subject to its normal retention policy.
Other channel interests, manual/history requests, sending and portal-activity publication continue under their existing
rules. Turning Tracker off does not promise that all COMM network traffic stops.

### Reactivation and retained buffers

Proposed policy is **no replay of already observed public messages**, rather than a client wall-clock event cutoff:

- While inactive, remember observed message GUIDs with lightweight delivery/deduplication bookkeeping; do not call
  the tracker location parser or allocate player histories. On reactivation, seed the exclusion baseline from the
  currently retained public buffer, retaining suppression of messages observed while off.
- After reactivation, messages first observed after that transition are eligible, even if their server event time is
  older. This includes delayed replies or previously unseen history; it is not a promise to exclude every event that
  occurred during the disabled interval. A stricter event-time policy requires a separate decision and server-time/
  equal-timestamp rules.
- Core messages expose `guid` and `time`, not `timestamp`. Do not implement `msg.timestamp >= Date.now()` or assume
  that client and server clocks agree.
- Keep exclusion/deduplication state bounded with an explicit retention/reset policy that does not accidentally
  replay a retained buffer. Preserve activation across map replacement and do not create duplicate pollers/listeners.
  A full page reload starts a fresh delivery session and retains normal bounded initial-history behavior when active.

Keep the guard at the existing page/tracker boundary or pass explicit delivery metadata from COMM if needed. Do not
make COMM depend on tracker internals or wrap the entire shared `onPublicMessages` callback in a tracker guard.

## 5. Phases and Evidence Gates

| Phase | Scope | Completion evidence |
| --- | --- | --- |
| 1 — Customize | Rename Panels, implement pinning/More tools, presets and migration using existing registries/components. | Preference and navigation checks below; no runtime feature activation changes. |
| 2 — Tracker activation | Implement the separate activation and observed-buffer policy, with explicit retention/lifetime ownership. | Processing/poll counters plus off/on, replay, shared-COMM and map-replacement regressions. |
| 3 — Profiling | Measure analysis/status republication and remaining Draw Tools costs with controlled dense fixtures. | Record entity/drawn-line counts, settings, viewport/device, cold/warm timings, analysis call counts and frame timings. Compare equivalent outputs; propose further work only from evidence. |

The Missions cancellation probe is a separate targeted correctness follow-up, not a prerequisite for menu pinning.
If it reproduces a defect, specify the fix and recovery behavior separately. Do not describe the current abort path as
already restoring idle/cached UI state.

If profiling justifies lazy analysis, first audit all message/UI consumers and define invalidation, refresh-on-open,
explicit demand across the page/content bridge and stale/null payload behavior. Hiding analysis menus is not a valid
substitute for that contract. Record intentional IITC behavior changes and measured runtime findings in the
[port plan](../port-plan.md); keep this file the implementation scope/tracker if the work is selected.

## 6. Acceptance Checks

- Preference normalization/migration: missing, empty, malformed and conflicting keys; unknown/duplicate IDs; blocked
  reads/writes; exact preset matching; reload; new optional tools; no deletion of feature data.
- Menu integration: baseline utilities remain reachable; More tools opens unpinned tools through real navigation
  guards; unpinning an open sheet leaves it open; shortcuts and Selected/portal Missions preserve their context.
- UI accessibility: keyboard activation/focus return, active overflow indication, Android Back, narrow portrait and
  short landscape layouts. Existing portal-section preferences remain intact.
- Independence: pinning/presets leave map layers, drawings, polling and tracker activity unchanged.
- Tracker off/on: no location parsing or player-history growth while off; tracker-owned interest stops without
  stopping other consumers; markers clear; retained history expires normally; already observed buffers are not
  replayed; equal/out-of-order timestamps, delayed/history replies and repeated toggles follow the stated policy.
- Lifetimes: map replacement, page reload, background/resume and late responses preserve the selected settings and
  do not duplicate listeners/timers. COMM channels/drafts/sending and portal activity remain functional.
- Use focused domain/storage tests and real-browser integration for the relevant phase. Once a phase settles, follow
  [SKILL.md](../../../SKILL.md) for full applicable checks and prepare a downloadable build only when needed for testing.
