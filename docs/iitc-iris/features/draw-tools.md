# Draw Tools

IITC source references:

- `reference/ingress-intel-total-conversion/plugins/draw-tools.js`
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
  clear with confirmation, per-link listing, centering, and IITC Draw Tools JSON export/import for supported records.
- `Map -> Markers` supports four marker presets (white, red, blue, green), nearest-marker deletion, undo, clear with
  confirmation, per-marker listing, centering, and IITC Draw Tools JSON export/import for supported records.
- Portal interaction stays map-first: left-click selects/activates the portal menu and feeds Draw Tools targets, while
  right-click opens the Portal sheet directly.
- Drawn overlays are non-interactive so they do not intercept portal selection. Management is sheet-driven for this
  milestone.
- Crossed-link visualization is available as a first pass: visible Intel links crossing drawn polylines render as red
  dashed overlays. This follows the IRIS planned-link visual concept and now uses the same IITC geodesic sampled geometry
  as rendering for both drawn links and visible Intel links.
- IITC Draw Tools `snapToPortals` has a native runtime action that moves stored drawn points in the current view to the
  nearest visible loaded portal using projected screen-space distance. The visible `Snap` sheet button is hidden for v1
  because selected-portal drawing already produces exact portal coordinates; keep the action parked for later
  import-cleanup UX.

Validation and accepted scope:

- Focused Draw Tools storage tests pass, including IITC-compatible mixed JSON round-trip for polyline, polygon, circle,
  and marker record shapes.
- IITC IRIS import/export has been user-validated for the supported v1 direction: export from IITC IRIS and import into
  IITC, plus import from IITC into IITC IRIS for links/markers.
- Latest local validation for this slice included `npm run lint:iitc-iris`, `npm run lint:css`,
  `npm run typecheck:iitc-iris`, `npm run test:iitc-core -- --run src/draw-tools.test.ts`, and
  `npm run package:iitc-iris`.
- Latest package artifacts:
  - `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-06-07T21-21-45.zip`
  - `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-06-07T21-21-45.xpi`

Deferred by design for v1:

- Polygon and circle rendering/UI.
- Full Leaflet.draw edit handles, keyboard access keys, toolbar parity, and `draw:*` event parity.
- `DrawTools Opt`, stock Intel `pls` import/export, `getDrawAsLines`, full palette/color picker, MPE, and plugin-facing
  compatibility.
- `window.plugin.drawTools` and `pluginDrawTools` should stay deferred until a concrete dependent plugin or workflow
  needs them.
