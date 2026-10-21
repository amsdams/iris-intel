# IITC IRIS Port Plan

Repository cleanup (2026-10-20): only `apps/iitc-iris` and `packages/iitc-core` remain active. Earlier IRIS/Mini-IRIS
code and documentation references below are historical Git paths; see the root README for retrieval. Retained samples
now live in `docs/iitc-iris/fixtures/`. Current implementation scope is in [the roadmap](plans/index.md).

Goal: maintain a clean IITC-compatible app with a compact UI shell, Leaflet rendering, and an IITC-CE-derived core.

Porting rule: prefer IITC-CE file names, public method names, data model names, and UI concepts when adding ported
behavior. Diverge only when TypeScript packaging, extension boundaries, or deliberate product decisions require it, and
document the reason near the relevant feature checkpoint. Existing IRIS/Mini-IRIS names can be used as local reference
material, but they should not become the default naming source for IITC IRIS.

## Porting Doctrine

The goal is behavioral parity with IITC-CE without importing its incidental complexity. IITC IRIS should preserve IITC
concepts and seams so comparison and debugging stay cheap, while using modern TypeScript boundaries, tests, and small
modules to avoid carrying over hard-to-maintain structure.

Non-functional requirements:

- Source of truth: use `reference/ingress-intel-total-conversion` first for behavior, naming, request shape, lifecycle,
  and UI concepts. Use
  earlier IRIS/Mini-IRIS from Git history only as implementation reference or migration context.
- Parity before improvement: the first acceptable version of any core map workflow is the IITC-CE behavior, not a
  cleaner IRIS-style reinterpretation. Optimization, UX redesign, and architectural simplification are allowed only
  after parity is demonstrated or the divergence is documented as temporary.
- Name compatibility: keep IITC names for recognizable domains such as `comm`, `parseMsgData`, `portalDetails`,
  `getEntities`, `artifacts`, `ornaments`, `links`, `fields`, `portals`, and layer/UI concepts. Do not rename a concept
  just because a cleaner generic name exists.
- Structure freedom: do not copy IITC file layout, globals, DOM coupling, or mutation-heavy flow when those are
  incidental. A cleaner module boundary is allowed if exported names and behavior remain easy to map back to IITC.
- Parity harness first: every ported subsystem needs copied diagnostics, fixture/live comparison points, and focused
  tests before broader UI polish.
- Behavioral deltas must be explicit: if IITC IRIS intentionally differs from IITC-CE, document why in this plan and
  expose enough diagnostics to verify the impact.
- Thin runtime, tested core: request planning, parsing, decoding, classification, and derived counters should live in
  `packages/iitc-core`; the extension runtime should mostly wire Leaflet, browser APIs, and UI messages.
- Avoid “smart” rewrites before parity: simplify internals only after the equivalent IITC behavior is understood, named,
  and covered by tests or diagnostics.
- Preserve IITC runtime semantics before optimization: for every ported subsystem, identify the IITC ownership model,
  lifecycle, mutation path, and hook/plugin contract. Prefer an explicit typed equivalent of the IITC model over a local
  shortcut that only matches the visible output.
- Visual parity is not JavaScript timing: for interaction-sensitive map features, measure click-to-pixels latency across
  content dispatch, page-runtime work, Leaflet invalidation, and browser paint before choosing further optimizations.
- Do not claim implementation superiority without measured visual parity: an IRIS implementation can be structurally
  cleaner or faster in internal timings, but it is not better than IITC-CE until click-to-visible behavior is comparable
  or intentionally documented as a divergence.
- Keep user-facing UI comparable: core map workflows should look and behave close enough to IITC-CE that screenshot and
  live-state comparisons are meaningful. Debug and fixture controls can remain IITC IRIS-specific, but should stay
  visually separate.

Required process for each new subsystem:

1. Identify the IITC-CE source files under `reference/ingress-intel-total-conversion` and record them in the pass notes
   before implementing.
2. Record the IITC ownership model, lifecycle, mutation path, and whether the behavior is hook/plugin-visible.
3. List the IITC public concepts being ported: file/module name, function names, endpoint names, data fields, UI
   pane/control names, and lifecycle events.
4. Choose IITC-aligned names at the boundary first. For example, prefer `comm.ts` plus `parseMsgData` over a cleaner but
   less traceable `plext.ts` parser name.
5. If a cleaner internal split is useful, keep a small IITC-named facade that maps directly back to the IITC source. The
   facade is the debugging contract.
6. Add tests or copied diagnostics that prove the IITC behavior before adding larger UI or architectural cleanup.
7. For interaction-sensitive features, add click-to-pixels diagnostics or document why visual parity is not yet measured.
8. Document every intentional divergence in this plan with the reason, expected effect, and how to compare it against
   IITC-CE.

Validation rule: after validating IITC IRIS code changes, run `npm run package` from the repository root so
the extension build and ZIP/XPI packaging are checked. Documentation-only changes do not require this package step.

Current local reference checkout: `reference/ingress-intel-total-conversion`. Older notes may refer to the same IITC-CE
lineage by repository name; new source references should use the local path above so searches and comparisons are
directly reproducible.

Naming checklist before creating a new file or exported function:

- Is there an IITC file or function with this responsibility? Use that name or an obvious TypeScript variant.
- Is the word from Intel payload terminology but not IITC module terminology, such as `plext`? Use it inside field/types
  where accurate, but prefer the IITC module concept at file/API boundaries, such as `comm`.
- Would a future debugger know where to look in `reference/ingress-intel-total-conversion` from this name? If not,
  rename or add a documented facade.
- Is the new name borrowed from current IRIS/Mini-IRIS? Treat that as suspect unless the pass explicitly documents why
  IITC naming is not appropriate.
- Is the divergence only for code cleanliness? Keep the IITC name at the boundary and hide the cleaner structure inside.

## Current Status - 2026-10-20

IITC IRIS has the core live-map path, entity rendering, geodesic links/fields, portal selection/details, COMM, scores,
missions, inventory, passcodes, agent profile, player tracker, search, diagnostics, Draw Tools v1 links/markers, and
portal analysis Counts/List/Scoreboard views. CSS/component ownership, feature composition, and repository/runtime
cleanup are complete; see [Application Architecture](architecture.md) for the retained ownership contract and limits.

The extension version is `0.1.2`. Latest verification passed 112 core and 405 app tests, lint/typechecks, CSS lint,
workbench build, and Chrome/Firefox packaging. The user reported the cleanup smoke test passed. Build/install commands
and artifact naming are maintained in the [root README](../../README.md#development).

Only `apps/iitc-iris` and `packages/iitc-core` remain active. The retired diagnostics fixture choices and empty fallback
maps were removed; the app uses live Intel data. Retained [payload samples](fixtures/README.md) are reference material.
Android hosting remains unproven and is governed by the [APK plan](plans/android-apk-installable-plan.md).

Base-map divergence (2026-10-21): CARTO’s key requirement prompted replacing Dark/Light with OpenFreeMap
Dark/Positron through MapLibre’s Leaflet binding. This changes basemap cartography, while Leaflet retains camera,
overlay, and interaction ownership; OSM remains available. Preference migration and real-tile browser checks pass.
The user tested the updated XPI and APK and reported both look fine (2026-10-21).

Cross Links correction (2026-10-21): port `cross-links.js` whole-arc classification and tolerant shared-anchor
checks into pure core helpers, replacing IRIS's sampled planar intersections. Intentional delta: omit the upstream
raw-longitude rejection and recognize equivalent wrapped endpoints so crossings across the antimeridian work.
Compare the focused fixtures with upstream: ordinary/shared-anchor results should agree; wrapped cases reproduce
and correct the reference limitation. Rendering, visible-link filtering, and runtime ownership remain unchanged;
snapping stays parked with its existing IITC-compatible viewport/nearest-portal behavior. See [Draw Tools](features/draw-tools.md).

## Documentation Layout

Feature details have been split out of this entry point so the current truth is easier to scan:

| Area | Status | Detail |
| --- | --- | --- |
| Missions | Partial | [features/missions.md](features/missions.md) |
| Internal registry and lifecycle facades | Native foundation implemented | [features/hook-plugin-lifecycle.md](features/hook-plugin-lifecycle.md) |
| Geodesic rendering | Partial | [features/geodesic-rendering.md](features/geodesic-rendering.md) |
| Map lifecycle | Partial | [features/map-lifecycle.md](features/map-lifecycle.md) |
| Scaffold/request lifecycle | Done/Partial | [features/scaffold-request-lifecycle.md](features/scaffold-request-lifecycle.md) |
| Entity decode and Leaflet rendering | Partial | [features/entity-rendering.md](features/entity-rendering.md) |
| Comparison UI | Implemented / Live comparison | [features/comparison-ui.md](features/comparison-ui.md) |
| Portal selection and details | Implemented / Partial parity | [features/portal-details.md](features/portal-details.md) |
| IITC side request/UI systems | Implemented / Partial parity | [features/side-systems.md](features/side-systems.md) |
| Draw Tools | Stable v1 / Partial | [features/draw-tools.md](features/draw-tools.md) |
| Portal analysis views | Stable v1 / Partial | [features/portal-analysis.md](features/portal-analysis.md) |
| Highlighters and layers | Stabilized v1 / Partial | [features/highlighters-and-layers.md](features/highlighters-and-layers.md) |
| Backlog and watch items | Ongoing | [backlog.md](backlog.md) |
| Roadmap | Ongoing | [plans/index.md](plans/index.md) |

## Current High-Level Gaps

- Map lifecycle is parked as acceptable for current UI/plugin parity work. Queue refill, old wanted-response bridging,
  IITC comparison timing, incremental core rendering, cache-fresh rendering, and retry recovery have live validation.
  True stale-cache retry exhaustion is still wired/diagnosed but needs a live case that proves cached stale tiles render
  exactly like IITC.
- Plugin-facing compatibility remains intentionally limited: no broad `window.plugin.*`, `addHook`/`runHooks`, toolbox,
  plugin-facing highlighter API, full plugin layer registry, or Leaflet.draw event parity yet. Native highlighter
  selection is stable for existing IRIS highlighter-like behavior and IITC-CE's single active highlighter model. The
  layer registry now has shared metadata/defaults, diagnostics, focused routing for non-core overlays, click-to-pixels
  timing, persistent Leaflet groups for whole `F`/`LN`/`P` overlay hide/show, named IITC-style filter descriptors,
  preserved layer instances for filter-only changes, lazy copied-status counts, and scoped/direct faction buckets. The
  main visual-latency mistake was fixed by deferring heavy copied entity-status reposts until after the map has had two
  animation frames to paint. Faction filters remain the watch item, but the team-subgroup optimization attempt was
  measured and rolled back because it worsened paint timing.
- Draw Tools v1 is links/markers only. Polygons, circles, visible snap cleanup UX, `DrawTools Opt`, stock Intel `pls`,
  and plugin-facing `window.plugin.drawTools` / `pluginDrawTools` remain deferred.
- The bottom-sheet/two-layer menu model is a deliberate product-shell divergence from IITC's sidebar/dropdown/statusbar
  UI.

## Next Planning Entry Points

- For new feature ports, update the relevant feature file or add a new file under `docs/iitc-iris/features/`.
- For cross-cutting parity gaps and prioritization, update [backlog.md](backlog.md).
- Keep this file as the short index, doctrine, latest validation snapshot, and high-level gap summary.
