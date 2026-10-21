# Draw Tools

IITC source references:

- `reference/ingress-intel-total-conversion/plugins/draw-tools.js`
- `reference/ingress-intel-total-conversion/plugins/cross-links.js` (`greatCircleArcIntersect`, `testPolyLine`)
- `reference/ingress-intel-total-conversion/core/code/boot.js` for `L.DivIcon.ColoredSvg`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-geodesic.js`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-snap.js`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-src.js`

Ported IITC concepts and names:

- Storage key and JSON shape: `plugin-draw-tools-layer` with Draw Tools item records for `polyline`, `polygon`,
  `circle`, and `marker` in `packages/iitc-core/src/draw-tools.ts`.
- Supported native v1 records: `polyline` and `marker`.
- Drawn overlay concept: internal Leaflet pane remains `drawnItems`; layer UI exposes split `Drawn Links` and
  `Drawn Markers` toggles (`DL`/`DM`) for usability while preserving stored Draw Tools data.
- Draw styling: drawn links use geodesic rendering, IITC Draw Tools line defaults where practical (`weight: 4`,
  `opacity: 0.5`, default color `#a24ac3`), and marker icons use a local equivalent of IITC's
  `L.DivIcon.ColoredSvg` marker SVG.

Current implementation choices:

- Draw Tools v1 is a native IITC IRIS slice, not a global plugin-system port. It deliberately does not expose
  `window.plugin.drawTools`, `pluginDrawTools`, Leaflet.draw toolbar/events, or DrawTools Opt yet.
- `Map -> Links` supports portal/context based two-step link creation (`From` / `To`), nearest-link deletion, undo,
  clear with confirmation, per-link listing, centering, and IITC Draw Tools JSON copy/import for supported records.
- `Map -> Markers` supports four marker presets (white, red, blue, green), nearest-marker deletion, undo, clear with
  confirmation, per-marker listing, centering, and IITC Draw Tools JSON copy/import for supported records.
- Import controls are collapsed behind an `Import` action in the Links and Markers sheets so the frequent drawing and
  marker-list workflows keep vertical space on mobile. Per-type `Copy` and all-item `Copy all` remain directly visible.
- Portal interaction stays map-first: left-click selects/activates the portal menu and feeds Draw Tools targets, while
  right-click opens the Portal sheet directly.
- Drawn overlays are non-interactive so they do not intercept portal selection. Management is sheet-driven for this
  milestone.
- Crossed-link visualization highlights visible Intel links crossing drawn polylines as red dashed overlays.
  Crossing classification follows IITC's whole great-circle arcs between original vertices, not rendered samples.
- IITC Draw Tools `snapToPortals` has a native runtime action that moves stored drawn points in the current view to the
  nearest visible loaded portal using projected screen-space distance. The visible `Snap` sheet button is hidden for v1
  because selected-portal drawing already produces exact portal coordinates; keep the action parked for later
  import-cleanup UX.

Validation and accepted scope:

- Crossing repair source/ownership notes (2026-10-21): IITC's `crossLinks` plugin owns classification and highlighted
  layers, refreshing on game-link additions, Draw Tools edits, and map refresh. IRIS keeps its existing runtime
  refresh/disposal and visible-link filtering; pure `greatCircleArcIntersect` / `testPolyLine` classification belongs
  in `packages/iitc-core/src/cross-links.ts`. No global plugin API or new listener lifecycle is introduced.
  Focused fixtures compare ordinary crossings, shared anchors, overlapping/degenerate arcs, curved paths, and
  antimeridian cases. Browser/device highlighting and click-to-pixels behavior require smoke testing separately;
  this repair does not change interaction dispatch or rendering style.
- The 12 Cross Links regression tests pass, including shared-anchor false positives, antimeridian world copies,
  and crossings at former generated vertices. An ad hoc comparison with the local reference agreed on 5,000 seeded
  ordinary/shared-anchor/degenerate fixtures; the antimeridian fixture intentionally changes false to true.
  Full app/core checks (546 tests), CSS/workbench checks, extension packaging, and signed Android release
  tests/lint/build pass. The APK matches the release certificate pin; all 19 embedded IRIS assets and the locally
  served APK match the verified build. The user smoke-tested the shared-anchor false-positive fix and reported
  improvement (2026-10-21). Platform and genuine-crossing/antimeridian live checks were not separately reported;
  those cases have automated coverage. Click-to-pixels timing was not measured.

- Focused Draw Tools storage tests pass, including IITC-compatible mixed JSON round-trip for polyline, polygon, circle,
  and marker record shapes.
- IITC IRIS import/export has been user-validated for the supported v1 direction: export from IITC IRIS and import into
  IITC, plus import from IITC into IITC IRIS for links/markers.
- For changes, run the focused core Draw Tools tests, `npm run check`, and `npm run package`.

Deferred by design for v1:

- Polygon and circle rendering/UI.
- Full Leaflet.draw edit handles, keyboard access keys, toolbar parity, and `draw:*` event parity.
- `DrawTools Opt`, stock Intel `pls` import/export, `getDrawAsLines`, full palette/color picker, MPE, and plugin-facing
  compatibility.
- `window.plugin.drawTools` and `pluginDrawTools` should stay deferred until a concrete dependent plugin or workflow
  needs them.
