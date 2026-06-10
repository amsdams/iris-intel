# Entity Decode And Leaflet Rendering

- Port IITC-CE map entity parsing into `packages/iitc-core`.
- Preserve IITC concepts and names where they make comparison easier: portals, links, fields, ornaments, artifacts,
  shards, events.
- Decode fixtures from `docs/har` and `docs/iris/update-map-samples` without rendering concerns mixed in.

IITC-CE source references:

- `reference/ingress-intel-total-conversion/core/code/map_data_render.js`
- `reference/ingress-intel-total-conversion/core/code/portal_marker.js`
- `reference/ingress-intel-total-conversion/core/code/ornaments.js`
- `reference/ingress-intel-total-conversion/core/code/sidebar.js` and IITC's `window.artifact` setup path for artifact lifecycle.

Acceptance:

- Fixture counts by entity type match IITC-CE for the same request responses.
- Ornament and artifact identifiers are exposed distinctly enough for UI styling checks.

Current status:

- Portals, links, fields, placeholder portals, fake field-edge link filtering, and ornament IDs are decoded.
- Fixture tests cover low-zoom placeholder behavior and zoom-15 summary/ornament behavior.
- Artifact brief decoding is wired with a synthetic parser test, but live artifact behavior is unverified because Intel
  is not currently returning artifact portal payloads in the available test responses.
- Artifact brief normalization for renderer-facing fragment/target entries now lives behind the IITC-named
  `packages/iitc-core/src/artifact.ts` facade; IITC IRIS renders the core artifact entry shape directly.
- IITC IRIS fetches `/r/getArtifactPortals` in live mode as an IITC-style artifact subsystem request, independent of the
  `AR` visual layer toggle. Returned IITC-shaped `guid -> portal summary` artifact responses are normalized into
  renderable entities, injected into the rendered portal set, and reported with endpoint status/count/type diagnostics
  in copied debug JSON. The New Jersey Orion HAR captured during setup returned `{"result":{}}`, so non-empty live
  artifact payloads still need validation.
- Shard and event decoding still need dedicated live fixtures and tests.

## Pass 4: Leaflet Rendering - Partial

- Add portal, link, field, ornament, artifact, shard, and event layers using Leaflet primitives compatible with IITC-CE.
- Match IITC zoom visibility rules first, then refine visual styling.
- Keep renderer state independent from request lifecycle state.

IITC-CE source references:

- `reference/ingress-intel-total-conversion/core/code/map_data_render.js`
- `reference/ingress-intel-total-conversion/core/code/ornaments.js`
- `reference/ingress-intel-total-conversion/core/code/portal_marker.js`
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display.js` for artifact display conventions.

Acceptance:

- IITC IRIS and IITC-CE show the same entity categories at comparable Amsterdam/Damrak zoom levels.
- Hard refreshes do not randomly hide links or fields once data is available.

Current status:

- Typed npm Leaflet is bundled into `iitc-iris`.
- Fields, links, placeholder portals, real portals, level fill, health fill, ornaments, level labels, and IITC-style
  artifact/shard marker icons render.
- Core IITC-style entity filters are available in the dock: unclaimed/placeholder portals, portal levels 1-8, and
  Resistance/Enlightened/Machina faction filters. The faction filters apply to portals, links, and fields, matching
  IITC-CE's default overlay semantics; ornament and artifact overlays remain independent IITC-style overlays when their
  own `OR`/`AR` layers are enabled.
- Ornament rendering honors IITC's `excludedOrnaments`, `knownOrnaments`, and `ingress.intelmap.layergroupdisplayed`
  localStorage settings through the IITC-named `packages/iitc-core/src/ornaments.ts` facade for known ornament sublayers
  such as `Anomaly`, `Scouting`, `Battle`, `Beacons`, `Fracker`, and `Shards`, so ornaments hidden in IITC's default
  layer configuration are not drawn in IITC IRIS either.
- IITC IRIS uses IITC core stock ornament marker images for common anomaly/scouting/battle/beacon/fracker/shard IDs
  currently seen in fixtures/HARs, while retaining IITC-style sublayer classification for those groups in
  `packages/iitc-core/src/ornaments.ts`.
- Dynamic ornament IDs are supported by exact known-ID mappings plus IITC-style prefix classification for future `ap*`,
  `sc*_p`, `peBB_*`, `peBR_*`, winner `peBN_*`, `peFRACK`, `peLOOK`, and other `pe*` beacon IDs; unknown IDs still
  render through IITC's stock marker image URL.
- Copied diagnostics include drawn/hidden ornament marker counts and ornament type counts, making IITC ornament
  exclusion and visual parity checks easier.
- Optional detail styling now has an explicit render policy: level fill, health fill, and level labels only draw when
  detailed portal data is available at zoom 14+ and the matching layer toggle is enabled. Ornament and artifact overlays
  follow IITC-CE more closely and can draw at any zoom when their data is available and their layer toggle is enabled.
  Base fields, links, and portals remain independent of that policy.
- Base renderer styling is closer to IITC-CE: team-coloured portal fills, IITC portal radius/weight scaling, 0.25 field
  fill opacity, full-opacity links, orange neutral portals, and text-only portal level labels with simple overlap
  thinning.
- Existing highlighter-like styling is now applied through the single active portal highlighter path. Core layer/filter
  toggles use scoped visibility sync and secondary-overlay masks when entity data has not changed. Whole `F`, `LN`, and
  `P` hide/show toggles can use persistent Leaflet groups; faction/level filter-only changes preserve existing Leaflet
  layer instances like IITC-CE's `FilterLayer` path instead of destroying and recreating them.
- Artifact rendering is wired with IITC's marker image convention (`{type}_shard.png` and `{type}_shard_target.png`) and
  can use either artifact briefs from `getEntities` or the live `/r/getArtifactPortals` endpoint. The `AR` toggle
  controls marker visibility only, not whether the endpoint is fetched, but non-empty live Intel data still needs
  validation with a real artifact fixture or HAR.
- Layer ordering and visual parity are only approximate.
- Shard, event, portal label polish, and plugin/highlighter parity are not done.
- Visual comparisons against an IITC-CE install with plugins enabled must account for plugin overlays. For example,
  Player Tracker markers are expected to appear in IITC-CE but not IITC IRIS until plugin parity work starts.
