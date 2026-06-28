# Geodesic Rendering

IITC source references:

- `reference/ingress-intel-total-conversion/core/external/L.Geodesic.js`
- `reference/ingress-intel-total-conversion/core/code/map_data_render.js`
- `reference/ingress-intel-total-conversion/core/code/boot.js` for the `L.Geodesic.js` boot include

Ported IITC concepts and names:

- Render factories/concepts: `L.geodesicPolyline`, `L.geodesicPolygon`, link `weight: 2`, field `fillOpacity: 0.25`,
  field `stroke: false` equivalent, and non-interactive link/field map paths.
- Core map entity behavior: links and fields render as great-circle/geodesic paths, not straight projected Leaflet
  chords; selected link/field overlays and map-object context hit-testing use the same geodesic points.
- Local facade: `apps/iitc-iris/src/iitc-geodesic.ts` keeps the pure IITC geodesic conversion algorithm as
  `convertIitcGeodesicPoints`; `apps/iitc-iris/src/leaflet-geodesic.ts` exposes Leaflet-facing
  `convertIitcGeodesicLatLngs`, `createIitcGeodesicPolyline`, and `createIitcGeodesicPolygon`.

Current implementation choices:

- IITC IRIS ports the geodesic point-generation behavior without installing global `L.GeodesicPolyline`,
  `L.GeodesicPolygon`, or `L.geodesic*` factories. This is an intentional TypeScript/bundling boundary: the page map
  runtime owns rendering and does not yet expose plugin-compatible Leaflet globals.
- The port preserves IITC's longitude-offset anti-meridian handling and `segmentsCoeff: 5000` default. It uses normal
  Leaflet `Polyline`/`Polygon` instances after conversion, so pane, renderer, and selection behavior stays compatible
  with the existing IITC IRIS runtime.
- Link and field context selection now checks generated geodesic segments/polygons. This is closer to the visible path
  than the old straight-segment hit test, but still remains an IRIS context-menu implementation rather than a full IITC
  plugin hook surface.

Known gaps before calling link/field rendering parity-complete:

- The global Leaflet classes/factories from `L.Geodesic.js` are not exposed. Add them later if plugin compatibility
  requires direct `L.GeodesicPolyline` / `L.GeodesicPolygon` checks.
- Field cleanup/render-queue mutation still follows the current generation-based IITC IRIS facade documented above, not
  full IITC `Render` object lifecycle parity.

Related cross-cutting planning:

- Broad refactor sequencing, plugin/core strategy, runtime policy, auth recovery notes, and release-quality work live in
  `docs/iitc-iris/backlog.md`.
- This file should stay focused on geodesic link/field rendering, geodesic hit-testing, and any future decision to expose
  IITC-compatible `L.Geodesic*` globals for plugin compatibility.
