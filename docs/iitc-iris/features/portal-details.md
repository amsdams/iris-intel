# Portal Selection And Details

Portal selection/details are implemented. Markers are selectable, selection survives supported refresh paths, and
`getPortalDetails` supplies owner, mods, resonators, history, and mitigation. The Portal details panel composes these
with selected-object context and copy/navigation actions. The separate orange selection ring is a deliberate visual
choice. Request/cancellation and persisted-section contracts remain behavior-preserving boundaries.

IITC-CE source references:

- `reference/ingress-intel-total-conversion/core/code/portal.js`
- `reference/ingress-intel-total-conversion/core/code/portal_details.js`
- `reference/ingress-intel-total-conversion/core/code/portal_display.js`
- `reference/ingress-intel-total-conversion/core/code/portal_display_tools.js`

Acceptance:

- Selecting the same portal in IITC-CE and IITC IRIS produces visually comparable selected-marker behavior.
- Selection remains coherent after pan/zoom refreshes and per-tile cached renders.
- Copied diagnostics include selected portal identity and enough selected-portal data to compare against IITC details.

Current status:

- Selection baseline: visible portal markers are clickable, the selected portal gets a separate
  orange Leaflet highlight ring, the compact innerstatus row shows the selected portal, selection can be cleared, and
  copied diagnostics include `selectedPortal`.
- A compact selected-portal summary row now uses the currently decoded map entity data: image, title, team, level,
  health, resonator count, mission flag, ornament/artifact counts, and basic link/field context from decoded map
  links/fields.
- Selecting a portal now starts a `/r/getPortalDetails` request. `packages/iitc-core` parses the IITC-shaped details
  response into owner, mods, resonators, history flags, mission flag, and derived mitigation; IITC IRIS exposes request
  status and parsed detail data in the selected row and copied diagnostics.
- A compact portal details panel now renders as a separate IITC-like right-side selected portal panel as part of the Portal domain. It shows a faction-colored shell, owner, mitigation, history flags, stable mod
  slots, a portal-centered resonator layout, selected link/field context, and safe portal actions for zoom/copy
  link/copy GUID.
- The first pass intentionally does not yet include verified IITC resonator compass-slot parity, deploy/recharge/link
  action wiring, inventory key counts, or IITC plugin/highlighter interactions.

## Portal map links (2026-11-13)

The selected portal's **Map links** disclosure follows IITC core's location links for Google Maps, Bing Maps and
OpenStreetMap. Links use the selected portal's coordinates, with its title encoded for services that support a label.
They also work for a pending/placeholder portal before detail loading finishes. Browser links open separately so
IRIS retains the selection. Invalid coordinates do not produce links.

Map links is collapsed initially, after Mods, Resonators and Facts, and before Portal activity and request diagnostics.
Its links use two columns so service names fit on narrow phones, independently of the compact portal action grid.
It remains available while portal details are loading or unavailable. The original **OpenStreetMap** link preserves
IITC's pin view; a separate **OSM directions** link opens `/directions?to=latitude,longitude` with the portal as the
destination and the map centered there. Starting point and travel mode are chosen in OSM. This is an intentional
addition to IITC's links. OSM's current [directions source](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/assets/javascripts/index_modules/directions.js)
reads the `to` parameter, and its [endpoint source](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/assets/javascripts/index_modules/directions/endpoint.js)
recognizes coordinates directly before reverse-geocoding their label.

On Android, **Other maps…** hands `geo:latitude,longitude` to a compatible installed app through `ACTION_VIEW`,
using the same base coordinate handoff as IITC Mobile's `IntentGenerator.getGeoIntents`. IITC also supplies `?z=zoom`,
resolves apps into its own chooser, and substitutes a labelled `geo:0,0?q=...` query specifically for Google Maps.
IRIS uses Android's default handler or chooser and offers Google through its separate coordinate-only web link.
The generic geo action asks to show a location; it does not guarantee a pin, selected route destination or automatic
navigation. If no app handles the location, IRIS shows a message and the web map links remain available.
Native launches require a user gesture in Intel's main frame and leave the WebView in place.

Reference sources: `core/code/portal_display.js` (`renderUrl`), `core/code/portal_display_tools.js`
(`posLinksTemplate`), `core/code/app.js` (`intentPosLink`) and
`mobile/app/src/main/java/org/exarhteam/iitc_mobile/share/IntentGenerator.java` in the reference checkout.
The full IITC Mobile Share portal dialog, QR code and sharing tabs are outside this slice. Route planning and
transport choices belong to the receiving map service. After user testing reported Google could not resolve IITC's
combined coordinate/name query, its web link now uses Google's documented
[`maps/search/?api=1&query=latitude,longitude`](https://developers.google.com/maps/documentation/urls/get-started#search)
format with coordinates only. Portal names and parentheses are excluded from the Google query. Bing retains IITC's
labelled location link; the generic native link carries only coordinates for broader app compatibility.

Tests cover service URLs, title encoding, coordinate boundaries, selected-portal changes, browser selection retention,
Android link visibility and native launch policy. The user confirmed the corrected Google Maps link works in the
XPI, and that the OSM pin appears. The new OSM planner link and Android map-app launch/return still need live acceptance.
Validation: `npm run check` passes 736 app/core tests and the repository gates. All 70 browser cases pass, including
section ordering, collapsed Map links, the OSM planner URL and selected-destination changes in both themes and hosts.
Popup requests are intercepted across the browser context; this verifies link handoff, not live provider routing.
Android checks pass 15 JavaScript tests, 33 native JUnit tests, debug lint and assembly. Extension XPI/ZIP packaging
passes with the verified web build.

Signed Android handoff: APK `0.4.1-alpha+a1dfb91` (1879) includes the uncommitted feature and final Map links placement,
corrected Google query and OSM directions link. Release JavaScript/native tests, lint and signed assembly pass.
The permanent application ID and pinned signing certificate match; all 22 bundled web assets match the validated
web build, and the port-6969 download matches the built APK. Download:
`http://192.168.0.169:6969/downloads/iitc-iris-android.apk`. The build's source SHA identifies the base commit,
not a committed feature checkpoint.

Acceptance/review (2026-11-13): the user tested APK 1879 and the earlier XPI and considers the feature okay.
Other maps opens a receiving app without a preselected routing target; the specific app and whether it centers
on the portal were not reported. This is consistent with the generic geo action's location-viewing contract;
it does not establish every app handles the coordinates correctly. Comparison against the checked-in IITC-CE
reference `c33820e7` confirms the handoff differences above. Google's separate link works per user feedback;
OSM pin display is confirmed, while successful OSM route calculation and individual navigation apps remain
unverified. The initial feature is accepted with this compatibility limit; no universal routing parity is claimed.

Completion review (2026-11-13): destinations/map links is complete within the scope above and ready for main
integration. Review found one layout defect: the shared four-column action grid let the OpenStreetMap label overflow
at a 320px viewport. Map links now owns a two-column grid; all four browser/theme/host cases reproduce the failure
before the fix and pass after it. Final validation passes 736 app/core tests, all 70 browser cases, lint/types, CSS,
workbench and whitespace checks. No remaining merge blocker was found in URL encoding, coordinate validation,
selected-portal changes, collapsed-section placement or guarded Android handoff. Per-app routing remains the
documented compatibility limit. No commit or merge has been performed for this feature.

Reviewed downloads: signed APK `0.4.1-alpha+a1dfb91` (1880) supersedes 1879 with the narrow-phone layout fix;
XPI/ZIP timestamp `2026-11-13T19-45-40`. Release checks pass 15 JavaScript tests, 33 native tests, lint and signed
assembly. The signing pin, all 22 bundled web assets and the served APK match. APK 1879 has user acceptance;
1880 adds only the reviewed layout fix and has automated validation, not a separate phone retest.

## Additional core features — 2026-11-13

Map links now includes Prime portal-link copying and optional local QR sharing (`GEO:lat,lng`). Facts adds calculated
link range (click to fit), energy totals, maximum outgoing links, friendly/attack AP, hack counts/cooldown/burnout and
attack modifiers. Selection adds the IITC 40m access indicator and detail-based geodesic link range, dashed when
not fully deployed. The [missing core features plan](../plans/missing-core-features.md) owns contracts, reference
comparisons, testing and pending live acceptance. Previously accepted XPI/APK artifacts predate these additions.

## Phone information hierarchy — 2026-11-13

On `feat/ui-improvements`, portal details now lead with name/faction/level and Zoom, Navigate and Share. The compact
summary shows health, resonators, known keys and links; energy and clickable range follow Mods and Resonators. Keys use already
loaded inventory only, with Unknown distinguished from a known zero.

Navigate opens the existing provider choices. The full Map links disclosure remains below details. Share contains
copy title, Intel link, Prime link and QR, with GUID inside Advanced sharing. Mods and resonators remain directly
available; AP/hack/attack breakdowns move from Facts to Advanced statistics. The header also shows a compact owner line; Facts retains owner/history/topology.
Routine request diagnostics are disclosed separately. Expand/Reduce changes panel height; returning to the map and
reopening the same selection preserves scroll, expansion and open sections. The [UI plan](../plans/ui-improvements.md)
records all ten changes and validation. This UI batch still awaits user acceptance.
