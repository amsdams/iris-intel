# Comparison UI

- Add a Mini-IRIS-style control surface for fixture/mock mode, free search, current request state, and entity counts.
- Include a compact diagnostic view for zoom, data zoom, tile count, request count, and decoded entity totals.

Acceptance:

- Amsterdam and Damrak can be selected from fixtures.
- Free search can be used for other places without changing fixture behavior.

Current status:

- The System sheet shows zoom, data zoom, summary availability, tile span, fetch state, entity totals,
  real/placeholder/ornament portal counts, and copy-to-clipboard diagnostics. Earlier versions used a floating debug
  dock; that UI has been moved into the System sheet so map-first use has no permanent top-left debug panel.
- Copied diagnostics include IITC-style request response buckets (`serverRetryTileKeys`, `timeoutTileKeys`,
  `errorTileKeys`, `responseRetryTileKeys`, and `queueDelayReasons`) so slow-network retries can be separated from
  returned-empty tile recovery.
- Copied diagnostics also include core queue-state counters so the immutable queue model can be compared against the
  current live runtime loop before it replaces scheduling.
- Copied diagnostics include `partialTileKeys` and `queue.partialTiles` for low-zoom placeholder tiles that exhausted
  timeout retries without becoming hard request failures. These should eventually become `staleTiles` once per-tile
  stale-payload fallback is ported.
- Copied diagnostics include `elapsedMs` and `elapsedSeconds`; these are useful for trend comparison, but exact parity
  with IITC still depends on matching all request lifecycle timing semantics.
- Copied diagnostics include `entities.artifactFetch` so artifact-event tests can tell whether `/r/getArtifactPortals`
  was disabled, empty, ready, errored, or blocked by login HTML.
- Per-tile cached renders explicitly report cache-fresh/cache-stale diagnostics, so copied snapshots do not mix the
  current tile plan with stale queue counters from the previous network fetch.
- Copied diagnostics and the System sheet now show entity source (`live`, `cache`, or `fixture`) so pan/zoom lifecycle
  tests can distinguish network fetches from cached same-bounds renders.
- The dock replaces entity diagnostic snapshots on each status message instead of partially merging them, preventing
  stale retry/source/queue fields from leaking across live/cache/fixture transitions.
- The System sheet has fixed Amsterdam and Damrak view presets for repeatable IITC/IITC IRIS comparisons.
- The System sheet can jump to arbitrary comparison views from `lat,lng,z` text, Intel map URLs with `ll` and `z`, or IITC-CE
  portal links with `pll`.
- The floating map-controls panel has pan buttons aligned with IITC's Pan Control plugin:
  `reference/ingress-intel-total-conversion/plugins/external/L.Control.Pan.js` uses `panOffset: 500`, so IITC IRIS
  sends a direct Leaflet `panBy([x, y])` command with 500px offsets. This keeps fast repeated clicks cumulative like
  IITC's plugin instead of deriving each pan from possibly stale content-side camera state. The +/- zoom buttons still
  move one zoom level at a time.
- Manual comparison on 2026-06-10 confirmed the direct `panBy` behavior feels closer to IITC for repeated fast pan
  clicks than the previous content-side projected-center calculation.
- The dock can copy the current view back out as an Intel URL.
- The floating map-controls panel has base-map switches for CartoDB Dark Matter, CartoDB Positron, and OpenStreetMap,
  with the selected base map persisted for repeatable visual comparisons.
- Layer toggles are persisted; the default comparison view enables only fields, links, and portals while leaving
  ornaments, artifacts, labels, key counts, and tile debug off. Level color, recharge health, and portal history styling
  are selected through the single portal highlighter selector.
- Copied diagnostics expose `layerRegistry`, active/registered highlighters, `timing.layerUpdate`, and rolling
  `timing.interactionUpdates` entries. Use `interactionUpdates` when testing a sequence of core toggles, detail toggles,
  and highlighter changes because `layerUpdate` only reports the latest layer update.
- Base map, core/detail layer toggles, side-system tabs, and pan/zoom controls live outside the debug/comparison
  controls. The data-source switch now lives in the System sheet because it is comparison/fixture infrastructure rather
  than IITC-style map UI.
- Current layer toggles:
    - `F`: fields.
    - `LN`: links.
    - `P`: portals.
    - `U`: unclaimed and placeholder portals.
    - `L1`..`L8`: portal levels 1 through 8.
    - `RES`, `ENL`, `MAC`: faction filters for portals, links, and fields.
    - `OR`: ornament image overlays.
    - `AR`: artifact rings.
    - `LV`: portal level labels.
    - `KEY`: inventory-derived key-count labels.
    - `T`: tile debug rectangles.
- Optional portal styling and level labels only render when detailed portal data is available at zoom 14+; controls may
  be enabled in the dock but still hidden in low-zoom placeholder mode. `OR` and `AR` follow IITC-CE overlay behavior
  and can render at any zoom when their data is available.
- The System sheet has a data-source switch for live Intel data, bundled Amsterdam z10/z14 fixtures, and a Damrak z15
  fixture extracted from an IITC HAR. When those fixture files are present, fixture mode renders deterministic saved
  `getEntities` responses and jumps to the matching view. When the optional captured JSON files are missing from the
  checkout, packaging writes empty valid fixture fallbacks so the extension can still build, but fixture mode is not
  useful for visual parity until real fixtures are restored.
- Copied diagnostics include `renderPolicy`, so comparison snapshots show whether optional detail overlays were eligible
  to render.
- Visual parity comparisons should use the dock's viewport P/L/F counts and copied `entities.viewport` block; total
  fetched counts include padded request bounds and placeholder support entities.
- Mock controls are not yet implemented in IITC IRIS. Place-name geocoding now exists through confirmed Nominatim
  search with `polygon_geojson=1`; remaining search parity is hover/preview behavior beyond the search sheet and
  broader IITC search UI affordances.
