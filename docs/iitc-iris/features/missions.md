# Missions

IITC source references:

- `reference/ingress-intel-total-conversion/plugins/missions.js`
- `reference/ingress-intel-total-conversion/plugins/missions.css`
- `reference/ingress-intel-total-conversion/core/code/portal_marker.js` for portal detail fields `mission` and `mission50plus`
- `reference/ingress-intel-total-conversion/plugins/images/mission-type-*.png` and `mission-length.png` for mission metric icon parity

Ported IITC concepts and names:

- Endpoints: `getTopMissionsInBounds`, `getTopMissionsForPortal`, `getMissionDetails`
- Parser/core facade: `packages/iitc-core/src/missions.ts` with `parseIitcTopMissionsResponse`,
  `parseIitcMissionDetailsResponse`, `decodeIitcMissionSummary`, `decodeIitcMission`,
  `decodeIitcMissionWaypoint`, `getIitcMissionBounds`, and `formatIitcMissionDuration`
- Mission domain values: sequential/non-sequential/hidden mission order, portal/field-trip waypoint target,
  waypoint objectives, rating, median completion time, unique completed players, route length, and mission bounds
- Runtime/UI wiring: `IITC_IRIS_REQUEST_MISSIONS`, `IITC_IRIS_REQUEST_MISSION_DETAILS`,
  `IITC_IRIS_MISSION_ZOOM`, and `IITC_IRIS_MISSIONS_STATUS`

Current implementation choices:

- Map Missions and Portal Missions are explicit IRIS sheet actions. Unlike IITC's dialog lifecycle, opening/collapsing
  the sheet does not automatically re-request missions; this avoids duplicate request aborts in the extension shell.
- Mission list sorting follows IITC's natural alphanumeric title sort in the runtime before display.
- Mission route rendering uses IITC plugin route colors (`#404000` and `#A6A600`) and a separate Leaflet mission pane.
- Portal waypoint buttons use the existing IRIS portal-link navigation path so a loaded portal can be selected as well
  as panned/zoomed to.
- Mission `Zoom` uses IITC-style mission bounds with max zoom 15. Live comparison looked acceptable for now.
- Mission rows use summary response data first, then show IITC-style richer row metadata only when mission details are
  cached. Expanded mission details use a 3-column metric grid with restrained IITC-style icons and text labels.

Known gaps before calling Missions parity-complete:

- Live IITC vs IITC-IRIS comparison has not shown blockers. Accepted divergences: IRIS does not auto-refresh Missions in
  view on map move, and non-sequential missions do not draw a connecting dashed route. Continue watching copied
  diagnostics for request count/source and mission ordering, but route bounds/zoom is acceptable for now.
- IITC portal detail enrichment adds a `Missions` link only when portal details include `mission` or `mission50plus`.
  IRIS now shows a portal mission enrichment card and action using portal details flags plus cached portal mission counts;
  continue validating source switching and selected-portal update behavior.
- Portal Missions currently refreshes when the Missions sheet is already showing portal-source data and the selected
  portal changes, but unlike core portal details it is not part of every portal selection. Revisit this after comparing
  vanilla Intel mission behavior and IITC plugin behavior: decide whether Portal Missions should stay sheet-scoped,
  become a portal-detail enrichment action, or adopt a cached selection-driven model.
- IITC caches mission details for 3 days and portal mission summaries for 3 weeks. IRIS now mirrors those TTLs with
  persistent localStorage-backed caches, runtime cache hits, and visible cache-hit chips.
- Stabilization note: portal mission summary cache is intentionally kept summary-only. Rich row metadata is always
  re-enriched from the shorter-lived mission details cache so author/length/completed/order data cannot outlive the
  3-day details TTL via the 3-week portal summary cache.
- IITC mission progress/checkmark state is local plugin state, not Intel-backed mission progress: IITC stores checked
  missions and checked waypoints in localStorage and can optionally sync them through `plugin.sync`. Keep this as a later
  optional personal-checklist feature unless user value becomes clear.
- IITC app panes/dialog behavior, distance-to-mission, and Create New Mission link are not ported.
- Mission UI parity polish has started with restrained IITC-style metric icons in expanded mission details. Keep broader
  icon work parked until Missions remains stable in live use.
- Add mission distance-to-start once map/user-location behavior is clearer. IITC has distance-oriented mission affordances
  that should be ported only after the selected mission, first waypoint, and route bounds behavior is stable.
- Park Mission `First` and waypoint-click focus polish until after the current Missions checkpoint. Current behavior is
  usable; later work should decide whether `First` and waypoint clicks pan, zoom, select, or open portal details.
- Define one consistent zoom/focus contract for Mission `First`, mission waypoint clicks, COMM portal links, search
  results, inventory keys, and player tracker portal links. Mission `Zoom` already uses IITC-style mission bounds and
  `DEFAULT_ZOOM`; the IRIS-only waypoint pan action remains broader navigation polish, not a Missions parity blocker.
- Add IITC-style long-press/right-click parity for mission waypoints and mission map overlays after the general map/portal
  context interaction model is settled.
- Remaining mission validation should be opportunistic: copied diagnostics for request count/source, mission order, and
  portal mission single-result behavior are useful, but no longer block the current Missions checkpoint.
