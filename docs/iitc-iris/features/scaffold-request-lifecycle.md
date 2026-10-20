# Request Lifecycle Boundaries

The browser-extension scaffold and initial request-lifecycle port are implemented. The active workspaces are
`apps/iitc-iris` and `packages/iitc-core`; no legacy app or reference checkout is needed to build.

Core owns IITC tile parameters, zoom/data-zoom selection, request keys, centre-first ordering, dynamic batches, response
classification, retry/error accounting, tile-cache decisions, and render-queue planning. The app runtime owns HTTP,
Intel cookies/version/CSRF, cancellation, movement events, rendering, and status messages.

The live runtime refills up to five concurrent requests, uses per-tile fresh/stale cache decisions, and renders core
entities incrementally when context permits. Movement invalidates render generations; older responses can still satisfy
tiles wanted by the active plan. Avoid treating movement as an unconditional abort of all map-data work.
Map replacement/removal disposes owned requests, timers, frames, and gestures through the map lifetime boundary.

The [map lifecycle note](map-lifecycle.md) retains the detailed IITC contract, live comparison evidence, deliberate
divergences, and watch items. In particular, stale-cache fallback is wired and diagnosed but live retry-exhaustion
validation remains open. Returned-empty summary recovery remains a compatibility path. This note does not close those gaps.

Related behavior:

- Player Tracker consumes faction-split COMM activity with a three-hour history window, z9 visibility gate, same-time
  portal grouping, averaged coordinates, marker pins, and dashed traces. Broad plugin/add-on compatibility remains deferred.
- COMM is stored/rendered oldest-to-newest; continuation fetches preserve IITC ascending timestamp write semantics.
- Copied diagnostics separate request and render queues, cache/network/stale tiles, retry buckets, and timing.
- Retained [payload samples](../fixtures/README.md) and inline test fixtures support comparison; retired Amsterdam/Damrak
  diagnostic fixture choices and generated empty fallback maps are not part of the app.

For changes, run focused tests plus `npm run check`, `npm run package`, and `git diff --check`.
Use npm workspaces for focused checks, for example `npm run test -w packages/iitc-core`.
Build/install instructions are maintained in the [root README](../../../README.md).
