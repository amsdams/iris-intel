# Browser smoke tests

Run from the repository root after `npm ci`. Google Chrome must be installed; the suite uses it without changing
your normal Chrome profile. Each test starts with fresh, isolated storage.

```sh
npm run test:browser         # Headless; prints test names and results
npm run test:browser:watch   # Visible browser, slowed down so you can follow along
npm run test:browser:report  # Open the last HTML report, with steps and screenshots
```

For interactive stepping and rerunning individual tests, use `npm run test:browser -- --ui`.
These are standard [Playwright commands](https://playwright.dev/docs/test-cli).

The command builds the current app, starts a loopback-only fixture server on port 6973, runs the tests, and stops
the server/browser. Keep that port free. Reports and failure traces live in ignored `playwright-report/` and
`test-results/` directories. The styling test also attaches light/dark screenshots on successful runs.

The appearance/action checks are kept in [iris.smoke.mjs](iris.smoke.mjs):

1. Appearance selection survives reload; System follows device appearance while explicit Dark/Light stays fixed.
2. Search, COMM, Passcode, and Diagnostics have matching input surfaces; submit buttons match input heights;
   actions and toggles have matching corners, and Technical details opens/closes. Runs in light and dark themes.
3. Diagnostics starts with technical details collapsed, remembers disclosure/timing preferences across reloads, and
   exports full JSON while counters are hidden. Retired scenario/preset buttons remain absent.
4. Jump disables empty/whitespace input, guards direct submission, accepts Enter for coordinates, and shows
   feedback for malformed input. Runs in light and dark themes.

[base-map.smoke.mjs](base-map.smoke.mjs) adds malformed-style/HTTP failure, unavailable WebGL, stale failure after
switching styles, context loss/restoration, and map replacement checks. These use empty valid vector styles and
deliberate faults, not live providers. A recovered map uses OSM and updates Appearance, with a dismissible notice.

[panels.smoke.mjs](panels.smoke.mjs) checks 17 sheets at three landscape sizes and one portrait size. Populated
mission, inventory, and drawing lists exercise scrolling to the last row, import controls, and panel footers;
panels must fit above navigation without clipping their top. Each sheet must expose exactly one reachable close
button that returns to the map. Nested sections share their parent sheet's header. The data is simulated through
the UI message boundary; the three selected-object sheets are exercised by the map-context cases below.

[map-view.smoke.mjs](map-view.smoke.mjs) checks URL-over-storage precedence on boot, move-end storage/Intel
cookie/history synchronization, and restored position after reload without URL position parameters.

[map-requests.smoke.mjs](map-requests.smoke.mjs) runs the live request path with simulated Intel responses: TIMEOUT
retries recover into real Leaflet layers, request metadata is retained, and a subsequent refresh reuses cached tiles.

[map-entities.smoke.mjs](map-entities.smoke.mjs) checks real Leaflet layer identity across incremental generations,
whole-overlay/faction/level/unclaimed filters, in-place highlighter refresh, and fresh entity layers after map replacement.
It uses controlled fixture data through the page message boundary. Portal cases exercise detailed entity promotion,
cached-state display while refreshing, cancelled late responses, pending portal arrival, cache/selection retention
across map replacement, and native context gestures for portals, links, fields and empty map points. A combined
layer/highlighter/base-map message verifies update ordering, retained marker identity and both deferred frame timings.
Canvas teardown cases queue redraws and move synchronously before removal/replacement, covering the formerly lost
frame callback. Entity/label replacement checks also remove with frames still queued; image and drawing/mission replacement in
[map-overlays.smoke.mjs](map-overlays.smoke.mjs) also covers implicit pane renderers without waiting for paint first.

Level-label cases protect retained layers/shared canvas on unchanged refreshes, level changes, collision winners,
placeholder exclusion, faction/level toggles, removal and map-replacement cleanup. Wider-view checks protect
known-data labels/highlighters, unknown-history fallback, retained enabled settings, and Display/Counts/List/Scoreboard
availability notes across zoom 12/13/15 transitions. Pixel checks verify visible text
at portal positions after animated pan/zoom and an empty canvas after labels are disabled. Collision unit tests compare the
spatial buckets against the previous exhaustive scan, including boundary points and seeded dense/sparse clouds.
Key-count cases additionally check retained badge layers, inventory changes/removals and failed-refresh cache retention,
canvas clearing, faction filters, portal radius/position changes, text pixels after animated gestures, canvas ordering
and map replacement. Both label overlays draw passive canvas text without per-badge HTML nodes.

To repeat the optional performance probe, build with `npm run build -w apps/iitc-iris`, then run
`node tests/browser/server.mjs` in one terminal and `node tests/browser/profile-level-labels.mjs` in another.
Stop the server afterward; keep it stopped when running the regular browser suite. The probe prints JSON for
1,000/4,000 synthetic portals: three samples after a warm-up, toggle phase timings, refresh latency and retained labels.
Frame durations include message dispatch and two animation frames after layer detection (refreshes use a queued task
and two frames). They are paint opportunities, not measured GPU completion or real-device frame rates; no timing
threshold gates the tests. All external requests are stubbed.

Use `node tests/browser/profile-level-labels.mjs --gestures` with the same server for animated pan/zoom.
This keeps a simulated 4,000-portal dataset through camera-triggered refreshes, compares labels off/on at 412×780
and 2× pixel density, and applies 4× Chrome CPU throttling. JSON includes animation-frame gaps and CDP style/layout/
task durations. It approximates CPU pressure, not Android hardware, GPU/compositor completion or live map/network
work. Run it alone, without concurrent builds/browser probes; durations are observations, not test thresholds.

Add `--key-counts` to either command to profile inventory key badges instead of level labels, at
100/1,000/4,000 loaded portals with one synthetic key per portal. Inventory/subscription responses are stubbed through
the real request path; this does not test Intel availability or represent a measured real inventory distribution.
For example: `node tests/browser/profile-level-labels.mjs --key-counts --gestures`.
JSON identifies the overlay and dataset size. Gesture modes start from the same camera position and record both
attached badges and those whose portal coordinates fall inside the viewport; some loaded badges remain offscreen.
Assertions guard against profiling an emptied map or an entirely offscreen overlay. The refresh mode reports label
identity retention independently of timing. Runtime rendering is not changed by this diagnostic script.

Use `--ornaments` or `--artifacts` instead of `--key-counts` to investigate passive image overlays at
100/1,000/4,000 markers; each also supports `--gestures`. Choose one overlay flag per run. These modes substitute
one shared local PNG for marker image URLs and wait for decoding, isolating warm-image marker/render overhead from
remote availability. They do not test real asset loading, failures, CORS or a measured live decoration density.
Gesture JSON also reports decoded image counts; the legacy `labels` field counts the selected overlay's layers.
Image readiness inspects the isolated adapter cache for diagnostics; it is not a public renderer API.

Image-overlay browser cases cover retained ornaments/artifacts, actual fixture pixels and opacity, image sizes,
stacking after reattachment, changes/removals, placeholders/exclusions, unchanged faction/zoom policy, animated
pan/zoom, clearing/re-enable, shared URLs, failed-load retry, late loads and cache/map cleanup. Fixtures rewrite
image URLs to the local origin for readable pixel assertions; real cross-origin image display does not require CORS,
and its dedicated canvas can be tainted. The current PNG assets are the supported/verified image format.

[panel-requests.smoke.mjs](panel-requests.smoke.mjs) runs real Scores, Inventory/Profile, Passcode and COMM panel workflows
with simulated endpoint responses, checking request metadata, selected-portal key counts and rendered rewards. It also
checks that Inventory waits for an active shared subscription check, closing during that wait does not dispatch
items afterward, closing during the inventory fetch cancels it, and reopening loads successfully. Inventory regressions
exercise bounded retries for malformed responses, stopping on an empty
response with wait guidance, HTTP failure feedback and retention of previously loaded items after failed or empty refreshes.

The COMM case covers channel changes, older-history continuation, disabled Alerts input and simulated sending.
All network responses are local fixtures; no live messages are sent.

[map-features.smoke.mjs](map-features.smoke.mjs) checks live mission list/detail requests with simulated responses,
persistent detail-cache reuse after map replacement, and COMM-driven grouped player markers: list/history/back navigation,
faction filtering and history retention across replacement. It exercises real Leaflet markers and popup DOM.

[map-overlays.smoke.mjs](map-overlays.smoke.mjs) exercises real Draw Tools actions and cached mission route/waypoint
rendering before and after map replacement, including stored drawing restoration and undo. It uses simulated data.

[search.smoke.mjs](search.smoke.mjs) checks Enter submission with existing local results, arrow-key focus in displayed
order, single-action point/portal navigation, and address bounds fitting with stubbed Nominatim responses. It also
checks that `/` opens/refocuses the field, menu opening leaves focus alone, and editing/disabled shortcuts are respected.
Fast Enter submission is checked with a delayed online response; closing clears the preview without losing results or
changing the camera, and reopening restores the query. Street-sized bounds reach zoom 15; municipality, province, country, and continent fixtures still fit their full bounds.

[intel-fixture.html](intel-fixture.html) loads the actual compiled IRIS UI/runtime with simulated Intel globals,
empty API responses, and representative host input CSS. External map/network requests are stubbed by the tests.
No login, credentials, live Intel data, or real messages are used. This covers browser UI behavior, not extension
installation, live map-provider availability, or Android WebView behavior; keep phone smoke checks for those.

Run this suite for relevant UI changes. It stays separate from fast unit tests and is not added to CI yet.
Add a check when it protects a concrete behavior, rather than preserving every temporary investigation script.
