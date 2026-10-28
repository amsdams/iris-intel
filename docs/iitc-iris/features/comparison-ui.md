# Comparison UI

The Diagnostics and Controls surfaces provide copied request/entity diagnostics and navigation for live IITC
comparisons. The app uses live Intel data; retired fixture choices and generated empty fallbacks were removed on
2026-10-20. Manual scenario tools and fixed Amsterdam/Damrak presets were removed on 2026-10-28. Automated browser
fixtures remain available for regression checks. See [payload samples](../fixtures/README.md).

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
- Copied diagnostics and the System sheet now show entity source (`live` or `cache`) so pan/zoom lifecycle
  tests can distinguish network fetches from cached same-bounds renders.
- The diagnostics view replaces entity diagnostic snapshots on each status message instead of partially merging them, preventing
  stale retry/source/queue fields from leaking across live/cache transitions.
- Technical counters sit in a native **Technical details** disclosure, collapsed by default unless a previous debug
  preference explicitly enabled them. That choice persists under the existing storage key; JSON export includes the
  full diagnostics regardless of disclosure state. Status/login/selection actions remain visible without duplicates.
- The IITC Delay setting remains available, with existing request timing and stored preferences unchanged.
- The System sheet can jump to arbitrary comparison views from `lat,lng,z` text, Intel map URLs with `ll` and `z`, or IITC-CE
  portal links with `pll`.
- The floating map-controls panel has pan buttons aligned with IITC's Pan Control plugin:
  `reference/ingress-intel-total-conversion/plugins/external/L.Control.Pan.js` uses `panOffset: 500`, so IITC IRIS
  sends a direct Leaflet `panBy([x, y])` command with 500px offsets. This keeps fast repeated clicks cumulative like
  IITC's plugin instead of deriving each pan from possibly stale content-side camera state. The +/- zoom buttons still
  move one zoom level at a time.
- Manual comparison on 2026-06-10 confirmed the direct `panBy` behavior feels closer to IITC for repeated fast pan
  clicks than the previous content-side projected-center calculation.
- Controls can copy the current view back out as an Intel URL.
- The floating map-controls panel has base-map switches for CartoDB Dark Matter, CartoDB Positron, and OpenStreetMap,
  with the selected base map persisted for repeatable visual comparisons.
- Layer toggles are persisted; the default comparison view enables only fields, links, and portals while leaving
  ornaments, artifacts, labels, key counts, and tile debug off. Level color, recharge health, and portal history styling
  are selected through the single portal highlighter selector.
- Copied diagnostics expose `layerRegistry`, active/registered highlighters, `timing.layerUpdate`, and rolling
  `timing.interactionUpdates` entries. Use `interactionUpdates` when testing a sequence of core toggles, detail toggles,
  and highlighter changes because `layerUpdate` only reports the latest layer update.
- Base map, core/detail layer toggles, side-system tabs, and pan/zoom controls remain separate from diagnostic controls.
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
  be enabled in Display but still hidden in low-zoom placeholder mode. `OR` and `AR` follow IITC-CE overlay behavior
  and can render at any zoom when their data is available.
- Copied diagnostics include `renderPolicy`, so comparison snapshots show whether optional detail overlays were eligible
  to render.
- Visual parity comparisons should use the viewport P/L/F counts and copied `entities.viewport` block; total
  fetched counts include padded request bounds and placeholder support entities.
- Mock controls are not yet implemented in IITC IRIS. Place-name geocoding now exists through confirmed Nominatim
  search with `polygon_geojson=1`; remaining search parity is hover/preview behavior beyond the search sheet and
  broader IITC search UI affordances.
