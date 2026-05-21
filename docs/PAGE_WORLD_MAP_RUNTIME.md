# Page-World Map Runtime

IRIS now renders the main MapLibre map from the page world instead of the
extension/content world. The UI still lives in the extension world, but the map
engine and rendered-feature queries stay in the same JavaScript world as the
Intel page.

## Why this changed

The old renderer worked in Chrome, but Firefox extension builds could throw
permission errors when extension-world code touched MapLibre feature objects
returned by `queryRenderedFeatures`. Cloning or mapping those objects after the
query was not enough, because Firefox could throw before IRIS had a chance to
sanitize the data.

The page-world runtime avoids that boundary problem:

- MapLibre owns the map surface in the page world.
- Feature queries happen in the page world.
- IRIS sends and receives plain JSON messages across the extension boundary.
- Preact UI, popups, draw-tool state, settings, and orchestration remain in the
  extension world.

## Previous Shape

```text
Intel page
  |
  +-- native INTEL map
  |
  +-- extension/content world
      |
      +-- IRIS Preact UI
      |
      +-- MapOverlay MapLibre map
          |
          +-- GeoJSON source rebuilds
          +-- plugin HTML markers
          +-- Bench diagnostics
          +-- queryRenderedFeatures
              |
              +-- Firefox permission risk
```

The extension world owned both the IRIS UI and the MapLibre map. That kept state
local, but it put MapLibre feature objects on the wrong side of Firefox's
extension security boundary.

## Current Shape

```text
Intel page / MAIN world
  |
  +-- page-map-runtime.ts
      |
      +-- MapLibre map surface
      +-- GeoJSON sources and layers
      +-- queryRenderedFeatures
      +-- frame Bench sampler
      +-- DOM marker pins for planned markers and player tracker
      +-- plain camera/selection/benchmark events

Extension/content world
  |
  +-- IRIS Preact UI
      |
      +-- Zustand stores
      +-- popups and drawer controls
      +-- draw tools state
      +-- plain snapshot builder
      +-- message bridge to page runtime
```

The page runtime is now the normal full-viewport IRIS map surface. The old
extension-world `MapOverlay` implementation has been removed after the page
runtime covered source sync, interaction, diagnostics, draw tools, and marker
pin rendering.

## Message Flow

```text
IRIS stores
  |
  v
snapshot builder
  |
  v
postMessage(SHOW_MAP / SYNC_CAMERA / SYNC_DATA / SYNC_LAYERS / SYNC_TILES)
  |
  v
page-world map runtime
  |
  v
postMessage(CAMERA_CHANGED / SELECTION / CONTEXTMENU / FRAME_BENCHMARK)
  |
  v
IRIS stores and UI
```

Only plain data crosses the world boundary. MapLibre `Map`, `Feature`, event,
and geometry objects stay inside the page runtime.

## Benchmark Impact

The previous Bench samples measured the extension-world `MapOverlay` path:

```text
camera move -> viewport query -> source setData -> HTML marker sync -> frame sample
```

The current Bench frame samples measure the page-world runtime frame loop:

```text
camera move -> page-world MapLibre render loop -> frame sample
```

Page-world source updates now also publish viewport source counts and `setData`
timings back into Diagnostics. The old extension-world HTML marker sample is no
longer shown because that sync path is not part of the page-world renderer.

## Current Status

```text
Done
  +-- page-world runtime is the default IRIS map
  +-- live entity loading works after panning
  +-- portal/link/field selection works in Chrome and Firefox
  +-- draw tools, highlights, filters, themes, and player tracker render
  +-- repeated theme and map-style switching uses split sync paths
  +-- Bench runs from the page-world runtime
  +-- source/update diagnostics are restored without stale HTML-marker rows
  +-- artifacts, ornaments, and mission overlays have first-pass page-world styling
  +-- expanded Bench variants isolate base map, plugin, link, and field costs
  +-- player activity details open from secondary interaction only
  +-- tile coverage generation rejects invalid bounds and caps extreme requests

Left
  +-- polish plugin GeoJSON, plugin labels, planned items, and player tracker styling
```

## Current References

- `docs/IRIS_ARCHITECTURE.md` is the current architecture overview and restart guide.
- `docs/PERF_BENCHMARKS.md` stores copied benchmark samples and comparison scenarios.
- `docs/WORK_ITEMS.md` tracks active follow-ups and historical worklog decisions.
