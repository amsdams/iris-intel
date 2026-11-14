# Architecture and invariants

The [porting doctrine](port-plan.md) owns behavioral reference/deviations; this guide owns implementation boundaries.

## Dependencies and ownership

- `packages/iitc-core` owns pure parsing, normalization, geometry, ordering, aggregation and request/cache planning.
  No production dependencies, browser/DOM/Preact/Leaflet/extension APIs or app message imports.
- `apps/iitc-iris` owns UI, workflows, transport, auth, timers, Leaflet and browser integration. Shared `ui/` primitives
  do not import features. ESLint enforces import/re-export/dynamic/type boundaries; deliberate changes require rule updates.
- Features own their components/styles/helpers/tests under `map/`, `portals/`, `agent/`, `comm/`, `system/`; `shell/`
  coordinates navigation. Extract pure stable facades, not JSX/gestures/layer mutation or forwarding-only wrappers.
  Preserve intentional effect registration, persistence and setter/cancellation ordering when moving ownership.
- Typed bridge payloads are not JSON validation or authentication of same-page scripts. Credentials/version/CSRF stay
  in page-owned Intel transport. Endpoint-specific empty/error/auth handling remains explicit.
- App assembly receives/adapts state; the page runtime composes current-map owners. Queue/cache sessions are pure;
  network/timers/render publication stay in their coordinator. Features read other owners through explicit callbacks.
- Prefer direct typed owners and existing registries over a global store, generic dispatcher, activation engine or
  plugin framework without a concrete consumer. Menu placement, layer visibility and processing activation are separate.
  Layers control objects/visibility; highlighters restyle visible portal markers. Split features that do both.

The root minimatch override addresses a development-tool advisory. Reassess/remove it when upstream consumers adopt
patched versions; past audit counts do not establish current security. Recheck the Leaflet private seam on upgrades.

## Lifetimes, cancellation and storage

- Map replacement/disposal releases owned requests, timers, frames, listeners, gestures, canvases and WebGL resources
  idempotently. Page listeners/caches, selection/history, mission caches and accepted inventory/subscription data survive.
  Surviving owners read the current map through callbacks rather than capture old instances.
- Cancellation stops work; invalidation also rejects obsolete completions. Check generation/wanted tiles before session
  mutation, including artifact completion. Movement may keep useful old tile replies for cache/current wanted tiles.
- Clear removes layers before resetting references; resetting indexes alone is not teardown. Data changes invalidate
  hidden-layer caches. Filter-only updates retain layer identities; decoration visibility is independent of core filters.
- Leaflet 1.9's private canvas seam must cancel queued frames before synchronous redraw loses their handles; explicit
  and implicit renderers share it. Late image loads must not revive disposed overlays; image caches are bounded.
- Closing/hiding a panel retains its data/settings unless its explicit contract says otherwise. Panel cancellation
  leaves shared subscription work running; map disposal cancels it and returns loading subscription state to unknown.
- Optional preference failures leave the app usable. Owners retain keys, normalization/migration and serialization;
  do not conflate optional preferences with auth/session storage, Draw Tools errors or mission cache maintenance.
- Mission details live 3 days; portal summaries live 3 weeks but enrich metadata only from valid shorter-lived details.
  Portal detail cache is page-scoped (12 entries); selected-GUID guards reject stale replies and accepted history updates
  the shared entity. Derive player/topology-dependent statistics from current state, not cached presentation values.

## Shared requests and truthful state

- COMM has one interested-channel poller with shared public requests for visible channels/tracker. History/foreground
  completion must not postpone deadlines. Material mutually padded bounds changes reset local public/faction cursors
  and reject old-area replies; alerts/tracker history have separate lifetimes. Navigation/readiness synchronize interest.
- Invalid envelopes/timestamps cannot change buffers/cursors. Drafts are per channel; late acknowledgments cannot erase
  newer text. Pending sends survive closure. Display filters never change raw public tracker input; portal activity
  subscribes to loaded data and adds no polling. COMM does not reconstruct authoritative map entities.
- Inventory requires the shared C.O.R.E. check; malformed responses retry at most three attempts, valid-empty lists do
  not repeatedly retry. Failed/empty refreshes retain accepted items/counts. Unloaded values differ from loaded zero.
- Omitted score checkpoints are not zero observations; projections/timers use the received cycle and expire honestly.
  Passcode redemption is explicit with no hidden uncertain-result retry; static Profile data refreshes on reload.
- Diagnostics replace snapshots instead of merging obsolete retry/source fields, and reading them adds no requests.
  Freshness labels use actual timestamps/cache flags; runtime completion and animation-frame timings remain distinct.

## UI and host boundaries

- Components own appearance/interaction/responsive CSS; callers own placement. Shell/theme/map DOM infrastructure is
  shared. Use native elements, meaningful tokens/variants and bounded specificity; CSS imports do not provide scoping.
  Preserve game palettes independently of UI theme/text size; complete JSX/CSS/export migrations together.
- Native forms share empty/busy guards in controls and handlers; Button defaults to non-submitting. Keep essential
  headers/actions reachable, ordinary panels in one body scroller, and COMM history/composer scrolling intentional.
- Modal previews trap focus, restore inert state/connected-trigger focus and isolate shortcuts. Cancel deferred Search
  focus on navigation/replacement/unmount without cancelling a newer frame. Preserve portal reading/section preferences.
- Map style is independent of theme/text size. Keyboard/safe-area overlay repositioning does not resize the map.
  Clipboard feedback belongs to its initiating area; obsolete completions cannot overwrite newer feedback.
- Shared assets resolve through the host asset base. About includes visible credits and offline license notices in
  extension/APK builds. Do not fabricate extension APIs or privileged native bridges; see the [Android guide](../../apps/android-intel-spike/README.md).
