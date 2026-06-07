# IITC IRIS Draw Tools Port Plan

Goal: smart-port IITC Draw Tools into IITC IRIS with IITC-compatible names, storage, and draw item data first. Plugin
hooks and plugin-facing seams remain compatibility targets, but should not shape the first native implementation.

Status: native links/markers v1 is stable and merged back into `docs/iitc-iris/port-plan.md` as the
`Draw Tools V1 Checkpoint - 2026-06-07` section. Keep this file as branch-local detail/history for later Draw Tools
expansion planning.

First priority: ship a native IITC IRIS Draw Tools slice for drawing geodesic links and four marker presets. Follow the
Player Tracker port precedent: preserve IITC behavior, names, and stored data where they matter, but do not create a
broad plugin system until a dependent feature needs it. Full IITC plugin-system semantics (`window.plugin.drawTools`,
`pluginDrawTools`, Leaflet.draw toolbar parity, MPE, and dependent Community plugin compatibility) are explicitly
deferred and are not blockers for the first usable Draw Tools milestone.

Doctrine for this feature:

- Use `reference/ingress-intel-total-conversion/plugins/draw-tools.js` as the primary source of truth for behavior,
  naming, storage format, hooks, and lifecycle.
- Use `reference/ingress-intel-total-conversion/plugins/external/*draw*` as the primary source for Leaflet.draw,
  geodesic drawing, snap, and confirm behavior.
- Use `reference/Community-plugins` to identify plugin-facing API compatibility pressure, especially plugins that call
  `window.plugin.drawTools` or depend on `pluginDrawTools`.
- Treat the existing `apps/iris` planning/draw implementation as UI/UX reference only. It does not follow the smart-port
  doctrine and should not define the IITC IRIS API, storage, or data model.
- Keep the first accepted version close enough to IITC that stored Draw Tools JSON and screenshot/live behavior are easy
  to compare. Plugin calls are a later compatibility surface.
- Match the Player Tracker port precedent for early passes: preserve IITC behavior and names where they matter, but do
  not create a broad plugin system until a dependent feature needs it.

## Source References

Primary IITC-CE references:

- `reference/ingress-intel-total-conversion/plugins/draw-tools.js`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-src.js`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-src.css`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-fix.css`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-snap.js`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-geodesic.js`
- `reference/ingress-intel-total-conversion/plugins/external/leaflet.draw-confirm.js`
- `reference/ingress-intel-total-conversion/screenshots/plugin_draw_tools.png`

Community plugin compatibility references:

- `reference/Community-plugins/dist/Zaso/draw-tools-plus.user.js`
- `reference/Community-plugins/dist/Tarsi210/draw-best-link-star.user.js`
- `reference/Community-plugins/dist/DanielOnDiordna/quick-draw-links.user.js`
- `reference/Community-plugins/dist/57Cell/fieldplanner.user.js`
- `reference/Community-plugins/dist/McBen/KMLImport.user.js`
- `reference/Community-plugins/dist/Loskir/dt-replace-portal.user.js`
- `reference/Community-plugins/dist/Jormund/poly-counts2.user.js`
- `reference/Community-plugins/dist/Zaso/destroyed-links-simulator.user.js`

IRIS-only UI/UX reference:

- `apps/iris/src/ui/shared/PlanningBar.tsx`
- `apps/iris/src/ui/shared/drawer/MapTab.tsx`
- `apps/iris/src/ui/domains/map/page-map-runtime-snapshot.ts`
- `packages/core/src/store.ts` planned links/markers state
- `packages/plugins/src/planned-links/index.ts`

## IITC Concepts To Preserve

Deferred plugin namespace and public fields/functions:

- `window.plugin.drawTools`
- `KEY_STORAGE = 'plugin-draw-tools-layer'`
- `currentColor`, `currentMarker`, `lineOptions`, `polygonOptions`, `editOptions`, `markerOptions`
- `drawnItems`
- `drawControl`
- `merge.status`, `merge.toggle`
- `getMarkerIcon`, `setOptions`, `setDrawColor`, `addDrawControl`, `setAccessKeys`
- `getSnapLatLng`, `snapToPortals`
- `save`, `load`, `import`
- `manualOpt`, `optCopy`, `optPaste`, `promptImport`, `optImport`, `optExport`, `optReset`, `optAlert`, `isEmpty`
- `getDrawAsLines`
- `EDFstatus`, `initEDF`, `toggleEDF`, `toggleOpacityOpt`, `clearAndDraw`, `edfStatusToggle`
- `initMPE`
- `getLocationFilters`, `filterEvents`

Layer/UI concepts:

- Leaflet overlay layer name: `Drawn Items`
- Toolbox/menu action label: `DrawTools Opt` is deferred until the options/import-export pass; it is not needed for the
  first native drawing UI.
- Draw toolbar tools: polyline, polygon, circle, marker, edit, delete
- Disabled draw tools when the `Drawn Items` overlay is hidden
- Access keys: line `l`, polygon `p`, circle `o`, marker `m`, edit `e`, delete `d`, save `s`, cancel `a`
- Default color: `#a24ac3`
- Spectrum palette colors from IITC Draw Tools

Hook/event concepts:

- Custom hook: `pluginDrawTools`
- Events: `import`, `clear`, `layerCreated`, `layersDeleted`, `layersEdited`, `layersSnappedToPortals`
- Leaflet.draw events: `draw:created`, `draw:deletestart`, `draw:deletestop`, `draw:deleted`, `draw:edited`
- `filterEvents` should fire `changed` on create/edit/delete and clear cached location filters.

These hook/event concepts are deferred. The first milestone should use local typed messages/actions inside IITC IRIS, not
global plugin hooks.

Storage/import/export concepts:

- Local storage key: `plugin-draw-tools-layer`
- Stored item types:
  - `polyline`: `{type, latLngs, color}`
  - `polygon`: `{type, latLngs, color}`
  - `circle`: `{type, latLng, radius, color}`
  - `marker`: `{type, latLng, color}`
- Import should create geodesic polylines/polygons/circles and colored markers.
- Paste should accept Draw Tools JSON and stock Intel URLs with `pls=lat,lng,lat,lng_...`.
- Export should support normal Draw Tools JSON, polygon-as-lines JSON via `getDrawAsLines`, and stock Intel URL `pls`
  export, including IITC warning behavior for circles/markers/polygons/more than 40 line segments.
- Merge toggle semantics are intentionally inverted in the UI label: when `merge.status` is false, paste/import resets
  existing draws before importing.

Geometry/rendering concepts:

- Drawn polylines/polygons/circles should use geodesic rendering, aligned with the existing IITC IRIS geodesic helpers
  where possible.
- Draw item style defaults:
  - line: `stroke: true`, `weight: 4`, `opacity: 0.5`, `fill: false`, `interactive: true`
  - polygon: line options plus `fill: true`, `fillOpacity: 0.2`, `dashArray: ''`
  - edit selected path: polygon options plus `dashArray: '10,10'`, no fixed color
  - marker: colored marker icon, `zIndexOffset: 2000`
- `getSnapLatLng` should snap active drawing points to a portal when the point falls within marker radius plus weight.
- `snapToPortals` should move existing visible draw points to nearest visible portal coordinates and warn when portals
  may be incomplete.
- `getLocationFilters` should expose polygon/marker filters for other plugins while `Drawn Items` is visible.

## Initial Architecture Direction

Keep an IITC-named runtime facade:

- Add a focused Draw Tools runtime module under `apps/iitc-iris/src/` with IITC names at the boundary. Candidate file
  names: `draw-tools.ts` for the facade and `draw-tools-storage.ts` / `draw-tools-geometry.ts` only if the split removes
  real complexity.
- Install the facade from `page-map-runtime.ts` once Leaflet and the IITC IRIS panes/layers are ready.
- Reuse `createIitcGeodesicPolyline`, `createIitcGeodesicPolygon`, and a new geodesic circle helper rather than
  reintroducing a separate path algorithm.
- Prefer a typed parser/serializer for Draw Tools JSON. Keep stored JSON shape byte-compatible enough for IITC import.
- Keep UI in IITC IRIS sheet/menu style, but preserve IITC labels and workflows. The IRIS planning bar can inform
  ergonomics for mobile controls, marker lists, and import/export panels.

Current architecture decision:

- Implement minimum native drawing interactions directly for Passes 1-3. Do not vendor Leaflet.draw for the first
  milestone. Leaflet.draw remains the likely source of truth if/when toolbar, edit-handle, access-key, and `draw:*` event
  parity becomes a priority.

## Implementation Passes

### Pass 0 - Compatibility Survey

Status: scoped/deferred.

- First compatibility target is core native Draw Tools only: IITC-compatible storage/data for links and markers, native
  IITC IRIS rendering, and native IITC IRIS drawing controls.
- Do not block Passes 1-3 on Leaflet.draw bundling or Community plugin API survey.
- Before Pass 6, identify all Community plugin references to `window.plugin.drawTools`, `pluginDrawTools`, `drawnItems`,
  and Draw Tools storage, then decide the API subset needed by common dependent plugins such as Draw Tools Plus and
  Fieldplanner.

### Pass 1 - Data Model, Storage, Import/Export

Status: core storage complete; runtime save/load mutation still belongs to Pass 3 creation/delete controls.

Completed:

- Added `packages/iitc-core/src/draw-tools.ts` with IITC storage constants, typed Draw Tools item shapes, parser,
  serializer, and merge/reset import helper.
- Parser accepts IITC/Leaflet-style `{lat,lng}` coordinates and array `[lat,lng]` coordinates for import tolerance.
- Focused tests cover storage constants, polyline/marker round-trip, imported coordinate arrays, invalid input, and
  merge/reset behavior.

- Add typed Draw Tools item parser/serializer for IITC JSON.
- Implement `KEY_STORAGE`, `save`, `load`, and `import` for the first supported item types: `polyline` and `marker`.
- Preserve marker `color` as a string in IITC Draw Tools JSON, even if the first UI exposes only four quick marker
  choices.
- Add tests for round-tripping `polyline`, `marker`, invalid input, and merge/reset behavior.
- Park polygon/circle rendering/UI, `getDrawAsLines`, and stock `pls` parse/export helpers until the basic link/marker
  workflow is stable. If the parser recognizes polygon/circle records early to avoid data loss, that does not make them
  part of the first rendered milestone.
- Document any storage divergence immediately.

### Pass 2 - Basic Link And Marker Rendering

Status: complete for first stable native slice.

Completed:

- Added native IITC IRIS passive rendering for stored `polyline` and `marker` records from `plugin-draw-tools-layer`.
- Added split `Drawn Links` and `Drawn Markers` layer toggles as `DL`/`DM` in the existing Layers sheet. Existing saved
  `drawnItems` visibility is migrated to both toggles.
- Added a non-interactive `drawnItems` Leaflet pane and local marker icon facade using the IITC `L.DivIcon.ColoredSvg`
  marker SVG shape. Stored marker data remains IITC-compatible via the `color` field.
- Drawn overlays are intentionally non-interactive so portal left-click selection remains usable after links/markers are
  drawn. Deletion is sheet-driven for this milestone.
- Added crossed-link visualization: visible Intel links crossing drawn polylines render as red dashed overlays, following
  the IRIS planned-link visual concept. The check now uses IITC geodesic sampled geometry for both drawn links and
  visible Intel links.

- Render stored drawn items as a `Drawn Items` overlay on the Leaflet map.
- Support geodesic polyline rendering for drawn links and marker rendering for four marker types.
- Use IITC draw link visual defaults where practical: color, `weight: 4`, and `opacity: 0.5`. First-milestone drawn
  items are non-interactive so portal selection stays reliable; restore interactivity only with a proper selection/edit
  model.
- Keep marker colors compatible with Draw Tools' free-form `color` field. The first UI can expose the existing IRIS four
  marker choices, but stored data should not prevent later full palette/color-picker support.
- Match layer visibility behavior for the `Drawn Items` overlay.
- Run visual checks for long links, anti-meridian-adjacent links if feasible, and marker z-index.

### Pass 3 - Basic Native Drawing UI

Status: first native slice complete; first polish pass complete.

Completed:

- Added native Draw Tools sheets under the Map menu: `Links` and `Markers`. `DrawTools Opt` remains deferred.
- Marker creation supports the four IRIS marker presets: white, red, blue, and green. Stored data remains IITC Draw Tools
  marker JSON with a `color` field.
- Link creation uses a two-step workflow: select a portal and click `From`, select another portal and click `To`. A map
  context point remains a fallback target when no portal is selected. Stored data remains IITC Draw Tools `polyline` JSON.
- Left-click portal selection does not open the Portal sheet; it only selects/activates the Portal primary menu and feeds
  Draw Links/Markers targets. Right-click portal context still opens the Portal sheet directly.
- Draw Tools creation/management lives under Map subtabs as `Links` and `Markers`, not inside View.
- Layer visibility is split into `Drawn Links` and `Drawn Markers` toggles (`DL`/`DM`) instead of one coarse `DT` toggle.
  The internal Leaflet pane can remain `drawnItems` to preserve the IITC overlay concept.
- Runtime saves on create/delete/clear to `plugin-draw-tools-layer` and rerenders the `Drawn Items` overlay immediately.
- Delete is implemented as nearest drawn marker/polyline deletion from the selected portal or current context point, with
  a 100m hit threshold. This is a first-milestone native UI divergence from Leaflet.draw edit/delete handles.
- Link and marker clear actions are type-scoped: Links clears polylines, Markers clears markers.
- Added two-click confirmation for type-scoped clear actions to reduce accidental data loss.
- Added `Undo` for the latest drawn link/marker.
- Added runtime-to-content Draw Tools status messages so the native sheets can list stored supported items.
- Added per-item link/marker listing with `Center` and `Del` actions.
- Added a hidden/native runtime action for IITC Draw Tools `snapToPortals` projected screen-space nearest-visible-portal
  behavior. The visible `Snap` sheet button is parked for v1 because selected-portal drawing already uses exact portal
  coordinates; keep the runtime action for later import-cleanup UX.

- Implement native IITC IRIS controls for adding drawn links and four marker types.
- Prefer portal-to-portal link creation for the first slice, using the existing map selection/context mechanics where
  possible.
- Save on create/delete and keep in-progress draw state separate from persisted Draw Tools data.
- Add delete and clear actions for drawn links/markers.
- Defer Leaflet.draw edit handles, polygon/circle drawing, toolbar access keys, and full `draw:*` event parity.

### Pass 4 - Options And Import/Export UI

Status: partially complete for the supported native slice; `DrawTools Opt` remains deferred.

Completed:

- Added per-type copy and all-supported-item `Export` from `Map > Links` and `Map > Markers` for IITC Draw Tools JSON
  records: `polyline` and `marker`.
- Added paste/import for supported IITC Draw Tools JSON records. Unsupported `polygon` and `circle` records are filtered
  out for now because they are intentionally not rendered in this milestone.
- Added import status text that reports skipped unsupported records when IITC JSON contains polygons/circles.
- Added merge/reset-before-import behavior via a `Merge` checkbox in the native sheets. Existing unsupported records are
  preserved when supported records are imported/cleared.
- Added core test coverage that round-trips an IITC-compatible mixed Draw Tools JSON array for polyline, polygon, circle,
  and marker storage shape. The native UI still exports/imports only rendered links and markers.

- Add `DrawTools Opt` entry in the IITC IRIS UI shell only after Pass 3 is usable and reviewed.
- Keep four marker choices as the first marker UI.
- Defer full IITC palette/color picker, stock Intel URL export, and fill-polygon (`EDFstatus`) toggles until after the
  basic link/marker workflow is useful.
- Use `apps/iris` PlanningBar/MapTab only for mobile ergonomics, not naming/storage/API.

### Pass 5 - Full IITC Draw Tools Expansion

Status: not started.

- Add polygon and circle item support.
- Add `getDrawAsLines`, stock Intel `pls` parse/export, and full color palette behavior.
- Decide whether to port/bundle Leaflet.draw controls for polyline, polygon, circle, marker, edit, and delete.
- Wire `draw:created`, `draw:edited`, `draw:deleted`, `draw:deletestart`, and `draw:deletestop` if Leaflet.draw is
  adopted.
- Add keyboard/access-key behavior or document a UI divergence if the bottom-sheet shell cannot support exact toolbar
  access keys.

### Pass 6 - Plugin-Facing Compatibility

Status: deferred.

- Expose enough `window.plugin.drawTools` and `pluginDrawTools` behavior for dependent Community plugins to inspect and
  add draw items.
- Test at least Draw Tools Plus-style calls:
  - `drawPolyline(arrCoordArr, color)`
  - `drawPolygon(arrCoordArr, color)`
  - `drawCircle(coord, radius, color)`
  - `drawMarker(coord, color)`
- Support `drawnItems.eachLayer`, `addLayer`, `clearLayers`, and visible-layer checks if using Leaflet `FeatureGroup`.
- Implement or explicitly park `initMPE`, `getLocationFilters`, and `filterEvents` compatibility.

### Pass 7 - Validation And Merge-Back

Status: first stable native slice validated locally and merged back to the main port plan.

Completed:

- `npm run test:iitc-core -- --run src/draw-tools.test.ts`
- `npm run lint:iitc-iris`
- `npm run lint:css`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`
- Latest validated artifacts for this slice:
  - `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-06-07T21-21-45.zip`
  - `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-06-07T21-21-45.xpi`

- Compare against IITC-CE with the same stored Draw Tools JSON for whichever item types are supported in the milestone.
- Validate import/export with real IITC Draw Tools data for supported item types. Stock Intel `pls` validation waits for
  the full import/export expansion pass.
- Run `npm run typecheck:iitc-iris`.
- Run focused tests added for Draw Tools.
- Run `npm run package:iitc-iris` after code validation, per the main port plan.
- Move the final completed pass notes and accepted gaps into `docs/iitc-iris/port-plan.md`.

## Known Risks And Open Questions

- Leaflet.draw may need browser-global assumptions that conflict with the Vite IIFE bundle. Verify before building too
  much UI around it.
- Existing IITC IRIS has geodesic links/fields but not a geodesic circle helper yet.
- Exact IITC toolbar placement is top-left Leaflet control UI, while IITC IRIS uses a Mini-IRIS bottom-sheet shell.
  Decide whether draw controls live as Leaflet controls for parity or as shell actions for mobile usability.
- Marker icons use `L.DivIcon.ColoredSvg` in IITC. IITC IRIS currently uses an equivalent local SVG facade rather than
  installing the global class.
- `snapToPortals` depends on portal completeness and map request status. IITC IRIS has different request diagnostics, so
  warning conditions need a local mapping to IITC's `getDataZoomTileParameters().hasPortals` and
  `mapDataRequest.status.short`.
- Multi-Project Extension (`window.plugin.mpe`) is probably out of scope for the first pass, but the storage-key switch
  should be planned so it can be added later without changing stored item shape.
- `apps/iris` planned links/markers export shape (`iris-draw-tools`) is not IITC Draw Tools JSON. If useful, add a
  migration/import helper as an IRIS-specific extra after IITC import/export works.
