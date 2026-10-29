# Play Store readiness review

Reviewed 2026-10-25 against the current Android wrapper, workflows, privacy text, and official requirements.
This is a source/documentation assessment; no Play Console account, submission, or reviewer decision was inspected.

**Recommendation:** continue the signed GitHub/friends alpha. Resolve authentication and website-distribution
permission evidence before spending time on store artwork or submitting a Play build. More component decomposition
is not a prerequisite. A WebView does not itself mean automatic rejection, and this review cannot promise acceptance.

## Decisions before submission

| Area | Current evidence | Required next step |
| --- | --- | --- |
| Google login | `LoginUserAgent.java` hides the WebView marker; navigation deliberately retains Google sign-in inside the WebView. Phone login works, but this remains a compatibility workaround. | Establish a supported login/session architecture. Google prohibits directing OAuth requests into embedded user-agents under developer control. Simply opening Chrome does not transfer its Intel cookies to this WebView; investigate a provider-supported flow before replacing the working alpha login. [OAuth policy](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers). |
| Website/content permission | The wrapper loads Intel and substitutes bundled IRIS UI. No website-owner permission evidence for Play redistribution was found in the reviewed project docs. | Resolve permission/terms and retain evidence suitable for review. Google's Web views policy addresses presenting a website without its owner's permission. This is a review risk requiring evidence, not a conclusion that IRIS has been rejected. [Play policy](https://support.google.com/googleplay/android-developer/answer/18258653?hl=en-GB). |
| App access for reviewers | Core functionality requires an Ingress account and authentication. Browser fixtures simulate data but are development tooling, not a shipped review/demo mode. | Supply an acceptable reviewer access path and clear instructions for restricted functionality. Do not claim the UI smoke fixture solves review access. [App content/review](https://support.google.com/googleplay/android-developer/answer/9859455). |
| Identity and signing | On 2026-10-29 the user chose `io.github.amsdams.iris` as the permanent ID, replacing `org.iris.intelspike` before Play listing creation. The build/Java namespace and release metadata use the new ID; the pinned signing key is unchanged and backed up. Restoration has not been demonstrated. | Use `io.github.amsdams.iris` in Play Console. This starts a separate installation with fresh session/settings; old alpha users must install it manually. Enroll the existing app-signing key and use a separate upload key to preserve compatibility between future GitHub/Play builds. Verify enrollment and backup restoration before acting. Folder names can change independently. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756). |

## Technical and listing work after those decisions

- **Bundle delivery:** local `npm run android:bundle` now runs Android JavaScript/release unit tests and lint, then
  produces a signed `app/build/outputs/bundle/release/app-release.aab` (2026-10-29). Bundletool validation, manifest
  identity/target API, JAR signature, pinned certificate and all 22 bundled web assets pass. CI still produces
  APK/XPI/ZIP, not an AAB. The user uploaded/published the first internal release and accepted its Play-delivered
  phone smoke: install, retained sign-in on reopen, location and clipboard. The Play app-signing fingerprint still
  needs comparison with the GitHub certificate before assuming cross-channel update compatibility.
  Keep GitHub APK delivery. New Play apps require Android App Bundles.
  [Android App Bundles](https://developer.android.com/guide/app-bundle).
- **Target API:** `targetSdk 36` already meets the current API 36 requirement for new phone apps and updates
  (effective August 31, 2026). This is a version check, not evidence of full Android 16 device compatibility.
  [Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878).
- **Version/update channels:** Android's `0.4.1-alpha+commit` and extension `0.1.2` versions are separate today.
  Git-history-based Android version codes require preserved history. Establish monotonically increasing Play codes
  and compatible cross-channel updates before publishing. A Play build should direct update help to its store
  channel; the current manual checker points to GitHub APKs. No channel behavior is changed by this assessment.
- **Privacy/Data safety:** `site/privacy/index.html` now contains a dedicated policy with retention/deletion details
  and the user-approved public contact `1sos.2play@gmail.com` (2026-10-29). A pinned Pages workflow publishes only `site/`;
  enable GitHub Actions as the Pages source, push and verify `https://amsdams.github.io/iris-intel/privacy/` publicly.
  Android keeps an offline summary and adds Online policy; the shared About panel links to the page. Then complete
  Data safety from actual flows: authentication/session data, agent/COMM/inventory data, optional foreground location,
  map areas, address searches, image hosts, GitHub update requests, and user-initiated feedback. No IRIS analytics
  backend does not mean no data handling. Determine whether any in-app signup path triggers account-deletion
  requirements; Intel logout/local data clearing is not deletion of a Niantic/Google account.
  [User data/privacy](https://support.google.com/googleplay/android-developer/answer/10144311),
  [account deletion scope](https://support.google.com/googleplay/android-developer/answer/13327111).
- **Listing declarations/assets:** prepare description, support/privacy links, screenshots, high-resolution icon,
  feature graphic, content rating, target audience, ads declaration, and app-access instructions. The existing vector
  launcher icon is not the whole store asset set. Keep independent-project attribution clear.
  [App content](https://support.google.com/googleplay/android-developer/answer/9859455).
- **Testing:** use an internal track/pre-launch report, then the required closed test if applicable. For personal
  accounts created after November 13, 2023, production access requires at least 12 testers opted in continuously
  for 14 days and an application for access. The maintainer's account type/date was not verified.
  [Personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
  Keep real-device regression of fresh login, persistent sessions, Back/rotation, background/resume, location denial,
  map-style recovery, and Android display/keyboard insets. Automated browser fixtures cannot replace those checks.

Do not change the working alpha login, application ID, or signing key as an incidental cleanup. The next useful
store-focused task is a supported-auth/permission investigation, followed by an explicit go/no-go decision for Play.
Neither a production backend nor a larger UI component library is assumed necessary by this review.
