# IITC porting doctrine and compatibility

## Doctrine

**IITC-CE core and relevant plugins are the behavioral reference.** Before implementing or changing a feature,
inspect its corresponding core/plugin behavior: public names, payloads, ownership, lifecycle, mutation paths and hooks.
Preserve recognizable names (`comm`, `parseMsgData`, `portalDetails`, `getEntities`) and semantics where practical.
Existing IRIS behavior alone does not establish the contract; earlier IRIS/Mini-IRIS implementations are historical context.

Port behavior before optimizing. Typed modules, pure facades and a mobile UI may replace globals, DOM coupling or file
layout while retaining observable behavior. [Architecture](architecture.md) defines the app/core and lifetime boundaries.
Broad public plugin compatibility is not implied by using plugins as a behavioral reference.

For every intentional improvement or deviation, record **reference behavior, IRIS behavior, reason and validation
method** here (or in a selected feature's active plan). Compare against the reference before declaring parity; add
focused behavioral fixtures/diagnostics. Implementation changes that preserve behavior need no new deviation entry.
The [definition of done](../../README.md#definition-of-done) requires this comparison and explicit documentation.

Use the optional `reference/ingress-intel-total-conversion` checkout or the corresponding IITC-CE source; record the
revision in comparison evidence. Builds and normal tests must not depend on that ignored checkout.

## Reference map

Paths below are relative to the IITC-CE checkout; identify additional relevant plugins when extending a feature.
This is a source guide, not a list of promised plugin APIs.

| Area | Core / plugin sources |
| --- | --- |
| Requests / rendering | `core/code/map_request.js`, `map_cache.js`, `map_renderer.js`, `map_tiles.js`, `map_debug.js`, `request_handling.js`, `entity_decode.js`. |
| Portals / overlays | `core/code/portal.js`, `portal_details.js`, `portal_display.js`, `portal_display_tools.js`, `portal_marker.js`, `ornaments.js`, `sidebar.js`, `artifact.js`. |
| Geometry / drawing | `core/external/L.Geodesic.js`; `plugins/draw-tools.js`, `cross-links.js`, `plugins/external/` Leaflet.draw/geodesic/snap scripts; `core/code/boot.js` ColoredSvg. |
| Layers / analysis | `core/code/map.js`, `portal_highlighter.js`; `plugins/highlight-level-color.js`, `highlight-needs-recharge.js`, `highlight-portal-history.js`, `keys-on-map.js`, `portal-counts.js`, `portals-list.js`, `scoreboard.js`. |
| COMM / agent / missions | `core/code/comm.js`, `chat.js`, `sidebar.js`; `plugins/player-activity-tracker.js`, `keys.js`, `missions.js` and mission styles/images. |
| Extension / mobile | `core/code/hooks.js`; `plugins/external/L.Control.Pan.js`; mobile `share/IntentGenerator.java`, `IITC_WebView.java`, `IITC_WebViewClient.java`, `IITC_Mobile.java`. |

## Intentional differences

The rows below record existing decisions, not permission for unrelated changes. Recheck the relevant reference and
extend the row when changing its contract. Validation methods describe what to compare; live gaps remain in the roadmap.

| Reference → IRIS | Reason | Validation method |
| --- | --- | --- |
| Sidebar/dialog/toolbox → one Selected/Map/Agent/COMM/System sheet; tap selects without forcing details, with a separate orange ring. | Phone hierarchy and preserving faction/highlighter appearance. | Selection/context/pending-link flows, narrow layout, Back/focus and marker styling. |
| Plugin presentation → compact Counts/List/Viewport scores; RES/ENL/MAC order, no List row numbers, left-aligned names. | Consistent dense tables; viewport scores remain separate from server Regional scores. | Compare filtered viewport totals/AP, neutral L0/chart proportions and ordering. |
| Reference history modes → six explicit positive/negative choices, yellow/red; one active highlighter. | Explicit choices; unknown history matches neither. | Known/unknown history and level/health at multiple zooms; separate layer visibility. |
| Manual `plugin.keys` values → authenticated inventory-backed key counts. | Use available live inventory, not duplicate manual data. | Unknown versus loaded-zero, no details-triggered fetch, retained counts after failed/empty refresh. |
| Reference move/hidden timing → Fast 250ms or IITC Delay (400ms + 1000ms when downloading); immediate hidden suspension. | Responsive default with a comparison mode and reduced hidden work. | Same-view/cache/retry diagnostics; visibility/idle/resume and both timing modes. |
| Reference COMM send handling → affirmative acknowledgment only; uncertain replies retain drafts and never auto-resend. | Prevent lost text or duplicate sends. | Malformed/error/late acknowledgments, newer drafts, channel switches and closure. |
| COMM system events → selected-portal activity from loaded public events for selected portal, capped at 100 plus total. | Reuse available data without extra polling or authoritative ownership claims. | GUID/exact-E6 matching, loaded buffers and unchanged request interest. |
| Missions plugin → explicit view requests, native source/navigation, no dashed connecting route for non-sequential missions. | Avoid automatic view fetching and implying an ordered route. | Request sources/counts, sorting/enrichment, sequential versus non-sequential geometry and zoom. |
| Global geodesic factories / Leaflet.draw toolbar → local geometry factories and native Links/Markers management. | Typed ownership and phone UI; no unused global API promise. | Wrapped-world geometry, passive overlays, IITC JSON round-trip; Merge appends without deduplication. |
| `cross-links.js` raw-longitude rejection → whole great-circle arc tests with wrapped equivalent endpoints. | Correct antimeridian crossings. | Wrapped crossings, shared anchors and degenerate arcs without false positives. |
| Reference base-map/plugin choices → OSM and OpenFreeMap Dark/Light; migrate CARTO preferences and fall back to OSM on unresolved vector failure. | Supported bundled providers with recovery. | Style failure/retry/replacement, preference migration and owned WebGL teardown. |
| Mobile provider substitutions → coordinate-only Google search, labelled Bing location, separate OSM pin and destination planner, generic Android `geo:` ACTION_VIEW. | Avoid Google title-as-place failures and app-specific coupling. | Exact valid-coordinate payloads and no-handler recovery; device handoff separately. Generic geo does not guarantee a pin or route. |
| Global mutable request/render/plugin objects → pure queue/cache/session helpers, typed local registries and guarded runtime generations. | Explicit testable ownership. | Observable queue/cache/layer/lifetime behavior; returned-empty summary recovery remains a compatibility shim. |

## Compatibility boundaries

- Known metadata may style/label at any zoom; unknown is not false or zero. Wider-view omissions and padded fetch
  totals must not imply complete viewport coverage. Filters/highlighters do not retrieve missing data.
- Ornaments/artifacts are independent of faction/core portal visibility. Artifact fetching is separate from its visual
  toggle and deferred until initial map rendering. Unknown ornament IDs retain the reference image-URL fallback.
- Draw Tools converts IITC polygon/circle records but native editing/rendering supports links/markers only. Snap UX,
  stock `pls`, public Leaflet.draw/plugin hooks and arbitrary plugins are deferred until a concrete consumer is selected.
- Portal details are read-only; no in-game deploy/recharge/link actions. Access/link ranges use geodesic geometry.
  Prime sharing uses the encoded GUID; QR is generated locally (`GEO:lat,lng`), without an external image service.
- Native registries/facades do not expose `window.plugin.*`, hook/toolbox/highlighter APIs or global `L.Geodesic*` factories.
- Normal operation uses live Intel. Fixtures/samples are development tools, not packaged diagnostic maps or empty-map
  fallbacks. Compare identical settings/data, viewport counts and dispatch → mutation → paint; JS timing or screenshots
  alone do not prove lifecycle/performance parity. Synthetic results are not live/device acceptance.
- [Browser/live comparison](../../tests/browser/README.md) owns procedures; [the roadmap](../ROADMAP.md) owns unverified
  parity and future scope. Keep evidence/revisions in reports or review records rather than session diaries here.
