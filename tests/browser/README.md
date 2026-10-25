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

The original three checks are kept in [iris.smoke.mjs](iris.smoke.mjs):

1. Appearance selection survives reload; System follows device appearance while explicit Dark/Light stays fixed.
2. Search, COMM, Passcode, and Diagnostics have matching input surfaces; submit buttons match input heights;
   actions and toggles have matching corners and Debug still toggles. Runs in light and dark themes.
3. Jump disables empty/whitespace input, guards direct submission, accepts Enter for coordinates, and shows
   feedback for malformed input. Runs in light and dark themes.

[base-map.smoke.mjs](base-map.smoke.mjs) adds malformed-style/HTTP failure, unavailable WebGL, stale failure after
switching styles, context loss/restoration, and map replacement checks. These use empty valid vector styles and
deliberate faults, not live providers. A recovered map uses OSM and updates Appearance, with a dismissible notice.

[intel-fixture.html](intel-fixture.html) loads the actual compiled IRIS UI/runtime with simulated Intel globals,
empty API responses, and representative host input CSS. External map/network requests are stubbed by the tests.
No login, credentials, live Intel data, or real messages are used. This covers browser UI behavior, not extension
installation, live map-provider availability, or Android WebView behavior; keep phone smoke checks for those.

Run this suite for relevant UI changes. It stays separate from fast unit tests and is not added to CI yet.
Add a check when it protects a concrete behavior, rather than preserving every temporary investigation script.
