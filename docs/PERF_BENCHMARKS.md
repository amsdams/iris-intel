# Performance Benchmarks

Manual benchmark samples copied from IRIS Diagnostics. Use these as reference points
when evaluating major dependency migrations or rendering changes.

## Summary

| Version | Migration Point               | Device      | Browser     | Style   | Overlays                                | Items  | Portals | Links  | Fields | Plugins | Viewport | `setData` | HTML | Avg Frame | Median | Max   | FPS | Slow Frames |
|---------|-------------------------------|-------------|-------------|---------|-----------------------------------------|--------|---------|--------|--------|---------|----------|-----------|------|-----------|--------|-------|-----|-------------|
| 0.1.2   | Zustand 5                     | Desktop Mac | Chrome 148  | VOYAGER | player-tracker, portal-key-count-labels | 4,877  | 1,078   | 2,652  | 1,147  | 60      | 5ms      | 2ms       | 2ms  | 22ms      | 22ms   | 133ms | 46  | 35/467      |
| 0.1.2   | Zustand 5                     | Desktop Mac | Chrome 148  | VOYAGER | player-tracker                          | 10,180 | 2,102   | 5,469  | 2,609  | 65      | 7ms      | 2ms       | 1ms  | 20ms      | 21ms   | 117ms | 49  | 34/564      |
| 0.1.2   | Zustand 5                     | Mobile ARM  | Firefox 149 | OSM     | player-tracker                          | 1,364  | 287     | 702    | 375    | 30      | 13ms     | 5ms       | 2ms  | 45ms      | 49ms   | 134ms | 22  | 106/228     |
| 0.1.3   | MapLibre 5.24                 | Desktop Mac | Chrome 148  | VOYAGER | player-tracker                          | 1,624  | 419     | 860    | 345    | 73      | 2ms      | 0ms       | 1ms  | 23ms      | 21ms   | 117ms | 44  | 35/451      |
| 0.1.3   | MapLibre 5.24                 | Mobile ARM  | Firefox 149 | OSM     | player-tracker                          | 1,112  | 576     | 368    | 169    | 23      | 3ms      | 0ms       | 2ms  | 70ms      | 62ms   | 218ms | 14  | 94/149      |
| 0.1.4   | TypeScript 6                  | Desktop Mac | Chrome 148  | VOYAGER | player-tracker                          | 12,209 | 3,756   | 5,807  | 2,646  | 78      | 10ms     | 0ms       | 0ms  | 24ms      | 25ms   | 133ms | 41  | 47/426      |
| 0.1.4   | TypeScript 6                  | Mobile ARM  | Firefox 149 | OSM     | player-tracker                          | 1,241  | 399     | 566    | 277    | 41      | 2ms      | 0ms       | 1ms  | 58ms      | 55ms   | 151ms | 17  | 100/186     |
| 0.1.4   | Page-world map                | Desktop Mac | Firefox 151 | OSM     | player-tracker                          | n/a    | n/a     | n/a    | n/a    | n/a     | n/a      | n/a       | n/a  | 8ms       | 8ms    | 36ms  | 122 | 1/1,102     |
| 0.1.4   | Page-world map                | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | n/a    | n/a     | n/a    | n/a    | n/a     | n/a      | n/a       | n/a  | 17ms      | 17ms   | 33ms  | 60  | 0/540       |
| 0.1.4   | Page-world map                | Mobile ARM  | Firefox 149 | OSM     | player-tracker                          | n/a    | n/a     | n/a    | n/a    | n/a     | n/a      | n/a       | n/a  | 18ms      | 18ms   | 50ms  | 57  | 1/511       |
| 0.1.4   | Page-world source diagnostics | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 27,576 | 9,215   | 11,294 | 4,601  | 133     | 0ms      | 0ms       | n/a  | 9ms       | 10ms   | 118ms | 106 | 12/951      |
| 0.1.4   | Page-world source diagnostics | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 12,554 | 3,167   | 6,386  | 2,937  | 17      | 0ms      | 0ms       | n/a  | 9ms       | 9ms    | 66ms  | 117 | 4/1,053     |
| 0.1.4   | Page-world source diagnostics | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 14,382 | 4,760   | 6,525  | 2,933  | 17      | 0ms      | 0ms       | n/a  | 9ms       | 9ms    | 67ms  | 114 | 6/1,030     |
| 0.1.5   | Source-sync split + rbush load | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 13,922 | 4,510   | 6,392  | 2,882  | 13      | 1ms      | 0ms       | n/a  | 17ms      | 17ms   | 50ms  | 59  | 1/527       |
| 0.1.5   | Source-sync split + rbush load | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 13,681 | 4,439   | 6,271  | 2,833  | 13      | 1ms      | 0ms       | n/a  | 17ms      | 17ms   | 33ms  | 60  | 0/539       |
| 0.1.5   | Domain patch sync              | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 58     | 0       | 0      | 0      | 58      | 3ms      | 0ms       | n/a  | 17ms      | 17ms   | 67ms  | 57  | 8/519       |
| 0.1.5   | Domain patch sync              | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 61     | 0       | 0      | 0      | 61      | 2ms      | 0ms       | n/a  | 17ms      | 17ms   | 18ms  | 60  | 0/541       |
| 0.1.5   | Domain patch counts fix        | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 11,518 | 2,410   | 6,199  | 2,884  | 25      | 3ms      | 0ms       | n/a  | 17ms      | 17ms   | 33ms  | 60  | 0/540       |
| 0.1.5   | Domain patch counts fix        | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 14,016 | 4,547   | 6,427  | 2,884  | 25      | 2ms      | 0ms       | n/a  | 17ms      | 17ms   | 33ms  | 59  | 0/535       |
| 0.1.5   | Large source count             | Desktop Mac | Chrome 148  | OSM     | player-tracker                          | 105,044 | 29,782 | 52,552 | 21,072 | 280     | 3ms      | 0ms       | n/a  | 17ms      | 17ms   | 150ms | 58  | 4/525       |
| 0.1.5   | Pan vs zoom overlay cost        | Desktop Mac | Chrome 148  | OSM     | tracker, health fill, level labels      | 17,518 | 4,773   | 6,571  | 2,965  | 3,002   | 1ms      | 0ms       | n/a  | 17ms      | 17ms   | 68ms  | 58  | 6/523       |
| 0.1.5   | Pan vs zoom overlay cost        | Desktop Mac | Chrome 148  | OSM     | tracker, health fill, level labels      | 17,518 | 4,773   | 6,571  | 2,965  | 3,002   | 0ms      | 0ms       | n/a  | 17ms      | 17ms   | 34ms  | 60  | 0/541       |
| 0.1.5   | No-plugin pan variant           | Desktop Mac | Chrome 148  | OSM     | tracker, health fill, level labels      | 17,518 | 4,773   | 6,571  | 2,965  | 3,002   | 0ms      | 0ms       | n/a  | 17ms      | 17ms   | 33ms  | 60  | 0/539       |
| 0.1.5   | Moving overlay suspension       | Desktop Mac | Chrome 148  | OSM     | tracker, health fill, level labels      | 16,355 | 4,256   | 6,562  | 2,967  | 2,389   | 0ms      | 0ms       | n/a  | 17ms      | 17ms   | 84ms  | 58  | 5/525       |
| 0.1.6   | z8 entity isolation batch       | Mobile ARM  | Firefox 149 | OSM     | tracker, health fill, level labels      | 18,395 | 5,404   | 9,045  | 3,659  | 223     | n/a      | n/a       | n/a  | 30ms      | 27ms   | 268ms | 34  | 43/302      |
| 0.1.6   | z8 no-links isolation           | Mobile ARM  | Firefox 149 | OSM     | tracker, health fill, level labels      | 18,395 | 5,404   | 9,045  | 3,659  | 223     | n/a      | n/a       | n/a  | 18ms      | 18ms   | 50ms  | 55  | 3/498       |
| 0.1.6   | z8 no-fields isolation          | Mobile ARM  | Firefox 149 | OSM     | tracker, health fill, level labels      | 18,395 | 5,404   | 9,045  | 3,659  | 223     | n/a      | n/a       | n/a  | 18ms      | 18ms   | 33ms  | 57  | 0/511       |
| 0.1.7   | z8 mobile post-polish batch     | Mobile ARM  | Firefox 149 | OSM     | tracker, health fill, level labels      | 16,205 | 5,366   | 7,174  | 2,905  | 695     | n/a      | n/a       | n/a  | 28ms      | 23ms   | 368ms | 35  | 34/317      |
| 0.1.7   | z8 mobile no-links isolation    | Mobile ARM  | Firefox 149 | OSM     | tracker, health fill, level labels      | 16,205 | 5,366   | 7,174  | 2,905  | 695     | n/a      | n/a       | n/a  | 18ms      | 18ms   | 50ms  | 55  | 2/495       |
| 0.1.7   | z8 mobile no-fields isolation   | Mobile ARM  | Firefox 149 | OSM     | tracker, health fill, level labels      | 16,205 | 5,366   | 7,174  | 2,905  | 695     | n/a      | n/a       | n/a  | 18ms      | 18ms   | 50ms  | 56  | 1/505       |

## Readout

- Desktop stayed broadly stable after MapLibre 5.24: median frame time stayed around `21ms`, and max frame time stayed
  at `117ms` in the comparable player-tracker-only sample.
- The MapLibre 5.24 desktop viewport/update path looks cheaper in this sample (`7ms` -> `2ms`, `setData 2ms` -> `0ms`),
  but the entity count was much lower (`10,180` -> `1,624`), so this is not a clean performance win.
- Mobile got worse in the MapLibre 5.24 sample (`49ms` -> `62ms` median, `134ms` -> `218ms` max), but the sample is
  still not strict A/B because entity mix and live map state differ.
- TypeScript 6 did not show an obvious desktop runtime regression: the `0.1.4` desktop sample processed more entities
  than the earlier player-tracker-only baselines while staying in the same broad frame-time range.
- The `0.1.4` mobile sample improved versus `0.1.3` (`62ms` -> `55ms` median, `218ms` -> `151ms` max), but it is still
  slower than the earlier `0.1.2` mobile sample.
- The useful conclusion is: the migration appears functionally safe from smoke testing, desktop did not obviously
  regress, and mobile panning remains the main performance area to investigate separately.
- After the page-world map migration, Bench moved into the MAIN-world runtime and no longer reports the old
  extension-world `HTML` marker sample. The first copied samples were frame-only, while later samples restored
  page-world source/update timing so frame cost and data-update cost can be separated.
- Later page-world diagnostics restored `VIEWPORT`/`SOURCES` as source-update timing. They are not the old
  extension-world spatial query timings.
- The two restored page-world Chrome samples show why entity mix matters: average frame time stayed around `9ms`, but
  the high-ornament sample (`2,333` ornaments) had more slow frames and a higher max frame than the lower-ornament
  sample (`47` ornaments).
- The `0.1.5` source-sync/rbush samples are stable across two runs at a wider `1920x934` viewport: `17ms` median,
  `59-60fps`, and `0-1` slow frames. Treat them as a same-viewport baseline rather than a strict comparison with the
  older `1728x958` samples, where Chrome reported a higher apparent FPS cadence.
- The later `0.1.5` domain patch sync samples show the new narrow-source behavior: the copied viewport sample can now
  report only the source that changed, such as `plugin-features`, with portals/links/fields shown as `-/-`.
- The follow-up domain patch count fix restores current portal/link/field counts while preserving narrow patch timing:
  `plugin-features 25/0ms` with portals/links/fields counts shown and `-` timing for untouched sources.
- A later large-source-count sample stayed at `17ms` median with `105,044` current source items, but the `150ms` max
  frame shows why reducing UI subscriptions and occasional main-thread spikes still matters.

## Fixed Scenario Set

For dependency updates and renderer changes, collect the same small scenario set when possible:

| Scenario | Purpose | Map State | Overlay State |
|----------|---------|-----------|---------------|
| Base map | Map engine and tile baseline | Amsterdam, zoom `14.36`, `OSM` unless comparing style costs | All optional overlays off |
| Default use | Normal daily use | Same center, zoom, style, and live/mock mode as base | Default plugin set only |
| Labels on | Label-heavy overlay cost | Same center, zoom, style, and live/mock mode as base | Portal level labels and key-count labels on |
| Draw tools on | Planning overlay cost | Same center, zoom, style, and live/mock mode as base | Draw tools enabled with representative planned links/markers |
| Heavy overlay | Worst reasonable interactive case | Same center, zoom, style, and live/mock mode as base | Tracker, labels, draw tools, artifacts/ornaments, and keys if useful inventory data is available |

Keep browser, viewport, device mode, DPR, map style, run count, and live/mock mode visible in the copied sample. For
mobile, keep a manual finger-pan note next to Bench output when the deterministic RAF pan does not match perceived UX.
Bench now has selectable zoom presets (`Z8`, `Z12`, `Z14.36`, `Z16`), and copied `FRAME` lines include the selected
benchmark zoom.

## 2026-05-14 - IRIS 0.1.2 - Chrome Desktop - Zustand 5

Context:

- Purpose: post-`zustand` 5 migration sanity baseline before remaining major dependency migrations.
- Browser: Chrome 148.0.0.0 on macOS (`MacIntel`), desktop pointer.
- Viewport: `1464x934`, DPR `2.00`.
- Map style: `VOYAGER`.
- Benchmark: Diagnostics Bench, 3 runs at zoom `14.36`.

### Player Tracker + Portal Key Count Labels

```text
CONTEXT IRIS 0.1.2 browser Chrome 148.0.0.0 platform MacIntel viewport 1464x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle VOYAGER overlays player-tracker,portal-key-count-labels
VIEWPORT 5ms z 14.36 buffer 0.0500 query 0ms setData 2ms items 4,877 P 1,078 L 2,652 F 1,147 art 0 orn 0 plugin 60
SOURCES portals 1,078/0ms | links 2,652/1ms | fields 1,147/1ms | artifacts 0/0ms | ornaments 0/0ms | plugin-features 60/0ms
HTML 2ms candidates 16 active 16 existing 16 created 0 updated 16 removed 0
FRAME 10295ms avg 22ms max 133ms fps 46 slow 35/467 bench 3 median 22ms range 20ms-25ms benchMax 133ms
```

### Player Tracker Only

```text
CONTEXT IRIS 0.1.2 browser Chrome 148.0.0.0 platform MacIntel viewport 1464x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle VOYAGER overlays player-tracker
VIEWPORT 7ms z 14.36 buffer 0.0500 query 0ms setData 2ms items 10,180 P 2,102 L 5,469 F 2,609 art 0 orn 0 plugin 65
SOURCES portals 2,102/0ms | links 5,469/1ms | fields 2,609/1ms | artifacts 0/0ms | ornaments 0/0ms | plugin-features 65/0ms
HTML 1ms candidates 17 active 17 existing 17 created 0 updated 17 removed 0
FRAME 11604ms avg 20ms max 117ms fps 49 slow 34/564 bench 3 median 21ms range 20ms-21ms benchMax 117ms
```

### Firefox Mobile - Player Tracker Only

Phone sample from Firefox on Linux/Android ARM. Different map style and entity
counts from the desktop samples, so use it as a mobile baseline rather than a
strict desktop comparison.

```text
CONTEXT IRIS 0.1.2 browser Firefox 149.0 platform Linux armv81 viewport 360x704 dpr 3.00 touch 5 pointer coarse hover no mapStyle OSM overlays player-tracker
VIEWPORT 13ms z 14.36 buffer 0.0031 query 0ms setData 5ms items 1.364 P 287 L 702 F 375 art 0 orn 10 plugin 30
SOURCES portals 287/1ms | links 702/1ms | fields 375/2ms | artifacts 0/0ms | ornaments 10/0ms | plugin-features 30/0ms
HTML 2ms candidates 6 active 6 existing 6 created 0 updated 6 removed 0
FRAME 10328ms avg 45ms max 134ms fps 22 slow 106/228 bench 3 median 49ms range 37ms-53ms benchMax 134ms
```

Notes:

- Desktop samples are Chrome/macOS; the mobile sample is Firefox/Linux ARM.
- Entity counts differ between samples, so compare broad frame-time range rather than treating them as a strict A/B
  label-cost test.
- Future migration comparisons should keep browser, viewport, map style, overlays, zoom, and live/mock mode as close as
  possible.

## 2026-05-14 - IRIS 0.1.3 - MapLibre 5.24

Context:

- Purpose: post-`maplibre-gl` 5.24 migration sanity check.
- Manual smoke result: desktop and mobile tests looked functional; remaining perceived portal-selection delay and
  panning lag should be treated as separate UX/performance follow-up, not an immediate migration blocker.
- Benchmark: Diagnostics Bench, 3 runs at zoom `14.36`.

### Chrome Desktop - Player Tracker Only

```text
CONTEXT IRIS 0.1.3 browser Chrome 148.0.0.0 platform MacIntel viewport 1464x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle VOYAGER overlays player-tracker
VIEWPORT 2ms z 14.36 buffer 0.0500 query 0ms setData 0ms items 1,624 P 419 L 860 F 345 art 0 orn 16 plugin 73
SOURCES portals 419/0ms | links 860/0ms | fields 345/0ms | artifacts 0/0ms | ornaments 16/0ms | plugin-features 73/0ms
HTML 1ms candidates 17 active 17 existing 17 created 0 updated 17 removed 0
FRAME 10400ms avg 23ms max 117ms fps 44 slow 35/451 bench 3 median 21ms range 20ms-31ms benchMax 117ms
```

### Firefox Mobile - Player Tracker Only

```text
CONTEXT IRIS 0.1.3 browser Firefox 149.0 platform Linux armv81 viewport 360x704 dpr 3.00 touch 5 pointer coarse hover no mapStyle OSM overlays player-tracker
VIEWPORT 3ms z 14.36 buffer 0.0031 query 0ms setData 0ms items 1.112 P 576 L 368 F 169 art 0 orn 24 plugin 23
SOURCES portals 576/0ms | links 368/0ms | fields 169/0ms | artifacts 0/0ms | ornaments 24/0ms | plugin-features 23/0ms
HTML 2ms candidates 7 active 7 existing 7 created 0 updated 7 removed 0
FRAME 10401ms avg 70ms max 218ms fps 14 slow 94/149 bench 3 median 62ms range 56ms-127ms benchMax 218ms
```

Notes:

- Desktop 0.1.3 frame timing is close to the 0.1.2 baseline, but the entity count is lower, so do not treat this as
  proof of an engine-level improvement.
- Mobile 0.1.3 frame timing is worse than the earlier 0.1.2 Firefox sample despite similar test settings; entity mix and
  live-data state differ, so keep this as a signal for future mobile panning work rather than a hard regression verdict.

## 2026-05-14 - IRIS 0.1.4 - TypeScript 6

Context:

- Purpose: post-`typescript` 6.0.3 migration sanity check.
- Benchmark: Diagnostics Bench, 3 runs at zoom `14.36`.

### Chrome Desktop - Player Tracker Only

```text
CONTEXT IRIS 0.1.4 browser Chrome 148.0.0.0 platform MacIntel viewport 1464x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle VOYAGER overlays player-tracker
VIEWPORT 10ms z 14.36 buffer 0.0500 query 1ms setData 0ms items 12,209 P 3,756 L 5,807 F 2,646 art 0 orn 102 plugin 78
SOURCES portals 3,756/0ms | links 5,807/0ms | fields 2,646/0ms | artifacts 0/0ms | ornaments 102/0ms | plugin-features 78/0ms
HTML 0ms candidates 18 active 18 existing 18 created 0 updated 18 removed 0
FRAME 10478ms avg 24ms max 133ms fps 41 slow 47/426 bench 3 median 25ms range 21ms-29ms benchMax 133ms
```

### Firefox Mobile - Player Tracker Only

```text
CONTEXT IRIS 0.1.4 browser Firefox 149.0 platform Linux armv81 viewport 360x704 dpr 3.00 touch 5 pointer coarse hover no mapStyle OSM overlays player-tracker
VIEWPORT 2ms z 14.36 buffer 0.0031 query 0ms setData 0ms items 1.241 P 399 L 566 F 277 art 0 orn 6 plugin 41
SOURCES portals 399/0ms | links 566/0ms | fields 277/0ms | artifacts 0/0ms | ornaments 6/0ms | plugin-features 41/0ms
HTML 1ms candidates 6 active 6 existing 6 created 0 updated 6 removed 0
FRAME 10942ms avg 58ms max 151ms fps 17 slow 100/186 bench 3 median 55ms range 50ms-82ms benchMax 151ms
```

Notes:

- Desktop 0.1.4 had substantially more entities than the 0.1.3 MapLibre sample and still stayed in the same broad
  frame-time range.
- Mobile 0.1.4 improved versus the 0.1.3 MapLibre sample, but still points to mobile panning as the main remaining
  performance area.

## 2026-05-15 - IRIS 0.1.4 - Page-World Map Runtime

Context:

- Purpose: post page-world runtime migration sanity benchmark after the old `MapOverlay` fallback was no longer mounted.
- Benchmark: Mock tools Bench, 3 deterministic RAF-driven runs at Amsterdam zoom `14.36`.
- Map style: `OSM`.
- Overlay state: `player-tracker`.
- Important caveat for the first three samples: `VIEWPORT` and `SOURCES` show `no sample` because Bench had moved
  inside the page-world runtime before source-update diagnostics were restored. Those samples mainly compare
  camera/render frame smoothness. `HTML` marker diagnostics are intentionally absent in page-world mode.

### Firefox Desktop - Player Tracker Only

```text
CONTEXT IRIS 0.1.4 browser Firefox 151.0 platform MacIntel viewport 960x943 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT no sample
SOURCES no sample
FRAME 9023ms avg 8ms max 36ms fps 122 slow 1/1,102 bench 3 median 8ms range 8ms-8ms benchMax 36ms
```

### Chrome Desktop - Player Tracker Only

```text
CONTEXT IRIS 0.1.4 browser Chrome 148.0.0.0 platform MacIntel viewport 960x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT no sample
SOURCES no sample
FRAME 9032ms avg 17ms max 33ms fps 60 slow 0/540 bench 3 median 17ms range 17ms-17ms benchMax 33ms
```

### Firefox Mobile - Player Tracker Only

```text
CONTEXT IRIS 0.1.4 browser Firefox 149.0 platform Linux armv81 viewport 360x704 dpr 3.00 touch 5 pointer coarse hover no mapStyle OSM overlays player-tracker
VIEWPORT no sample
SOURCES no sample
FRAME 9038ms avg 18ms max 50ms fps 57 slow 1/511 bench 3 median 18ms range 17ms-18ms benchMax 50ms
```

Notes:

- Chrome desktop improved versus the earlier TypeScript 6 sample from roughly `24ms / 41fps / 47 slow frames` to
  `17ms / 60fps / 0 slow frames`, though the viewport and map style differ.
- Firefox mobile improved strongly versus the earlier TypeScript 6 sample from roughly `58ms / 17fps / 100 slow frames`
  to `18ms / 57fps / 1 slow frame`.
- Firefox desktop reports `8ms / 122fps`; treat browser-to-browser FPS comparisons cautiously because frame timing can
  be browser-dependent.
- Source-update timing has now been restored for later page-world samples; use those for future data-update comparisons.

### Chrome Desktop - Restored Source Diagnostics - Large Snapshot

This later sample includes page-world source-update diagnostics. `VIEWPORT` measures source update/copy timing, not the
old extension-world spatial query and HTML marker path.

```text
CONTEXT IRIS 0.1.4 browser Chrome 148.0.0.0 platform MacIntel viewport 1726x958 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT 0ms z 14.36 buffer n/a query 0ms setData 0ms items 27,576 P 9,215 L 11,294 F 4,601 art 0 orn 2,333 plugin 133
SOURCES portals 9,215/0ms | links 11,294/0ms | fields 4,601/0ms | artifacts 0/0ms | ornaments 2,333/0ms | plugin-features 133/0ms
FRAME 9018ms avg 9ms max 118ms fps 106 slow 12/951 bench 3 median 10ms range 9ms-10ms benchMax 118ms
```

Notes:

- This is a much larger desktop source snapshot than the first copied Chrome page-world sample, especially ornaments.
- Average frame time stayed low, but worst frame and slow-frame count increased, so compare future samples with similar
  entity and ornament counts.

### Chrome Desktop - Restored Source Diagnostics - Lower Ornament Count

```text
CONTEXT IRIS 0.1.4 browser Chrome 148.0.0.0 platform MacIntel viewport 1728x958 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 0ms z 14.36 buffer n/a query n/a setData 0ms items 12,554 P 3,167 L 6,386 F 2,937 art 0 orn 47 plugin 17
SOURCES portals 3,167/0ms | links 6,386/0ms | fields 2,937/0ms | artifacts 0/0ms | ornaments 47/0ms | plugin-features 17/0ms
FRAME 9012ms avg 9ms max 66ms fps 117 slow 4/1,053 bench 3 median 9ms range 8ms-9ms benchMax 66ms
```

Notes:

- With fewer entities and far fewer ornaments, average frame time remained similar, while max frame time and slow-frame
  count improved.
- Keep ornament count visible in future benchmark comparisons because it appears to affect occasional stutter more than
  average frame time.

### Chrome Desktop - Post Diagnostics Cleanup

This sample uses the updated copy format without the stale HTML marker row.

```text
CONTEXT IRIS 0.1.4 browser Chrome 148.0.0.0 platform MacIntel viewport 1728x958 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 0ms z 14.36 buffer n/a query n/a setData 0ms items 14,382 P 4,760 L 6,525 F 2,933 art 0 orn 147 plugin 17
SOURCES portals 4,760/0ms | links 6,525/0ms | fields 2,933/0ms | artifacts 0/0ms | ornaments 147/0ms | plugin-features 17/0ms
FRAME 9023ms avg 9ms max 67ms fps 114 slow 6/1,030 bench 3 median 9ms range 9ms-9ms benchMax 67ms
```

Notes:

- Frame timing remains close to the previous lower-ornament source diagnostic sample despite a higher portal and
  ornament count.

## 2026-05-17 - IRIS 0.1.5 - Source-Sync Split And rbush Bulk Load

Context:

- Purpose: sanity baseline after page-world source sync started patching selected/planned sources separately and
  `SpatialIndex.syncAll` moved to `rbush.load()`.
- Browser: Chrome 148.0.0.0 on macOS (`MacIntel`), desktop pointer.
- Viewport: `1920x934`, DPR `2.00`.
- Map style: `OSM`.
- Overlay state: `player-tracker`.
- Benchmark: Diagnostics Bench, 3 deterministic runs at zoom `14.36`.

### Chrome Desktop - Player Tracker Only - Run 1

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 1ms z 14.36 buffer n/a query n/a setData 0ms items 13,922 P 4,510 L 6,392 F 2,882 art 0 orn 125 plugin 13
SOURCES portals 4,510/0ms | links 6,392/0ms | fields 2,882/0ms | artifacts 0/0ms | ornaments 125/0ms | plugin-features 13/0ms
FRAME 9030ms avg 17ms max 50ms fps 59 slow 1/527 bench 3 median 17ms range 17ms-17ms benchMax 50ms
```

### Chrome Desktop - Player Tracker Only - Run 2

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 1ms z 14.36 buffer n/a query n/a setData 0ms items 13,681 P 4,439 L 6,271 F 2,833 art 0 orn 125 plugin 13
SOURCES portals 4,439/0ms | links 6,271/0ms | fields 2,833/0ms | artifacts 0/0ms | ornaments 125/0ms | plugin-features 13/0ms
FRAME 9035ms avg 17ms max 33ms fps 60 slow 0/539 bench 3 median 17ms range 17ms-17ms benchMax 33ms
```

Notes:

- The two runs are very stable: median frame time stayed at `17ms`, source update time stayed at `1ms`, and `setData`
  remained `0ms`.
- The second run had a lower max frame (`33ms` vs `50ms`) and no slow frames, suggesting the current desktop path is
  healthy for this viewport/entity mix.
- Do not compare the `17ms / 60fps` line too literally against older `9ms / 114fps` Chrome samples unless the viewport,
  display refresh cadence, entity counts, and browser scheduling conditions match.

## 2026-05-17 - IRIS 0.1.5 - Domain Patch Sync

Context:

- Purpose: sanity baseline after routine page-world updates were split into narrow domain patches, including visual
  filter/theme changes.
- Browser: Chrome 148.0.0.0 on macOS (`MacIntel`), desktop pointer.
- Viewport: `1469x934`, DPR `2.00`.
- Map style: `OSM`.
- Overlay state: `player-tracker`.
- Benchmark: Diagnostics Bench, 3 deterministic runs at zoom `14.36`.
- Important caveat: these samples captured a plugin-feature patch, not a full portal/link/field source refresh. That is
  why portals, links, and fields show `0` in `VIEWPORT` and `-/-` in `SOURCES`.

### Chrome Desktop - Player Tracker Patch - Run 1

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1469x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 3ms z 14.36 buffer n/a query n/a setData 0ms items 58 P 0 L 0 F 0 art 0 orn 0 plugin 58
SOURCES portals -/- | links -/- | fields -/- | artifacts -/- | ornaments -/- | plugin-features 58/0ms
FRAME 9085ms avg 17ms max 67ms fps 57 slow 8/519 bench 3 median 17ms range 17ms-19ms benchMax 67ms
```

### Chrome Desktop - Player Tracker Patch - Run 2

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1469x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 2ms z 14.36 buffer n/a query n/a setData 0ms items 61 P 0 L 0 F 0 art 0 orn 0 plugin 61
SOURCES portals -/- | links -/- | fields -/- | artifacts -/- | ornaments -/- | plugin-features 61/0ms
FRAME 9036ms avg 17ms max 18ms fps 60 slow 0/541 bench 3 median 17ms range 17ms-17ms benchMax 18ms
```

Notes:

- The narrow `plugin-features` source update confirms the domain patch path is avoiding unrelated portal/link/field
  source work for tracker-only updates.
- Frame timing remains at the expected Chrome desktop display cadence around `17ms`; the second run is especially
  clean with `0` slow frames and `18ms` max.

### Chrome Desktop - Current Source Counts Restored - Run 1

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 3ms z 14.36 buffer n/a query n/a setData 0ms items 11,518 P 2,410 L 6,199 F 2,884 art 0 orn 0 plugin 25
SOURCES portals 2,410/- | links 6,199/- | fields 2,884/- | artifacts 0/- | ornaments 0/- | plugin-features 25/0ms
FRAME 9030ms avg 17ms max 33ms fps 60 slow 0/540 bench 3 median 17ms range 17ms-17ms benchMax 33ms
```

### Chrome Desktop - Current Source Counts Restored - Run 2

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 2ms z 14.36 buffer n/a query n/a setData 0ms items 14,016 P 4,547 L 6,427 F 2,884 art 0 orn 133 plugin 25
SOURCES portals 4,547/- | links 6,427/- | fields 2,884/- | artifacts 0/- | ornaments 133/- | plugin-features 25/0ms
FRAME 9037ms avg 17ms max 33ms fps 59 slow 0/535 bench 3 median 17ms range 17ms-17ms benchMax 33ms
```

Notes:

- Current source counts are visible again while source timings still show only the latest changed source.
- The `-` timing for portals/links/fields is expected here: those sources were present on the map but were not updated
  by the latest patch.
- Both runs stayed clean at `17ms` median and `0` slow frames.

### Chrome Desktop - Large Current Source Count

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT source 3ms z 14.36 buffer n/a query n/a setData 0ms items 105,044 P 29,782 L 52,552 F 21,072 art 0 orn 1,358 plugin 280
SOURCES portals 29,782/- | links 52,552/- | fields 21,072/- | artifacts 0/- | ornaments 1,358/- | plugin-features 280/0ms
FRAME 9023ms avg 17ms max 150ms fps 58 slow 4/525 bench 3 median 17ms range 17ms-18ms benchMax 150ms
```

Notes:

- The median remains pinned to Chrome's expected desktop cadence, even with `105,044` current source items.
- The `150ms` max frame and four slow frames are the remaining concern; future work should focus on occasional
  main-thread spikes rather than average frame cadence alone.

## 2026-05-18 - IRIS 0.1.5 - Benchmark Variants

Context:

- Purpose: compare normal rendering against base-map-only and no-plugin benchmark variants after adding Bench variant
  support.
- Browser: Chrome 148.0.0.0 on macOS (`MacIntel`), desktop pointer.
- Viewport: `1920x934`, DPR `2.00`.
- Map style: `OSM`.
- Overlay state: `player-tracker`, `portal-key-count-labels`, `portal-health-fill`.
- Benchmark: Diagnostics Bench, 3 deterministic runs at zoom `14.36`.

### Normal

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker,portal-key-count-labels,portal-health-fill
VIEWPORT source 0ms z 14.36 buffer n/a query n/a setData 0ms items 16,146 P 5,104 L 6,489 F 2,904 art 0 orn 178 plugin 1,416
SOURCES portals 5,104/- | links 6,489/- | fields 2,904/0ms | artifacts 0/- | ornaments 178/- | plugin-features 1,416/-
FRAME 9039ms avg 17ms max 49ms fps 59 slow 3/532 bench 3 variant normal median 17ms range 17ms-17ms benchMax 49ms
LONGTASK count 2 max 79ms last 79ms longtask
UIRENDER recent/total DiagnosticsPopup 1/2 | BottomDock 1/48 | StatusBar 1/270 | IRISOverlay 1/48 | MockToolsBar 1/48 | PlanningBar 1/48 | DockDrawer 1/48
```

### Base

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker,portal-key-count-labels,portal-health-fill
VIEWPORT source 1ms z 14.36 buffer n/a query n/a setData 0ms items 16,146 P 5,104 L 6,489 F 2,904 art 0 orn 178 plugin 1,416
SOURCES portals 5,104/- | links 6,489/- | fields 2,904/- | artifacts 0/- | ornaments 178/- | plugin-features 1,416/0ms
FRAME 9036ms avg 17ms max 34ms fps 60 slow 0/540 bench 3 variant base median 17ms range 17ms-17ms benchMax 34ms
LONGTASK count 2 max 79ms last 79ms longtask
UIRENDER recent/total DiagnosticsPopup 1/6 | IRISOverlay 1/64 | PlanningBar 1/64 | DockDrawer 1/64 | BottomDock 1/64 | StatusBar 1/344 | MockToolsBar 1/65
```

### No Plugins

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker,portal-key-count-labels,portal-health-fill
VIEWPORT source 1ms z 14.36 buffer n/a query n/a setData 0ms items 16,146 P 5,104 L 6,489 F 2,904 art 0 orn 178 plugin 1,416
SOURCES portals 5,104/- | links 6,489/- | fields 2,904/- | artifacts 0/- | ornaments 178/- | plugin-features 1,416/0ms
FRAME 9036ms avg 17ms max 18ms fps 60 slow 0/542 bench 3 variant no-plugins median 17ms range 17ms-17ms benchMax 18ms
LONGTASK count 2 max 79ms last 79ms longtask
UIRENDER recent/total DiagnosticsPopup 1/10 | IRISOverlay 1/74 | PlanningBar 1/74 | DockDrawer 1/74 | BottomDock 1/74 | StatusBar 1/391 | MockToolsBar 1/76
```

Notes:

- Average frame time stayed at the expected desktop cadence in all variants.
- `No Plugins` was cleanest (`18ms` max, `0` slow frames), while `Normal` had the only slow frames (`49ms` max,
  `3` slow frames).
- This points the next performance work toward plugin overlays, marker pins, and label/fill layers rather than base
  map rendering or core portal/link/field source sync.

## 2026-05-18 - IRIS 0.1.5 - Pan vs Zoom Overlay Cost

Context:

- Purpose: compare pan and zoom benchmark modes after plugin composition diagnostics were added.
- Browser: Chrome 148.0.0.0 on macOS (`MacIntel`), desktop pointer.
- Viewport: `1920x934`, DPR `2.00`.
- Map style: `OSM`.
- Overlay state: `player-tracker`, `portal-health-fill`, `portal-level-labels`.
- Benchmark: Diagnostics Bench, 3 deterministic runs at zoom `14.36`.

### Normal Pan

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker,portal-health-fill,portal-level-labels
VIEWPORT source 1ms z 14.36 buffer n/a query n/a setData 0ms items 17,518 P 4,773 L 6,571 F 2,965 art 0 orn 152 plugin 3,002
SOURCES portals 4,773/- | links 6,571/- | fields 2,965/- | artifacts 0/- | ornaments 152/- | plugin-features 3,002/0ms
PLUGIN total 3,002 rendered 1,820 html 1,801 labels 1,801 player 4 highlights 1,178 lines 19 fills 0 points 2,983 interactive 0
FRAME 9027ms avg 17ms max 68ms fps 58 slow 6/523 bench 3 variant normal mode pan z 14.36 median 17ms range 17ms-18ms benchMax 68ms
LONGTASK count 4 max 76ms last 76ms longtask
UIRENDER recent/total IRISOverlay 1/37 | StatusBar 1/209 | BottomDock 1/37 | PlanningBar 1/37 | DockDrawer 1/37 | MockToolsBar 1/37
```

### Normal Zoom

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker,portal-health-fill,portal-level-labels
VIEWPORT source 0ms z 14.36 buffer n/a query n/a setData 0ms items 17,518 P 4,773 L 6,571 F 2,965 art 0 orn 152 plugin 3,002
SOURCES portals 4,773/- | links 6,571/- | fields 2,965/- | artifacts 0/0ms | ornaments 152/- | plugin-features 3,002/-
FRAME 9042ms avg 17ms max 34ms fps 60 slow 0/541 bench 3 variant normal mode zoom z 14.36 median 17ms range 17ms-17ms benchMax 34ms
LONGTASK count 4 max 76ms last 76ms longtask
UIRENDER recent/total IRISOverlay 1/46 | StatusBar 1/250 | BottomDock 1/46 | DockDrawer 1/46 | PlanningBar 1/46 | MockToolsBar 1/47 | DiagnosticsPopup 1/15
```

### No Plugins Pan

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker,portal-health-fill,portal-level-labels
VIEWPORT source 0ms z 14.36 buffer n/a query n/a setData 0ms items 17,518 P 4,773 L 6,571 F 2,965 art 0 orn 152 plugin 3,002
SOURCES portals 4,773/- | links 6,571/- | fields 2,965/- | artifacts 0/0ms | ornaments 152/- | plugin-features 3,002/-
FRAME 9041ms avg 17ms max 33ms fps 60 slow 0/539 bench 3 variant no-plugins mode pan z 14.36 median 17ms range 17ms-17ms benchMax 33ms
LONGTASK count 4 max 76ms last 76ms longtask
UIRENDER recent/total DiagnosticsPopup 1/30 | StatusBar 1/343 | IRISOverlay 1/65 | DockDrawer 1/65 | BottomDock 1/65 | PlanningBar 1/65 | MockToolsBar 1/68
```

### Normal Pan With Moving Overlay Suspension

Later sample after pan-mode Bench began hiding plugin labels and portal highlights during active movement:

```text
CONTEXT IRIS 0.1.5 browser Chrome 148.0.0.0 platform MacIntel viewport 1920x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker,portal-health-fill,portal-level-labels
VIEWPORT source 0ms z 14.36 buffer n/a query n/a setData 0ms items 16,355 P 4,256 L 6,562 F 2,967 art 0 orn 127 plugin 2,389
SOURCES portals 4,256/- | links 6,562/- | fields 2,967/0ms | artifacts 0/- | ornaments 127/- | plugin-features 2,389/-
FRAME 9036ms avg 17ms max 84ms fps 58 slow 5/525 bench 3 variant normal mode pan z 14.36 median 17ms range 17ms-18ms benchMax 84ms
LONGTASK count 10 max 110ms last 62ms longtask
UIRENDER recent/total DiagnosticsPopup 1/1 | IRISOverlay 1/34 | BottomDock 1/34 | StatusBar 1/207 | DockDrawer 1/34 | PlanningBar 1/34 | MockToolsBar 1/34
```

Notes:

- Normal pan had slow frames while normal zoom and no-plugin pan were clean on the same source mix.
- The active plugin mix was dominated by portal level HTML labels (`1,801`) and portal health highlights (`1,178`);
  player tracker was negligible in this sample (`4` markers, `19` lines).
- Follow-up change: pan-mode Bench now temporarily hides plugin label and portal-highlight layers during active movement,
  restoring them after the run, to test an IITC-Mobile-style moving/settled overlay split.
- The first post-change sample did not improve the worst frame (`84ms`, `5` slow frames), so plugin labels/highlights are
  not the only remaining pan spike source in that run, or the layer-visibility change itself needs a different timing
  strategy.

## 2026-05-19 - IRIS 0.1.6 - Batch Benchmark Entity Isolation

Context:

- Purpose: use the expanded Batch report to separate plugin-overlay cost from core entity layer cost, especially at
  low zoom.
- Desktop browser: Chrome 148.0.0.0 on macOS (`MacIntel`), viewport `1728x934`, DPR `2.00`.
- Mobile browser: Firefox 149.0 on Linux/Android ARM, viewport `360x704`, DPR `3.00`.
- Map style: `OSM`.
- Overlay state: `player-tracker`, `portal-health-fill`, `portal-level-labels`.
- Network note: desktop was collected on a slow network; z8 entity counts changed mid-batch, so desktop rows are useful
  for smoke testing the batch tooling but not as a strict A/B.

### Desktop Batch Excerpt

```text
IRIS BENCH BATCH browser Chrome/148.0.0.0 platform MacIntel viewport 1728x934 dpr 2.00
z8 normal pan | items 29,547 | P 8,852 | L 13,092 | F 5,347 | orn 1,267 | plugin 989 | avg 9ms | max 83ms | fps 116 | slow 5/1,043 | median 9ms | benchMax 83ms | pluginMix total 989 labels 0 player 0 highlights 989 lines 0 points 989
z8 no-links pan | items 48,255 | P 13,960 | L 22,672 | F 9,367 | orn 1,267 | plugin 989 | avg 11ms | max 150ms | fps 89 | slow 27/807 | median 8ms | benchMax 150ms | pluginMix total 989 labels 0 player 0 highlights 989 lines 0 points 989
z8 no-fields pan | items 54,252 | P 15,534 | L 25,829 | F 10,633 | orn 1,267 | plugin 989 | avg 14ms | max 167ms | fps 70 | slow 43/632 | median 14ms | benchMax 167ms | pluginMix total 989 labels 0 player 0 highlights 989 lines 0 points 989
z8 base pan | items 54,361 | P 15,542 | L 25,919 | F 10,644 | orn 1,267 | plugin 989 | avg 13ms | max 133ms | fps 77 | slow 40/703 | median 12ms | benchMax 133ms | pluginMix total 989 labels 0 player 0 highlights 989 lines 0 points 989
z8 no-plugins pan | items 54,361 | P 15,542 | L 25,919 | F 10,644 | orn 1,267 | plugin 989 | avg 8ms | max 17ms | fps 120 | slow 0/1,080 | median 8ms | benchMax 17ms | pluginMix total 989 labels 0 player 0 highlights 989 lines 0 points 989
```

### Mobile Batch Excerpt

```text
IRIS BENCH BATCH browser Firefox/149.0 platform Linux armv81 viewport 360x704 dpr 3.00
z8 normal pan | items 18,395 | P 5,404 | L 9,045 | F 3,659 | orn 64 | plugin 223 | avg 30ms | max 268ms | fps 34 | slow 43/302 | median 27ms | benchMax 268ms | pluginMix total 223 labels 0 player 0 highlights 223 lines 0 points 223
z8 no-links pan | items 18,395 | P 5,404 | L 9,045 | F 3,659 | orn 64 | plugin 223 | avg 18ms | max 50ms | fps 55 | slow 3/498 | median 18ms | benchMax 50ms | pluginMix total 223 labels 0 player 0 highlights 223 lines 0 points 223
z8 no-fields pan | items 18,395 | P 5,404 | L 9,045 | F 3,659 | orn 64 | plugin 223 | avg 18ms | max 33ms | fps 57 | slow 0/511 | median 18ms | benchMax 33ms | pluginMix total 223 labels 0 player 0 highlights 223 lines 0 points 223
z8 base pan | items 18,395 | P 5,404 | L 9,045 | F 3,659 | orn 64 | plugin 223 | avg 17ms | max 50ms | fps 58 | slow 3/519 | median 17ms | benchMax 50ms | pluginMix total 223 labels 0 player 0 highlights 223 lines 0 points 223
z8 no-plugins pan | items 18,395 | P 5,404 | L 9,045 | F 3,659 | orn 64 | plugin 223 | avg 18ms | max 67ms | fps 57 | slow 5/511 | median 18ms | benchMax 67ms | pluginMix total 223 labels 0 player 0 highlights 223 lines 0 points 223
```

Notes:

- The mobile z8 rows are the cleaner comparison because item/source counts stayed fixed across variants.
- At z8, plugin mix contained only portal-health highlights (`223`) and no labels/player lines; `No Links` and
  `No Fields` both returned the mobile run near baseline.
- `No Fields` was slightly cleaner than `No Links` in this sample (`0` slow frames vs `3`), and hiding/simplifying
  fields during movement is lower UX risk because links are more useful for orientation while panning.
- Treat the desktop z8 rows as non-comparable because the slow network allowed live entity loading to change the source
  mix from `29,547` to `54,361` items during the same batch.

## 2026-05-23 - IRIS 0.1.7 - Mobile Post-Polish Batch

Context:

- Purpose: mobile sanity batch after IRIS page-world movement and browser ergonomics polish.
- Browser: Firefox 149.0 on Linux/Android ARM, viewport `360x704`, DPR `3.00`.
- Map style: `OSM`.
- Overlay state: `player-tracker`, `portal-health-fill`, `portal-level-labels`.
- Caveat: copied output does not include the latest `moveMode` / layer visibility columns, so treat it as a performance
  sample rather than final verification of movement-layer state on mobile.

```text
IRIS BENCH BATCH browser Firefox/149.0 platform Linux armv81 viewport 360x704 dpr 3.00
z14 normal pan | items 7,050 | P 2,651 | L 2,565 | F 1,054 | orn 65 | plugin 715 | sources P 2,651 L 2,565 F 1,054 | avg 20ms | max 100ms | fps 51 | slow 12/458 | median 20ms | benchMax 100ms | pluginMix total 715 labels 0 player 3 highlights 695 lines 17 points 698
z14 base pan | items 7,050 | P 2,651 | L 2,565 | F 1,054 | orn 65 | plugin 715 | sources P 2,651 L 2,565 F 1,054 | avg 17ms | max 50ms | fps 58 | slow 1/525 | median 17ms | benchMax 50ms | pluginMix total 715 labels 0 player 3 highlights 695 lines 17 points 698
z14 no-plugins pan | items 7,050 | P 2,651 | L 2,565 | F 1,054 | orn 65 | plugin 715 | sources P 2,651 L 2,565 F 1,054 | avg 17ms | max 50ms | fps 58 | slow 1/522 | median 17ms | benchMax 50ms | pluginMix total 715 labels 0 player 3 highlights 695 lines 17 points 698
z14 normal zoom | items 7,050 | P 2,651 | L 2,565 | F 1,054 | orn 65 | plugin 715 | sources P 2,651 L 2,565 F 1,054 | avg 18ms | max 67ms | fps 54 | slow 5/490 | median 19ms | benchMax 67ms | pluginMix total 715 labels 0 player 3 highlights 695 lines 17 points 698
z14 no-plugins zoom | items 7,050 | P 2,651 | L 2,565 | F 1,054 | orn 65 | plugin 715 | sources P 2,651 L 2,565 F 1,054 | avg 17ms | max 33ms | fps 58 | slow 0/521 | median 17ms | benchMax 33ms | pluginMix total 715 labels 0 player 3 highlights 695 lines 17 points 698
z8 normal pan | items 16,205 | P 5,366 | L 7,174 | F 2,905 | orn 65 | plugin 695 | sources P 5,366 L 7,174 F 2,905 | avg 28ms | max 368ms | fps 35 | slow 34/317 | median 23ms | benchMax 368ms | pluginMix total 695 labels 0 player 0 highlights 695 lines 0 points 695
z8 no-links pan | items 16,205 | P 5,366 | L 7,174 | F 2,905 | orn 65 | plugin 695 | sources P 5,366 L 7,174 F 2,905 | avg 18ms | max 50ms | fps 55 | slow 2/495 | median 18ms | benchMax 50ms | pluginMix total 695 labels 0 player 0 highlights 695 lines 0 points 695
z8 no-fields pan | items 16,205 | P 5,366 | L 7,174 | F 2,905 | orn 65 | plugin 695 | sources P 5,366 L 7,174 F 2,905 | avg 18ms | max 50ms | fps 56 | slow 1/505 | median 18ms | benchMax 50ms | pluginMix total 695 labels 0 player 0 highlights 695 lines 0 points 695
z8 base pan | items 16,205 | P 5,366 | L 7,174 | F 2,905 | orn 65 | plugin 695 | sources P 5,366 L 7,174 F 2,905 | avg 18ms | max 33ms | fps 56 | slow 0/507 | median 18ms | benchMax 33ms | pluginMix total 695 labels 0 player 0 highlights 695 lines 0 points 695
z8 no-plugins pan | items 16,205 | P 5,366 | L 7,174 | F 2,905 | orn 65 | plugin 695 | sources P 5,366 L 7,174 F 2,905 | avg 18ms | max 50ms | fps 56 | slow 1/504 | median 18ms | benchMax 50ms | pluginMix total 695 labels 0 player 0 highlights 695 lines 0 points 695
```

Notes:

- z14 Normal pan is acceptable but not fully clean: `20ms avg`, `12/458` slow frames, with a large highlight-heavy
  plugin mix (`695` highlights).
- z8 Normal remains the main mobile pain point: `28ms avg`, `34/317` slow frames, and a `368ms` worst frame.
- z8 `No Links`, `No Fields`, `Base`, and `No Plugins` all return to an `18ms` cadence with low slow-frame counts,
  matching the earlier conclusion that active low-zoom movement needs simplified core/entity rendering.
- Compared with the 0.1.6 mobile z8 sample, Normal improved slightly (`30ms` -> `28ms`, `43` -> `34` slow frames),
  but the residual gap is still trace-level work rather than a reason to block mini-IRIS alignment.
