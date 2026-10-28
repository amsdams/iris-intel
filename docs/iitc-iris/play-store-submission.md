# IRIS Play Console preparation

The maintainer chose to prepare a Play submission and respond to actual review findings (2026-10-28).
Account identity/address verification is pending. Authentication and website permission concerns in the
[readiness review](plans/play-store-readiness.md) remain unresolved, not waived or concealed. No submission or
operator inquiry has been sent by the coding agent. Work is on `feat/play-store-preparation`.

## Local Play bundle

```bash
source apps/android-intel-spike/signing/release.env
npm run android:bundle
```

This runs the existing JavaScript/native tests, release lint and `bundleRelease` with `-PirisPlayStore=true`.
Output: `apps/android-intel-spike/app/build/outputs/bundle/release/app-release.aab`.
It contains bundled IRIS, uses the existing release key/application ID and opens Google Play for updates.
It does not offer GitHub APK releases or fetch GitHub update metadata. The initial Play listing will not open
successfully until the app is available to that account/tester. An AAB cannot be installed directly on a phone.
Use Play's internal test delivery for the final generated-APK check after signing setup.

Local verification on 2026-10-28: `npm run check` (670 app/core tests and six release gates), extension packaging,
Play AAB and ordinary signed APK release tests/lint/build pass (31 native and 15 JavaScript tests per channel).
Google bundletool 1.18.3 validates the AAB; its JAR signature matches the pinned certificate and all 19 IRIS assets
match the web build. Compiled Play update code contains no metadata-fetch path; the ordinary APK retains it.
The privacy page renders at 360 px without horizontal overflow. These checks do not establish live login, Play
acceptance or installed APK behavior. Initial bundle: `0.4.1-alpha+d141d6b`, code `1850`; rebuild/check codes before upload.

Ordinary `npm run android:release` continues to produce the GitHub APK with GitHub update behavior. The flag defaults
to false, is compiled into the build, and is not inferred from the installer. Existing release workflows are unchanged;
there is no Play upload automation or AAB publishing. Build commands share generated web assets: run them sequentially.

**Before the first upload:** keep `org.iris.intelspike` unless deliberately abandoning installed-update compatibility.
Do not accept a different Google-generated app-signing key by accident. Configure Play App Signing to use the existing
app-signing key if GitHub/Play updates must be compatible, then verify the delivered APK certificate against
`apps/android-intel-spike/release-certificate.sha256`. The current local bundle uses that existing key for upload too;
a separate upload key is recommended and can be configured during enrollment. Nothing here exports the private key
to Google or enrolls signing. Follow the console's current encrypted-key import instructions; do not commit key
material. Internal App Sharing may re-sign an artifact and is not proof of normal track signing compatibility.
[Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en).

The version code defaults to `1000 + git rev-list --count HEAD`, with an optional `IRIS_ANDROID_VERSION_CODE` override.
Do not upload two different bundles with the same code. Preserve history and check the highest code in Play and the
latest GitHub APK before choosing a new value. These channels need a shared increasing sequence after publication;
separate branch commit counts alone cannot guarantee it. Store the exact uploaded AAB and its SHA-256 privately.

## Listing text to copy

App name: **IRIS – Intel companion**

Short description:

```text
An independent Ingress Intel companion with maps, portal tools and COMM.
```

Full description:

```text
IRIS is an independent, open-source companion for the Ingress Intel map, based on IITC.

Explore the map, inspect portal details, follow missions and use COMM in an interface
designed for phones. Choose a light or dark interface independently of your map style.

Features include:
• Portal details, map layers and portal lists
• COMM and player activity tools
• Mission information and passcode entry
• Inventory and portal key counts for eligible C.O.R.E. subscribers
• Drawing tools for planning links and saving markers
• Address search and optional location-based map centering

An Ingress account and internet connection are required. Feature availability depends
on Intel, your account and third-party map services. Location permission is optional.

IRIS is currently an early testing release. Google sign-in uses an experimental
embedded-browser compatibility workaround, and saved-password support may vary.

IRIS is a community project, not an official Ingress application. It is not affiliated
with or endorsed by Niantic Spatial or Google.

Source code and feedback: https://github.com/amsdams/iris-intel
```

Choose app, free, and no ads for the current IRIS build (no donation/purchase feature has been added).
Complete the content-rating, audience and other declarations from the actual questions; do not guess a rating.
Public support email is pending the maintainer's choice; do not copy private sign-in/recovery details into the listing.

## Privacy and Data safety

[Privacy policy webpage source](privacy.html) is prepared for static hosting. It names IRIS/the maintainer, explains
third-party requests, local storage, optional location, feedback and deletion, and uses GitHub Issues as its current
privacy contact mechanism. A dedicated public support email can replace/extend that route when chosen.
It is not yet published: host the HTML at a stable public HTTPS URL, open it signed out on a phone, and use that exact
URL in Play Console. Do not submit a localhost URL, repository source-code view, downloadable file or unverified URL.
The current app already exposes offline privacy text at **App → About IRIS → Privacy**, now with channel-specific
update information. See [privacy requirements](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

Do not declare "no data collected" merely because IRIS has no backend. Prepare the Data safety form from these flows:

| Flow | Data / recipient to assess |
| --- | --- |
| Intel/authentication | Account/session identifiers, game activity and requests to Niantic and the sign-in provider |
| Locate and map | Optional approximate/precise location; map area and IP/network metadata to Intel/map providers |
| Address search | Query text to OpenStreetMap Nominatim |
| COMM/passcodes | User-entered messages or codes to Intel; account restrictions and retention belong to the service |
| Images/decorations | Requested image identifiers and network information to supplied resource hosts |
| Feedback/clipboard | User-chosen content; copying locally differs from submitting a public GitHub issue |
| Updates | Play build opens Play; GitHub build requests public GitHub metadata on demand |

This is an evidence inventory, not completed form answers. Apply Google's collection/sharing, ephemeral processing,
user-initiated transfer and controlled-WebView definitions to the exact questions. Determine the account-creation/
deletion declaration from reachable sign-in/signup paths: clearing IRIS storage is not deleting an Ingress account.
[Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

## Reviewer access draft

Declare that some/all functionality is restricted. Initial instructions:

```text
IRIS requires an authenticated Ingress Intel account and an internet connection.
Open the app and complete sign-in. IRIS loads automatically when Intel recognizes
the account. Open the map menu to access Portal, Map, Agent and System features.
Inventory requires an active C.O.R.E. subscription; other features can be reviewed
without it. Location is optional: Map → Controls → Locate prompts for permission.
App → About IRIS contains privacy information. App → Recovery → Stock Intel restores
the original Intel interface; select IRIS there to return to the alternative UI.
```

These steps alone do **not** provide reviewer access. Before submitting for review, resolve what credentials/access
the reviewer can actually use, including subscription-only functionality and any MFA/account/device restrictions.
There is no shipped demo mode; development fixtures are not a substitute. Do not put passwords, recovery codes or
live session cookies in this repository. Enter any agreed review credentials only in the private Console fields.

## Remaining Console work

After verification, create the app and review signing setup together before its first AAB upload. Begin with internal
testing; check installation/update certificate compatibility and the Play update link on a real phone. Prepare genuine
phone screenshots without private player/portal information, a 512×512 store icon and a 1024×500 feature graphic.
Artwork, public privacy hosting, support email, final Data safety answers and working reviewer access remain pending.
New personal accounts must then complete the required closed test (at least 12 testers opted in continuously for
14 days) and apply for production access. Existing sideload testers can join, but earlier APK testing does not count
as Play opt-in time. [Testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
