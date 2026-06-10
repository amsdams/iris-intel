# Highlighters And Layers

## IITC-CE Model

IITC-CE separates map layers from portal highlighters.

- Layers are Leaflet base layers or overlay/filter layers. Base layers are mutually exclusive map backgrounds. Overlay
  layers are independently toggled; many can be enabled at the same time. IITC core creates default filter overlays for
  unclaimed portals, portal levels, fields, links, and factions in
  `reference/ingress-intel-total-conversion/core/code/map.js`, and plugins add more overlays with
  `window.layerChooser.addOverlay(...)`.
- Portal highlighters are selected style callbacks. IITC keeps one `window._current_highlighter`, registers callbacks
  with `window.addPortalHighlighter(...)`, and applies the active callback through `window.highlightPortal(...)` in
  `reference/ingress-intel-total-conversion/core/code/portal_highlighter.js`.

IRIS should preserve that distinction: many layers can be visible, but only one portal highlighter should be active, or
none.

## Classification Rule

Use this rule when deciding where a feature belongs:

- If it adds/removes visible map objects or controls object visibility, it is a layer.
- If it changes the style of already visible portal markers, it is a highlighter.
- If an IITC plugin does both, split the concepts. Example: ornament icons are a layer; coloring portals that have
  ornaments is a highlighter.

## Current IRIS Classification

| IRIS feature | IITC-aligned category | Notes |
|--------------|-----------------------|-------|
| Base map switch | Base layer | One selected base map at a time. |
| `fields`, `links`, `portals` | Overlay/filter layers | Existing hard-coded layer toggles align with IITC's layer chooser concept. |
| `resistance`, `enlightened`, `machina` | Overlay/filter layers | Faction filters affect portals, links, and fields. |
| `unclaimedPortals`, `level1Portals`..`level8Portals` | Overlay/filter layers | IITC-CE has comparable portal filter layers. |
| `ornaments` | Overlay layer | Current IRIS renders ornament markers; this should remain a layer. |
| `artifacts` | Overlay layer | Current IRIS renders artifact markers; this should remain a layer. |
| `labels` | Overlay layer | Level labels add separate label markers. |
| `tiles` | Overlay layer | Debug rectangles add separate map objects. |
| `drawnLinks`, `drawnMarkers` | Overlay layers | Draw Tools map objects remain layers. |
| player tracker toggles | Overlay layers | Player markers/traces are separate map objects. |
| mission route/waypoint overlay | Overlay layer | Mission geometry and labels are separate map objects. |
| selected portal/object highlight | Selection overlay | Separate from the highlighter registry; it is interaction state. |
| user-location marker/circle | Overlay layer | Separate map objects. |
| `levelFill` legacy setting | Migration-only highlighter behavior | Old persisted layer settings still migrate to `Level Color`, but this flag is no longer part of current layer settings. |
| `healthFill` legacy setting | Migration-only highlighter behavior | Old persisted layer settings still migrate to `Needs Recharge (Health)`, but this flag is no longer part of current layer settings. |
| `historyCaptured`, `historyVisited`, `historyScoutControlled` legacy styling | Migration-only highlighter behavior | Old persisted layer settings still migrate to the highlighter selector, but these flags are no longer part of current layer settings. |
| key-count text labels | Overlay layer | Adds label markers. IITC-CE `keys-on-map` is a layer backed by the manual `keys` plugin; IRIS uses live inventory-derived counts but keeps the map display as a layer. |

## Existing Highlighter Alignment

The first registry pass should only move existing behavior into an IITC-shaped selection model. It should not add new
visual modes.

| Candidate | Current IRIS state | IITC-CE reference | Alignment |
|-----------|--------------------|-------------------|-----------|
| Level color | Active highlighter `level-color` colors portal body by level at detailed zoom. | `plugins/highlight-level-color.js` registers `Level Color`. | Aligned in concept and exposed through the single highlighter selector. Legacy `levelFill` is migration-only state. |
| Needs recharge | Active highlighter `needs-recharge` colors damaged portals by health buckets. | `plugins/highlight-needs-recharge.js` registers `Needs Recharge (Health)`. | Aligned in concept and exposed through the single highlighter selector. Legacy `healthFill` is migration-only state. |
| History visited/captured/scout-controlled | Active history highlighters restyle portal fill color. | `plugins/highlight-portal-history.js` registers four combined history highlighters, but its inherited styles distinguish visited, captured, visit target, capture target, scout controlled, and scout-control target. | IRIS exposes those as six explicit selector entries: visited, not visited, captured, not captured, scout controlled, and not scout controlled. It keeps IITC's red/yellow `fillColor` vocabulary, but uses a consistent IRIS rule: positive history states are yellow and negative/target states are red. |

## Current Styling Rules

Highlighters only style already visible portal markers. They do not hide portals, filter portals, or add separate map
objects. Portal visibility still comes from layer/filter settings such as portals, factions, unclaimed, and portal
levels.

| Highlighter | Matching rule | Applied marker style | Non-matching portals |
|-------------|---------------|----------------------|----------------------|
| No Highlights | Always selected fallback. | No data-overlay style. | Normal portal style. |
| Level Color | Portal has detailed data and optional overlays are enabled. | Fill color uses the IITC level color for the portal level. | Normal portal style. |
| Needs Recharge (Health) | Portal has detailed data, belongs to a team, and health is below 100. | Fill color uses the existing health bucket color. | Normal portal style. |
| History: visited | `history.visited === true`. | Yellow fill, `fillOpacity: 1`. | Normal portal style. |
| History: not visited | History is known and `history.visited === false`. | Red fill, `fillOpacity: 1`. | Normal portal style. |
| History: captured | `history.captured === true`. | Yellow fill, `fillOpacity: 1`. | Normal portal style. |
| History: not captured | History is known and `history.captured === false`. | Red fill, `fillOpacity: 1`. | Normal portal style. |
| History: scout controlled | `history.scoutControlled === true`. | Yellow fill, `fillOpacity: 1`. | Normal portal style. |
| History: not scout controlled | History is known and `history.scoutControlled === false`. | Red fill, `fillOpacity: 1`. | Normal portal style. |

Portals without known history do not match a history highlighter and keep their normal portal style. Because only one
highlighter can be active, these rules do not stack with each other.

Deferred IITC highlighters include missing resonators, high-level-only, ornament portal coloring, hide portal ownership,
portal weakness, my-level filters, forgotten/inactive portals, moved portals, bookmarks, and uniques. Those should not
be added as part of the registry pass unless the user explicitly scopes them in.

## Planned Registry Work

### Portal highlighter registry and selection model

Build an IITC-aligned registry with:

- Highlighter id, IITC/display name, description, and style callback.
- One persisted active highlighter id, with `none` as the default.
- Runtime application from the portal marker style path, after base portal style and before selection overlays.
- Diagnostics that expose the active highlighter and registered highlighter ids.
- UI rendered from registry metadata, using one compact selector rather than independent toggle buttons.
- Key-count labels remain a layer. They are derived from live inventory in IRIS, unlike IITC-CE `keys-on-map`, which
  reads manual `window.plugin.keys.keys` values.

The initial registry registers only existing highlighter candidates. Legacy `levelFill`, `healthFill`, and old history
settings are migration inputs only. User-facing controls use the highlighter selector, and current layer settings no
longer include those old highlighter-like layer flags.

### Map layer registry

Started in the content UI. A layer registry should describe existing layers and filters declaratively so settings, UI,
diagnostics, and render ownership stop drifting. It should not add new layers in the first pass.

Useful fields:

- id
- display label
- UI group
- default visibility
- selection kind: base layer, overlay layer, filter layer
- minimum zoom / detailed-data requirement
- render owner or filter predicate

This is larger than the highlighter registry because layers are wired through visibility filters, render queues,
secondary overlays, diagnostics, persistence, and UI grouping.

Current first pass:

- A typed content-side registry describes existing boolean and tri-state layer controls.
- The registry owns current layer control labels, titles, UI group, selection kind, and content-side defaults for the
  Layers sheet.
- Registered layer ids, kinds, and defaults are exposed in diagnostics.
- It intentionally does not change visibility behavior or render ownership yet.
- Highlighter selection now updates existing portal marker styles in place where possible instead of rebuilding entity
  layers.
- Core layer/filter setting changes now use the existing incremental entity-layer sync against the previous layer
  settings where possible, so unchanged fields, links, and portals remain on the map.

Remaining registry work:

- Registered layer ids/kinds/defaults are exposed in diagnostics.
- Move page-runtime defaults and current active layer settings behind registry metadata where practical.
- Move page-runtime visibility filters and overlay render owners behind registry metadata.
- Keep selected portal/object highlights, mission overlays, and user-location objects classified explicitly so they do
  not drift into portal highlighter behavior.
