# Play distribution checklist

This is a resumption checklist, not proof of policy compliance or Console approval. [The roadmap](../../ROADMAP.md)
owns the paused status. Recheck current policy links and actual account/Console state before publishing.
Keep the working alpha login, permanent app ID and signing key intact during documentation or unrelated UI work.

## Decisions and evidence

| Area | Evidence needed before broader distribution |
| --- | --- |
| Authentication | A supported sign-in/session architecture. The WebView user-agent workaround works in alpha but is not a supported OAuth architecture; opening Chrome alone does not transfer Intel cookies. See [secure-browser policy](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers). |
| Website/content permission | Appropriate Intel/content redistribution permission or terms evidence; no owner permission is established by this repository. See [Play policy](https://support.google.com/googleplay/android-developer/answer/18258653). |
| Reviewer access | An acceptable account/access path and restricted-functionality instructions. Browser fixtures are development tooling, not a shipped reviewer/demo mode. See [app access](https://support.google.com/googleplay/android-developer/answer/9859455). |
| Signing | Compare Play's delivered app-signing certificate with the pinned GitHub certificate; signing an uploaded AAB does not configure Google's app-signing key. Verify enrollment and backup restoration; consider a separate upload key. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756). |
| Privacy/Data safety | Verify the public policy and complete declarations from actual flows: auth/session, agent/COMM/inventory, location, map areas, address/image hosts, GitHub requests and explicit feedback. No analytics backend does not mean no data handling. [User data](https://support.google.com/googleplay/android-developer/answer/10144311). |
| Account deletion | Determine whether any in-app account-creation path brings deletion obligations. Intel logout/local app clearing does not delete a provider account. [Deletion scope](https://support.google.com/googleplay/android-developer/answer/13327111). |

## Resume Console work

1. Inspect the existing app/release/tester state; do not assume earlier Console screenshots are current. An internal
   Play-delivered install received user smoke acceptance, but closed-test participation and production access did not.
2. Select the appropriate countries/testers and closed track, create or reuse an eligible bundle when offered,
   review/submit the release and share its opt-in link. Confirm actual opt-ins and duration against this account's
   requirements; [testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
   must be rechecked rather than inferred from the old internal test.
3. Build a signed AAB using the [Android guide](../../../apps/android/README.md#play-console-app-bundle).
   Verify target API against [current requirements](https://support.google.com/googleplay/android-developer/answer/11926878),
   identity/certificate, monotonic code and bundle validity. CI currently packages APK/XPI/ZIP, not AAB delivery.
4. Confirm [public privacy policy](https://amsdams.github.io/iris-intel/privacy/) visibility and actual Data safety answers.
   Pages publishes only `site/`; the Android policy also has an offline summary. Account-specific submission answers
   and permission/auth questions remain decisions, not a guarantee that a WebView will be accepted or rejected.
5. Finish listing/content rating/audience/ads/access declarations and refresh phone screenshots for the current UI. Existing launcher artwork,
   feature graphic, renderer and capture instructions live in [store-listing](../../../apps/android/store-listing/README.md).
6. Check fresh login, persistent sessions, Back/rotation, background/resume, keyboard/insets, location denial/retry,
   clipboard and map-style recovery on device. Keep GitHub APK distribution; decide Play-specific update help explicitly.

Production services, another UI library or further component decomposition are not assumed prerequisites. Supported
authentication, permission evidence and an explicit distribution decision come before cosmetic submission work.
