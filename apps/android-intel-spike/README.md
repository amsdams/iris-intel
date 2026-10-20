# IRIS Android Spike APK

Disposable native Android/WebView proof on `feature/android-readiness`. Version **0.2.0-spike** loads live Intel and
can manually inject bundled IRIS. Phone login and reopening without another login passed on 0.1.3;
0.2.0 displayed IRIS on the phone and the user accepted a quick smoke of inventory, layers, COMM, portal details, and missions.

## Build And Download

Use JDK 21 and an Android SDK with platform 36 and Build Tools 36.0.0. The root commands discover the normal macOS SDK
location and a registered JDK 21; `JAVA_HOME` and `ANDROID_HOME` override discovery. Gradle 8.14.3 and AGP 8.13.2 are pinned.
Gradle can install missing SDK components when the SDK licenses have been accepted. First build needs internet access.

```bash
npm run android:check
npm run serve
```

`android:check` runs the session/injection tests, native navigation/asset tests, Android lint, and debug APK assembly.
Gradle builds the existing web bundles and packages their scripts, CSS, images, and licenses from generated output.
Node 24 and `npm ci` are prerequisites; no generated web files are committed.
For subsequent build-only runs, use `npm run android:build`.

The server prints a phone URL (port 6969 by default; set `PORT` to override). Connect the phone to the same Wi-Fi as the Mac, open that URL, download the APK, and
allow installation from the browser when Android asks. If macOS asks about incoming connections, allow this local server.
Guest networks/VPNs may prevent devices from reaching each other. Stop the server with Ctrl+C after downloading.
The page lists generated Firefox XPI, Chrome ZIP, and APK artifacts only; repository and session files are not served.
`npm run android:serve` remains an alias. Missing artifacts show their build command; starting the server does not build.

Output: `app/build/outputs/apk/debug/app-debug.apk`. The download is named `iris-intel-test.apk`.
It is automatically debug-signed using the local Android debug key; no release signing material is stored in the repo.
Installable on Android 8.0/API 26 or newer. Later permanent-app minimum/version policy is undecided.
Keep the local debug key to install subsequent builds over this one without losing app data.

## Phone Check

1. Install the update over the existing **IRIS Intel Test** app, preserving its session. Open Intel and sign in if needed.
2. Tap **Check session**: PASS requires a signed-in player plus a valid `getHasActiveSubscription` response.
3. Tap **Load IRIS** (scroll the native button row horizontally if needed). Expect IRIS UI/map and
   **PASS: bundled IRIS UI, Leaflet runtime, and message round trip confirmed.**
4. Pan/zoom, select a portal, and open a panel. Tap Check session again to confirm the injected app still authenticates.
5. Tap Load IRIS again to recheck without duplicating assets. **Reload** or **Intel** returns to stock Intel.
   Injection is manual per page in this spike; reload/relaunch requires Load IRIS again.
6. Close/force-stop/reopen and verify login persists, then load IRIS again.
7. On failure, use **Diagnostics → Copy**. It includes versions, hosts, and fixed session/injection status messages;
   no cookies, tokens, player identity, full URLs, or response bodies. Share visible errors without authentication URLs.

Login compatibility (since 0.1.3) keeps `accounts.google.com` and `accounts.youtube.com` in the same WebView as Intel and its authorization page.
It uses the updated IITC mobile user-agent workaround: remove the WebView marker and adjust a reduced Chrome version
ending in `.0.0.0` to `.0.0.1`, preserving the installed browser major version and device information.
This is a compatibility experiment, not a supported Google OAuth integration; Google's
[embedded-user-agent policy](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers)
prohibits this kind of embedded authorization, so it is not a permanent auth architecture or a distribution-ready solution.
Version 0.1.3 reached stock Intel without Chrome and stayed logged in after force-stop; the earlier recovered
0.1.2 session passed the authenticated probe. No credentials are copied to native code.
USB is optional; debug builds can also be inspected with Chrome DevTools and Android Studio Logcat.

## Ownership And Next Step

A native Activity owns the WebView, lifecycle, Back behavior, and a manual Load IRIS action. Cookies/DOM storage stay in the WebView, flushed when
pausing. Embedded top-level pages are restricted to Intel, `login.ingress.com`, `accounts.google.com`, `accounts.youtube.com`, and its named Niantic sign-in hosts; other HTTPS links open
in the browser. The app requests Internet access only. Location, clipboard integration for the web page, file handling,
remain later work. Native clipboard access only supports the explicit diagnostics Copy action.

IITC mobile comparison sources are `IITC_WebView.java`, `IITC_WebViewClient.java`, and the user-agent helpers in
`IITC_Mobile.java` under `reference/ingress-intel-total-conversion/mobile/`. Reused concepts: JavaScript/DOM storage,
cookie persistence, navigation ownership, and WebView lifecycle. The broad JavaScript interface, mixed/file access,
and entire mobile/plugin framework were not adopted. Only the narrow user-agent login workaround is now under test.

Native diagnostics evaluate a bundled probe only on the exact HTTPS Intel origin. Credentials stay inside that page's
same-origin request; no privileged native JavaScript bridge is installed. Navigation/disposal invalidates pending probe
callbacks. Request format mirrors `postIntelEndpoint`/`extractVersion` in the existing page runtime.

Bundled assets are served only under the reserved HTTPS Intel path `/__iris_android__/`; other Intel requests
keep their network owner. The host supplies an asset-base meta tag; no fake extension APIs or privileged JavaScript
bridge are installed. The read-only Draw Tools status request/reply proves the existing shell/runtime transport.
This late-injection spike overlays stock Intel; injection timing and stock-runtime ownership need review for a permanent wrapper.
Next: wrapper hardening (automatic injection, stock-runtime ownership, native Back, background/resume) and outstanding
platform/auth decisions before permanent Android packaging.
See the [APK plan](../../docs/iitc-iris/plans/android-apk-installable-plan.md).

Phone evidence (2026-10-20): early versions handed sign-in to Chrome, losing the WebView session.
Adding `login.ingress.com`, `accounts.google.com`, then `accounts.youtube.com` kept the complete flow embedded.
Version 0.1.3 reached stock Intel and persisted login across force-stop. Google Password Manager autofill remains
unresolved. Version 0.2.0 phone injection and the quick feature smoke passed. The native PASS label was not
separately reported; keep that diagnostic distinct from the accepted feature smoke.
