# Android development and distribution

The experimental Android WebView host bundles IRIS on authenticated Intel with Stock Intel recovery.
[Friends testing](../../docs/iitc-iris/friends-testing.md) owns installation,
updates and device smoke; [CONTRIBUTING](../../CONTRIBUTING.md) owns shared validation/release procedures.

## SDK and debug builds

Use Node 26 LTS from the root `.nvmrc`, `npm ci`, JDK 25 LTS, Android platform 36 and Build Tools 36.0.0.
Gradle 9.6.1 and AGP 9.5.2 are pinned.
CI uses Temurin and reads the JDK version from `.java-version`. The app uses Java 21 source and bytecode targets.
Check newer Java library calls against Android's API levels. For example, `List.getFirst()` and `List.reversed()`
were added in API 35, while the app supports API 26 and newer.
Root tooling discovers the normal macOS SDK/registered JDK; `JAVA_HOME` / `ANDROID_HOME` override discovery.
Accept SDK licenses; Gradle can then install missing components. First build needs internet.

```sh
npm run android:check
npm run serve
```

The check runs JavaScript/native tests, lint and debug assembly; `npm run android:build` only builds. Gradle packages
web bundles, images and licenses from generated output. Reuse validated web assets as described in CONTRIBUTING.
Debug output: `app/build/outputs/apk/debug/app-debug.apk`, served as `iris-intel-test.apk`. Minimum Android is 8/API 26.
Keep the local debug key for in-place debug updates; debug and release keys differ. Switching requires uninstall/data loss.
The download page lists existing XPI/ZIP/APK only, builds nothing and serves no repository/session files. Use the printed
same-Wi-Fi URL; allow local incoming connections if prompted. Guest networks/VPNs may block access; stop with Ctrl+C.

## Signed GitHub APKs

Keep application ID / Java namespace **`io.github.amsdams.iris`** and the existing release key. The old
`org.iris.intelspike` alpha installs separately; [migration help](../../docs/iitc-iris/friends-testing.md#install-and-try)
is user-facing. The package change did not change the signing key.

GitHub secrets: `ANDROID_SIGNING_KEYSTORE_BASE64`, `ANDROID_SIGNING_STORE_PASSWORD`, `ANDROID_SIGNING_KEY_ALIAS`,
`ANDROID_SIGNING_KEY_PASSWORD`. The private ignored `signing/` backup includes `release.env`; back it up securely.
The public digest is pinned in `release-certificate.sha256`. Backup restoration remains unverified; do not replace the key.
PR/debug builds must not receive release credentials. Release APKs are not debuggable.

```sh
source apps/android/signing/release.env
npm run android:release
```

Output: `app/build/outputs/apk/release/app-release.apk`, served as `iitc-iris-android.apk`.
Codes use `1005 + git rev-list --count HEAD`; complete Git history and preserved main history are required.
`IRIS_ANDROID_VERSION_CODE` overrides this when necessary. The final local UI controls test APK uses **1906**,
above the previous UI test APK's **1905**. The next signed build must exceed **1906**.
Record overrides here before the next integration.
Names include source commit; mark uncommitted builds `-dirty`. Follow the [version procedure](../../CONTRIBUTING.md#versioning-and-releases).
CI derives `iitc-iris-android-update.properties` from APK `output-metadata.json`; the manual checker compares codes,
using the explicit `latest` tag (including prereleases). Tagged releases also carry update metadata.

## Play Console app bundle

Play expansion is paused; use the [readiness checklist](../../docs/iitc-iris/plans/play-store-readiness.md) before resuming.

```sh
source apps/android/signing/release.env
npm run android:bundle
```

This checks release tests/lint and signs `app/build/outputs/bundle/release/app-release.aab`; it does not submit/publish.
An upload signature does not determine Google's delivered APK certificate. Verify Play App Signing uses the existing
app-signing key for GitHub/Play update compatibility; a separate upload key remains an option. Never upload a keystore
or `release.env` as the bundle. The local download page does not list AABs.
Public privacy source: `site/privacy/index.html`. Enable Pages → GitHub Actions; `.github/workflows/pages.yml` publishes
only `site/`. Verify the public URL in README without sign-in; native About retains an offline summary and online link.

## Native security and lifetime boundaries

- The Activity owns WebView, injection, mode, Back and lifecycle. Cookies/DOM storage stay there and cookies flush on
  pause. WebView timers/native probe polling pause in background; timer suspension is process-wide (one WebView).
- Embedded pages are limited to HTTPS Intel, `login.ingress.com`, exact allowed regional Google accounts,
  `accounts.youtube.com` and named Niantic sign-in hosts; other HTTPS links open externally. Reject userinfo,
  non-default ports, unrelated subdomains/lookalikes. No mixed/file access or privileged native JavaScript bridge.
- Login uses IITC Mobile's user-agent workaround: remove the WebView marker and change reduced Chrome `.0.0.0` to
  `.0.0.1`, retaining installed major/device data. This is experimental, not a supported OAuth architecture;
  [embedded authorization policy](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers)
  is a distribution blocker. Saved-password support remains open; no credentials are copied to native code.
- `GoogleAccountHosts.java` records the domain snapshot/source hash. To refresh, download
  [Google's supported domains](https://www.google.com/supported_domains), prepend `accounts` to each leading-dot domain,
  update snapshot/date/hash and run navigation tests. Exact host matching is required; do not fetch the list at runtime/build.
- Geolocation is user-triggered, foreground coarse/fine only, restricted to exact HTTPS Intel origin with Intel on top.
  Navigation/cancellation/disposal discard pending page callbacks. Never retain positive WebView grants. Retain denials
  to avoid loops; clear on a new page or return with Android permission granted. Check prior decisions/rationale before
  prompting again. No background location/tracking service.
- Bundled assets use reserved HTTPS Intel path `/__iris_android__/` and host asset-base metadata; other requests keep
  their network owner. No fake extension APIs. In IRIS mode, block only `gen_dashboard_<hash>.js`, retaining script-tag
  version/inline player data/endpoints; Stock mode permits it. Recheck this bootstrap dependency when Intel changes.
- Back is a cancelable DOM event, without native component-state access. Explicit user-gesture map-app launches require
  Intel's main frame. Web clipboard handles drawings/titles; native clipboard is only explicit diagnostic Copy.
  Import/export remains JSON text/clipboard, with no supported native file-picker/download bridge.
- Session diagnostics run a bundled probe only at exact HTTPS Intel origin; page-owned requests retain credentials.
  Navigation/disposal invalidate pending probe callbacks. Debug builds support Chrome DevTools/Android Logcat.

Compare native changes against IITC Mobile `IITC_WebView.java`, `IITC_WebViewClient.java` and `IITC_Mobile.java` per
[the doctrine](../../docs/iitc-iris/port-plan.md); adopting its entire mobile/plugin framework is outside current scope.

## Maintainer device checks

In addition to the friends checklist, confirm Diagnostics → Check session sees a player and valid subscription
response (non-subscribers can pass); reopen Diagnostics to read it. Feature smoke alone is not native PASS.
IRIS must report Stock dashboard blocked; Stock recovery must restore it. Back closes image → panel → selection →
background. Verify login/expiry, rotation/resume, location denial/retry/settings recovery and no cancelled callbacks.
