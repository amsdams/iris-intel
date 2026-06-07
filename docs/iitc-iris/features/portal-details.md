# Portal Selection And Details

- Port IITC-like portal selection as the next comparison surface before broader side request/UI systems.
- Keep the first pass narrow: click/select a portal, render the selected portal highlight, expose selected
  GUID/title/team/level in the dock or innerstatus row, clear selection, and preserve selection across entity refreshes
  when the selected portal is still present.
- Add a portal details panel after the selection baseline is stable. The details panel should start with title, team,
  level, health, resonators, mods, owner, ornaments, artifacts, and basic link/field context where the decoded data
  supports it.
- Align core map UI with IITC-CE for comparison: selected portal details should live in an IITC-like side panel, while
  Mini-IRIS-style debug/copy controls stay collapsed in the comparison dock.
- Use portal selection/details to validate richer entity decoding and to anchor later COMM, inventory, artifact, and
  ornament comparisons.

IITC-CE source references:

- `reference/ingress-intel-total-conversion/core/code/portal_detail.js`
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display.js`
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display_tools.js`

Acceptance:

- Selecting the same portal in IITC-CE and IITC IRIS produces visually comparable selected-marker behavior.
- Selection remains coherent after pan/zoom refreshes and per-tile cached renders.
- Copied diagnostics include selected portal identity and enough selected-portal data to compare against IITC details.

Current status:

- First selection baseline is in progress: visible portal markers are clickable, the selected portal gets a separate
  orange Leaflet highlight ring, the compact innerstatus row shows the selected portal, selection can be cleared, and
  copied diagnostics include `selectedPortal`.
- A compact selected-portal summary row now uses the currently decoded map entity data: image, title, team, level,
  health, resonator count, mission flag, ornament/artifact counts, and basic link/field context from decoded map
  links/fields.
- Selecting a portal now starts a `/r/getPortalDetails` request. `packages/iitc-core` parses the IITC-shaped details
  response into owner, mods, resonators, history flags, mission flag, and derived mitigation; IITC IRIS exposes request
  status and parsed detail data in the selected row and copied diagnostics.
- A compact portal details panel now renders as a separate IITC-like right-side selected portal panel instead of
  expanding the main comparison dock. It shows a faction-colored shell, owner, mitigation, history flags, stable mod
  slots, a portal-centered resonator layout, selected link/field context, and safe portal actions for zoom/copy
  link/copy GUID.
- The first pass intentionally does not yet include verified IITC resonator compass-slot parity, deploy/recharge/link
  action wiring, inventory key counts, or IITC plugin/highlighter interactions.
