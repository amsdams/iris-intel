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
  `VIEWPORT`, `SOURCES`, or `HTML` samples. Frame timing improved materially in the copied samples, but future
  comparisons should restore page-world source/update timing so frame cost and data-update cost can be separated.
- Later page-world diagnostics restored `VIEWPORT`/`SOURCES` as source-update timing. They are not the old
  extension-world spatial query timings; `HTML` remains absent because the page-world renderer does not use the old
  HTML marker sync path.
- The two restored page-world Chrome samples show why entity mix matters: average frame time stayed around `9ms`, but
  the high-ornament sample (`2,333` ornaments) had more slow frames and a higher max frame than the lower-ornament
  sample (`47` ornaments).

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
- Important caveat for the first three samples: `VIEWPORT`, `SOURCES`, and `HTML` show `no sample` because Bench had
  moved inside the page-world runtime before source-update diagnostics were restored. Those samples mainly compare
  camera/render frame smoothness.

### Firefox Desktop - Player Tracker Only

```text
CONTEXT IRIS 0.1.4 browser Firefox 151.0 platform MacIntel viewport 960x943 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT no sample
SOURCES no sample
HTML no sample
FRAME 9023ms avg 8ms max 36ms fps 122 slow 1/1,102 bench 3 median 8ms range 8ms-8ms benchMax 36ms
```

### Chrome Desktop - Player Tracker Only

```text
CONTEXT IRIS 0.1.4 browser Chrome 148.0.0.0 platform MacIntel viewport 960x934 dpr 2.00 touch 0 pointer fine hover yes mapStyle OSM overlays player-tracker
VIEWPORT no sample
SOURCES no sample
HTML no sample
FRAME 9032ms avg 17ms max 33ms fps 60 slow 0/540 bench 3 median 17ms range 17ms-17ms benchMax 33ms
```

### Firefox Mobile - Player Tracker Only

```text
CONTEXT IRIS 0.1.4 browser Firefox 149.0 platform Linux armv81 viewport 360x704 dpr 3.00 touch 5 pointer coarse hover no mapStyle OSM overlays player-tracker
VIEWPORT no sample
SOURCES no sample
HTML no sample
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
HTML n/a
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
HTML n/a
FRAME 9012ms avg 9ms max 66ms fps 117 slow 4/1,053 bench 3 median 9ms range 8ms-9ms benchMax 66ms
```

Notes:

- With fewer entities and far fewer ornaments, average frame time remained similar, while max frame time and slow-frame
  count improved.
- Keep ornament count visible in future benchmark comparisons because it appears to affect occasional stutter more than
  average frame time.
