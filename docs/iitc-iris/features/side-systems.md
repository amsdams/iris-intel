# IITC Side Request And UI Systems

- Port IITC side systems that require their own request lifecycle and UI, after portal selection is available as a
  stable anchor.
- Suggested order:
    - COMM: `/r/getPlexts` request lifecycle, `comm.parseMsgData`-style parsing, filters, message list, map-linked
      portal/player references where available.
    - Scores: request behavior, faction score display, checkpoint/cycle status.
    - Passcodes: request/submit flow, feedback states, history/errors if IITC exposes them.
    - Inventory: request lifecycle, item/key parsing, grouping/filtering, counts, and a dedicated panel.
    - Additional IITC request surfaces and plugin-derived UI can be added after these core systems are validated.

IITC-CE source references:

- `reference/ingress-intel-total-conversion/core/code/comm.js`
- `reference/ingress-intel-total-conversion/core/code/chat.js`
- `reference/ingress-intel-total-conversion/core/code/sidebar.js`
- `reference/ingress-intel-total-conversion/core/code/entity_decode.js` for extended portal history bits in `getEntities`.
- `reference/ingress-intel-total-conversion/plugins/highlight-portal-history.js` for visited/captured/scout-controlled highlighter behavior.
- `reference/ingress-intel-total-conversion/plugins/keys-on-map.js` and `reference/ingress-intel-total-conversion/plugins/keys.js` for key-count map labels.

Acceptance:

- Each side system has an explicit copied diagnostic block for request state, elapsed time, error/auth state, and
  decoded counts.
- UI panels are compact enough to compare with IITC without relying on the debug dock.
- Request behavior is documented where it intentionally differs from IITC-CE.

Current status:

- A compact IITC IRIS side-panel shell now exists for COMM, Scores, Passcodes, and Inventory. The panels persist their
  open/closed state, show explicit request state, and copied diagnostics include a `sidePanels` block.
- The COMM panel can issue `/r/getPlexts` requests for IITC-style `all`, `faction`, and `alerts` channels and reports
  status, elapsed time, auth/error state, bounds, response count, added count, stored message count, older-message
  continuation, and compact message previews parsed through `packages/iitc-core/src/comm.ts`. The parser and channel
  state deliberately follow IITC-CE `comm.parseMsgData`, `_genPostData`, `_writeDataToHash`, and render-markup semantics
  for team normalization, public/secure/alert categories, sender/player extraction, auto messages, narrowcasts, dedupe,
  timestamp continuation, transformed markup, map-linked portal references, and nickname-click insertion into chat
  input. Send-plext support is implemented for `all` and `faction` but still needs live user verification; plugin hook
  equivalents for nickname clicks are not ported yet.
- COMM is good enough to unblock other UI panels. Remaining COMM work is polish/live verification rather than a blocker:
  send-plext verification, plugin hook compatibility, and richer interaction can be deferred.
- Scores now has first-pass core wiring. The panel requests IITC-CE core endpoints `getGameScore` and
  `getRegionScoreDetails`, displays global faction MU totals/percentages plus compact regional score diagnostics, and
  includes the scores state in copied dock diagnostics. Remaining work is the richer IITC region scoreboard view
  (checkpoint table/chart/timers/top-agent details) and live validation against Intel responses.
- UI polish pass: selected portal details now use compact IITC-like stat cells, health/resonator energy bars, richer
  resonator owner display, and less cramped history/mitigation details. COMM now keeps normal request diagnostics out of
  the way unless debug/error state is active and uses denser message rows with stronger portal/player affordances. Scores
  now has global and regional ENL/RES split bars plus top-agent previews when Intel returns them.
- Follow-up polish moved portal facts below mods and collapsed panel request diagnostics into hoverable request chips for
  COMM, Scores, and Inventory so live-use panels stay focused while raw endpoint context remains available for testing.
- The request chips now live in panel footers. Inventory has a more dedicated layout for item totals, selected-portal key
  counts, top item rows, and top key rows now that live inventory responses have been observed working.
- UI shell now uses a two-layer bottom menu and a one-sheet-at-a-time model on desktop and mobile. The first primary
  slot is selected-object aware: `Selected` when empty, then `Portal`, `Link`, or `Field` when one of those objects is
  selected. The other primary slots are `Map`, `Agent`, `COMM`, and `System`; the secondary layer exposes domain actions
  such as `Details`, portal `Missions`, `Search`, `Display`, `Controls`, `Scores`, `Profile`, `Inventory`, `Passcode`,
  COMM tabs, and diagnostics. This keeps the map-first Mini-IRIS feel while leaving room for IITC-style side systems
  without adding a permanent crowded toolbar.
- Selected-object details are intentionally scoped by entity kind: selected portals expose `Details` and portal
  `Missions`, while selected links and fields expose only their own `Details` sheets. Portal-only submenu items are not
  shown for link/field selections.
- Display owns visual map choices: base map, core overlays, portal filters, portal highlighter, and detail overlays.
  Controls owns operational actions: camera/context tools, copy/export, presets, lifecycle/scenarios, data source, and
  debug display. Keep future menu additions in that split unless they need a deliberate product-shell exception.
- Passcodes are now wired as a core Intel panel using IITC's `redeemReward` request shape. The panel sanitizes printable
  passcodes, posts `/r/redeemReward`, and displays AP/XM/other/item rewards with endpoint diagnostics in the footer.
  Passcode redemption is now its own Agent-domain menu item and opens in the same bottom sheet style as the other side
  systems. Live reward formatting can be refined further after testing real passcode responses.
- Inventory is core Intel API parity for IITC IRIS because it is backed by Intel's `/r/getInventory` endpoint. Port the
  request lifecycle and parser directly from IITC/Intel behavior into the IITC IRIS code path; do not depend on or copy
  the existing IRIS inventory implementation. Plugin-like inventory extensions, player tracker, draw tools, and richer
  key overlays can be classified separately after the core inventory panel works.
- First-pass history/key overlays are intentionally low risk and IITC-aligned: the Display sheet exposes history through
  the one-active-highlighter radio group and exposes key labels as a boolean `Key counts` overlay. The runtime styles
  portals using extended `getEntities` history bits when present, remembered `/r/getPortalDetails` history data, and
  `/r/getInventory` key counts by GUID, following IITC behavior from `core/code/entity_decode.js`,
  `plugins/highlight-portal-history.js`, `plugins/keys.js`, and `plugins/keys-on-map.js`. Negative history highlighters
  cover the old inverted modes such as not visited, not captured, and not scout controlled. This pass does not add bulk
  history fetching or hide/filter behavior; broader plugin/highlighter parity remains later work.
- The System sheet now owns app-level comparison/debug controls: copied diagnostics, Intel URL copy, fixture/live data
  source, view presets, jump input, and debug rows. This is an intentional product-shell divergence from IITC-CE’s
  sidebar/dropdown placement, kept separate from core map workflows so visual map comparisons remain meaningful.
- Map data request lifecycle now follows IITC-CE's active refill model: initial requests keep up to five active
  `getEntities` calls, each completed response immediately opens a slot for the next queued batch, and tile
  timeout/error retries are requeued through the same flow up to the IITC retry limit. This replaces the earlier
  wave-barrier behavior where IRIS waited for all active requests in a wave before starting more work.
- Search is now a Map-domain sheet rather than a floating panel. It searches loaded portals first, accepts coordinates,
  and uses Nominatim/OpenStreetMap geocoding on confirmed search with IITC-style result ordering: portal matches,
  coordinate matches, then geocoder results in service order. Geocoder requests include `polygon_geojson=1`; selected
  polygon/bounds results render a red preview layer and fit the view with IITC-aligned max zoom behavior. Remaining
  search parity gap: IITC previews result geometry on hover and removes it on mouseout, while IITC IRIS currently draws
  geometry on selection.
- COMM scrolling now follows the IITC mental model more closely: the message list is oldest-to-newest, scrolling to the
  older edge requests continuation messages, and new messages keep the user at the newest edge when appropriate.
- Player tracker popups and pins are closer to IITC's plugin: Resistance/Enlightened use IITC marker images, popup
  content shows nickname, age, portal link, and previous locations, and styling now follows the IITC IRIS dark sheet/map
  look instead of a default white Leaflet popup.
- Agent profile reads the page `PLAYER` data that IITC uses for level/AP/XM/invite/progress style details and exposes it
  under the Agent menu. Inventory and Passcode are separate Agent-domain sheets.
- Active request diagnostics now include `getEntities`, `getPlexts`, portal details, scores, inventory, passcodes, and
  other side requests so IITC vs IITC IRIS comparisons can see when non-entity work overlaps map movement or rendering.
- Missions first pass is now a native, read-only smart-port of IITC's missions plugin: `Map -> Missions` calls
  `/r/getTopMissionsInBounds`, `Portal -> Missions` calls `/r/getTopMissionsForPortal`, details call
  `/r/getMissionDetails`, and selected mission routes/waypoints render on the map.
