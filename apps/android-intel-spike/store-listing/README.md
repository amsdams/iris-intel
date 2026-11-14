# Play Store images

Upload these English listing assets in Play Console:

| Field | File | Format |
| --- | --- | --- |
| App icon | [app-icon-512.png](app-icon-512.png) | 512 × 512, 32-bit RGBA PNG, opaque square artwork |
| Feature graphic | [feature-graphic-1024x500.png](feature-graphic-1024x500.png) | 1024 × 500, 24-bit RGB PNG, no alpha |

Suggested feature-graphic alt text: “IRIS Ingress Intel map, with connected map points on a dark teal background.”

The selected design is the original cyan I on dark teal. The icon exports the existing Android launcher vector,
without adding a mask, rounded corners or shadows.
The feature graphic uses original abstract map artwork, not live Intel data or a UI screenshot.
Its editable source is [feature-graphic.svg](feature-graphic.svg).

Regenerate the PNGs from the repository root using the existing Playwright dependency and installed Chrome:

```sh
node apps/android-intel-spike/store-listing/render.mjs
```

This reads the launcher vector and feature SVG, renders locally with network requests blocked, and checks dimensions,
PNG color types and upload file-size limits. It does not rebuild or change the app. Keep the generated PNGs in Git
alongside the source so they can be uploaded directly. Requirements: [Google Play preview assets](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

## Phone screenshots

Existing screenshots are signed-in phone captures from 2026-10-29; refresh them for the current UI before submission.
They are live Intel screens, not browser fixtures.

Upload in this order:

| Order | Screenshot | Shows |
| --- | --- | --- |
| 1 | [Map overview](phone/01-map-osm-light.png) | Street-level OpenStreetMap with portals, links and fields; light interface |
| 2 | [Portal details](phone/02-portal-details-light.png) | Portal photo, level, owner, health, resonators, links and mods |
| 3 | [Dark map](phone/03-map-dark.png) | OpenFreeMap Dark with the dark interface |
| 4 | [Appearance](phone/04-appearance-dark.png) | Independent interface-theme and base-map choices |

Existing files are 1080 × 1920 PNGs, under 8 MB each, including native/system chrome and attribution.
Review public portal names and avoid private COMM/account details. Capture at the intended device layout; do not
stretch/crop images to force a ratio. The renderer regenerates artwork only, not phone screenshots.

To recapture a prepared view with USB debugging authorized:

```sh
adb exec-out screencap -p > apps/android-intel-spike/store-listing/phone/01-map-osm-light.png
```

Use the SDK's `adb` on PATH; check device resolution before replacing captures. Review images before upload and retain
controls/attribution. A video is optional.
