# Credits

IRIS would not exist without the work of the Ingress Intel Total Conversion community. Thank you to the original
developers, plugin authors, contributors and maintainers who made that work available and continue to improve it.

## IITC and IITC-CE

[IITC / IITC-CE](https://github.com/IITC-CE/ingress-intel-total-conversion) provides the main behavioral reference
for our Intel requests, data models, map rendering, COMM, search, portal details and other workflows. IRIS includes
ported/adapted behavior and bundled image assets from this lineage, alongside its own TypeScript implementation and UI.
Special thanks to Stefan Breunig (breunigs), Jon Atkins (jonatkins), and the wider IITC and IITC-CE contributor community.
The names below come from the reference plugin headers; they do not replace recognition of later contributors.

The upstream ISC copyright and permission notice is retained in
[IITC-CE.txt](https://github.com/amsdams/iris-intel/blob/main/apps/iitc-iris/assets/licenses/IITC-CE.txt).

## Feature and plugin sources

These plugins informed feature ports, adaptations and behavioral comparisons. This table does not mean their complete
implementations or every upstream feature are included in IRIS. Our
[porting doctrine and comparison notes](https://github.com/amsdams/iris-intel/blob/main/docs/iitc-iris/port-plan.md)
describe deliberate differences and later improvements.

| IRIS feature | Original plugin / source | Credited author |
| --- | --- | --- |
| Drawn links and markers | [Draw tools](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/draw-tools.js) | breunigs |
| Player activity tracking | [Player activity tracker](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/player-activity-tracker.js) | breunigs |
| Missions | [Missions](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/missions.js) | jonatkins |
| Crossing-link checks | [Cross links](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/cross-links.js) | mcben |
| Portal counts | [Portal count](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/portal-counts.js) | yenky |
| Portal lists | [Portals list](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/portals-list.js) | teo96 |
| Viewport scoreboard | [Localized scoreboard](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/scoreboard.js) | Costaspap |
| Portal level labels | [Portal Level Numbers](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/portal-level-numbers.js) | rongou |
| Key counts | [Keys](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/keys.js), [Keys on map](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/keys-on-map.js) | xelio |
| Level highlighter | [Highlight portals by level color](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/highlight-level-color.js) | vita10gy |
| Recharge highlighter | [Highlight portals that need recharging](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/highlight-needs-recharge.js) | vita10gy |
| Portal history highlighters | [Highlight portals based on history](https://github.com/IITC-CE/ingress-intel-total-conversion/blob/master/plugins/highlight-portal-history.js) | Johtaja |

Additional inventory references, used to investigate request/retry behavior and key overlays:

- [Live Inventory](https://github.com/EisFrei/IngressLiveInventory) by EisFrei;
  [DanielOnDiordna's fork](https://github.com/IITC-CE/Community-plugins/blob/master/dist/DanielOnDiordna/liveInventory.user.js).
- [KuKuInventory](https://github.com/elkuku/iitc-kuku-inventory) by elkuku.

These inventory acknowledgements recognize behavioral references, not inclusion of those complete plugins.

## Libraries and maps

- [Preact](https://preactjs.com/), by Jason Miller and contributors — MIT.
- [Leaflet](https://leafletjs.com/), by Vladimir Agafonkin, CloudMade and contributors — BSD-2-Clause.
- [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js), by MapLibre contributors and its Mapbox lineage —
  BSD-3-Clause, with additional bundled notices in its license file.
- [MapLibre GL Leaflet](https://github.com/maplibre/maplibre-gl-leaflet), by MapLibre contributors and its Mapbox
  lineage — ISC.
- [OpenFreeMap](https://openfreemap.org/) and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
  supply our base maps. Provider/data attribution remains visible on the map.

The extension and APK bundle this document, the IRIS GPL-3.0 text, and the IITC, Leaflet, Preact and MapLibre notices
under `licenses/`. System → About also makes those license texts readable offline. These acknowledgements complement
the original notices; each third-party work retains its own license.

## Project license and independence

IRIS is distributed under [GNU GPL version 3](https://github.com/amsdams/iris-intel/blob/main/LICENSE), consistent with
the repository's existing declared license.
It is an independent project, not affiliated with or endorsed by Niantic or the upstream projects credited here.
Ingress and its services belong to their respective owners.

For an attribution correction or an omitted contributor, please
[open an issue](https://github.com/amsdams/iris-intel/issues).
