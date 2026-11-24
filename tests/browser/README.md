# Browser fixtures and comparison

Use Node 26 LTS from the root `.nvmrc`, `npm ci` and installed Google Chrome. Tests run compiled IRIS against a local
Intel-like host with isolated storage, simulated responses and hostile host styles; no credentials or real COMM sends.
[CONTRIBUTING](../../CONTRIBUTING.md#testing) owns when to test, build reuse and packaging policy.

## Running

```sh
npm run test:browser:smoke       # representative journeys
npm run test:browser             # full regression suite
npm run test:browser -- tests/browser/comm-usability.smoke.mjs
npm run test:browser:watch
npm run test:browser:report
```

Normal runs build the app and manage the loopback fixture server (port 6973). Reports/screenshots/traces are ignored
under `playwright-report/` and `test-results/`. `--ui` enables stepping; `--workers=1` isolates timing investigations.
Local default is two workers; CI uses one worker for the tagged smoke selection before packaging.
Re-benchmark reliability/runtime before increasing concurrency. Use `npm run test:browser:smoke:reuse` for quick
checks of unchanged build inputs; full build-reuse commands are in the contributor guide.

## Fixture and assertion rules

- `intel-fixture.html` hosts the runtime; `portal-fixture.mjs` / `navigation-fixture.mjs` share setup/navigation helpers.
- All suites use `smoke-fixtures.mjs`; declare feature RPC handlers before navigation/reload and suppress intended
  external resources explicitly. Only empty map/COMM/artifact and inactive subscription startup responses are shared.
  Unexpected requests and errors fail the test, including reload/popup errors. `entity-fixture.mjs` adds renderer setup.
- Supply authoritative map responses for entities that must survive refreshes; one-shot bridge injections can race
  publishers. Stop unrelated publishers deliberately when exercising malformed presentation snapshots.
- Wait for responses/state, not arbitrary sleeps. Stable feature fixtures use en-US/UTC; control lifecycle clocks.
  Preserve recovery/selection assertions when fixing races. WebGL cancellation checks must cross the fallback deadline.
- Use `navigation-fixture.mjs` for shared panel/group navigation. Tags mark existing quick journeys (`@smoke`); full
  regression includes them. Keep each test in its behavior suite rather than a UI-batch file.
- Assert behavior: navigation/focus, actual QR decode, geometry, retained layers/pixels, cancellation/errors and absent
  unintended requests. Source tests describe suite coverage; avoid maintaining a second catalogue here.

## Diagnostic probes

Build with `npm run build -w apps/iitc-iris`, then start `node tests/browser/server.mjs` separately. In another terminal:

```sh
node tests/browser/profile-level-labels.mjs --gestures
node tests/browser/profile-level-labels.mjs --key-counts --gestures
node tests/browser/profile-level-labels.mjs --ornaments
node tests/browser/profile-level-labels.mjs --artifacts --gestures
node tests/browser/investigate-comm-map.mjs
```

Choose one overlay flag per run. Stop the standalone server before normal tests and run timing probes alone.
Synthetic data, warm-up, counts, CPU/frame/CDP timings isolate rendering; warm local images exclude remote loading.
Frames indicate paint opportunities, not GPU completion or Android frame rates. There are no timing thresholds.
The COMM probe advances mocked clocks; it is not a production-data capture or a required reproduction of old defects.

## Live IITC comparison

1. Follow the [porting doctrine](../../docs/iitc-iris/port-plan.md); record the core/plugin revision and identical view,
   settings/data/device. Diagnostics location navigation and Controls restore the view. Test Fast/IITC Delay when
   relevant, restoring the previous setting afterward. Controls pan uses the reference 500px offset.
2. Capture Diagnostics JSON for same-bounds reuse, broad low zoom and dense high zoom. Compare viewport P/L/F counts
   (`entities.viewport`), not padded fetched/placeholder totals. Separate fresh/stale/network render sources.
3. Inspect fresh/stale tile keys, `partialTileKeys`, `retryRequests`, `retriedTileKeys`, `queue`, `renderQueue`, retry/error
   keys, `queueDelayReasons`, `renderPolicy` and `timing`. Retry requests count HTTP batches; retried keys may recover.
4. Investigate fresh tiles retried needlessly, cached stale tiles ending partial, inconsistent queue/source counters
   or materially worse same-view retry churn. Network completion alone is not render-queue completion.
5. Compare dispatch, mutation and first/second frame timings (`timing.layerUpdate` / `timing.interactionUpdates`),
   including output equivalence. Keep evidence in reports/review records; remaining live gaps go in the roadmap.

Chrome fixtures do not establish Firefox installation, WebView auth, real keyboards/insets, live Intel/provider routing
or store compliance. No maintained screenshot-diff baseline exists; geometry/attachments still require visual judgment.
Use the [friends guide](../../docs/iitc-iris/friends-testing.md) for device smoke. Do not reopen accepted lifecycle work
without a concrete mismatch or describe synthetic stale/artifact behavior as live acceptance.
