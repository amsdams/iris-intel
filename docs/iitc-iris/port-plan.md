# IITC IRIS Port Plan

Goal: build a clean IITC-compatible IRIS track with a Mini-IRIS-sized UI shell and an IITC-CE-derived core. This track
should use the same map library family as IITC-CE and avoid depending on the current IRIS map renderer while the port is
being validated.

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
  current IRIS/Mini-IRIS only as implementation reference or migration context.
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
- Keep user-facing UI comparable: core map workflows should look and behave close enough to IITC-CE that screenshot and
  live-state comparisons are meaningful. Debug and fixture controls can remain IITC IRIS-specific, but should stay
  visually separate.

Required process for each new subsystem:

1. Identify the IITC-CE source files under `reference/ingress-intel-total-conversion` and record them in the pass notes
   before implementing.
2. List the IITC public concepts being ported: file/module name, function names, endpoint names, data fields, UI
   pane/control names, and lifecycle events.
3. Choose IITC-aligned names at the boundary first. For example, prefer `comm.ts` plus `parseMsgData` over a cleaner but
   less traceable `plext.ts` parser name.
4. If a cleaner internal split is useful, keep a small IITC-named facade that maps directly back to the IITC source. The
   facade is the debugging contract.
5. Add tests or copied diagnostics that prove the IITC behavior before adding larger UI or architectural cleanup.
6. Document every intentional divergence in this plan with the reason, expected effect, and how to compare it against
   IITC-CE.

Validation rule: after validating IITC IRIS code changes, run `npm run package:iitc-iris` from the repository root so
the
extension build and ZIP/XPI packaging are checked. Documentation-only changes do not require this package step.

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

## Current Status - 2026-06-10

IITC IRIS is in a usable parity/polish checkpoint. The extension now has the core IITC live-map path, entity rendering,
geodesic links/fields, portal selection/details, COMM, scores, missions, inventory, passcodes, agent profile, player
tracker, search, diagnostics, native Draw Tools v1 for links/markers, and stable first-pass native portal analysis views
for counts, list, and scoreboard.

Latest map lifecycle validation included:

- `npm run test:iitc-core -- --run src/map-data-request.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`
- Manual live fast-pan and IITC-timing scenario copies at z15. Fast mode stayed complete after pan/retry recovery.
  IITC-timing mode exercised the 400ms movement debounce and 1000ms live download delay while panning, then settled to
  complete renders with no partials, no warning strings, no active requests, and no queued tiles.

Latest IITC IRIS portal analysis validation included:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:css`
- `npm run test:iitc-core -- --run src/portal-analysis.test.ts`
- `npm run package:iitc-iris`
- `git diff --check`
- Manual live comparison against IITC's `portal-counts`, `portals-list`, and `scoreboard` plugins; no blocking
  mismatches found for the stable v1 checkpoint.

Latest core fixture-health validation included:

- `npm run test -w packages/core`
- `npm run typecheck:core`
- `npm run lint:core`
- `npm run test:iitc-core`
- `npm run typecheck:iitc-core`
- `npm run lint:iitc-core`

Latest package artifacts:

- `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-06-10T15-45-23.zip`
- `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-06-10T15-45-23.xpi`

Fixture-health note: the previous missing-fixture degradation for full `npm run test:iitc-core` is resolved in the
current workspace. `@iris/core` and `@iris/iitc-core` full test suites are green; no fresh HAR capture is required for
this checkpoint.

## Documentation Layout

Feature details have been split out of this entry point so the current truth is easier to scan:

| Area                                | Status              | Detail                                                                           |
|-------------------------------------|---------------------|----------------------------------------------------------------------------------|
| Missions                            | Partial             | [features/missions.md](features/missions.md)                                     |
| Geodesic rendering                  | Partial             | [features/geodesic-rendering.md](features/geodesic-rendering.md)                 |
| Map lifecycle                       | Partial             | [features/map-lifecycle.md](features/map-lifecycle.md)                           |
| Scaffold/request lifecycle          | Done/Partial        | [features/scaffold-request-lifecycle.md](features/scaffold-request-lifecycle.md) |
| Entity decode and Leaflet rendering | Partial             | [features/entity-rendering.md](features/entity-rendering.md)                     |
| Comparison UI                       | Started             | [features/comparison-ui.md](features/comparison-ui.md)                           |
| Portal selection and details        | Started             | [features/portal-details.md](features/portal-details.md)                         |
| IITC side request/UI systems        | Started             | [features/side-systems.md](features/side-systems.md)                             |
| Draw Tools                          | Stable v1 / Partial | [features/draw-tools.md](features/draw-tools.md)                                 |
| Portal analysis views               | Stable v1 / Partial | [features/portal-analysis.md](features/portal-analysis.md)                       |
| Highlighters and layers             | Started / Partial   | [features/highlighters-and-layers.md](features/highlighters-and-layers.md)       |
| Backlog and replacement readiness   | Ongoing             | [backlog.md](backlog.md)                                                         |

## Current High-Level Gaps

- Map lifecycle is parked as acceptable for current UI/plugin parity work. Queue refill, old wanted-response bridging,
  IITC comparison timing, incremental core rendering, cache-fresh rendering, and retry recovery have live validation.
  True stale-cache retry exhaustion is still wired/diagnosed but needs a live case that proves cached stale tiles render
  exactly like IITC.
- Plugin-facing compatibility remains intentionally limited: no broad `window.plugin.*`, `addHook`/`runHooks`, toolbox,
  plugin-facing highlighter API, full layer registry, or Leaflet.draw event parity yet. Native highlighter selection has
  started with existing IRIS highlighter-like behavior and IITC-CE's single active highlighter model. The layer registry
  has a first content-side UI metadata pass, but page-runtime render/filter ownership is still hard-coded.
- Draw Tools v1 is links/markers only. Polygons, circles, visible snap cleanup UX, `DrawTools Opt`, stock Intel `pls`,
  and plugin-facing `window.plugin.drawTools` / `pluginDrawTools` remain deferred.
- The bottom-sheet/two-layer menu model is a deliberate product-shell divergence from IITC's sidebar/dropdown/statusbar
  UI.

## Next Planning Entry Points

- For new feature ports, update the relevant feature file or add a new file under `docs/iitc-iris/features/`.
- For cross-cutting parity gaps and prioritization, update [backlog.md](backlog.md).
- Keep this file as the short index, doctrine, latest validation snapshot, and high-level gap summary.
