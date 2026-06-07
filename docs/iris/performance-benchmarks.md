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
| 0.1.7   | z14 desktop post-polish batch    | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 11,539 | 3,644   | 5,378  | 2,383  | 40      | n/a      | n/a       | n/a  | 9ms       | 9ms    | 124ms | 106 | 11/959      |
| 0.1.7   | z8 desktop link/field isolation  | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 43,467 | 12,594  | 21,645 | 9,134  | 0       | n/a      | n/a       | n/a  | 48ms      | 47ms   | 167ms | 21  | 134/186     |
| 0.1.7   | z8 desktop no-links isolation    | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 43,591 | 12,616  | 21,719 | 9,162  | 0       | n/a      | n/a       | n/a  | 10ms      | 9ms    | 175ms | 105 | 19/945      |
| 0.1.7   | z8 desktop no-fields isolation   | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 43,591 | 12,616  | 21,719 | 9,162  | 0       | n/a      | n/a       | n/a  | 8ms       | 8ms    | 49ms  | 119 | 2/1,070     |
| Mini 1.0.32 | z14 desktop compact batch      | Desktop Mac | Chrome 148  | n/a     | player-tracker                          | 3,269  | 1,657   | 1,137  | 456    | 19      | n/a      | n/a       | n/a  | 17ms      | 17ms   | 18ms  | 60  | 0/133       |
| Mini 1.0.32 | z8 desktop compact batch       | Desktop Mac | Chrome 148  | n/a     | player-tracker                          | 3,269  | 1,657   | 1,137  | 456    | 19      | n/a      | n/a       | n/a  | 17ms      | 17ms   | 18ms  | 60  | 0/132       |
| Mini 1.0.32 | z8 desktop no-links isolation  | Desktop Mac | Chrome 148  | n/a     | player-tracker                          | 2,132  | 1,657   | 0      | 456    | 19      | n/a      | n/a       | n/a  | 17ms      | 17ms   | 18ms  | 60  | 0/132       |
| Mini 1.0.32 | z8 desktop no-fields isolation | Desktop Mac | Chrome 148  | n/a     | player-tracker                          | 2,813  | 1,657   | 1,137  | 0      | 19      | n/a      | n/a       | n/a  | 17ms      | 17ms   | 18ms  | 60  | 0/132       |
| 0.1.7   | z8 Firefox cold-compare batch   | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 32,301 | 9,154   | 16,370 | 6,775  | 2       | n/a      | n/a       | n/a  | 19ms      | 26ms   | 192ms | 53  | 82/476      |
| 0.1.7   | z8 Firefox no-links compare     | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 32,336 | 9,160   | 16,396 | 6,778  | 2       | n/a      | n/a       | n/a  | 8ms       | 8ms    | 43ms  | 118 | 3/1,064     |
| 0.1.7   | z8 Firefox no-fields compare    | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 32,336 | 9,160   | 16,396 | 6,778  | 2       | n/a      | n/a       | n/a  | 8ms       | 8ms    | 17ms  | 120 | 0/1,079     |
| 0.1.7   | z14 source reasonMix validation | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 7,122  | 1,740   | 3,673  | 1,648  | 61      | n/a      | 0ms       | n/a  | 9ms       | 9ms    | 25ms  | 116 | 0/1,043     |
| 0.1.7   | z8 source reasonMix validation  | Desktop Mac | Firefox 153 | OSM     | player-tracker                          | 17,570 | 5,133   | 8,860  | 3,577  | 0       | n/a      | 0ms       | n/a  | 9ms       | 9ms    | 25ms  | 110 | 0/996       |
| Mini 1.0.32 | z8 Firefox cold-compare batch | Desktop Mac | Firefox 153 | n/a     | player-tracker                          | 3,628  | 1,171   | 1,724  | 682    | 51      | n/a      | n/a       | n/a  | 8ms       | 8ms    | 17ms  | 120 | 0/263       |
| Mini 1.0.32 | z8 Firefox no-links compare  | Desktop Mac | Firefox 153 | n/a     | player-tracker                          | 1,907  | 1,174   | 0      | 682    | 51      | n/a      | n/a       | n/a  | 8ms       | 8ms    | 9ms   | 120 | 0/265       |
| Mini 1.0.32 | z8 Firefox no-fields compare | Desktop Mac | Firefox 153 | n/a     | player-tracker                          | 2,958  | 1,174   | 1,733  | 0      | 51      | n/a      | n/a       | n/a  | 8ms       | 8ms    | 9ms   | 120 | 0/264       |

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
- The 2026-05-25 Firefox desktop batch confirms the remaining heavy path is low zoom with all links and fields visible:
  z14 normal pan is healthy (`9ms avg`, `106fps`), while z8 normal pan drops to `48ms avg`/`21fps`; z8 no-links and
  no-fields variants recover to `10ms` and `8ms`, so future tuning should target low-zoom link/field simplification or
  moving-mode degradation rather than plugin overlays.
- The first Mini-IRIS compact batch baseline is clean after suppressing camera-event feedback during measurement:
  Chrome desktop stays at `17ms / 60fps / 0 slow` for z14 and z8 variants. It is not directly comparable to the large
  IRIS z8 batch because Mini only had `1,657P / 1,137L / 456F` loaded versus IRIS's `12,594P / 21,645L / 9,134F`;
  capture a denser Mini sample later before drawing cross-app scaling conclusions.
- For Mini/IRIS comparisons, prefer cold reloads in the same area and zoom. Warm IRIS storage after moving between
  distant globe locations can retain a larger source set until culling/refresh catches up, so compare source counts
  before treating frame timing as an app renderer difference.
- The Firefox cold-compare rows from 2026-05-25 are useful workload evidence, not an app-vs-app rendering verdict:
  IRIS z8 normal carried about `9.2kP / 16.4kL / 6.8kF`, while Mini carried about `1.2kP / 1.7kL / 0.7kF`. The shared
  scenario labels are aligned, but preload/camera coverage still needs one shared contract before cross-app claims.

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

## Mini-IRIS vs IRIS Cold Comparison Runbook

Use this when comparing the two apps rather than tracking one app over time.

1. Build both extensions from the same checkout: `npm run build:iris` and `npm run build:mini-iris`.
2. Load one extension at a time in the same browser profile, or use two profiles with the same viewport and DPR.
3. Hard reload Intel after enabling each extension. The batch buttons do not reload the page; they benchmark the
   current loaded source set. Do not pan to a different globe area between captures.
4. Use the same center, map style, viewport, and toggles. Prefer Amsterdam, OSM, desktop `1920x934` when available.
5. Let entity requests settle, then run the copied batch flow:
   - IRIS: Mock tools `Batch`, then `Copy Batch` or `Show Batch`.
   - Mini-IRIS: `DBG` -> `Run Batch`, then `Copy Batch`.
6. Compare the shared batch cases first: `z14.36 normal pan`, `z14.36 base pan`, `z14.36 normal zoom`, `z8 normal pan`,
   `z8 no-links pan`, `z8 no-fields pan`, and `z8 base pan`. Treat later app-specific cases such as IRIS
   `no-plugins` or Mini `no-players` as local isolation checks, not direct cross-app comparisons.
7. Confirm the report header says `load current-page hardReload manual`, then compare `sources P/L/F` before comparing
   `avg`, `fps`, or `slow`. If source counts differ materially, treat the frame numbers as different-load samples, not
   an app renderer comparison.
8. Paste both reports under a dated section in this file with any manual finger-pan notes.

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

## 2026-05-26 - IRIS 0.1.7 - Request/Source Lifecycle Benchmark Tooling

Context:

- Purpose: baseline before applying Request Lifecycle and Map Sync runtime changes.
- Change under test: benchmark output now includes endpoint deltas, entity stale deltas, source sync/call deltas,
  per-source `setData` call/time counts, moving overlap, long-task deltas, and workload signatures.
- Desktop browser: Firefox 153.0 on macOS (`MacIntel`), viewport `960x943`, DPR `2.00`.
- Mobile browser: Firefox 149.0 on Linux/Android ARM, viewport `360x704`, DPR `3.00`.
- Map style: `OSM`.
- Benchmark preload fix: preload now sends explicit viewport-estimated bounds for the target zoom, avoiding stale
  wide-bounds z14 preload on phone.

### Desktop Firefox Summary

```text
IRIS BENCH BATCH browser Firefox/153.0 platform MacIntel viewport 960x943 dpr 2.00 center 52.37109,4.90637 z8.00
PRELOAD z14.36 | request tiles 4 batches 1 dataZoom 13 loaded P 1,461 L 2,952 F 1,318 diagnostic none
z14.36 normal pan | items 7,391 | P 1,823 | L 3,846 | F 1,706 | avg 8ms | max 100ms | fps 120 | slow 4/1,084 | sourceDelta syncs 38 movingSyncs 13 calls 59 movingCalls 21 setData 1ms movingSetData 0ms
PRELOAD z8 | request tiles 72 batches 3 dataZoom 8 loaded P 4,524 L 7,650 F 3,148 diagnostic none
z8 normal pan | items 17,250 | P 5,084 | L 8,688 | F 3,477 | avg 11ms | max 158ms | fps 92 | slow 27/828 | net entities req 22 ok 28 | sourceDelta syncs 81 movingSyncs 54 calls 124 movingCalls 83 setData 2ms movingSetData 1ms
z8 no-links pan | items 17,250 | P 5,084 | L 8,688 | F 3,477 | avg 8ms | max 26ms | fps 120 | slow 0/1,080 | net entities req 0 ok 0 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 no-fields pan | items 17,250 | P 5,084 | L 8,688 | F 3,477 | avg 8ms | max 19ms | fps 120 | slow 0/1,081 | net entities req 0 ok 0 | sourceDelta syncs 1 movingSyncs 1 calls 1 movingCalls 1
z8 base pan | items 17,255 | P 5,084 | L 8,693 | F 3,477 | avg 9ms | max 142ms | fps 115 | slow 2/1,039 | net entities req 3 ok 3 | sourceDelta syncs 6 movingSyncs 6 calls 10 movingCalls 10
```

### Mobile Firefox Summary

```text
IRIS BENCH BATCH browser Firefox/149.0 platform Linux armv81 viewport 360x704 dpr 3.00 center 52.37109,4.90637 z8.00
PRELOAD z14.36 | request tiles 4 batches 1 dataZoom 13 loaded P 1.204 L 2.226 F 896 diagnostic none
z14.36 normal pan | items 4.337 | P 1.204 | L 2.226 | F 896 | avg 18ms | max 50ms | fps 57 | slow 2/512 | net entities req 0 ok 0 | sourceDelta syncs 1 movingSyncs 1 calls 2 movingCalls 2
PRELOAD z8 | request tiles 28 batches 2 dataZoom 8 loaded P 2.875 L 4.770 F 1.896 diagnostic none
z8 normal pan | items 9.542 | P 2.875 | L 4.771 | F 1.896 | avg 17ms | max 67ms | fps 58 | slow 1/524 | net entities req 3 ok 5 | sourceDelta syncs 10 movingSyncs 0 calls 16 movingCalls 0 setData 1ms movingSetData 0ms
z8 no-links pan | items 9.542 | P 2.875 | L 4.771 | F 1.896 | avg 17ms | max 33ms | fps 59 | slow 0/529 | net entities req 0 ok 0 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 no-fields pan | items 9.542 | P 2.875 | L 4.771 | F 1.896 | avg 17ms | max 50ms | fps 59 | slow 1/528 | net entities req 0 ok 0 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 base pan | items 9.544 | P 2.875 | L 4.773 | F 1.896 | avg 18ms | max 368ms | fps 56 | slow 4/506 | net entities req 2 ok 2 | sourceDelta syncs 6 movingSyncs 6 calls 10 movingCalls 10
```

Notes:

- The benchmark preload bound fix worked on phone: z14 preload now requests `4` tiles instead of the earlier capped
  `1,024` tile coverage.
- Desktop z8 Normal still shows source/network overlap and low-zoom entity renderer cost: `11ms avg`, `27` slow frames,
  `22/28` entity activity, and `83` moving source calls.
- Desktop z8 No Links / No Fields are clean at `8ms` average and `120fps`, reinforcing links/fields as the main
  low-zoom renderer cost when the sample is not polluted by source updates.
- Mobile z8 Normal is now much cleaner after the preload fix: `17ms avg`, `58fps`, and only `1` slow frame with no
  moving source calls. This is a useful pre-runtime-change baseline.
- The remaining suspicious mobile row is z8 Base with a `368ms` max frame despite `0ms` source work and no long task;
  keep this as a possible browser/GC/tile-pipeline sampling artifact until reproduced.

### Post-Change: Defer Non-Urgent Source Sync While Moving

Change:

- Page-world `syncData` updates are coalesced while the map is moving and flushed after movement settles.
- Camera, selection, and snapshot paths stay immediate.
- Smoke result: normal behavior looked unchanged after manual testing.
- Follow-up: player track pin can hide/show after pan; verify whether deferred source sync, tracker pruning, or layer
  ordering causes a visible flicker.

```text
DESKTOP Firefox/153.0 viewport 960x943 DPR 2.00
PRELOAD z14.36 | request tiles 4 batches 1 dataZoom 13 loaded P 1,716 L 3,549 F 1,558 diagnostic none
z14.36 normal pan | items 7,393 | P 1,820 | L 3,844 | F 1,709 | avg 8ms | max 50ms | fps 119 | slow 1/1,075 | sourceDelta syncs 18 movingSyncs 0 calls 33 movingCalls 0 reasons syncData:17,syncDataDeferred:1
PRELOAD z8 | request tiles 72 batches 3 dataZoom 8 loaded P 4,862 L 8,236 F 3,321 diagnostic none
z8 normal pan | items 17,273 | P 5,095 | L 8,693 | F 3,485 | avg 9ms | max 100ms | fps 113 | slow 7/1,017 | net entities req 18 ok 21 | sourceDelta syncs 33 movingSyncs 0 calls 59 movingCalls 0 setData 1ms movingSetData 0ms reasons syncData:32,syncDataDeferred:1
z8 no-links pan | items 17,273 | P 5,095 | L 8,693 | F 3,485 | avg 8ms | max 21ms | fps 120 | slow 0/1,079 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 no-fields pan | items 17,273 | P 5,095 | L 8,693 | F 3,485 | avg 8ms | max 20ms | fps 120 | slow 0/1,078 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 base pan | items 17,277 | P 5,095 | L 8,697 | F 3,485 | avg 9ms | max 100ms | fps 117 | slow 2/1,058 | sourceDelta syncs 1 movingSyncs 0 calls 6 movingCalls 0 reasons syncDataDeferred:1

MOBILE Firefox/149.0 viewport 360x704 DPR 3.00
PRELOAD z14.36 | request tiles 4 batches 1 dataZoom 13 loaded P 1.138 L 2.033 F 841 diagnostic none
z14.36 normal pan | items 4.334 | P 1.201 | L 2.214 | F 899 | avg 18ms | max 100ms | fps 57 | slow 3/515 | sourceDelta syncs 9 movingSyncs 0 calls 19 movingCalls 0 reasons syncData:8,syncDataDeferred:1 | longtask count 1 max 199ms
PRELOAD z8 | request tiles 28 batches 2 dataZoom 8 loaded P 2.744 L 4.380 F 1.742 diagnostic none
z8 normal pan | items 9.570 | P 2.885 | L 4.784 | F 1.901 | avg 19ms | max 134ms | fps 52 | slow 10/450 | net entities req 9 ok 9 | sourceDelta syncs 26 movingSyncs 0 calls 48 movingCalls 0 setData 3ms movingSetData 0ms reasons syncData:25,syncDataDeferred:1 | longtask count 1 max 285ms
z8 no-links pan | items 9.570 | P 2.885 | L 4.784 | F 1.901 | avg 17ms | max 33ms | fps 59 | slow 0/530 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 no-fields pan | items 9.570 | P 2.885 | L 4.784 | F 1.901 | avg 18ms | max 218ms | fps 57 | slow 2/510 | sourceDelta syncs 1 movingSyncs 0 calls 5 movingCalls 0 reasons syncDataDeferred:1
z8 base pan | items 9.570 | P 2.885 | L 4.784 | F 1.901 | avg 17ms | max 33ms | fps 59 | slow 0/533 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
```

Comparison:

- Desktop z8 Normal improved from `11ms / 92fps / 27 slow / max 158ms` to `9ms / 113fps / 7 slow / max 100ms`.
- Desktop z8 Normal moving source calls dropped from `83` to `0`, so the scheduler change did what it was meant to do.
- Mobile z8 Normal no longer has moving source calls, but the run is noisier than the previous clean baseline
  (`19ms / 52fps / 10 slow`) and still shows a long task. Treat phone smoothness as improved structurally, not proven
  faster until repeated mobile samples stabilize.

### Post-Change: Low-Zoom Movement Simplification and Center-First Tiles

Change:

- At z10 and below, IRIS temporarily hides the main link/field layers while the map is moving and restores them on
  move end. Selected link/field layers remain visible.
- Entity tile request payloads now sort generated tile keys by distance from viewport center before batching, matching
  IITC's center-first request priority.

```text
DESKTOP Firefox/153.0 viewport 960x943 DPR 2.00
PRELOAD z8 | request tiles 72 batches 3 dataZoom 8 loaded P 5,095 L 8,720 F 3,491 diagnostic none
z8 normal pan | items 17,306 | P 5,095 | L 8,720 | F 3,491 | avg 8ms | max 29ms | fps 119 | slow 0/1,076 | net entities req 0 ok 1 active 1 passive 0 moving 0 fail 0 | sourceDelta syncs 3 movingSyncs 0 calls 5 movingCalls 0 setData 0ms movingSetData 0ms
z8 no-links pan | items 17,306 | P 5,095 | L 8,720 | F 3,491 | avg 8ms | max 27ms | fps 120 | slow 0/1,077 | moving 0 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 no-fields pan | items 17,306 | P 5,095 | L 8,720 | F 3,491 | avg 8ms | max 26ms | fps 119 | slow 0/1,073 | moving 0 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 base pan | items 17,310 | P 5,095 | L 8,724 | F 3,491 | avg 9ms | max 100ms | fps 117 | slow 3/1,054 | moving 0 | sourceDelta syncs 1 movingSyncs 0 calls 5 movingCalls 0

MOBILE Firefox/149.0 viewport 360x704 DPR 3.00
PRELOAD z8 | request tiles 28 batches 2 dataZoom 8 loaded P 2.906 L 4.825 F 1.922 diagnostic none
z8 normal pan | items 9.653 | P 2.906 | L 4.825 | F 1.922 | avg 18ms | max 67ms | fps 56 | slow 2/508 | net entities req 0 ok 0 active 0 passive 0 moving 0 fail 0 | sourceDelta syncs 4 movingSyncs 0 calls 6 movingCalls 0 setData 1ms movingSetData 0ms | longtask count 1 max 182ms
z8 no-links pan | items 9.653 | P 2.906 | L 4.825 | F 1.922 | avg 18ms | max 50ms | fps 57 | slow 1/514 | moving 0 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 no-fields pan | items 9.653 | P 2.906 | L 4.825 | F 1.922 | avg 17ms | max 50ms | fps 57 | slow 1/517 | moving 0 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 base pan | items 9.653 | P 2.906 | L 4.825 | F 1.922 | avg 17ms | max 217ms | fps 57 | slow 1/515 | moving 0 | sourceDelta syncs 1 movingSyncs 0 calls 5 movingCalls 0
```

Comparison:

- Desktop z8 Normal is now clean: `8ms / 119fps / 0 slow / max 29ms`, with no moving endpoint/source overlap.
- Mobile z8 Normal improved from the previous poor sample (`24ms / 42fps / 21 slow / max 335ms`) to
  `18ms / 56fps / 2 slow / max 67ms`, and now closely matches the z8 isolation rows.
- The later mobile z8 No Plugins row in the same pasted run was noisy (`24ms`, `18` slow frames, `2` long tasks,
  `736ms` max long task, and active entity traffic), so treat it as contaminated rather than a rendering regression.

### Follow-Up: Fetched-Bounds Containment Phone Variance

Change under test:

- Move-settle entity refresh skips when the current viewport is covered by fresh tile-aligned fetched bounds.
- Rows should show `skip covered by fetched bounds`; remaining bad rows are more likely carryover async work or device
  long tasks than unnecessary move-settle fetch scheduling.

```text
DESKTOP Firefox/153.0 viewport 960x943 DPR 2.00
z8 normal pan | items 17,339 | P 5,102 | L 8,734 | F 3,499 | avg 8ms | max 27ms | fps 119 | slow 0/1,076 | entityDelta staleDrop 0 staleIgnore 0 skip covered by fetched bounds
z8 no-links pan | items 17,339 | P 5,102 | L 8,734 | F 3,499 | avg 8ms | max 26ms | fps 120 | slow 0/1,078 | entityDelta staleDrop 0 staleIgnore 0 skip covered by fetched bounds
z8 base pan | items 17,342 | P 5,102 | L 8,737 | F 3,499 | avg 9ms | max 75ms | fps 117 | slow 4/1,058 | entityDelta staleDrop 0 staleIgnore 0 skip covered by fetched bounds

MOBILE Firefox/149.0 viewport 360x704 DPR 3.00, first sample
z8 normal pan | items 9.687 | P 2.913 | L 4.844 | F 1.930 | avg 22ms | max 67ms | fps 46 | slow 11/415 | entityDelta staleDrop 2 staleIgnore 4 skip covered by fetched bounds | longtask count 1 max 605ms
z8 no-links pan | items 9.687 | P 2.913 | L 4.844 | F 1.930 | avg 26ms | max 67ms | fps 39 | slow 25/354 | entityDelta staleDrop 0 staleIgnore 0 skip covered by fetched bounds
z8 base pan | items 9.689 | P 2.913 | L 4.846 | F 1.930 | avg 22ms | max 318ms | fps 46 | slow 13/414 | entityDelta staleDrop 0 staleIgnore 0 skip cooldown (21 hints) | longtask count 1 max 282ms

MOBILE Firefox/149.0 viewport 360x704 DPR 3.00, repeat sample
z8 normal pan | items 9.687 | P 2.914 | L 4.843 | F 1.930 | avg 34ms | max 318ms | fps 30 | slow 40/273 | entityDelta staleDrop 0 staleIgnore 8 skip covered by fetched bounds | longtask count 3 max 473ms
z8 no-links pan | items 9.692 | P 2.914 | L 4.848 | F 1.930 | avg 32ms | max 535ms | fps 31 | slow 36/291 | entityDelta staleDrop 0 staleIgnore 0 skip covered by fetched bounds | longtask count 1 max 957ms
z8 no-fields pan | items 9.692 | P 2.914 | L 4.848 | F 1.930 | avg 21ms | max 67ms | fps 47 | slow 12/422 | entityDelta staleDrop 0 staleIgnore 0 skip covered by fetched bounds
z8 base pan | items 9.692 | P 2.914 | L 4.848 | F 1.930 | avg 18ms | max 50ms | fps 54 | slow 2/490 | entityDelta staleDrop 0 staleIgnore 0 skip covered by fetched bounds
```

Comparison:

- Fetched-bounds containment is confirmed: both desktop and phone repeatedly report `skip covered by fetched bounds`.
- Desktop remains clean in z8 normal after the skip.
- Phone remains variable. The repeat sample has worse active rows despite the same skip behavior, with long tasks and
  stale/active entity work showing up inside scenario windows. This justified adding compact entity-pass diagnostics and
  a quiet-window wait between batch scenarios before further request lifecycle changes.

### Follow-Up: Entity-Pass Preload Capture and Quiet Scenario Windows

Change under test:

- Benchmark preload uses an entity-only manual refresh and captures the completed manual entity pass before later quiet
  wait or COMM activity can overwrite the preload row.
- Batch scenario windows wait for active endpoint work and near-term entity auto-refreshes before timing.
- Copy fallback stays inside the report panel instead of using browser prompt/alert UI.

```text
DESKTOP Firefox/153.0 viewport 960x943 DPR 2.00
PRELOAD z14.36 | request tiles 4 batches 1 dataZoom 13 loaded P 1,200 L 2,392 F 1,110 | entityPass current id 3 gen 7 reason manual req 4/4 fresh 0 batches 1 dataZoom 13
z14.36 normal pan | items 7,265 | P 1,783 | L 3,781 | F 1,688 | avg 9ms | max 92ms | fps 115 | slow 6/1,034 | entityDelta staleDrop 0 staleIgnore 0 skip covered by fetched bounds | entityPass current id 4 gen 10 reason move_settle req 0/4 fresh 4 batches 0 dataZoom 13
z14.36 base pan | items 7,265 | P 1,783 | L 3,781 | F 1,688 | avg 8ms | max 29ms | fps 120 | slow 0/1,080 | entityPass current id 5 gen 13 reason move_settle req 0/4 fresh 4 batches 0 dataZoom 13
z14.36 normal zoom | items 7,265 | P 1,783 | L 3,781 | F 1,688 | avg 8ms | max 33ms | fps 118 | slow 0/1,066 | entityPass current id 6 gen 16 reason move_settle req 0/4 fresh 4 batches 0 dataZoom 13
PRELOAD z8 | request tiles 72 batches 3 dataZoom 8 loaded P 5,111 L 8,809 F 3,562 | entityPass current id 7 gen 17 reason manual req 72/72 fresh 0 batches 3 dataZoom 8
z8 normal pan | items 17,482 | P 5,111 | L 8,809 | F 3,562 | avg 8ms | max 34ms | fps 119 | slow 1/1,075 | entityPass current id 9 gen 20 reason move_settle req 0/72 fresh 72 batches 0 dataZoom 8 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 no-links pan | items 17,482 | P 5,111 | L 8,809 | F 3,562 | avg 8ms | max 30ms | fps 120 | slow 0/1,078 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
z8 no-fields pan | items 17,491 | P 5,111 | L 8,818 | F 3,562 | avg 8ms | max 50ms | fps 119 | slow 1/1,069 | sourceDelta syncs 1 movingSyncs 0 calls 5 movingCalls 0
z8 base pan | items 17,491 | P 5,111 | L 8,818 | F 3,562 | avg 8ms | max 25ms | fps 119 | slow 0/1,077 | sourceDelta syncs 0 movingSyncs 0 calls 0 movingCalls 0
```

Comparison:

- Preload rows now clearly show the intended manual pass: z14.36 `req 4/4` and z8 `req 72/72`, both captured before
  later move-settle or COMM activity can replace the diagnostic.
- Desktop z8 is effectively clean in this run: normal pan is `8ms / 119fps / 1 slow / max 34ms`, and the isolation rows
  are similarly stable.
- Remaining z14.36 normal pan spikes are small and isolated; the base and zoom rows are clean.

### Post-Change: Unchanged Source Skip Diagnostics

Change under test:

- Page-world source publication now skips unchanged FeatureCollections using a full geometry/properties signature.
- Copied batch rows report unchanged skips separately from real `setData` calls as `skipped`, `movingSkipped`, and
  `skippedSources`.
- Theme/style updates remain covered because the signature includes feature properties, not just ids/counts.

```text
DESKTOP Firefox/153.0 viewport 960x943 DPR 2.00
PRELOAD z14.36 | request tiles 4 batches 1 dataZoom 13 loaded P 1,750 L 3,702 F 1,653 | sourceDelta syncs 24 calls 32 skipped 93 setData 0ms sources portals:9/0ms,links:10/0ms,fields:8/0ms skippedSources portals:2,links:1,fields:3,artifacts:11,ornaments:10,plugin-features:24,planned-features:9
z14.36 normal pan | items 7,132 | P 1,750 | L 3,702 | F 1,653 | avg 8ms | max 19ms | fps 119 | slow 0/1,074 | sourceDelta syncs 1 movingSyncs 0 calls 0 skipped 3 movingCalls 0 movingSkipped 0 setData 0ms movingSetData 0ms sources none skippedSources artifacts:1,plugin-features:2
z14.36 base pan | items 7,132 | P 1,750 | L 3,702 | F 1,653 | avg 8ms | max 25ms | fps 119 | slow 0/1,078 | sourceDelta syncs 1 calls 0 skipped 2 sources none skippedSources plugin-features:2
z14.36 normal zoom | items 7,132 | P 1,750 | L 3,702 | F 1,653 | avg 8ms | max 27ms | fps 119 | slow 0/1,076 | sourceDelta syncs 0 calls 0 skipped 0 sources none skippedSources none
PRELOAD z8 | request tiles 72 batches 3 dataZoom 8 loaded P 5,141 L 8,863 F 3,581 | sourceDelta syncs 84 calls 117 skipped 373 setData 2ms sources portals:37/1ms,links:42/0ms,fields:36/1ms skippedSources portals:9,links:4,fields:10,artifacts:46,ornaments:46,plugin-features:75,planned-features:45
z8 no-plugins pan | items 17,588 | P 5,141 | L 8,866 | F 3,581 | avg 8ms | max 26ms | fps 119 | slow 0/1,071 | sourceDelta syncs 0 calls 0 skipped 0 sources none skippedSources none
```

Read:

- The new wording is doing its job: rows with source messages but no real MapLibre publication now say
  `calls 0 skipped ...` instead of looking like missing diagnostics.
- Timed desktop rows remain clean: `119-120fps`, no long tasks, and `setData 0ms` in the scenario windows shown here.
- Preload rows still expose the larger source-publication volume, which is useful context but should not be compared
  directly with timed pan/zoom windows.

### Follow-Up: Source Reason Mix Wording

Change under test:

- Copied `sourceDelta` rows now summarize update reasons as `reasonMix urgent/heavy/snapshot/other`.
- `selection` and `visual-filters` count as urgent; entity, plugin, planning, artifact, ornament, and mission updates
  count as heavy. This is diagnostics-only and does not change source scheduling.

```text
DESKTOP Firefox/153.0 viewport 960x943 DPR 2.00
PRELOAD z14.36 | request tiles 4 batches 1 dataZoom 13 loaded P 1,740 L 3,673 F 1,648 | sourceDelta syncs 19 calls 28 skipped 66 setData 1ms sources portals:8/0ms,links:8/0ms,fields:8/0ms reasonMix urgent:0,heavy:59,snapshot:0,other:0 reasons plugins:11,entities:portals:8,entities:links:8,entities:fields:8,entities:artifacts:8,entities:ornaments:8,planning:8
z14.36 normal pan | items 7,122 | P 1,740 | L 3,673 | F 1,648 | avg 9ms | max 25ms | fps 116 | slow 0/1,043 | sourceDelta syncs 1 calls 0 skipped 2 setData 0ms sources none skippedSources plugin-features:2 reasonMix urgent:0,heavy:1,snapshot:0,other:0 reasons plugins:1
z14.36 base pan | items 7,122 | P 1,740 | L 3,673 | F 1,648 | avg 8ms | max 33ms | fps 119 | slow 0/1,072 | sourceDelta syncs 0 calls 0 skipped 0 reasonMix urgent:0,heavy:0,snapshot:0,other:0 reasons none
PRELOAD z8 | request tiles 72 batches 3 dataZoom 8 loaded P 5,133 L 8,860 F 3,577 | sourceDelta syncs 73 calls 94 skipped 353 setData 6ms reasonMix urgent:0,heavy:288,snapshot:0,other:0
z8 normal pan | items 17,570 | P 5,133 | L 8,860 | F 3,577 | avg 9ms | max 25ms | fps 110 | slow 0/996 | sourceDelta syncs 0 calls 0 skipped 0 setData 0ms sources none skippedSources none reasonMix urgent:0,heavy:0,snapshot:0,other:0 reasons none
z8 no-fields pan | items 17,570 | P 5,133 | L 8,860 | F 3,577 | avg 9ms | max 29ms | fps 117 | slow 0/1,052 | sourceDelta syncs 1 calls 0 skipped 1 setData 0ms sources none skippedSources artifacts:1 reasonMix urgent:0,heavy:1,snapshot:0,other:0 reasons artifacts:1
```

Read:

- The reason mix field is present and classifies the observed source work as heavy, with no urgent updates in these
  benchmark windows.
- Timed rows remain behaviorally clean: no long tasks, no entity requests inside the main z14/z8 pan rows, and no real
  `setData` calls where only unchanged plugin/artifact updates arrived.
- The summary table now records representative z14/z8 rows for this milestone; the detailed section remains the source
  of truth for endpoint/source diagnostics that do not fit the older table schema.

### Follow-Up: Noisy Row Classification

Change under test:

- Copied batch rows now include `noise clean` when no known benchmark-interference signal landed in the scenario window.
- Rows are marked with compact causes when applicable: `net-moving`, `source-moving`, and/or `longtask`.
- This classifies measurement contamination only. Slow frames still remain performance data and are not automatically
  treated as noise.

Expected shape:

```text
z8 normal pan | ... | noise clean | net entities req 0 ok 0 ... | sourceDelta syncs 0 ... | longtask count 0 max 0ms
z8 no-fields pan | ... | noise net-moving:8,longtask:1 | net ... moving 8 ... | sourceDelta ... | longtask count 1 max 197ms
```

Observed desktop validation:

```text
z14.36 normal pan | items 7,124 | P 1,732 | L 3,673 | F 1,648 | avg 8ms | max 20ms | fps 119 | slow 0/1,075 | noise net-moving:1 | net artifacts req 1 ok 1 active 0 passive 1 moving 1 fail 0 | sourceDelta syncs 1 calls 0 skipped 3 setData 0ms | longtask count 0 max 0ms
z14.36 base pan | items 7,124 | P 1,732 | L 3,673 | F 1,648 | avg 8ms | max 33ms | fps 119 | slow 0/1,076 | noise clean | net entities req 0 ok 0 active 0 passive 0 moving 0 fail 0 | sourceDelta syncs 0 calls 0 skipped 0 | longtask count 0 max 0ms
z8 normal pan | items 17,583 | P 5,137 | L 8,861 | F 3,585 | avg 8ms | max 28ms | fps 120 | slow 0/1,079 | noise clean | net entities req 0 ok 0 active 0 passive 0 moving 0 fail 0 | sourceDelta syncs 0 calls 0 skipped 0 | longtask count 0 max 0ms
z8 no-plugins pan | items 17,587 | P 5,136 | L 8,867 | F 3,584 | avg 8ms | max 32ms | fps 119 | slow 0/1,072 | noise net-moving:2 | net plexts req 1 ok 1 active 0 passive 1 moving 1 fail 0 ; artifacts req 1 ok 1 active 0 passive 1 moving 1 fail 0 | sourceDelta syncs 1 calls 0 skipped 1 | longtask count 0 max 0ms
```

Read:

- Use `noise clean` rows for isolated renderer/source-count comparisons.
- Use caused noise rows to diagnose why a sample should not be compared directly, without discarding the row entirely.

### Follow-Up: Source Publication Pass Summary

Change under test:

- Copied preload and timed rows now include `sourcePass`, mirroring the earlier `entityPass` summary.
- The row records whether the last source publication pass is `current` or `carry`, the number of source passes in the
  row window, moving source pass count, plus the latest pass id, reason string, moving state, source count, real
  `setData` calls, unchanged skips, and pass `setData` time.
- This is diagnostics-only. It does not change source scheduling; it makes the next scheduler change attributable.

Expected shape:

```text
sourcePass current id 12 passes 4 movingPasses 0 reason entities:portals,entities:links,plugins passMoving no sources 10 calls 3 skipped 7 setData 1ms
sourcePass carry id 12 passes 0 movingPasses 0 reason entities:portals,entities:links,plugins passMoving no sources 10 calls 3 skipped 7 setData 1ms
```

Read:

- `current` means a source publication pass was created during that benchmark/preload window.
- `carry` means the row is measuring against an already completed source pass, which is usually what we want for
  isolated renderer rows.
- `passes` is the source publication pass count inside the row window; this prevents preload rows from looking like
  they only did the final tiny plugin/artifact pass when many entity/planning passes happened earlier in the same row.
- `calls 0 skipped N` is now clearly a no-op publication pass instead of hidden `setData` work.
- The latest desktop sample shows the classifier doing the intended thing: clean z14/z8 rows stay clean, while otherwise
  good rows with moving passive artifact/plext completions are marked as noise without implying a renderer regression.

### Follow-Up: Hot/Cold Source Publication Split

Change under test:

- Page-world source scheduling now treats `selection` and `visual-filters` as hot source sync reasons that may publish
  immediately during active movement.
- Cold entity/plugin/planning/artifact/ornament/mission source sync still uses the deferred/coalesced movement queue.
- Synthetic Bench now holds cold source work from scenario start through row publication, then flushes shortly after, so
  isolated timed rows should no longer include pre-sample or final post-benchmark cold no-op flushes in their
  source pass/window deltas.

Expected bench signal:

- Isolated timed rows should usually show `sourcePass carry ... passes 0 movingPasses 0` and `sourceDelta syncs 0`.
- Rows with real passive moving traffic should still show `noise net-moving:N`; this change does not hide network noise.
- If a user changes selection or visual filters while moving, `sourcePass ... passMoving yes` is acceptable because those
  are intentionally hot updates.

Observed validation:

- The latest desktop batch shows the target isolated shape on clean timed rows: `sourcePass carry ... passes 0
  movingPasses 0`, `sourceDelta syncs 0`, and `setData 0ms`.
- Rows with passive endpoint overlap still show `noise net-moving`, but no source publication landed inside those rows.
- This validates the hot/cold split for isolated Bench. Further contention work should happen in a separate live-load
  benchmark mode rather than by making isolated rows noisier.

### Follow-Up: Live-Load Benchmark Mode

Change under test:

- The mock toolbar now has an opt-in `Live Bench` button for the selected variant, zoom, and pan/zoom mode.
- The older single-run `Bench` button was removed during toolbar cleanup. `Batch` is the default isolated benchmark, and
  Live Bench variant/mode/zoom selectors are hidden behind `Bench Options`.
- Unlike isolated `Bench`/`Batch`, `Live Bench` intentionally forces an entity refresh at synthetic movement start and
  bypasses the cold-source hold for that run.
- Use this when we want to measure request, parse, store, source publication, and render contention together.

Expected signal:

- `net entities` should show active entity request activity inside or near the movement window.
- `sourcePass` / `sourceDelta` may show current passes and real `setData` inside the measured run; this is expected for
  live-load mode.
- Rows now include `sourcePass ... max Nms` and `sourceDelta ... maxSources source:Nms` so single expensive source
  publications are visible even when aggregate `setData` time stays small.
- Do not compare live-load rows directly with isolated `Batch` rows. They answer different questions.

Observed validation:

- First copied Live Bench sample showed the intended active overlap shape: `net entities req 24 ok 24 active 24 passive
  0 moving 24`, `sourcePass current ... movingPasses 8 ... passMoving yes`, and `sourceDelta syncs 8 movingSyncs 8`.
- That run did not reproduce a `setData` hammer: it reported `calls 0`, `setData 0ms`, and only unchanged skips, while
  frame smoothness stayed usable at `avg 9ms`, `max 59ms`, `fps 107`, `slow 6/966`.

Phase 2 close-out:

- Use `Batch` for isolated render smoothness comparisons.
- Use `Live Bench` only when measuring intentional request/source/render contention.
- Current desktop validation shows isolated rows are clean enough to move on to Phase 3 diagnostics: UI render deltas,
  phase timing, post-scenario stability, and manual interaction capture.

### Phase 3 Start: Stable After Movement Sample

Change under test:

- Copied benchmark rows now include a `stable avg ... max ... fps ... slow ...` segment.
- The stable sample runs briefly after the synthetic movement window and after deferred cold source publication is allowed
  to flush, so post-move stutter is visible separately from pan/zoom movement smoothness.

Expected signal:

- A healthy isolated row should have both good movement stats and good stable stats.
- If movement looks smooth but a deferred source publication freezes the map afterward, `stable max` and `stable slow`
  should expose that before we consider cold source partitioning.

Observed validation:

- Desktop Batch showed clean movement and stable phases. Representative rows stayed around `avg 8ms`, `fps 119-124`,
  with `stable avg 8ms max 9ms fps 120 slow 0/107`.
- Phone Batch also stayed stable: movement rows were mostly `avg 17-18ms`, `fps 55-60`, and stable samples were mostly
  `stable avg 17ms`, `max 17-33ms`, `slow 0`.
- No desktop or phone row showed the feared "smooth pan, freeze after stop" pattern, so cold source partitioning remains
  deferred pending later evidence.

### Phase 3 Follow-Up: UI Render Deltas

Change under test:

- Copied benchmark rows now include `ui renders`, a compact top-list of UI components whose render-diagnostic counters
  changed during the scenario window.
- This is intended to distinguish map/render-source cost from popup/dock/debug UI churn when a row has unexpected slow
  frames.

Observed validation:

- The first desktop batch with `ui renders` showed the field working and mostly reporting `none` or small toolbar/dock
  deltas. Representative rows included `ui renders none`, `MockToolsBar:1`, and occasional dock/status changes.
- One z8 row reported `StatusBar:10` alongside `noise net-moving:2`, but long-task and stable samples stayed clean.
- Current evidence does not point at React UI churn as the benchmark bottleneck; keep the field as context for future
  outlier rows.

### Phase 3 Follow-Up: Manual Interaction Capture

Change under test:

- `Bench Options` now includes `Capture Drag`, which records an 8-second real manual interaction window instead of
  driving the map with synthetic pan/zoom.
- The copied report is labeled `IRIS BENCH MANUAL` and keeps the same frame, network, source, long-task, UI-render,
  workload, and plugin-mix fields as Batch/Live rows.

Observed validation:

- First desktop z16 manual capture validated the path with a heavier real display than the synthetic Batch rows:
  `18,923` items, including `1,894` ornaments and `1,264` plugin features.
- Smoothness stayed healthy at `avg 9ms`, `max 75ms`, `fps 117`, and `slow 1/937`, with `longtask count 0`.
- Source publication was not a hammer in this capture: `sourceDelta calls 6`, `setData 2ms`, `movingSetData 0ms`,
  with per-source maxima only `0-1ms`.
- UI render deltas were visible (`StatusBar:44`, toolbar/dock/planning single digits), but they coincided with clean
  frame and long-task stats rather than a UI-driven stall.
