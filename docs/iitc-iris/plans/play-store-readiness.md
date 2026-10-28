# Play Store readiness review

Reviewed 2026-10-25 against the current Android wrapper, workflows, privacy text, and official requirements.
This is a source/documentation assessment; no Play Console account, submission, or reviewer decision was inspected.

**Maintainer decision (2026-10-28):** prepare a Play submission and respond to actual review findings while continuing
the signed GitHub/friends alpha. Authentication and website-distribution permission remain known concerns, but an
operator reply is not a preparation prerequisite. No permission or policy acceptance is implied. More component
decomposition is not a prerequisite. [Submission materials and build](../play-store-submission.md).

## Decisions before submission

| Area | Current evidence | Required next step |
| --- | --- | --- |
| Google login | `LoginUserAgent.java` hides the WebView marker; navigation deliberately retains Google sign-in inside the WebView. Phone login works, but this remains a compatibility workaround. | Establish a supported login/session architecture. Google prohibits directing OAuth requests into embedded user-agents under developer control. Simply opening Chrome does not transfer its Intel cookies to this WebView; investigate a provider-supported flow before replacing the working alpha login. [OAuth policy](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers). |
| Website/content permission | The wrapper loads Intel and substitutes bundled IRIS UI. No website-owner permission evidence for Play redistribution was found in the reviewed project docs. | Resolve permission/terms and retain evidence suitable for review. Google's Web views policy addresses presenting a website without its owner's permission. This is a review risk requiring evidence, not a conclusion that IRIS has been rejected. [Play policy](https://support.google.com/googleplay/android-developer/answer/18258653?hl=en-GB). |
| App access for reviewers | Core functionality requires an Ingress account and authentication. Browser fixtures simulate data but are development tooling, not a shipped review/demo mode. | Supply an acceptable reviewer access path and clear instructions for restricted functionality. Do not claim the UI smoke fixture solves review access. [App content/review](https://support.google.com/googleplay/android-developer/answer/9859455). |
| Identity and signing | Installed GitHub releases use `org.iris.intelspike` and the pinned release certificate. The key is backed up; restoration has not been demonstrated. | Decide the permanent Play application ID before creating its listing. Keeping the ID and enrolling the existing app-signing key can preserve sideload/Play compatibility; use a separate upload key. Verify the supported enrollment process and backup restoration before acting. Folder names can change independently. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756). |

## Technical and listing work after those decisions

- **Bundle delivery:** CI currently produces APK/XPI/ZIP. The local `npm run android:bundle` command now builds a
  release-signed AAB with Play-specific update routing. Internal-track validation and signing enrollment remain pending;
  GitHub APK delivery is retained. New Play apps require Android App Bundles.
  [Android App Bundles](https://developer.android.com/guide/app-bundle).
- **Target API:** `targetSdk 36` already meets the current API 36 requirement for new phone apps and updates
  (effective August 31, 2026). This is a version check, not evidence of full Android 16 device compatibility.
  [Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878).
- **Version/update channels:** Android's `0.4.1-alpha+commit` and extension `0.1.2` versions are separate today.
  Git-history-based Android version codes require preserved history. Establish monotonically increasing Play codes
  and compatible cross-channel updates before publishing. A Play build should direct update help to its store
  channel; the local Play build now does so. Ordinary APK builds retain the GitHub checker. Branch commit counts can
  collide: check the highest published code across both channels before uploading a bundle.
- **Privacy/Data safety:** the app has offline privacy text and the friends guide describes data use. Prepare a
  clearly labelled, public privacy-policy page with a named contact and retention/deletion details, then complete
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

Do not change the working alpha login, application ID, or signing key as an incidental cleanup. The investigation
below records the evidence and unanswered questions; the maintainer subsequently chose to proceed with preparation.
Neither a production backend nor a larger UI component library is assumed necessary by this review.

## Authentication/distribution investigation — 2026-10-28

**Outcome:** investigation completed; the current login is not a supported submission architecture. No supported
Intel session handoff was found in the reviewed repository/public sources. This does not establish that none exists:
the next step requires clarification from the operator. The maintainer reports no known written distribution
permission. Since the investigation, the maintainer has begun Play Console registration and reports identity/address
verification is pending. The inquiry below is prepared but sending has not been confirmed. Working alpha login,
signing, and application ID remain unchanged.

The wrapper strips `; wv` from its user agent and keeps Google authentication inside its WebView. After login it
persists WebView cookies and injects IRIS only when the Intel page exposes an authenticated `window.PLAYER`.
There is no browser-authentication callback/session exchange in the current wrapper. Google explicitly prohibits
directing OAuth authorization into developer-controlled embedded user agents; successful phone testing does not
resolve that policy. [Google OAuth policy](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers).

| Candidate | Assessment for IRIS |
| --- | --- |
| Keep embedded Google login/user-agent workaround | Works in the alpha, but does not meet the supported-auth requirement above. |
| Browser Custom Tab/Auth Tab plus operator-supported session handoff | Preferred direction to investigate. Browser login and the WebView have separate cookie stores, so opening Chrome alone cannot authenticate the Intel WebView. A documented operator-supported return/session exchange is needed; adding a callback handler alone is insufficient. |
| Register our own Google OAuth client | Could authenticate a user to our own app, but does not by itself establish that user's Intel session or grant Intel access. This follows from the current app's dependence on Intel's authenticated page/session. |
| Replace the wrapper with a Trusted Web Activity | Not a direct replacement: TWAs expect verified app/site association and do not give the host app direct web-content/cookie access. IRIS currently injects bundled UI into an Intel origin it does not own. |

Browser state separation is documented in [Custom Tabs](https://developer.chrome.com/docs/android/custom-tabs);
supported return handling in [Auth Tab](https://developer.chrome.com/docs/android/custom-tabs/guide-auth-tab);
site ownership/access constraints in [Trusted Web Activities](https://developer.chrome.com/docs/android/trusted-web-activity).
The implications for IRIS in the table are architecture conclusions, not an operator-approved integration contract.
Do not implement cookie extraction, an authentication proxy, or another user-agent disguise as a supposed fix.

The official [IITC mobile page](https://iitc.app/download_mobile) links Play distributions. That is useful precedent
to investigate, but does not establish permission for IRIS or approval of its particular authentication flow.
The [Ingress website](https://ingress.com/) currently identifies Niantic Spatial and links its
[terms](https://www.nianticspatial.com/en/terms). Neither those public terms nor the repository provide the specific
distribution permission needed here. Request clarification rather than treating upstream availability as a grant.

### Ready-to-copy operator inquiry

Use the terms contact `termsofservice@nianticspatial.com` published in section 17.6 of the terms, or the official
[Ingress support form](https://support.ingress.com/hc/en-us/requests/new), asking for referral to the appropriate team.
This is a draft for the maintainer to send; nothing has been sent on their behalf.
Contact details were rechecked on 2026-10-28. Retain the sent message, ticket/reference and reply privately; record
only a redacted permission summary here. Silence is not permission, and operator permission alone does not approve
Google OAuth implementation or guarantee Play acceptance.

```text
Subject: IRIS — permission for Google Play distribution and supported Intel authentication

Hello,

I maintain IRIS, an independent open-source Ingress Intel companion based on IITC:
https://github.com/amsdams/iris-intel

Its Android app loads intel.ingress.com in a WebView and replaces the page interface
with bundled IRIS UI. Users access their own authenticated Intel session for features
such as the map, portal details, COMM and inventory. It is not affiliated with Niantic
Spatial. The current Android package is org.iris.intelspike.

We are evaluating Google Play distribution. Our alpha currently uses embedded Google
sign-in with a modified WebView user agent, which we understand is not a supported
Google OAuth architecture. We want to resolve this before submitting to Play.

Could you clarify:
1. May we distribute this Intel-based interface through Google Play, and under what
   terms? Can you provide written permission suitable for Google's website-owner
   permission review, or direct us to an applicable existing authorization?
2. Is there a supported authentication/integration flow for third-party Intel clients,
   using the system browser and then establishing an authorized session in the app?
   Browser login alone does not transfer a session into Android's separate WebView.
3. Is there an approved way to give Google Play reviewers access to restricted
   functionality without sharing a player's personal credentials?

Please forward this to the appropriate Intel/authentication or permissions team
if necessary. Thank you.
```

### Account setup and next pickup

Recommend a dedicated, secured Google account for development and a separate public project/support email. Use
accurate legal identity for verification; a project developer display name does not make a personal account anonymous.
Google displays a personal developer's legal name, country and developer email; monetization or regional rules can
require more public details. Review these disclosures before registering.
[Account information requirements](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en).

The maintainer chose to proceed with Play preparation rather than wait for the inquiry. Keep the findings visible
and respond accurately if review asks for permission or authentication changes. Website permission alone does not
resolve Google's OAuth policy; GitHub distribution does not waive authentication policies or the operator's terms.
Continue with signing enrollment, real reviewer access, public privacy hosting, listing and test-track setup in the
[submission guide](../play-store-submission.md). A new personal account needs the Play closed-test requirement above;
the three friends who tested sideloaded APKs have not thereby completed that Play test.
