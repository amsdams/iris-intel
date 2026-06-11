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
| key-count text labels | Overlay layer | Adds label markers. IITC-CE `keys-on-map` is a layer backed by the manual `keys` plugin; IRIS uses live inventory-derived counts but keeps the map display as a boolean `Key counts` layer. |

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
| History: not visited | History is missing or `history.visited === false`. | Red fill, `fillOpacity: 1`. | Normal portal style. |
| History: captured | `history.captured === true`. | Yellow fill, `fillOpacity: 1`. | Normal portal style. |
| History: not captured | History is missing or `history.captured === false`. | Red fill, `fillOpacity: 1`. | Normal portal style. |
| History: scout controlled | `history.scoutControlled === true`. | Yellow fill, `fillOpacity: 1`. | Normal portal style. |
| History: not scout controlled | History is missing or `history.scoutControlled === false`. | Red fill, `fillOpacity: 1`. | Normal portal style. |

Portals without known history do not match positive history highlighters. They do match negative history highlighters as
targets, mirroring the old inverted history controls. Because only one highlighter can be active, these rules do not
stack with each other.

Deferred IITC highlighters include missing resonators, high-level-only, ornament portal coloring, hide portal ownership,
portal weakness, my-level filters, forgotten/inactive portals, moved portals, bookmarks, and uniques. Those should not
be added as part of the registry pass unless the user explicitly scopes them in.

## Registry Status

### Portal highlighter registry and selection model

The current v1 is implemented for existing IRIS highlighter-like behavior. It is intentionally not a broad plugin
highlighter port yet.

- Highlighter entries have an id, display name, description, and style callback.
- One persisted active highlighter id is used, with `none` as the fallback.
- Runtime application happens from the portal marker style path, after base portal style and before selection overlays.
- Diagnostics expose the active highlighter, registered highlighter ids, and rolling highlighter interaction timings.
- UI is rendered from registry metadata through one compact selector rather than independent toggle buttons.
- Key-count labels remain a layer. They are derived from live inventory in IRIS, unlike IITC-CE `keys-on-map`, which
  reads manual `window.plugin.keys.keys` values.

The registry registers only existing highlighter candidates. Legacy `levelFill`, `healthFill`, and old history settings
are migration inputs only. User-facing controls use the highlighter selector, and current layer settings no longer
include those old highlighter-like layer flags. Highlighter changes use a style-refresh path for existing portal markers
when possible, so changing highlighters does not require rebuilding fields or links.

### Map layer registry

Started in the content UI. The first pass describes existing layers and filters declaratively so settings, UI, and
diagnostics stop drifting. It does not add new layers.

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

- A shared typed registry describes existing boolean layer controls.
- The registry owns current layer control labels, titles, UI group, selection kind, and content-side defaults for the
  Display sheet.
- The Display sheet now presents registered boolean overlays/filters as IITC-style multi-select checkbox groups:
  core overlays, portal filters, and detail overlays. This keeps the many-enabled layer chooser semantics while leaving
  compact map controls free to stay as shortcuts.
- The Display sheet also owns base map selection and the one-active portal highlighter radio group. Section labels use
  explicit names such as `Base map`, `Portal highlighter`, `Core overlays`, `Portal filters`, and `Detail overlays` so
  layer controls read as map display choices rather than generic app controls.
- `keyCount` is a boolean detail overlay labelled `Key counts`. The previous `invert` mode was removed because the
  renderer only supported hidden or shown key labels.
- Registered layer ids, kinds, and defaults are exposed in diagnostics.
- Tile debug, Draw Tools, and player tracker layer setting changes route to their own overlay refresh paths without
  invoking core entity rendering.
- Core layer/filter setting changes use scoped entity sync instead of refreshing every entity kind:
  `fields` touches fields, `links` touches links, `portals` touches portals, faction filters touch affected factions
  across entity kinds, and level/unclaimed filters touch affected portal buckets.
- Secondary overlay work is masked by the changed layer kind. Field toggles do not rebuild portal labels, ornaments, or
  artifacts. Link toggles refresh link/draw overlays when needed. Portal/faction/level/detail changes refresh the
  relevant portal-side overlays.
- Removal bookkeeping is batched so core layer toggles compact rendered arrays once per update instead of splicing per
  entity.
- Layer-setting-only updates use a visibility-only fast path when the entity data object is unchanged.
- Whole `F`, `LN`, and `P` overlay toggles use persistent Leaflet layer groups when the current entity layers already
  exist. This avoids removing/re-adding every field, link, or portal for the common hide/show case. If data changes
  while one of those groups is hidden, the hidden group is cleared so re-enabling rebuilds current geometry instead of
  showing stale objects.
- Faction/level filter changes now follow IITC-CE's `IITC.filters.FilterLayer` behavior more closely: layer instances
  are preserved for filter-only changes and moved out of or back into their core group instead of being destroyed and
  recreated. Data-changing renders clear cached hidden layers first, so later re-adds do not show stale geometry.
- Core visibility is now described by named IITC-style filter descriptors (`Fields`, `Links`, `Portals`,
  `Unclaimed/Placeholder Portals`, `Level 1..8 Portals`, `Resistance`, `Enlightened`, `Machina`). A disabled layer means
  its filter is active, matching IITC-CE's `FilterLayer` semantics instead of scattering visibility checks through
  bespoke IRIS conditionals.
- Copied diagnostics keep a rolling `timing.interactionUpdates` list for the latest layer and highlighter changes.
  Whole-overlay group toggles report `coreGroupToggleMs`.
- Click-to-pixels diagnostics now record runtime completion plus first and second `requestAnimationFrame` timing for
  layer/highlighter interactions. This proved that low JS timings were not enough: visible paint was being delayed by
  work scheduled after the toggle.
- Layer/highlighter interactions now defer the heavy copied entity-status repost until after the second animation frame.
  The map mutation happens first, the browser gets a paint opportunity, and then diagnostics/counts are copied back to
  the UI.
- Portal visibility lists are built lazily for the copied status path instead of being recomputed on every interaction
  update.
- Faction filters use scoped buckets and a direct faction-bucket path for the common all-levels-enabled case. This keeps
  IITC-style filter semantics while avoiding broad recomputation.

Latest dense Amsterdam z15 stabilization observations, with roughly 3.9k portals, 2.8k links, and 1.7k fields loaded,
show the current shape:

| Toggle | Earlier scoped JS timing | Paint timing before status deferral | Current observed shape | Notes |
|--------|--------------------------|-------------------------------------|------------------------|-------|
| Fields | 15-31ms | First frame around 385-395ms, second frame around 770-808ms. | About 9-28ms runtime, second frame commonly 17-49ms. | Persistent core group attach/detach is now fast enough in the tested viewport. |
| Links | 18-43ms | First frame around 374-395ms, second frame around 779-880ms. | About 14-42ms runtime, second frame commonly 38-51ms. | Secondary drawn-link work is still the main add-on cost. |
| Resistance filter | 48-66ms | First frame around 407-441ms, second frame around 814-888ms. | Best observed about 34-54ms runtime, second frame around 47-72ms. | Direct faction-bucket path improved the common case, but this remains heavier than whole-overlay toggles. |
| Highlighter change | 18-29ms | First frame around 405-419ms, second frame around 809-877ms. | About 22-29ms runtime, second frame around 42-57ms. | Existing portal marker styles refresh in place. |
| Drawn links | 1-14ms | First frame around 367-373ms, second frame around 724-840ms. | About 2-14ms runtime, second frame around 10-28ms. | Dedicated Draw Tools overlay path. |

Manual status:

- User testing reported the map felt much faster after deferring the heavy status repost. The earlier “JS is fast but
  UI feels slow” mismatch was real: the copied status/diagnostic path was blocking paint after the Leaflet mutation.
- The team-subgroup topology experiment was tested and rolled back. It made faction filters worse in the live viewport
  because nested group attach/detach still triggered expensive Leaflet work: observed Resistance timings regressed to
  about 47/61ms runtime and about 105/102ms second-frame timing.
- This is stable enough for the current checkpoint. Further work should be driven by fresh diagnostics or a different
  renderer strategy, not another blind grouping rewrite.

Remaining registry work:

- Move page-runtime visibility filters and overlay render owners behind registry metadata where practical.
- Continue validating faction and level filters against IITC-CE on watch-only status. Do not retry the subgroup topology
  without a different rendering strategy or a benchmark that predicts better browser paint behavior.
- Keep click-to-pixels diagnostics active for future regressions.
- Keep selected portal/object highlights, mission overlays, and user-location objects classified explicitly so they do
  not drift into portal highlighter behavior.
